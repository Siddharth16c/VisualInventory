/**
 * VerticalSidebar - Left sidebar showing verticals with icons
 * Clicking a vertical filters the items grid
 */

import { useState, useMemo } from 'react';
import { Plus, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Vertical, Item } from '@/db/types';

interface VerticalSidebarProps {
  verticals: Vertical[];
  items: Item[];
  selectedVerticalId: number | null;
  onSelectVertical: (verticalId: number | null) => void;
  onAddItem?: (verticalId?: number) => void;
  pricingMode: 'retail' | 'wholesale';
}

const DEFAULT_ICONS: Record<string, string> = {
  'fireworks': '🎆',
  'stationery': '✏️',
  'cutlery': '🍴',
  'fmcg': '🛒',
  'kitchenware': '🍳',
  'electronics': '🔌',
  'toys': '🧸',
  'sports': '⚽',
  'general': '📦',
  'bakery': '🍪',
  'confectionery': '🍬',
  'snacks': '🍿',
};

function getVerticalIcon(vertical: Vertical): string {
  if ((vertical as any).icon_base64) {
    return ''; // Will use image
  }
  const name = vertical.name.toLowerCase();
  for (const [key, icon] of Object.entries(DEFAULT_ICONS)) {
    if (name.includes(key)) return icon;
  }
  return '📦';
}

export default function VerticalSidebar({
  verticals,
  items,
  selectedVerticalId,
  onSelectVertical,
  onAddItem,
  pricingMode,
}: VerticalSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Count items per vertical
  const itemCountByVertical = useMemo(() => {
    const counts = new Map<number | string, number>();
    
    // Initialize counts for all verticals
    verticals.forEach(v => counts.set(v.id, 0));
    counts.set('all', items.length);
    
    // Count items
    items.forEach(item => {
      const vid = item.vertical_id ?? 'general';
      counts.set(vid, (counts.get(vid) || 0) + 1);
      if (item.vertical_id) {
        counts.set(item.vertical_id, (counts.get(item.vertical_id) || 0) + 1);
      }
    });
    
    return counts;
  }, [verticals, items]);

  // Sort verticals by sort_order
  const sortedVerticals = useMemo(() => {
    return [...verticals].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [verticals]);

  if (isCollapsed) {
    return (
      <div className="w-14 flex-shrink-0 bg-slate-900 flex flex-col items-center py-2 border-r border-slate-700">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          title="Expand sidebar"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-1 mt-2">
          <button
            onClick={() => onSelectVertical(null)}
            className={`p-2 rounded-lg transition-colors ${
              selectedVerticalId === null
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="All Items"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          
          {sortedVerticals.map(v => (
            <button
              key={v.id}
              onClick={() => onSelectVertical(v.id)}
              className={`p-2 rounded-lg transition-colors ${
                selectedVerticalId === v.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title={v.name}
            >
              <span className="text-lg">{getVerticalIcon(v)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-48 flex-shrink-0 bg-slate-900 flex flex-col border-r border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-slate-700">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Categories
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Verticals List */}
      <div className="flex-1 overflow-y-auto">
        {/* All Items Button */}
        <button
          onClick={() => onSelectVertical(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
            selectedVerticalId === null
              ? 'bg-indigo-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <LayoutGrid className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium flex-1">All Items</span>
          <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">
            {itemCountByVertical.get('all') || 0}
          </span>
        </button>

        <div className="h-px bg-slate-700 my-1" />

        {/* Verticals */}
        {sortedVerticals.map(vertical => {
          const icon = getVerticalIcon(vertical);
          const hasImage = (vertical as any).icon_base64;
          const count = itemCountByVertical.get(vertical.id) || 0;
          const isSelected = selectedVerticalId === vertical.id;

          return (
            <button
              key={vertical.id}
              onClick={() => onSelectVertical(vertical.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {/* Icon or Image */}
              {hasImage ? (
                <img
                  src={(vertical as any).icon_base64}
                  alt={vertical.name}
                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                />
              ) : (
                <span className="text-base flex-shrink-0 w-6 text-center">{icon}</span>
              )}
              
              {/* Name */}
              <span className="text-sm flex-1 truncate">{vertical.name}</span>
              
              {/* Count */}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-indigo-500' : 'bg-slate-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Add Item Button */}
      {onAddItem && (
        <div className="p-2 border-t border-slate-700">
          <button
            onClick={() => onAddItem(selectedVerticalId || undefined)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      )}
    </div>
  );
}