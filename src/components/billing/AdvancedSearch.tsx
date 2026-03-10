/**
 * AdvancedSearch - Search bar with filter chips for vertical, brand, subcategory
 * Uses debounced search with Typesense fallback
 */

import { useState, useCallback, useEffect } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/store/store';
import type { Vertical, Brand, Subcategory } from '@/db/types';

interface AdvancedSearchProps {
    verticals: Vertical[];
    brands: Brand[];
    subcategories: Subcategory[];
    onSearch: (query: string) => void;
    isSearching?: boolean;
    resultsCount?: number;
}

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export default function AdvancedSearch({
    verticals,
    brands,
    subcategories,
    onSearch,
    isSearching = false,
    resultsCount = 0,
}: AdvancedSearchProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [localQuery, setLocalQuery] = useState('');
    
    const searchQuery = useAppStore((s) => s.searchQuery);
    const searchFilters = useAppStore((s) => s.searchFilters);
    const setSearchQuery = useAppStore((s) => s.setSearchQuery);
    const setSearchFilter = useAppStore((s) => s.setSearchFilter);
    const clearSearchFilters = useAppStore((s) => s.clearSearchFilters);

    // Debounce the search query
    const debouncedQuery = useDebounce(localQuery, 300);

    // Trigger search when debounced query changes
    useEffect(() => {
        if (debouncedQuery !== searchQuery) {
            setSearchQuery(debouncedQuery);
            onSearch(debouncedQuery);
        }
    }, [debouncedQuery, searchQuery, setSearchQuery, onSearch]);

    // Get filter names for display
    const getFilterName = (type: 'vertical' | 'brand' | 'subcategory', id?: number): string => {
        if (!id) return '';
        switch (type) {
            case 'vertical':
                return verticals.find(v => v.id === id)?.name || '';
            case 'brand':
                return brands.find(b => b.id === id)?.name || '';
            case 'subcategory':
                return subcategories.find(s => s.id === id)?.name || '';
        }
    };

    // Active filter chips
    const activeFilters = [
        ...(searchFilters.vertical_id ? [{ type: 'vertical' as const, id: searchFilters.vertical_id, name: getFilterName('vertical', searchFilters.vertical_id) }] : []),
        ...(searchFilters.brand_id ? [{ type: 'brand' as const, id: searchFilters.brand_id, name: getFilterName('brand', searchFilters.brand_id) }] : []),
        ...(searchFilters.subcategory_id ? [{ type: 'subcategory' as const, id: searchFilters.subcategory_id, name: getFilterName('subcategory', searchFilters.subcategory_id) }] : []),
    ];

    const handleClearSearch = () => {
        setLocalQuery('');
        setSearchQuery('');
        clearSearchFilters();
        onSearch('');
    };

    const hasActiveSearch = localQuery || activeFilters.length > 0;

    return (
        <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                    type="text"
                    className="w-full input-field pl-10 pr-24"
                    placeholder="Search by item name or SKU..."
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                />
                
                {/* Right side actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSearching && (
                        <div className="h-4 w-4 border-2 border-surface-300 border-t-surface-900 rounded-full animate-spin" />
                    )}
                    
                    {hasActiveSearch && (
                        <button
                            onClick={handleClearSearch}
                            className="p-1 hover:bg-surface-100 rounded"
                        >
                            <X className="h-4 w-4 text-surface-400" />
                        </button>
                    )}
                    
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            showFilters || activeFilters.length > 0
                                ? 'bg-surface-900 text-white'
                                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                        }`}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        Filters
                        {activeFilters.length > 0 && (
                            <span className="ml-1 bg-white text-surface-900 rounded-full px-1.5 text-[10px]">
                                {activeFilters.length}
                            </span>
                        )}
                        {showFilters ? (
                            <ChevronUp className="h-3 w-3" />
                        ) : (
                            <ChevronDown className="h-3 w-3" />
                        )}
                    </button>
                </div>
            </div>

            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-surface-400">Active:</span>
                    {activeFilters.map((filter) => (
                        <span
                            key={`${filter.type}-${filter.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-surface-100 rounded-full text-xs text-surface-700"
                        >
                            <span className="text-surface-400 capitalize">{filter.type}:</span>
                            {filter.name}
                            <button
                                onClick={() => setSearchFilter(`${filter.type}_id` as any, undefined)}
                                className="ml-1 p-0.5 hover:bg-surface-200 rounded"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    <button
                        onClick={clearSearchFilters}
                        className="text-xs text-surface-400 hover:text-surface-600 underline"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Results count */}
            {hasActiveSearch && (
                <p className="text-xs text-surface-400">
                    {isSearching ? 'Searching...' : `${resultsCount} result${resultsCount !== 1 ? 's' : ''}`}
                </p>
            )}

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-surface-50 rounded-xl p-4 space-y-4 border border-surface-200">
                    {/* Vertical Filter */}
                    <div>
                        <label className="text-xs font-medium text-surface-500 mb-2 block">
                            Vertical
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSearchFilter('vertical_id', undefined)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    !searchFilters.vertical_id
                                        ? 'bg-surface-900 text-white'
                                        : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-100'
                                }`}
                            >
                                All
                            </button>
                            {verticals.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setSearchFilter('vertical_id', v.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        searchFilters.vertical_id === v.id
                                            ? 'bg-surface-900 text-white'
                                            : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-100'
                                    }`}
                                >
                                    {v.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Brand Filter */}
                    {brands.length > 0 && (
                        <div>
                            <label className="text-xs font-medium text-surface-500 mb-2 block">
                                Brand
                            </label>
                            <select
                                value={searchFilters.brand_id || ''}
                                onChange={(e) => setSearchFilter('brand_id', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full input-field text-sm"
                            >
                                <option value="">All Brands</option>
                                {brands.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Subcategory Filter */}
                    {subcategories.length > 0 && (
                        <div>
                            <label className="text-xs font-medium text-surface-500 mb-2 block">
                                Subcategory
                            </label>
                            <select
                                value={searchFilters.subcategory_id || ''}
                                onChange={(e) => setSearchFilter('subcategory_id', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full input-field text-sm"
                            >
                                <option value="">All Subcategories</option>
                                {subcategories.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
