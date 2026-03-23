/**
 * ItemsGridView - Grid display of items with thumbnails
 * Shows items filtered by selected vertical
 */

import { useState, useMemo } from 'react';
import { Plus, Package, Search } from 'lucide-react';
import type { Item, Vertical } from '@/db/types';
import ItemCard from './ItemCard';

interface ItemsGridViewProps {
  items: Item[];
  verticals: Vertical[];
  selectedVerticalId: number | null;
  pricingMode: 'retail' | 'wholesale';
  onAddToCart: (item: Item) => void;
  onAddItem?: (verticalId?: number) => void;
}

export default function ItemsGridView({
  items,
  verticals,
  selectedVerticalId,
  pricingMode,
  onAddToCart,
  onAddItem,
}: ItemsGridViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVerticals, setExpandedVerticals] = useState<Set<number>>(new Set());

  // Filter items by selected vertical
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Filter by vertical if one is selected
    if (selectedVerticalId !== null) {
      result = result.filter(item => item.vertical_id === selectedVerticalId);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.item_name.toLowerCase().includes(query) ||
        (item.keyword_id && item.keyword_id.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [items, selectedVerticalId, searchQuery]);

  // Group items by vertical (when showing all)
  const itemsByVertical = useMemo(() => {
    if (selectedVerticalId !== null) {
      return null; // Don't group when a specific vertical is selected
    }

    const groups = new Map<number | string, { vertical: Vertical | null; items: Item[] }>();
    
    // Initialize groups for all verticals
    const sortedVerticals = [...verticals].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    sortedVerticals.forEach(v => {
      groups.set(v.id, { vertical: v, items: [] });
    });
    
    // Add "General" category for items without vertical
    groups.set('general', { vertical: null, items: [] });
    
    // Distribute items
    filteredItems.forEach(item => {
      const vid = item.vertical_id ?? 'general';
      const group = groups.get(vid);
      if (group) {
        group.items.push(item);
      }
    });
    
    // Filter out empty groups
    for (const [key, group] of groups) {
      if (group.items.length === 0) {
        groups.delete(key);
      }
    }
    
    return groups;
  }, [filteredItems, verticals, selectedVerticalId]);

  // Toggle vertical expansion
  const toggleVertical = (verticalId: number) => {
    setExpandedVerticals(prev => {
      const next = new Set(prev);
      if (next.has(verticalId)) {
        next.delete(verticalId);
      } else {
        next.add(verticalId);
      }
      return next;
    });
  };

  // Get vertical name
  const getVerticalName = (verticalId: number | null): string => {
    if (!verticalId) return 'All Items';
    const vertical = verticals.find(v => v.id === verticalId);
    return vertical?.name || `Vertical ${verticalId}`;
  };

  // Get default icon for vertical
  const getVerticalIcon = (vertical: Vertical | null): string => {
    if (!vertical) return '📦';
    if ((vertical as any).icon_base64) return '';
    const name = vertical.name.toLowerCase();
    if (name.includes('firework')) return '🎆';
    if (name.includes('stationer')) return '✏️';
    if (name.includes('cutler')) return '🍴';
    if (name.includes('fmcg')) return '🛒';
    if (name.includes('kitchen')) return '🍳';
    if (name.includes('electronic')) return '🔌';
    if (name.includes('toy')) return '🧸';
    if (name.includes('sport')) return '⚽';
    return '📦';
  };

  const selectedVerticalName = getVerticalName(selectedVerticalId);

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-white pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${selectedVerticalName.toLowerCase()}...`}
            className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600"
            >
              <Plus className="h-3 w-3 rotate-45" />
            </button>
          )}
        </div>
      </div>

      {/* Items Count */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-900">
          {selectedVerticalName}
          <span className="ml-2 text-xs text-surface-500 font-normal">
            ({filteredItems.length} items)
          </span>
        </h3>
        
        {onAddItem && (
          <button
            onClick={() => onAddItem(selectedVerticalId || undefined)}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {/* Items Display */}
      <div className="flex-1 overflow-y-auto">
        {itemsByVertical ? (
          // Grouped by vertical
          <div className="space-y-4">
            {Array.from(itemsByVertical.entries()).map(([vid, group]) => {
              const isExpanded = expandedVerticals.has(vid as number) || vid === 'general';
              
              return (
                <div key={vid} className="border border-surface-200 rounded-lg overflow-hidden">
                  {/* Vertical Header */}
                  <button
                    onClick={() => vid !== 'general' && toggleVertical(vid as number)}
                    className={`w-full flex items-center gap-2 px-3 py-2 bg-surface-50 ${
                      vid !== 'general' ? 'hover:bg-surface-100' : ''
                    }`}
                  >
                    {group.vertical && (
                      <>
                        {(group.vertical as any).icon_base64 ? (
                          <img
                            src={(group.vertical as any).icon_base64}
                            alt={group.vertical.name}
                            className="w-5 h-5 rounded object-cover"
                          />
                        ) : (
                          <span className="text-lg">{getVerticalIcon(group.vertical)}</span>
                        )}
                      </>
                    )}
                    <span className="text-sm font-medium text-surface-900 flex-1 text-left">
                      {group.vertical?.name || 'General'}
                    </span>
                    <span className="text-xs border-slate-700 px-2 py-0.5 rounded-full">
                      {group.items.length}
                    </span>
                  </button>

                  {/* Items Grid */}
                  {isExpanded && (
                    <div className="p-2 bg-white">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-1.5">
                        {group.items.map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            pricingMode={pricingMode}
                            onAddToCart={onAddToCart}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Single vertical grid
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-1.5">
            {filteredItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                pricingMode={pricingMode}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-surface-500">
            <Package className="h-12 w-12 mb-2" />
            <p className="text-sm">No items found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-indigo-600 hover:text-indigo-500"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}