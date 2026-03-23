import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import { Search, Plus, Trash2, FileOutput, Loader2, Layers, ChevronUp, ChevronDown, CheckSquare, X, Download } from 'lucide-react';
import { generateFlipbookHtml, CatalogueItem, BusinessProfile, CatalogueConfig } from '@/utils/catalogueGenerator';
import { downloadBlob, shareFile } from '@/utils/share';
import type { Item, Vertical, Brand, Product, ItemMedia } from '@/db/types';

export default function Catalogue() {
    const addToast = useAppStore((s) => s.addToast);
    const activeBusiness = useAppStore((s) => s.activeBusiness);
    const [isGenerating, setIsGenerating] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        vertical_id: 0,
        brand_id: 0,
        product_id: 0,
        subcategory_id: 0,
    });

    const items = useSupabaseQuery(['items'], () => DAL.items.getAll(), []) as Item[];
    const verticals = useSupabaseQuery(['verticals'], () => DAL.verticals.getAll(), []) as Vertical[];
    const brands = useSupabaseQuery(['brands'], () => DAL.brands.getAll(), []) as Brand[];
    const products = useSupabaseQuery(['products'], () => DAL.products.getAll(), []) as Product[];
    const allMedia = useSupabaseQuery(['item_media'], () => DAL.item_media.getAll(), []) as ItemMedia[];

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (searchQuery && !item.item_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (filters.vertical_id && item.vertical_id !== filters.vertical_id) return false;
            if (filters.brand_id && item.brand_id !== filters.brand_id) return false;
            if (filters.product_id && item.product_id !== filters.product_id) return false;
            if (filters.subcategory_id && item.subcategory_id !== filters.subcategory_id) return false;
            return true;
        });
    }, [items, searchQuery, filters]);

    const [draftItems, setDraftItems] = useState<Item[]>([]);

    // Catalogue configuration
    const [catalogueConfig, setCatalogueConfig] = useState<CatalogueConfig>({
        title: activeBusiness || 'Product Catalogue',
        showPrices: true,
        priceType: 'retail'
    });

    const addToDraft = (item: Item) => {
        if (draftItems.find(i => i.id === item.id)) return;
        setDraftItems([...draftItems, item]);
    };

    const removeFromDraft = (id: number) => {
        setDraftItems(draftItems.filter(i => i.id !== id));
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === draftItems.length - 1) return;

        const newItems = [...draftItems];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
        setDraftItems(newItems);
    };

    const handleGenerate = async (mode: 'download' | 'share' = 'download') => {
        if (draftItems.length === 0) {
            addToast('Add items to the catalogue first', 'error');
            return;
        }
        setIsGenerating(true);
        try {
            const profile: BusinessProfile = {
                business_name: activeBusiness || 'My Business',
            };

            const catalogueItems: CatalogueItem[] = draftItems.map((item) => {
                const vert = verticals.find(v => v.id === item.vertical_id);
                const brand = brands.find(b => b.id === item.brand_id);
                const product = products.find(p => p.id === item.product_id);
                
                // Get media for this item from item_media table
                const itemMedia = allMedia.filter(m => m.item_id === item.id);

                return {
                    id: item.id!,
                    item_name: item.item_name,
                    category: item.category,
                    product_name: product?.name,
                    brand_name: brand?.name,
                    vertical_name: vert?.name,
                    retail_price: item.retail_price_container || item.retail_price_unit,
                    media: itemMedia,
                };
            });

            const html = await generateFlipbookHtml(catalogueItems, profile, catalogueConfig);

            const blob = new Blob([html], { type: 'text/html' });
            const filename = `${catalogueConfig.title?.replace(/\s+/g, '-') || 'Catalogue'}-${new Date().toISOString().split('T')[0]}.html`;

            if (mode === 'share') {
                const file = new File([blob], filename, { type: 'text/html' });
                await shareFile(file, `Check out our new catalogue!`);
                addToast('Catalogue shared!', 'success');
            } else {
                downloadBlob(blob, filename);
                addToast('Catalogue downloaded!', 'success');
            }
        } catch (e) {
            console.error(e);
            addToast('Generation failed', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const addAllFiltered = () => {
        const newItems = filteredItems.filter(i => !draftItems.find(d => d.id === i.id));
        setDraftItems([...draftItems, ...newItems]);
        addToast(`Added ${newItems.length} items`, 'success');
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden animate-fade-in">
            <div className="flex-1 flex flex-col glass rounded-xl overflow-hidden min-h-[400px]">
                <div className="p-4 border-b border-surface-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg flex items-center gap-2 text-surface-400">
                            <Search className="h-5 w-5 text-brand-600" />
                            Item Selector
                        </h2>
                        <span className="text-xs text-surface-500">{filteredItems.length} found</span>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                        <input
                            className="input-field pl-9"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <select className="input-field text-xs" value={filters.vertical_id} onChange={e => setFilters({ ...filters, vertical_id: Number(e.target.value) })}>
                            <option value={0}>All Verticals</option>
                            {verticals.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <select className="input-field text-xs" value={filters.brand_id} onChange={e => setFilters({ ...filters, brand_id: Number(e.target.value) })}>
                            <option value={0}>All Brands</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <select className="input-field text-xs" value={filters.product_id} onChange={e => setFilters({ ...filters, product_id: Number(e.target.value) })}>
                            <option value={0}>All Products</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button
                            onClick={addAllFiltered}
                            className="btn-secondary text-xs flex items-center justify-center gap-1"
                            title="Add all filtered items"
                        >
                            <CheckSquare className="h-3 w-3" /> Add All ({filteredItems.length})
                        </button>
                        <button
                            onClick={() => setFilters({ vertical_id: 0, brand_id: 0, product_id: 0, subcategory_id: 0 })}
                            className="btn-ghost text-xs flex items-center justify-center gap-1 text-surface-500"
                        >
                            <X className="h-3 w-3" /> Clear Filters
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredItems.map(item => {
                        // Get primary catalogue image or fallback to thumbnail
                        const itemMedia = allMedia.filter(m => m.item_id === item.id);
                        const primaryMedia = itemMedia.find(m => m.media_role === 'primary');
                        const displayImage = primaryMedia?.data_base64 || item.thumbnail_base64;
                        
                        return (
                            <div key={item.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 border border-transparent hover:border-surface-200 transition-all">
                                <div className="flex items-center gap-3">
                                    {displayImage && (
                                        <img src={displayImage} alt="" className="w-10 h-10 object-cover rounded" />
                                    )}
                                    <div>
                                        <h3 className="font-medium text-sm text-surface-900">{item.item_name}</h3>
                                        <div className="text-xs text-surface-500 flex gap-2">
                                            <span>{item.category}</span>
                                            {item.brand_id && <span>• {brands.find(b => b.id === item.brand_id)?.name}</span>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => addToDraft(item)} className="btn-ghost p-1.5 text-brand-600 hover:bg-brand-50">
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        );
                    })}
                    {filteredItems.length === 0 && (
                        <div className="text-center p-8 text-surface-400 text-sm">No items found matching filters</div>
                    )}
                </div>
            </div>

            <div className="w-full lg:w-96 flex flex-col glass rounded-xl overflow-hidden h-[400px] lg:h-auto">
                <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-surface-50/50">
                    <h2 className="font-semibold text-lg flex items-center gap-2 text-surface-400">
                        <Layers className="h-5 w-5 text-brand-600" />
                        Draft
                    </h2>
                    <span className="badge-info">{draftItems.length} items</span>
                </div>

                {draftItems.length > 0 && (
                    <div className="p-4 border-b border-surface-200 bg-amber-50/50 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-surface-600 mb-1 block">Catalogue Title</label>
                            <input
                                type="text"
                                className="input-field text-sm"
                                value={catalogueConfig.title}
                                onChange={(e) => setCatalogueConfig({ ...catalogueConfig, title: e.target.value })}
                                placeholder="Enter catalogue title..."
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="showPrices"
                                className="h-4 w-4 rounded border-surface-300 text-brand-600"
                                checked={catalogueConfig.showPrices}
                                onChange={(e) => setCatalogueConfig({ ...catalogueConfig, showPrices: e.target.checked })}
                            />
                            <label htmlFor="showPrices" className="text-sm text-surface-600">Show prices</label>
                        </div>
                        
                        {catalogueConfig.showPrices && (
                            <div>
                                <label className="text-xs font-medium text-surface-600 mb-1 block">Price Type</label>
                                <select
                                    className="input-field text-sm"
                                    value={catalogueConfig.priceType}
                                    onChange={(e) => setCatalogueConfig({ ...catalogueConfig, priceType: e.target.value as 'retail' | 'wholesale' | 'both' })}
                                >
                                    <option value="retail">Retail (MRP)</option>
                                    <option value="wholesale">Wholesale</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {draftItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-surface-400 p-8 text-center">
                            <FileOutput className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-sm">Add items from the left to build your catalogue</p>
                        </div>
                    ) : (
                        draftItems.map((item, idx) => {
                            // Get primary catalogue image or fallback to thumbnail
                            const itemMedia = allMedia.filter(m => m.item_id === item.id);
                            const primaryMedia = itemMedia.find(m => m.media_role === 'primary');
                            const displayImage = primaryMedia?.data_base64 || item.thumbnail_base64;
                            
                            return (
                                <div key={`${item.id}-${idx}`} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-surface-200 shadow-sm">
                                    {displayImage && (
                                        <img src={displayImage} alt="" className="w-8 h-8 object-cover rounded" />
                                    )}
                                    <span className="text-xs font-mono text-surface-400 w-5 text-center">{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-surface-400">{item.item_name}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="flex flex-col">
                                            <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-0.5 hover:bg-surface-100 rounded text-surface-500 disabled:opacity-30">
                                                <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <button onClick={() => moveItem(idx, 'down')} disabled={idx === draftItems.length - 1} className="p-0.5 hover:bg-surface-100 rounded text-surface-500 disabled:opacity-30">
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <button onClick={() => removeFromDraft(item.id)} className="p-1.5 hover:bg-red-50 text-surface-400 hover:text-red-500 rounded transition-colors">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-surface-200 bg-surface-50">
                    <button
                        onClick={() => handleGenerate('download')}
                        disabled={isGenerating || draftItems.length === 0}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Download Catalogue
                    </button>
                    <button
                        onClick={() => handleGenerate('share')}
                        disabled={isGenerating || draftItems.length === 0}
                        className="btn-secondary w-full flex items-center justify-center gap-2 py-2 mt-2"
                    >
                        <FileOutput className="h-4 w-4" />
                        Share
                    </button>
                </div>
            </div>
        </div>
    );
}
