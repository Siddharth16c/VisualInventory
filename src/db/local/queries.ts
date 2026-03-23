import { initLocalDb, getDb } from './db';
import type { Item, Prospect, Route, Order, OrderItem, Bill, StoragePlace, StorageZone, StorageSlot, ItemLocation, Brand, Vertical, PackingUnit, Supplier } from '../types';

export async function initializeLocalDb() {
  await initLocalDb();
}

// ─── Search Items (FTS5) ─────────────────────────────────────────────────────

export async function searchItems(
  firmId: string,
  query: string,
  options?: {
    verticalId?: number;
    brandId?: number;
    subcategoryId?: number;
    limit?: number;
  }
): Promise<Item[]> {
  const db = getDb();
  const limit = options?.limit || 50;
  
  let sql: string;
  let params: any[] = [];
  
  if (query.trim()) {
    sql = `
      SELECT i.* FROM items i
      JOIN items_fts fts ON fts.rowid = i.id
      WHERE i.firm_id = ?
        AND items_fts MATCH ?
    `;
    params = [firmId, `${query}*`];
  } else {
    sql = `SELECT * FROM items WHERE firm_id = ?`;
    params = [firmId];
  }
  
  if (options?.verticalId) {
    sql += ` AND vertical_id = ?`;
    params.push(options.verticalId);
  }
  if (options?.brandId) {
    sql += ` AND brand_id = ?`;
    params.push(options.brandId);
  }
  if (options?.subcategoryId) {
    sql += ` AND subcategory_id = ?`;
    params.push(options.subcategoryId);
  }
  
  sql += ` ORDER BY i.item_name ASC LIMIT ?`;
  params.push(limit);
  
  const rows = await db.sql<Item | Record<string, unknown>>(sql, params) as Item[];
  return rows;
}

// ─── Items CRUD ───────────────────────────────────────────────────────────

export async function getItems(firmId: string): Promise<Item[]> {
  const db = getDb();
  return db.sql<Item>`SELECT * FROM items WHERE firm_id = ${firmId} ORDER BY item_name ASC`;
}

export async function getItemById(id: number): Promise<Item | null> {
  const db = getDb();
  const rows = await db.sql<Item>`SELECT * FROM items WHERE id = ${id}`;
  return rows[0] || null;
}

export async function getItemByKeywordId(keywordId: string): Promise<Item | null> {
  const db = getDb();
  const rows = await db.sql<Item>`SELECT * FROM items WHERE keyword_id = ${keywordId}`;
  return rows[0] || null;
}

export async function getLowStockItems(firmId: string, threshold?: number): Promise<Item[]> {
  const db = getDb();
  return db.sql<Item>`
    SELECT * FROM items 
    WHERE firm_id = ${firmId} 
      AND stock_parcels <= COALESCE(reorder_threshold, ${threshold || 10})
    ORDER BY stock_parcels ASC
  `;
}

// ─── Prospects CRUD ────────────────────────────────────────────────────────

export async function getProspects(firmId: string): Promise<Prospect[]> {
  const db = getDb();
  return db.sql<Prospect>`SELECT * FROM prospects WHERE firm_id = ${firmId} ORDER BY prospectname ASC`;
}

export async function getProspectById(id: number): Promise<Prospect | null> {
  const db = getDb();
  const rows = await db.sql<Prospect>`SELECT * FROM prospects WHERE id = ${id}`;
  return rows[0] || null;
}

export async function insertProspect(firmId: string, prospect: Partial<Prospect>): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const id = Date.now();
  await db.sql`
    INSERT INTO prospects (id, firm_id, prospectname, area_town, contact, business_type, notes, created_at)
    VALUES (${id}, ${firmId}, ${prospect.prospectname}, ${prospect.area_town || ''}, ${prospect.contact || ''}, ${prospect.business_type || ''}, ${prospect.notes || ''}, ${now})
  `;
  await queueWrite('prospects', 'INSERT', id, { ...prospect, id, firm_id: firmId, created_at: now });
}

export async function updateProspect(id: number, prospect: Partial<Prospect>): Promise<void> {
  const db = getDb();
  const setClauses: string[] = [];
  const values: any[] = [];
  
  for (const [key, value] of Object.entries(prospect)) {
    if (key === 'id' || key === 'firm_id' || key === 'createdAt' || key === 'created_at') continue;
    setClauses.push(`${key} = ?`);
    values.push(value === undefined ? null : value);
  }
  
  if (setClauses.length > 0) {
    values.push(id);
    await db.sql(`UPDATE prospects SET ${setClauses.join(', ')} WHERE id = ?`, values);
    await queueWrite('prospects', 'UPDATE', id, prospect);
  }
}

export async function deleteProspect(id: number): Promise<void> {
  const db = getDb();
  await db.sql`DELETE FROM prospects WHERE id = ${id}`;
  await queueWrite('prospects', 'DELETE', id);
}

