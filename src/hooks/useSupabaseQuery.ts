import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { dbEvents } from '@/db/dal';

export const useSupabaseQuery = <T>(
    queryKey: string[],
    queryFn: () => Promise<T>,
    defaultValue: T
): T => {
    const queryClient = useQueryClient();
    const watchTables = queryKey;

    const { data = defaultValue } = useQuery({
        queryKey,
        queryFn,
    });

    useEffect(() => {
        const handler = (table: string) => {
            if (watchTables.includes(table)) {
                queryClient.invalidateQueries({ queryKey: [table] });
            }
        };

        dbEvents.on('change', handler);
        return () => dbEvents.off('change', handler);
    }, [queryClient, watchTables]);

    return data;
};

export { useQueryClient };
