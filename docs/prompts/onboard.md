# Onboard Prompt Template
> Copy-paste this to any AI model to give it full project context.
> Replace `[TASK]` with the specific task from SPRINT.md.

---

## Prompt:

You are working on VisualInventory — a React+TS+Vite inventory management app with Supabase PostgreSQL backend.

**Read these files first (in order):**
1. `docs/context/PROJECT_INDEX.md` — Full project reference (architecture, DB schema, file index)
2. `docs/context/CURRENT_STATE.md` — What works, what's broken, what's missing
3. `docs/tasks/SPRINT.md` — Current sprint and active task

**Your task:** [TASK DESCRIPTION HERE]

**Rules:**
- All DB calls go through `src/db/dal.ts` — never call Supabase directly from components
- After every DAL mutation, call `emitDbChange('tablename')` for reactive UI updates  
- All firm-scoped inserts must use `withFirmId(table, values)` to inject firm_id
- All firm-scoped reads must filter by `getFirmId()` (RLS is disabled)
- NEVER break the stock formula: `stock_units = p_unit × p_unit_per_parcel × stock_parcels`
- Types live in `src/db/types.ts` — check existing interfaces before creating new ones
- Use `any` casts sparingly, prefer typed interfaces

**File to modify:** [FILE PATH]
**Reference files to read:** [LIST RELEVANT FILES]

Output only the changed code. No explanations unless asked. Mark what was added/changed with comments.
