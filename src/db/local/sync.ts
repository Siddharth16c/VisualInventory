import { supabase } from '../supabase';
import { initLocalDb, getDb } from './db';
import { getFirmId } from '../dal';

const MAX_RETRY_ATTEMPTS = 3;

interface SyncState {
  table_name: string;
  last_sync_at: string;
  record_count: number;
}

interface PendingWrite {
  id: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  data: string | null;
  attempts: number;
  last_error: string | null;
}

const SYNCABLE_TABLES = [
  'firms', 'verticals', 'brands', 'products', 'packing_units', 'subcategories',
  'items', 'prospects', 'routes', 'sales_orders', 'sales_order_items', 'bills',
  'suppliers', 'purchase_orders', 'purchase_log', 'stock_movements',
  'item_locations', 'storage_places', 'storage_zones', 'storage_slots',
  'storage_packages', 'package_items', 'visits', 'costs', 'account', 'item_media',
  'categories', 'variant_params_1', 'variant_params_2', 'variant_params_3',
  'cost_types', 'stock_details', 'total_stock', 'parceling_details',
  'warehouse_layout', 'warehouse_cells'
] as const;

const TABLE_TIMESTAMP_COLS: Record<string, string> = {
  firms: 'created_at',
  verticals: 'created_at',
  brands: 'created_at',
  products: 'created_at',
  packing_units: 'created_at',
  subcategories: 'created_at',
  items: 'updated_at',
  prospects: 'created_at',
  routes: 'created_at',
  sales_orders: 'created_at',
  sales_order_items: 'created_at',
  bills: 'created_at',
  suppliers: 'created_at',
  purchase_orders: 'created_at',
  purchase_log: 'purchase_date',
  stock_movements: 'created_at',
  item_locations: 'updated_at',
  storage_places: 'created_at',
  storage_zones: 'created_at',
  storage_slots: 'created_at',
  storage_packages: 'created_at',
  package_items: 'created_at',
  visits: 'created_at',
  costs: 'date',
  account: 'created_at',
  item_media: 'created_at',
  categories: 'created_at',
  variant_params_1: 'created_at',
  variant_params_2: 'created_at',
  variant_params_3: 'created_at',
  cost_types: 'created_at',
  stock_details: 'last_updated',
  total_stock: 'updated_at',
  parceling_details: 'created_at',
  warehouse_layout: 'created_at',
  warehouse_cells: 'created_at'
};

const FIRM_SCOPED_TABLES = new Set([
  'items', 'prospects', 'routes', 'sales_orders', 'bills', 'purchase_orders',
  'stock_movements', 'item_locations', 'storage_places', 'storage_zones',
  'storage_slots', 'storage_packages', 'package_items', 'visits', 'costs',
  'account', 'item_media', 'warehouse_layout'
]);

export async function initLocalDbWithSync() {
  await initLocalDb();
}

export async function pullFromSupabase(tables?: string[]): Promise<{ pulled: number; errors: string[] }> {
  const firmId = getFirmId();
  if (!firmId) {
    throw new Error('No firm selected. Cannot pull data.');
  }
  
  const tablesToSync = tables || [...SYNCABLE_TABLES];
  let totalPulled = 0;
  const errors: string[] = [];
  
  for (const table of tablesToSync) {
    try {
      const pulled = await pullTable(table, firmId);
      totalPulled += pulled;
    } catch (err: any) {
      errors.push(`${table}: ${err.message}`);
    }
  }
  
  return { pulled: totalPulled, errors };
}

