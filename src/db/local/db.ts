import { SQLocal } from 'sqlocal';

const SCHEMA_VERSION = 1;

let db: SQLocal | null = null;

export async function initLocalDb(): Promise<SQLocal> {
  if (db) return db;
  
  db = new SQLocal({ databasePath: 'visualos-local.db' });
  
  await db.sql`PRAGMA journal_mode = WAL`;
  await db.sql`PRAGMA synchronous = NORMAL`;
  await db.sql`PRAGMA cache_size = -64000`;
  await db.sql`PRAGMA temp_store = MEMORY`;
  
  await db.sql`
    CREATE TABLE IF NOT EXISTS __schema_version (version INTEGER PRIMARY KEY)
  `;
  await db.sql`
    CREATE TABLE IF NOT EXISTS __sync_state (
      table_name TEXT PRIMARY KEY,
      last_sync_at TEXT NOT NULL,
      record_count INTEGER DEFAULT 0
    )
  `;
  await db.sql`
    CREATE TABLE IF NOT EXISTS __pending_writes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
      record_id TEXT NOT NULL,
      data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      attempts INTEGER DEFAULT 0,
      last_error TEXT
    )
  `;
  
  const versionRows = await db.sql<{ version: number }>`SELECT version FROM __schema_version`;
  const currentVersion = versionRows[0]?.version || 0;
  
  if (currentVersion < SCHEMA_VERSION) {
    await runMigrations(currentVersion);
    await db.sql`INSERT OR REPLACE INTO __schema_version (version) VALUES (${SCHEMA_VERSION})`;
  }
  
  return db;
}

