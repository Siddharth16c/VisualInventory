import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { emitDbChange, dbEvents } from '@/db/dal';

/**
 * useSupabaseLiveQuery — reactive Supabase query hook.
 *
 * Runs `queryFn()` on mount, then re-runs whenever one of
 * `watchTables` tables is mutated via emitDbChange() from the DAL.
 *
 * Usage:
 *   const items = useSupabaseLiveQuery(() => DAL.items.getAll(), [], ['items']);
 */
export function useSupabaseLiveQuery<T>(
    queryFn: () => Promise<T>,
    defaultValue: T,
    watchTables: string[]
): T {
    const [data, setData] = useState<T>(defaultValue);

    const runQuery = useCallback(async () => {
        try {
            const result = await queryFn();
            setData(result);
        } catch (e) {
            console.error('[useLiveQuery] Query failed:', e);
        }
    }, [queryFn]);

    useEffect(() => {
        runQuery();
    }, [runQuery]);

    useEffect(() => {
        const handler = (table: string) => {
            if (watchTables.includes(table)) {
                runQuery();
            }
        };
        dbEvents.on('change', handler);
        return () => dbEvents.off('change', handler);
    }, [watchTables, runQuery]);

    return data;
}

// Backwards-compatible alias
export { useSupabaseLiveQuery as useLiveQuery };