// ─── Routes CRUD ────────────────────────────────────────────────────────────

export async function getRoutes(firmId: string): Promise<Route[]> {
  const db = getDb();
  return db.sql<Route>`SELECT * FROM routes WHERE firm_id = ${firmId} ORDER BY name ASC`;
}

// ─── Orders CRUD ────────────────────────────────────────────────────────────

export async function getOrders(firmId: string, status?: string): Promise<Order[]> {
  const db = getDb();
  if (status) {
    return db.sql<Order>`SELECT * FROM orders WHERE firm_id = ${firmId} AND status = ${status} ORDER BY order_date DESC`;
  }
  return db.sql<Order>`SELECT * FROM orders WHERE firm_id = ${firmId} ORDER BY order_date DESC`;
}

export async function getOrderById(id: number): Promise<Order | null> {
  const db = getDb();
  const rows = await db.sql<Order>`SELECT * FROM orders WHERE id = ${id}`;
  return rows[0] || null;
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const db = getDb();
  return db.sql<OrderItem>`SELECT * FROM order_items WHERE order_id = ${orderId}`;
}

// ─── Bills CRUD ─────────────────────────────────────────────────────────────

export async function getBills(firmId: string): Promise<Bill[]> {
  const db = getDb();
  return db.sql<Bill>`SELECT * FROM bills WHERE firm_id = ${firmId} ORDER BY created_at DESC`;
}

// ─── Storage CRUD ───────────────────────────────────────────────────────────

export async function getStoragePlaces(firmId: string): Promise<StoragePlace[]> {
  const db = getDb();
  return db.sql<StoragePlace>`SELECT * FROM storage_places WHERE firm_id = ${firmId} AND deleted_at IS NULL`;
}

export async function getStorageZones(firmId: string, placeId?: number): Promise<StorageZone[]> {
  const db = getDb();
  if (placeId) {
    return db.sql<StorageZone>`SELECT * FROM storage_zones WHERE firm_id = ${firmId} AND place_id = ${placeId} AND deleted_at IS NULL`;
  }
  return db.sql<StorageZone>`SELECT * FROM storage_zones WHERE firm_id = ${firmId} AND deleted_at IS NULL`;
}

export async function getStorageSlots(firmId: string, zoneId?: number): Promise<StorageSlot[]> {
  const db = getDb();
  if (zoneId) {
    return db.sql<StorageSlot>`SELECT * FROM storage_slots WHERE zone_id = ${zoneId} AND deleted_at IS NULL ORDER BY order_index ASC`;
  }
  return db.sql<StorageSlot>`SELECT * FROM storage_slots WHERE firm_id = ${firmId} AND deleted_at IS NULL ORDER BY order_index ASC`;
}

export async function getItemLocations(firmId: string, itemId?: number): Promise<ItemLocation[]> {
  const db = getDb();
  if (itemId) {
    return db.sql<ItemLocation>`SELECT * FROM item_locations WHERE item_id = ${itemId} AND deleted_at IS NULL`;
  }
  return db.sql<ItemLocation>`SELECT * FROM item_locations WHERE firm_id = ${firmId} AND deleted_at IS NULL`;
}

// ─── Reference Data ──────────────────────────────────────────────────────────

export async function getVerticals(): Promise<Vertical[]> {
  const db = getDb();
  return db.sql<Vertical>`SELECT * FROM verticals ORDER BY sort_order ASC, name ASC`;
}

export async function getBrands(verticalId?: number): Promise<Brand[]> {
  const db = getDb();
  if (verticalId) {
    return db.sql<Brand>`SELECT * FROM brands WHERE vertical_id = ${verticalId} ORDER BY name ASC`;
  }
  return db.sql<Brand>`SELECT * FROM brands ORDER BY name ASC`;
}

export async function getPackingUnits(): Promise<PackingUnit[]> {
  const db = getDb();
  return db.sql<PackingUnit>`SELECT * FROM packing_units`;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const db = getDb();
  return db.sql<Supplier>`SELECT * FROM suppliers ORDER BY name ASC`;
}

// ─── Write Operations (with offline queue) ──────────────────────────────────

import { queueWrite } from './sync';

export async function insertItem(firmId: string, item: Partial<Item>): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();
  
  const result = await db.sql<{ id: number }>`
    INSERT INTO items (
      firm_id, item_name, product_id, brand_id, vertical_id, packing_unit_id,
      p_unit, p_unit_per_parcel, stock_parcels, stock_units,
      retail_price_unit, wholesale_price_unit, purchase_price_unit,
      keyword_id, subcategory_id, reorder_threshold, metadata, created_at, updated_at
    ) VALUES (
      ${firmId}, ${item.item_name}, ${item.product_id || null}, ${item.brand_id || null},
      ${item.vertical_id || null}, ${item.packing_unit_id || null},
      ${item.p_unit || 1}, ${item.p_unit_per_parcel || 1},
      ${item.stock_parcels || 0}, ${item.stock_units || 0},
      ${item.retail_price_unit || 0}, ${item.wholesale_price_unit || 0}, ${item.purchase_price_unit || 0},
      ${item.keyword_id || null}, ${item.subcategory_id || null},
      ${item.reorder_threshold || 0}, ${item.metadata ? JSON.stringify(item.metadata) : null},
      ${now}, ${now}
    ) RETURNING id
  `;
  
  const id = result[0]?.id;
  if (id) {
    await queueWrite('items', 'INSERT', id, { ...item, id, firm_id: firmId });}return id || 0;
}

