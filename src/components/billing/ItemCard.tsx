import { Plus, Package } from 'lucide-react';
import type { Item } from '@/db/types';

interface ItemCardProps {
    item: Item;
    pricingMode: 'retail' | 'wholesale';
    onAddToCart: (item: Item) => void;
    onEdit: (item: Item) => void;
}

const getCategoryIcon = (category: string | undefined | null): string => {
    if (!category) return '📦';
    const iconMap: Record<string, string> = {
        'stationery': '✏️',
        'cutlery': '🍴',
        'fireworks': '🎆',
        'fmcg': '🛒',
        'kitchenware': '🍳',
        'electronics': '🔌',
        'toys': '🧸',
        'sports': '⚽',
        'general': '📦',
        'notebooks': '📓',
        'pens': '🖊️',
        'pencils': '✏️',
        'accessories': '📎',
        'markers': '🖍️',
        'bakery': '🍪',
        'confectionery': '🍬',
        'snacks': '🍿',
        'spoons': '🥄',
        'forks': '🍴',
        'knives': '🔪',
        'sets': '🍽️',
        'cookware': '🍳',
        'storage': '📦',
        'utensils': '🥄',
        'sparklers': '✨',
        'fountains': '⛲',
        'ground': '🎯',
        'aerial': '🚀',
        'crackers': '💥',
        'novelties': '🎁',
        'gift boxes': '🎁',
    };
    return iconMap[category.toLowerCase()] || '📦';
};

const getStockStatus = (stockParcels: number) => {
    if (stockParcels === 0) return { color: 'bg-red-100 text-red-600', label: 'Out' };
    if (stockParcels <= 5) return { color: 'bg-amber-100 text-amber-600', label: 'Low' };
    return { color: 'bg-emerald-100 text-emerald-600', label: 'OK' };
};

export default function ItemCard({ item, pricingMode, onAddToCart, onEdit }: ItemCardProps) {
    const price = pricingMode === 'wholesale' 
        ? item.wholesale_price_container 
        : item.retail_price_container;
    
    const icon = getCategoryIcon(item.category);
    const stockStatus = getStockStatus(item.stock_parcels ?? 0);
    const isOutOfStock = (item.stock_parcels ?? 0) === 0;
    const thumbnail = (item as any).thumbnail_base64;

    return (
        <div 
            className={`
                relative group flex-shrink-0 w-[80px] p-2 rounded-lg border transition-all duration-150 cursor-pointer
                ${isOutOfStock 
                    ? 'border-surface-200 bg-surface-50 opacity-50' 
                    : 'border-surface-200 bg-white hover:border-surface-400 hover:shadow-sm'
                }
            `}
            onClick={() => onAddToCart(item)}
        >
            {/* Icon/Thumbnail */}
            <div className="w-full aspect-square rounded bg-surface-100 flex items-center justify-center text-2xl mb-1 overflow-hidden">
                {thumbnail ? (
                    <img 
                        src={thumbnail} 
                        alt={item.item_name}
                        className="w-full h-full object-cover rounded"
                    />
                ) : (
                    icon
                )}
            </div>

            {/* Stock Badge */}
            <div className={`absolute top-1 right-1 px-1 py-0.5 rounded text-[8px] font-medium ${stockStatus.color}`}>
                {stockStatus.label}
            </div>

            {/* Item Name */}
            <h4 className="text-[10px] font-medium text-surface-900 line-clamp-2 leading-tight h-[24px]">
                {item.item_name}
            </h4>

            {/* Price */}
            <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] font-bold text-surface-900">
                    ₹{price?.toFixed(0) || '0'}
                </span>
                
                { (
                    <button 
                        className="p-0.5 rounded bg-surface-900 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(item);
                        }}
                    >
                        <Plus className="h-2.5 w-2.5" />
                    </button>
                )}
            </div>

            {/* Parcels */}
            <div className="flex items-center gap-0.5 mt-0.5 text-[8px] text-surface-400">
                <Package className="h-2.5 w-2.5" />
                <span>{item.stock_parcels}p</span>
            </div>
        </div>
    );
}
