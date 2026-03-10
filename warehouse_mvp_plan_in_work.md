# Warehouse MVP — 10-Point Action Plan
*Generated: 2026-03-10*

---

## ✅ Seed Data Review (seed.sql + seed.ts)

**Overall verdict: GOOD quality seed.** Minor issues:

| Issue | Severity | Notes |
|-------|----------|-------|
| `storage_zones` has `floor_num` starting from 1 in seed, but code uses 0-indexed floors | ⚠️ Medium | Change seed floor loop to `floor <= 0` OR update display logic to add 1 |
| `item_locations` table has NO seed entries — zero stock is placed in any zone | ⚠️ High | StockMovementDialog, 3D viewer stock panels all empty by design. Manual test needed. |
| `polygon_coords` not seeded for zones — all zones have NULL polygon_coords | ℹ️ Low | Expected — user draws these. No fix needed. |
| `packages`/`storage_packages` table — **does NOT exist in seed or schema** | 🔴 Critical | New table needed. See Point 6. |
| Seed uses `subcategories` table (which was removed from DBEditor) | ℹ️ Low | Seed still valid for DB insertion, just not editable via UI anymore. |

---

## 🔥 Priority Tasks (Do Now — Antigravity)

### Task 1 — Remove Backup Dialog ✅ (5 min)
**Problem:** AutoBackup fires every session after 15s, very intrusive.
**Fix:** Increase timer to once per 3 days OR move to settings-only.
- **File:** [src/components/AutoBackup.tsx](file:///d:/VisualInventory/VisualInventory/src/components/AutoBackup.tsx)
- **Change:** Line 18: change daily check to 3-day interval. Or add a "Don't show again for 3 days" button alongside "Remind Later".

### Task 2 — Rehydration Bug: Zones not appearing after tab switch ✅ (30 min)
**Problem:** Create store → switch tab → come back → `places` data is there (header shows store name) but Spatial Mapper/Viewer 3D canvas shows nothing until rebuild.
**Root cause:** [emitDbChange('storage_places')](file:///d:/VisualInventory/VisualInventory/src/db/dal.ts#31-32) fires but [useSupabaseQuery](file:///d:/VisualInventory/VisualInventory/src/hooks/useSupabaseQuery.ts#5-31) for `storage_places` in Warehouse.tsx doesn't re-fetch unless the query key changes. The `invalidateQueries` in [useSupabaseQuery](file:///d:/VisualInventory/VisualInventory/src/hooks/useSupabaseQuery.ts#5-31) listener may not be running correctly.
- **Files to read:** [src/hooks/useSupabaseQuery.ts](file:///d:/VisualInventory/VisualInventory/src/hooks/useSupabaseQuery.ts), [src/db/dal.ts](file:///d:/VisualInventory/VisualInventory/src/db/dal.ts) (emitDbChange and subscribe logic)
- **Fix:** In [SpatialMapper.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialMapper.tsx), after [handleCreatePlace](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialMapper.tsx#310-333), also call `queryClient.invalidateQueries(['storage_places'])` directly. Also need to invalidate from within [useSupabaseQuery](file:///d:/VisualInventory/VisualInventory/src/hooks/useSupabaseQuery.ts#5-31)'s event subscription properly.
- **Files:** [src/components/warehouse/SpatialMapper.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialMapper.tsx), [src/hooks/useSupabaseQuery.ts](file:///d:/VisualInventory/VisualInventory/src/hooks/useSupabaseQuery.ts)

### Task 3 — Fix Landmark Button Position ✅ (5 min)
**Problem:** "Place Landmark" button in [SpatialViewer3D](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialViewer3D.tsx#378-827) is positioned with `absolute top-16 left-4` which puts it above the page title.
- **File:** [src/components/warehouse/SpatialViewer3D.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialViewer3D.tsx) line ~643
- **Fix:** Change position to be inside the canvas bounds — `absolute top-4 right-4` (inside the canvas div, not the component root).

### Task 4 — Backup Dialog: Smarter dismiss ✅ (10 min)
**Current:** "Remind Later" only hides for this session. Shows every app load.
**Fix:** On "Remind Later", set `localStorage.setItem('visualOS_backupRemindAfter', Date.now() + 3*24*60*60*1000)`. Check this timestamp instead of just today's date.
- **File:** [src/components/AutoBackup.tsx](file:///d:/VisualInventory/VisualInventory/src/components/AutoBackup.tsx)

---

## 🎨 UX/Visual Tasks (Do Now — Antigravity)

### Task 5 — Simplify 3D Canvas: Single View Floor = Flat Plane (Medium, 2-3 hrs)
**Your question:** "Why is floor + zone so complex? Can we have single 3D drawing plane?"

**Answer:** YES. The current stacked-floors approach (multiple [FloorPlane](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialMapper.tsx#55-108) meshes offset vertically) is unnecessary complexity for the edit/draw view.

**Proposed change:**
- **Edit Map ([SpatialMapper](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialMapper.tsx#284-902)):** Keep current flat single-plane drawing (already single plane - this works ✅)
- **Map View ([SpatialViewer3D](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialViewer3D.tsx#378-827)):** Replace multi-floor stacking with a **floor selector dropdown** that swaps which floor's zones are shown on ONE flat plane. No vertical stacking. Clean. Simple. Better visibility.
- **Color differentiation:** Instead of 3D elevation, use **zone color + opacity** that's already in place, and use **floor tab pills** (F0, F1, F2) to switch context.

**3D Canvas theme:** Make it lighter — change background from `#0f172a` (near black) to `#1e293b` (slate-800) for the canvas background. Floor plane from `0x1e293b` to `0x334155` (lighter). Grid lines from `0x334155, 0x1e293b` to `0x475569, 0x334155`.

- **Files:** [src/components/warehouse/SpatialViewer3D.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialViewer3D.tsx), [src/components/warehouse/SpatialMapper.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialMapper.tsx)

### Task 6 — StockMovementDialog Theme Improvement (30 min)
**Request:** White/lighter background, darker text. Plus expand items to show parcel details.
- **File:** [src/components/warehouse/StockMovementDialog.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/StockMovementDialog.tsx)
- **Change:** Swap `bg-slate-900` → `bg-white/95`, `text-slate-200` → `text-slate-800`, borders lighter.

---

## 📦 Packaging System — New Feature (Complex, 4-6 hrs)

### Task 7 — What are Slots? (Explanation)
`storage_slots` = **named sub-locations within a zone**. Like:
- Zone "Back Wall" → Slot "Bottom Shelf", "Top Shelf", "Near Door"
- Zone "Main Area" → Slot "Stack A", "Stack B"

They're used to give items a precise address (zone + slot). For Phase 1 MVP, **slots are optional** — you can place items directly in a zone. For the packaging system, a "package" IS effectively an advanced slot with items inside it.

### Task 8 — Packaging System Design (DO THIS, CRITICAL)

**What it is:** A custom storage bundle — e.g., "Gunny Bag #1" containing 50 packets of fireworks + 20 sparkler boxes. This is an **inventory container**, not a shipping package.

**DB Schema needed (NEW TABLE):**
```sql
-- In Supabase SQL editor:
CREATE TABLE storage_packages (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id),
  zone_id bigint REFERENCES storage_zones(id),
  slot_id bigint REFERENCES storage_slots(id),
  
  -- Package identity
  package_type text NOT NULL,    -- ENUM-like: 'gunny_bag', 'cardboard_box', 'carry_bag', 'open_tying', 'crate', 'sack'
  package_label text,            -- Free text: "Holi Pichkari Large", "Fancy Fireworks Supreme"
  description text,              -- Any notes
  
  -- Metadata
  vertical_id bigint REFERENCES verticals(id),  -- Which vertical this package belongs to
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz          -- Soft delete
);

-- Junction table: Package ↔ Items (many-to-many with quantity)
CREATE TABLE package_items (
  id bigserial PRIMARY KEY,
  package_id bigint NOT NULL REFERENCES storage_packages(id) ON DELETE CASCADE,
  item_id bigint NOT NULL REFERENCES items(id),
  location_id bigint REFERENCES item_locations(id),  -- which item_location record this draws from
  parcel_count integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Static package type names (can be firm-specific or global)
-- No separate table needed — use a hardcoded enum in UI:
-- 'gunny_bag' | 'cardboard_box' | 'carry_bag' | 'open_tying' | 'crate' | 'sack' | 'polythene_bundle'
```

**DAL methods needed:**
- `DAL.storage_packages.create(data)` - create package in a zone
- `DAL.storage_packages.getByZone(zoneId)` - list packages in a zone
- `DAL.storage_packages.addItem(packageId, itemId, parcelCount)` - add item to package
- `DAL.storage_packages.removeItem(packageItemId)` - remove item from package
- `DAL.storage_packages.getWithItems(packageId)` - fetch package + all items incl. item_name, brand_name, vertical_name, qty, price

**UI changes:**
- **StockMovementDialog / zone detail panel:** Show packages in zone alongside individual items. Click package to expand → show items inside with name, brand, vertical, qty, price.
- **New PackageCreatorDialog:** Select zone → choose package_type → enter label → search/add items from that zone → save.
- **SpatialViewer3D zone panel:** Show package count badge on zone.

**Files to change:**
- [src/db/dal.ts](file:///d:/VisualInventory/VisualInventory/src/db/dal.ts) — add `storage_packages` namespace
- [src/db/types.ts](file:///d:/VisualInventory/VisualInventory/src/db/types.ts) — add `StoragePackage`, `PackageItem` interfaces
- [src/components/warehouse/StockMovementDialog.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/StockMovementDialog.tsx) — show packages in zone
- `src/components/warehouse/PackageCreatorDialog.tsx` — NEW file

---

## 🔗 Item→Zone Linking — Critical Missing Feature

### Task 9 — No way to add items to zones (CRITICAL)

**Current state:**  
- `item_locations` table exists in DB and DAL  
- BUT: No UI to create an `item_location` record (assign item to zone/slot)

**What's needed: "Place Items in Zone" dialog**
- Select a zone on the map → "Place Stock" button
- Search items from inventory (by name/keyword_id)
- Choose quantity (parcel_count)
- Choose slot (optional)  
- Choose packaging_type (optional, for `item_locations.packaging_type` field)
- Save → creates `item_locations` record

**Where to add UI:**
- [SpatialViewer3D](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialViewer3D.tsx#378-827): In the zone panel sidebar, add "Place Stock" button alongside existing "Move/Sell" buttons
- OR: In [SpatialMapper](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialMapper.tsx#284-902) — right-click on drawn zone → "Add Stock"

**Files:**
- NEW: `src/components/warehouse/PlaceStockDialog.tsx`
- [src/db/dal.ts](file:///d:/VisualInventory/VisualInventory/src/db/dal.ts) — `DAL.item_locations.create()` method (check if exists)
- [src/components/warehouse/SpatialViewer3D.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialViewer3D.tsx) — add trigger button

---

## 🌐 Complex/Research Tasks (Gemini/Claude Browser Models)

### Task 10 — Dynamic Scaling Drawing Ground (Analysis)

**Your question:** Can users resize the drawing board to match real shop dimensions? Dynamic parameters for polygon shape/size?

**Cost analysis:**
| Change | DB Cost | Logic Cost | Verdict |
|--------|---------|-----------|---------|
| Store `width_meters` + `height_meters` on `storage_places` | ~0 (2 columns) | Low | ✅ Do it |
| Scale Three.js plane to match real dimensions | 0 | Medium | ✅ Do it |
| Let user input polygon vertices by coordinate (x,y in meters) | 0 | Medium | ✅ Do it |
| Show dimension rulers on canvas | 0 | Medium | 🔄 Phase 2 |
| Drag existing polygon vertex to resize | 0 | High | 🔄 Phase 2 |

**DB change needed:**
```sql
ALTER TABLE storage_places 
  ADD COLUMN width_meters numeric(8,2) DEFAULT 20,
  ADD COLUMN depth_meters numeric(8,2) DEFAULT 20;
```

**This makes the Three.js plane `args={[width_meters, depth_meters]}`** — real 1:1 proportions. User inputs 15m × 8m godown → canvas accurately reflects that. Each grid square = 1 meter.

**Canvas input:** Add input fields above canvas: "Width (m): [  ] Depth (m): [  ]" with live update.

---

## 📋 Task Assignment Matrix

| Task | Complexity | Assignee | Est. Time |
|------|-----------|----------|-----------|
| #1 Backup dialog frequency | Low | Antigravity | ✅ Done |
| #2 Rehydration bug | Medium | Antigravity | 30 min |
| #3 Landmark button position | Low | Antigravity | ✅ Done |
| #4 3D view simplification (single plane + lighter theme) | Medium | Antigravity | 1-2 hrs |
| #5 StockMovementDialog theme | Low | Gemini/Claude browser | 30 min |
| #6 Packaging system DB schema | Medium | Antigravity | 30 min |
| #7 Packaging DAL + types | Medium | Gemini/Claude browser | 1 hr |
| #8 PackageCreatorDialog UI | High | Gemini/Claude browser | 2-3 hrs |
| #9 PlaceStockDialog UI | High | Gemini/Claude browser | 2 hrs |
| #10 Dynamic scaling | Medium | Antigravity (DB) + Claude (UI) | 1 hr DB |

---

## 🧾 Files Reference for Browser Model Tasks

### For StockMovementDialog theme (#5):
- **Read:** [src/components/warehouse/StockMovementDialog.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/StockMovementDialog.tsx) (full)
- **Read:** [src/db/types.ts](file:///d:/VisualInventory/VisualInventory/src/db/types.ts) (ItemLocation, StoragePackage interfaces)
- **Change:** [src/components/warehouse/StockMovementDialog.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/StockMovementDialog.tsx)

### For Packaging DAL + types (#7):
- **Read:** [src/db/dal.ts](file:///d:/VisualInventory/VisualInventory/src/db/dal.ts) lines 1280-1350 (existing item_locations namespace)
- **Read:** [src/db/types.ts](file:///d:/VisualInventory/VisualInventory/src/db/types.ts) (all Storage* interfaces)
- **Change:** [src/db/dal.ts](file:///d:/VisualInventory/VisualInventory/src/db/dal.ts) — add `storage_packages` namespace
- **Change:** [src/db/types.ts](file:///d:/VisualInventory/VisualInventory/src/db/types.ts) — add StoragePackage, PackageItem
- **SQL to run first:** The CREATE TABLE statements in Task 8 above

### For PackageCreatorDialog (#8):
- **Read:** [src/components/warehouse/StockMovementDialog.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/StockMovementDialog.tsx) (for dialog structure pattern)
- **Read:** [src/components/warehouse/SpatialViewer3D.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialViewer3D.tsx) (understand zone panel)
- **Read:** [src/db/dal.ts](file:///d:/VisualInventory/VisualInventory/src/db/dal.ts) (storage_packages methods — after #7 is done)
- **Create:** `src/components/warehouse/PackageCreatorDialog.tsx`
- **Change:** [src/components/warehouse/SpatialViewer3D.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialViewer3D.tsx) — add Package section to zone panel

### For PlaceStockDialog (#9):
- **Read:** [src/db/dal.ts](file:///d:/VisualInventory/VisualInventory/src/db/dal.ts) (item_locations.create method)
- **Read:** [src/db/types.ts](file:///d:/VisualInventory/VisualInventory/src/db/types.ts) (ItemLocation interface)
- **Read:** [src/pages/Warehouse.tsx](file:///d:/VisualInventory/VisualInventory/src/pages/Warehouse.tsx) (understand how items/zones data flows)
- **Create:** `src/components/warehouse/PlaceStockDialog.tsx`  
- **Change:** [src/components/warehouse/SpatialViewer3D.tsx](file:///d:/VisualInventory/VisualInventory/src/components/warehouse/SpatialViewer3D.tsx) — add "Place Stock" button to zone panel