export async function updateItem(id: number, updates: Partial<Item>): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  
  const setClauses: string[] = [];
  const values: any[] = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id' || key === 'firm_id') continue;
    setClauses.push(`${key} = ?`);
    values.push(value === undefined ? null : value);
  }
  
  setClauses.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  await db.sql(`UPDATE items SET ${setClauses.join(', ')} WHERE id = ?`, values);
  await queueWrite('items', 'UPDATE', id, updates);
}

export async function updateStock(itemId: number, parcelDelta: number, unitDelta: number): Promise<void> {
  const db = getDb();
  await db.sql`
    UPDATE items SET
      stock_parcels = stock_parcels + ${parcelDelta},
      stock_units = stock_units + ${unitDelta},
      updated_at = ${new Date().toISOString()}
    WHERE id = ${itemId}
  `;
}

export async function insertOrder(firmId: string, order: Partial<Order>, items: Partial<OrderItem>[]): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();
  
  const result = await db.sql<{ id: number }>`
    INSERT INTO orders (
      firm_id, prospect_id, prospect_name, order_date, pricing_mode,
      status, subtotal, tax_amount, discount_amount, grand_total,
      paid_amount, due_amount, payment_status, due_date, notes, created_at
    ) VALUES (
      ${firmId}, ${order.prospect_id}, ${order.prospect_name}, ${order.order_date || now.split('T')[0]},
      ${order.pricing_mode || 'retail'}, ${order.status || 'quote'},
      ${order.subtotal || 0}, ${order.tax_amount || 0}, ${order.discount_amount || 0}, ${order.grand_total || 0},
      ${order.paid_amount || 0}, ${order.due_amount || 0}, ${order.payment_status || 'unpaid'},
      ${order.due_date || null}, ${order.notes || null}, ${now}
    ) RETURNING id
  `;
  
  const orderId = result[0]?.id;
  if (!orderId) throw new Error('Failed to create order');
  
  for (const item of items) {
    await db.sql`
      INSERT INTO order_items (order_id, item_id, item_name, qty, unit_price, discount, total)
      VALUES (${orderId}, ${item.item_id}, ${item.item_name}, ${item.qty}, ${item.unit_price}, ${item.discount}, ${item.total})
    `;
  }
  
  await queueWrite('orders', 'INSERT', orderId, { ...order, id: orderId, firm_id: firmId, items });
  return orderId;
}

export async function deleteItem(id: number): Promise<void> {
  const db = getDb();
  await db.sql`DELETE FROM items WHERE id = ${id}`;
  await queueWrite('items', 'DELETE', id);
}

// Support tables for Inventory UI
export async function insertVertical(firmId: string, data: any): Promise<void> {
  const db = getDb();
  const id = Date.now(); // local temp ID, supabase will assign real ID on push, but this works for queue
  await db.sql`INSERT INTO verticals (id, name) VALUES (${id}, ${data.name})`;
  await queueWrite('verticals', 'INSERT', id, { ...data, id });
}

export async function insertProduct(firmId: string, data: any): Promise<void> {
  const db = getDb();
  const id = Date.now();
  await db.sql`INSERT INTO products (id, vertical_id, name, category) VALUES (${id}, ${data.vertical_id}, ${data.name}, ${data.category || ''})`;
  await queueWrite('products', 'INSERT', id, { ...data, id });
}

export async function insertBrand(firmId: string, data: any): Promise<void> {
  const db = getDb();
  const id = Date.now();
  await db.sql`INSERT INTO brands (id, vertical_id, name) VALUES (${id}, ${data.vertical_id}, ${data.name})`;
  await queueWrite('brands', 'INSERT', id, { ...data, id });
}

export async function insertPackingUnit(firmId: string, data: any): Promise<void> {
  const db = getDb();
  const id = Date.now();
  await db.sql`INSERT INTO packing_units (id, unit_name, multiplier) VALUES (${id}, ${data.unit_name}, ${data.multiplier})`;
  await queueWrite('packing_units', 'INSERT', id, { ...data, id });
}

// Temporary for variant_params mock (Not in schema locally yet, but keeping app from crashing)
export async function insertVariantParam(firmId: string, table: string, data: any): Promise<void> {
  // We will just queue it for supabase since variant params aren't locally defined in schema yet.
  await queueWrite(table, 'INSERT', Date.now(), { ...data });
}