async function runMigrations(fromVersion: number) {
  if (!db) throw new Error('DB not initialized');
  
  if (fromVersion < 1) {
    await db.sql`
      CREATE TABLE IF NOT EXISTS firms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        address TEXT,
        gstin TEXT,
        contact TEXT,
        email TEXT,
        website TEXT,
        enabled_features TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS verticals (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        icon_base64 TEXT
      )
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS brands (
        id INTEGER PRIMARY KEY,
        vertical_id INTEGER,
        name TEXT NOT NULL
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_brands_vertical ON brands(vertical_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        vertical_id INTEGER,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory_id INTEGER
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_products_vertical ON products(vertical_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS packing_units (
        id INTEGER PRIMARY KEY,
        unit_name TEXT NOT NULL,
        multiplier INTEGER DEFAULT 1
      )
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS subcategories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        vertical_id INTEGER,
        sort_order INTEGER DEFAULT 0
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_subcategories_vertical ON subcategories(vertical_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        product_id INTEGER,
        brand_id INTEGER,
        vertical_id INTEGER,
        keyword_id TEXT UNIQUE,
        thumbnail_base64 TEXT,
        marketing_images TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_items_firm ON items(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_items_keyword ON items(keyword_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_items_vertical ON items(vertical_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_items_brand ON items(brand_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_items_product ON items(product_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_items_name ON items(item_name)`;
    
    await db.sql`
      CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
        item_name, keyword_id,
        content='items',
        content_rowid='id'
      )
    `;
    
    await db.sql`
      CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
        INSERT INTO items_fts(rowid, item_name, keyword_id) VALUES (new.id, new.item_name, new.keyword_id)
      END
    `;
    await db.sql`
      CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
        INSERT INTO items_fts(items_fts, rowid, item_name, keyword_id) VALUES('delete', old.id, old.item_name, old.keyword_id)
      END
    `;
    await db.sql`
      CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
        INSERT INTO items_fts(items_fts, rowid, item_name, keyword_id) VALUES('delete', old.id, old.item_name, old.keyword_id);
        INSERT INTO items_fts(rowid, item_name, keyword_id) VALUES (new.id, new.item_name, new.keyword_id)
      END
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS prospects (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        prospectname TEXT NOT NULL,
        area_town TEXT DEFAULT '',
        contact TEXT DEFAULT '',
        business_type TEXT DEFAULT '',
        route_id INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_prospects_firm ON prospects(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_prospects_route ON prospects(route_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_prospects_name ON prospects(prospectname)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        area_towns TEXT DEFAULT '[]',
        color_tag TEXT DEFAULT '#4f46e5',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_routes_firm ON routes(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        prospect_id INTEGER NOT NULL,
        grand_total REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        due_amount REAL DEFAULT 0,
        due_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        end_of_sale boolean DEFAULT false
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_sales_orders_firm ON sales_orders(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_sales_orders_prospect ON sales_orders(prospect_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_sales_orders_end_of_sale ON sales_orders(end_of_sale)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS sales_order_items (
        id INTEGER PRIMARY KEY,
        sales_order_id INTEGER NOT NULL,
        item_name_SKU TEXT ,
        sold_uits REAL DEFAULT NOT NULL,
        total REAL DEFAULT NOT NULL
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(sales_order_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_sales_order_items_item ON sales_order_items(item_name_SKU)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        bill_number TEXT NOT NULL,
        business_name TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, 
        prospect_id INTEGER,
        grand_total REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        notes TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_bills_firm ON bills(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        address TEXT,
        notes TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        purchase_log_id INTEGER,
        purchase_rate REAL DEFAULT 0
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_purchase_orders_firm ON purchase_orders(firm_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS purchase_log (
        id INTEGER PRIMARY KEY,
        purchase_date TEXT NOT NULL,
        supplier_id INTEGER NOT NULL,
        shipment_date TEXT,
        total_amount REAL DEFAULT 0,
        item_keyword TEXT NOT NULL
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_purchase_log_supplier ON purchase_log(supplier_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        qty_change INTEGER NOT NULL,
        parcel_change INTEGER,
        from_location_id INTEGER,
        to_location_id INTEGER,
        order_id INTEGER,
        purchase_order_id INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_stock_movements_firm ON stock_movements(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS item_locations (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        slot_id INTEGER,
        parcel_count INTEGER DEFAULT 0,
        is_primary INTEGER DEFAULT 1,
        packaging_type TEXT,
        packaging_tags TEXT DEFAULT '[]',
        pos_x REAL,
        pos_y REAL,
        pos_z REAL,
        dim_w REAL DEFAULT 0.5,
        dim_d REAL DEFAULT 0.5,
        dim_h REAL DEFAULT 0.5,
        last_verified_at TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_item_locations_firm ON item_locations(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_item_locations_item ON item_locations(item_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS storage_places (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        place_name TEXT NOT NULL,
        place_slug TEXT NOT NULL,
        place_type TEXT DEFAULT 'shop',
        floor_count INTEGER DEFAULT 1,
        width_meters REAL DEFAULT 20,
        depth_meters REAL DEFAULT 20,
        height_meters REAL DEFAULT 5,
        svg_layout_path TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_storage_places_firm ON storage_places(firm_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS storage_zones (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        place_id INTEGER NOT NULL,
        floor_num INTEGER DEFAULT 0,
        zone_name TEXT NOT NULL,
        zone_slug TEXT NOT NULL,
        zone_label TEXT,
        zone_color TEXT DEFAULT '#4f46e5',
        notes TEXT,
        polygon_coords TEXT,
        bounding_box TEXT,
        deleted_at TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_storage_zones_firm ON storage_zones(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_storage_zones_place ON storage_zones(place_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS storage_slots (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        zone_id INTEGER NOT NULL,
        slot_name TEXT NOT NULL,
        slot_label TEXT,
        capacity_parcels INTEGER,
        notes TEXT,
        order_index INTEGER DEFAULT 0,
        deleted_at TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_storage_slots_firm ON storage_slots(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_storage_slots_zone ON storage_slots(zone_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS storage_packages (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        zone_id INTEGER,
        slot_id INTEGER,
        package_type TEXT DEFAULT 'other',
        package_label TEXT,
        description TEXT,
        vertical_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_storage_packages_firm ON storage_packages(firm_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS package_items (
        id INTEGER PRIMARY KEY,
        package_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        parcel_count INTEGER DEFAULT 1,
        unit_count INTEGER,
        location_id INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_package_items_package ON package_items(package_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        prospect_id INTEGER NOT NULL,
        route_id INTEGER,
        visit_date TEXT NOT NULL,
        outcome TEXT,
        notes TEXT,
        next_visit_plan TEXT,
        reason_response TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_visits_firm ON visits(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_visits_prospect ON visits(prospect_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS costs (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        cost_type_id TEXT NOT NULL,
        sales_order_id INTEGER,
        purchase_order_id INTEGER,
        amount REAL DEFAULT 0,
        description TEXT,
        date DATE DEFAULT CURRENT_DATE
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_costs_firm ON costs(firm_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS account (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        month_year TEXT NOT NULL,
        total_revenue REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        profit REAL DEFAULT 0,
        notes TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_account_firm ON account(firm_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS item_media (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        item_keyword text,
        media_role TEXT DEFAULT 'gallery',
        data_base64 TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT DEFAULT 'image/webp',
        file_size_kb INTEGER,
        width INTEGER,
        height INTEGER,
        is_watermarked INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_item_media_firm ON item_media(firm_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_item_media_item ON item_media(item_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_item_media_keyword ON item_media(item_keyword)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS variant_params_1 (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS variant_params_2 (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS variant_params_3 (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS cost_types (
        id INTEGER PRIMARY KEY,
        cost_type_name TEXT NOT NULL
      )
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS stock_details (
        id INTEGER PRIMARY KEY,
        item_id INTEGER NOT NULL,
        unit_multiplier_name TEXT NOT NULL,
        unit_multiplier REAL NOT NULL,
        pack_multiplier REAL NOT NULL,
        retail_unit_price REAL NOT NULL,
        wholesale_unit_price REAL NOT NULL,
        stock_type INTEGER NOT NULL,
        parcel_id INTEGER,
        last_updated TEXT NOT NULL
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_stock_details_item ON stock_details(item_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_stock_details_parcel ON stock_details(parcel_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS total_stock (
        id INTEGER PRIMARY KEY,
        item_keyword TEXT NOT NULL,
        total_units REAL NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_total_stock_keyword ON total_stock(item_keyword)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS parceling_details (
        id INTEGER PRIMARY KEY,
        packaging_type TEXT NOT NULL,
        location TEXT
      )
    `;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS warehouse_layout (
        id INTEGER PRIMARY KEY,
        firm_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT 'Main Warehouse',
        floors INTEGER NOT NULL DEFAULT 1,
        sections_per_floor INTEGER NOT NULL DEFAULT 4,
        rows_per_section INTEGER NOT NULL DEFAULT 10,
        cols_per_row INTEGER NOT NULL DEFAULT 5,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_warehouse_layout_firm ON warehouse_layout(firm_id)`;
    
    await db.sql`
      CREATE TABLE IF NOT EXISTS warehouse_cells (
        id INTEGER PRIMARY KEY,
        warehouse_id INTEGER NOT NULL,
        floor INTEGER NOT NULL DEFAULT 0,
        section TEXT NOT NULL,
        row_num INTEGER NOT NULL,
        col_num INTEGER NOT NULL,
        item_id INTEGER,
        parcel_count INTEGER NOT NULL DEFAULT 0,
        notes TEXT
      )
    `;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_warehouse_cells_warehouse ON warehouse_cells(warehouse_id)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_warehouse_cells_item ON warehouse_cells(item_id)`;
  }
}

export function getDb(): SQLocal {
  if (!db) throw new Error('Local DB not initialized. Call initLocalDb() first.');
  return db;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(strings: TemplateStringsArray, ...params: unknown[]): Promise<T[]> {
  const database = getDb();
  return database.sql<T>(strings, ...params);
}

export async function queryOne<T extends Record<string, unknown> = Record<string, unknown>>(strings: TemplateStringsArray, ...params: unknown[]): Promise<T | null> {
  const rows = await query<T>(strings, ...params);
  return rows[0] || null;
}

export async function exec(strings: TemplateStringsArray, ...params: unknown[]): Promise<void> {
  const database = getDb();
  await database.sql(strings, ...params);
}

export async function transaction<T>(fn: (tx: {
  sql: <R extends Record<string, unknown> = Record<string, unknown>>(strings: TemplateStringsArray, ...params: unknown[]) => Promise<R[]>;
}) => Promise<T>): Promise<T> {
  const database = getDb();
  return database.transaction(async (tx) => {
    return fn({
      sql: async <R extends Record<string, unknown> = Record<string, unknown>>(strings: TemplateStringsArray, ...params: unknown[]) => {
        return tx.sql<R>(strings, ...params);
      }
    });
  });
}

export async function closeLocalDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}

export async function exportDatabaseFile(): Promise<File> {
  const database = getDb();
  return database.getDatabaseFile();
}

export async function importDatabaseFile(file: File | Blob | ArrayBuffer | Uint8Array): Promise<void> {
  const database = getDb();
  await database.overwriteDatabaseFile(file);
}

export async function deleteLocalDb(): Promise<void> {
  if (db) {
    await db.deleteDatabaseFile();
    db = null;
  }
}

export async function getDatabaseSize(): Promise<number> {
  const database = getDb();
  const info = await database.getDatabaseInfo();
  return info.databaseSizeBytes || 0;
}