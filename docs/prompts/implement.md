# Implement Prompt Template
> For giving a specific implementation task to any model.

---

## Prompt:

**Context:** Read `docs/context/PROJECT_INDEX.md` §[SECTION] and `docs/context/CURRENT_STATE.md`.

**Task:** [TASK_ID] — [DESCRIPTION]

**Files to modify:**
- `[FILE1]` — [what to change]
- `[FILE2]` — [what to change]

**Files to reference (read-only):**
- `[FILE3]` — [why]

**Acceptance criteria:**
1. [CRITERION 1]
2. [CRITERION 2]
3. `npx tsc --noEmit` passes with 0 errors

**Output format:** Full file content OR diff blocks. Mark all changes with `// ADDED` or `// CHANGED` comments.

---

## Example Usage:

**Context:** Read `docs/context/PROJECT_INDEX.md` §4 (DB schema) and §5.1 (dal.ts). Read `docs/context/CURRENT_STATE.md` "Code Not Applied" section.

**Task:** T5-DAL — Add `items.search(filters)` method to `src/db/dal.ts`

**Files to modify:**
- `src/db/dal.ts` — add search method inside `items: { ... }` block

**Files to reference:**
- `src/db/types.ts` — use `ItemSearchFilters` and `ItemSearchResult` interfaces (already exist)

**Acceptance criteria:**
1. `DAL.items.search({ query: 'notebook', brand_id: 5, limit: 20 })` works
2. Uses Postgres FTS (`tsvector_search`) when `query` param is provided
3. Filters by brand_id, vertical_id, category when provided
4. Returns `ItemSearchResult[]` (lightweight, not full Item)
5. Scoped to current firm via `getFirmId()`