async function pullTable(table: string, firmId: string): Promise<number> {
  const db = getDb();
  const timestampCol = TABLE_TIMESTAMP_COLS[table] || 'updated_at';
  
  const syncStateResult = await db.exec(
    'SELECT * FROM __sync_state WHERE table_name = ?',
    [table]
  );
  const syncState = syncStateResult.rows?.[0] as SyncState | undefined;
  const lastSync = syncState?.last_sync_at || '1970-01-01T00:00:00Z';
  
  let query = supabase
    .from(table)
    .select('*')
    .gt(timestampCol, lastSync)
    .order(timestampCol, { ascending: true });
  
  if (FIRM_SCOPED_TABLES.has(table)) {
    query = query.eq('firm_id', firmId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  if (!data || data.length === 0) return 0;
  
  await upsertLocalRecords(table, data);
  
  const latestTimestamp = data[data.length - 1]?.[timestampCol as keyof typeof data[0]] || new Date().toISOString();
  await db.exec(
    'INSERT OR REPLACE INTO __sync_state (table_name, last_sync_at, record_count) VALUES (?, ?, ?)',
    [table, latestTimestamp, data.length]
  );
  
  return data.length;
}

async function upsertLocalRecords(table: string, records: Record<string, unknown>[]) {
  if (records.length === 0) return;
  
  const db = getDb();
  
  for (const record of records) {
    const columns = Object.keys(record);
    const values = columns.map(c => {
      const val = record[c];
      if (val === null || val === undefined) return null;
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    });
    
    const placeholders = columns.map(() => '?').join(', ');
    const updateCols = columns.filter(c => c !== 'id');
    const updateClause = updateCols.map(c => `${c} = ?`).join(', ');
    const updateValues = [...values.slice(1), values[0]]; // Exclude id from SET, include id at end for WHERE
    
    const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateClause}`;
    
    try {
      await db.exec(insertSql, values);
    } catch (err) {
      console.error(`Failed to upsert ${table} id=${record.id}:`, err);
    }
  }
}

export async function pushToSupabase(): Promise<{ pushed: number; errors: string[] }> {
  const db = getDb();
  
  const pendingResult = await db.exec(
    `SELECT * FROM __pending_writes WHERE attempts < ? ORDER BY created_at ASC`,
    [MAX_RETRY_ATTEMPTS]
  );
  const pendingWrites = (pendingResult.rows || []) as PendingWrite[];
  
  if (pendingWrites.length === 0) {
    return { pushed: 0, errors: [] };
  }
  
  let pushed = 0;
  const errors: string[] = [];
  
  for (const pw of pendingWrites) {
    try {
      await pushPendingWrite(pw);
      await db.exec('DELETE FROM __pending_writes WHERE id = ?', [pw.id]);
      pushed++;
    } catch (err: any) {
      await db.exec(
        'UPDATE __pending_writes SET attempts = ?, last_error = ? WHERE id = ?',
        [pw.attempts + 1, err.message, pw.id]
      );
      errors.push(`${pw.table_name}:${pw.record_id} - ${err.message}`);
    }
  }
  
  return { pushed, errors };
}

async function pushPendingWrite(pw: PendingWrite) {
  const data = pw.data ? JSON.parse(pw.data) : null;
  
  let result;
  
  if (pw.operation === 'INSERT') {
    result = await supabase.from(pw.table_name).insert(data).select();
  } else if (pw.operation === 'UPDATE') {
    result = await supabase.from(pw.table_name).update(data).eq('id', pw.record_id).select();
  } else if (pw.operation === 'DELETE') {
    result = await supabase.from(pw.table_name).delete().eq('id', pw.record_id);
  }
  
  if (result?.error) {
    throw result.error;
  }
}

export async function queueWrite(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', recordId: string | number, data?: unknown) {
  const db = getDb();
  await db.exec(
    'INSERT INTO __pending_writes (table_name, operation, record_id, data) VALUES (?, ?, ?, ?)',
    [table, operation, String(recordId), data ? JSON.stringify(data) : null]
  );
}

export async function syncAll(): Promise<{ pullResult: { pulled: number; errors: string[] }; pushResult: { pushed: number; errors: string[] } }> {
  const db = getDb();
  const pullResult = await pullFromSupabase();
  const pushResult = await pushToSupabase();
  
  for (const table of SYNCABLE_TABLES) {
    const countResult = await db.exec(`SELECT COUNT(*) as count FROM ${table}`, []);
    const count = (countResult.rows?.[0] as { count: number } | undefined)?.count || 0;
    await db.exec(
      'INSERT OR REPLACE INTO __sync_state (table_name, last_sync_at, record_count) VALUES (?, ?, ?)',
      [table, new Date().toISOString(), count]
    );
  }
  
  return { pullResult, pushResult };
}

export async function getSyncStatus(): Promise<Record<string, { lastSync: string; count: number; pendingWrites: number }>> {
  const db = getDb();
  
  const syncResult = await db.exec('SELECT * FROM __sync_state', []);
  const syncStates = (syncResult.rows || []) as SyncState[];
  
  const pendingResult = await db.exec(
    'SELECT table_name, COUNT(*) as count FROM __pending_writes GROUP BY table_name',
    []
  );
  const pendingCounts = (pendingResult.rows || []) as { table_name: string; count: number }[];
  
  const pendingMap = new Map(pendingCounts.map(p => [p.table_name, p.count]));
  
  const status: Record<string, { lastSync: string; count: number; pendingWrites: number }> = {};
  
  for (const state of syncStates) {
    status[state.table_name] = {
      lastSync: state.last_sync_at,
      count: state.record_count,
      pendingWrites: pendingMap.get(state.table_name) || 0
    };
  }
  
  return status;
}

export { SYNCABLE_TABLES };