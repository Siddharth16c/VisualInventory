┌────────────────────────────────────────────────────────────┐
│                     React Components                        │
│  ┌─────────────────┐  ┌──────────────────────────────────┐ │
│  │ Billing, Items, │  │     SyncPanel.tsx               │ │
│  │ Orders, etc.    │  │  - Pull/Push/Sync buttons       │ │
│  └────────┬────────┘  │  - Export/Import backup (.db)   │ │
│           │           │  - Table sync status display    │ │
│           ▼           └──────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            Local Queries (queries.ts)                │  │
│  │  - searchItems() with FTS5 (~50ms for 100k items)    │  │
│  │  - getItems(), getProspects(), getOrders(), etc.     │  │
│  └─────────────────────────────────────────────────────┘  │
│                          │                                 │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            SQLite WASM (sqlocal)                     │  │
│  │  - OPFS persistence (survives browser clear)         │  │
│  │  - All tables mirrored from Supabase                │  │
│  │  - FTS5 virtual tables for fast search               │  │
│  └─────────────────────────────────────────────────────┘  │
│                          │                                 │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │               Sync Layer (sync.ts)                   │  │
│  │  - Pull: SELECT * WHERE updated_at > last_sync      │  │
│  │  - Push: Queue writes → retry on reconnect          │  │
│  │  - Conflict: last-write-wins via timestamp          │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Supabase   │
                    │ (writes only)│
                    └──────────────┘



┌──────────────────────────────────────────────────────┐
│                  Image Flow                          │
│                                                      │
│  1. User selects image in ItemCard/AddItemModal    │
│                         ↓                            │
│  2. generateThumbnailBase64()                       │
│     - FFmpeg WASM resizes to 64x64 WebP             │
│     - Returns "data:image/webp;base64,..."         │
│                         ↓                            │
│  3. Save directly to items.thumbnail_base64        │
│         (stored in Postgres AND SQLite WASM)        │
│                         ↓                            │
│  4. Sync: thumbnail travels with item data         │
│         (no separate storage API needed)            │
│                                                      │
│  Storage: 100k items × 10KB = ~1GB                  │
│  Works offline: Images in SQLite WASM               │
└──────────────────────────────────────────────────────┘




Current scenario:

Feature	Primary Storage	Sync	Workflow
Item Creation	Supabase → SQLite	✅ Real-time	DAL.items.add() → emit change → invalidate query
Billing	SQLite (reads)	⚡ Background	Read from SQLite → Create order → Queue write → Push
Image Upload	Supabase (base64)	✅ With item	Compress + Watermark → base64 → items.update() → Sync
Catalogue Gen	SQLite (offline)	❌ N/A	Read items.marketing_images → Generate HTML
Stock Update	SQLite + Supabase	✅ Real-time	DAL.items.update() → Sync
Reports	Supabase (RPC)	❌ Online only	Direct Supabase queries



Component	Storage	Sync	Availability
Items, Orders, Prospects	SQLite + Supabase	✅ Bidirectional	Offline-first
Images (marketing_images)	Supabase (base64 in JSON)	✅ With items	Offline-first
Thumbnails	Supabase (base64)	✅ With items	Offline-first
Product Media	Dexie (IndexedDB) ❌	❌ Not synced	Only local