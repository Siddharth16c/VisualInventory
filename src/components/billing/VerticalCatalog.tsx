/**
 * * BillingCatalog - Horizontal scrollable rows organized by vertical
 * - Collapsible verticals with expandable rows
* - Shows items grouped under vertical header
* - Items displayed in grid format per product
* - Mobile: grid on mobile, horizontal scroll on desktop
*/

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import type { Item, Vertical } from '@/db/types';
import ItemCard from './ItemCard';
import { useAppStore } from '@/store/store';

interface VerticalCatalogProps {
    items: Item[];
    verticals: Vertical[];
    pricingMode: 'retail' | 'wholesale';
    onAddToCart: (item: Item) => void;
}

export default function VerticalCatalog({
    items,
    verticals,
    pricingMode,
    onAddToCart
}: VerticalCatalogProps) {
    const expandedVerticals = useAppStore((s) => s.expandedVerticals);
    const toggleVerticalExpanded = useAppStore((s) => s.toggleVerticalExpanded);
    const expandAllVerticals = useAppStore((s) => s.expandAllVerticals);
    const collapseAllVerticals = useAppStore((s) => s.collapseAllVerticals);

    // Group items by vertical
    const itemsByVertical = useMemo(() => {
        const grouped = new Map<number | string, Item[]>();

        // Initialize with all verticals (sorted by sort_order)
        const sortedVerticals = [...verticals].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        sortedVerticals.forEach(v => {
            grouped.set(v.id, []);
        });

        // Add "General" category for items without vertical
        grouped.set('general', []);

        // Distribute items
        items.forEach(item => {
            const verticalId = item.vertical_id ?? 'general';
            const existing = grouped.get(verticalId) || [];
            existing.push(item);
            grouped.set(verticalId, existing);
        });

        return grouped;
    }, [items, verticals]);

    // Get vertical name by ID
    const getVerticalName = (id: number | string): string => {
        if (id === 'general') return 'General';
        const vertical = verticals.find(v => v.id === id);
        return vertical?.name || `Vertical ${id}`;
    };

    // Scroll handlers for horizontal rows
    const scrollRow = (elementId: string, direction: 'left' | 'right') => {
        const container = document.getElementById(elementId);
        if (container) {
            const scrollAmount = 300;
            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs sm:text-sm font-semibold text-surface-900">
                    Catalog ({items.length} items)
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={expandAllVerticals}
                        className="text-[10px] sm:text-xs text-surface-500 hover:text-surface-900 transition-colors"
                    >
                        Expand All
                    </button>
                    <span className="text-surface-300">|</span>
                    <button
                        onClick={collapseAllVerticals}
                        className="text-[10px] sm:text-xs text-surface-500 hover:text-surface-900 transition-colors"
                    >
                        Collapse All
                    </button>
                </div>
            </div>

            {/* Vertical Rows */}
            <div className="space-y-3">
                {Array.from(itemsByVertical.entries())
                    .filter(([_, items]) => items.length > 0)
                    .map(([verticalId, verticalItems]) => {
                        const isExpanded = expandedVerticals.has(verticalId);
                        const verticalName = getVerticalName(verticalId);
                        const scrollId = `vertical-scroll-${verticalId}`;

                        return (
                            <div
                                key={String(verticalId)}
                                className="bg-white rounded-xl border border-surface-200 overflow-hidden"
                            >
                                {/* Vertical Header */}
                                <button
                                    onClick={() => toggleVerticalExpanded(verticalId)}
                                    className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-surface-50 hover:bg-surface-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-surface-500" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-surface-500" />
                                        )}
                                        <span className="font-medium text-xs sm:text-sm text-surface-900">
                                            {verticalName}
                                        </span>
                                        <span className="text-[10px] sm:text-xs text-surface-400 bg-surface-200 px-1.5 sm:px-2 py-0.5 rounded-full">
                                            {verticalItems.length}
                                        </span>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="p-2 sm:p-3">
                                        {/* Grid on mobile, horizontal scroll on desktop */}
                                        <div
                                            id={scrollId}
                                            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:hidden gap-1.5 sm:gap-2"
                                        >
                                            {verticalItems.map((item) => (
                                                <ItemCard
                                                    key={item.id}
                                                    item={item}
                                                    pricingMode={pricingMode}
                                                    onAddToCart={onAddToCart}
                                                />
                                            ))}
                                        </div>

                                        {/* Desktop: horizontal scroll with navigation */}
                                        <div className="hidden lg:block relative">
                                            <button
                                                onClick={() => scrollRow(scrollId, 'left')}
                                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white shadow-lg border border-surface-200 hover:bg-surface-50 opacity-0 hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronLeft className="h-4 w-4 text-surface-600" />
                                            </button>

                                            <div
                                                id={scrollId}
                                                className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
                                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                            >
                                                {verticalItems.map((item) => (
                                                    <ItemCard
                                                        key={item.id}
                                                        item={item}
                                                        pricingMode={pricingMode}
                                                        onAddToCart={onAddToCart}
                                                    />
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => scrollRow(scrollId, 'right')}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white shadow-lg border border-surface-200 hover:bg-surface-50 opacity-0 hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronRightIcon className="h-4 w-4 text-surface-600" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>

            {/* Empty State */}
            {items.length === 0 && (
                <div className="text-center py-12 text-surface-400">
                    <p className="text-sm">No items found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filters</p>
                </div>
            )}
        </div>
    );
}