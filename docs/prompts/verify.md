# Verify Prompt Template
> Use this after any chat-based AI session to verify changes were applied correctly.

---

## Prompt:

I had a coding session with [MODEL] on [DATE]. The changelog is in `docs/changelog/[FILE]`.

**For each claimed change, verify:**
1. Does the function/method/type actually exist in the file?
2. Is the logic correct (not just a stub)?
3. Are all imports present?
4. Does `npx tsc --noEmit` pass?

**Search for these specific strings in the codebase:**
- `[LIST KEY FUNCTION NAMES]`
- `[LIST KEY TYPE NAMES]`

**Report format:**
| Claimed Change | File | Present? | Notes |
|---|---|---|---|
| ... | ... | ✅/❌ | ... |

---

## Example:

I had a coding session with Claude Sonnet 4.6 on 2026-03-05. The changelog is in `docs/changelog/5MarSonnet4-6-chat.md`.

**Search for:**
- `items.search` in `src/db/dal.ts`
- `stock_movements` in `src/db/dal.ts`
- `StockMovement` in `src/db/types.ts`
- `logAndUpdateStock` in `src/pages/Billing.tsx`
- `keyword_id` in `src/db/dal.ts`
