import { useEffect, useState, useCallback } from 'react';
import { DAL } from '@/db/dal';

interface UseSupabaseDataOptions<T> {
    key: string;
    fetcher: () => Promise<T[]>;
    dependencies?: any[];
    staleTime?: number; // milliseconds
}

const cache = new Map<string, { data: any[]; timestamp: number }>();

export function useSupabaseData<T>({
    key,
    fetcher,
    dependencies = [],
    staleTime = 5 * 60 * 1000, // 5 minutes default
}: UseSupabaseDataOptions<T>) {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        const cached = cache.get(key);
        const now = Date.now();

        if (cached && now - cached.timestamp < staleTime) {
            setData(cached.data);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const result = await fetcher();
            cache.set(key, { data: result, timestamp: now });
            setData(result);
            setError(null);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [key, fetcher, staleTime]);

    useEffect(() => {
        fetchData();
    }, [fetchData, ...dependencies]);

    const refetch = useCallback(() => {
        cache.delete(key);
        fetchData();
    }, [key, fetchData]);

    return { data, isLoading, error, refetch };
}

// Convenience hooks for common tables
export function useItems() {
    return useSupabaseData({
        key: 'items',
        fetcher: () => DAL.items.getAll(),
    });
}

export function useVerticals() {
    return useSupabaseData({
        key: 'verticals',
        fetcher: () => DAL.verticals.getAll(),
    });
}

export function useBrands() {
    return useSupabaseData({
        key: 'brands',
        fetcher: () => DAL.brands.getAll(),
    });
}

export function useProducts() {
    return useSupabaseData({
        key: 'products',
        fetcher: () => DAL.products.getAll(),
    });
}

export function useProspects() {
    return useSupabaseData({
        key: 'prospects',
        fetcher: () => DAL.prospects.getAll(),
    });
}

export function useItemMedia() {
    return useSupabaseData({
        key: 'item_media',
        fetcher: () => DAL.item_media.getAll(),
    });
}

export function useSalesOrders() {
    return useSupabaseData({
        key: 'sales_orders',
        fetcher: () => DAL.sales_orders.getAll(),
    });
}

// Clear all cache
export function clearSupabaseCache() {
    cache.clear();
}

// Clear specific table cache
export function clearTableCache(table: string) {
    cache.delete(table);
}
