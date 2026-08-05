import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import { jsPDF } from 'jspdf';
import { Search, Download, Share2, Megaphone, ChevronDown, ChevronRight, Image, Calendar, Loader2 } from 'lucide-react';
import { generateFlipbookHtml, CatalogueItem, BusinessProfile } from '@/utils/catalogueGenerator';
import { shareFile, shareText, downloadBlob } from '@/utils/share';

type Mode = 'prices' | 'catalogue';

export default function Marketing() {
    const addToast = useAppStore((s) => s.addToast);
    const activeBusiness = useAppStore((s) => s.activeBusiness);
    const [mode, setMode] = useState<Mode>('prices');
    const [searchQuery, setSearchQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [catalogueDate, setCatalogueDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // NEW STATES
    const [customTitle, setCustomTitle] = useState('');
    const [customNote, setCustomNote] = useState('');
    const [priceMode, setPriceMode] = useState<'lean' | 'bulk'>('lean');
    const [deselectedItems, setDeselectedItems] = useState<Set<number>>(new Set());

    // Data — from Supabase via DAL
    const items = useSupabaseQuery(['items'], () => DAL.items.getAll(), []);
    const verticals = useSupabaseQuery(['verticals'], () => DAL.verticals.getAll(), []);
    const brands = useSupabaseQuery(['brands'], () => DAL.brands.getAll(), []);
    const products = useSupabaseQuery(['products'], () => DAL.products.getAll(), []);
    const stockDetails = useSupabaseQuery(['stock_details'], () => DAL.stock_details.getAll(), []);

    const toggleItemSelection = (id: number) => {
        setDeselectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Filter
    const filteredItems = useMemo(() => {
        let res = items;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            res = res.filter(i =>
                i.item_name.toLowerCase().includes(q) ||
                (typeof i.category === 'string' && i.category.toLowerCase().includes(q))
            );
        }

        return res.map(item => {
            const sd = stockDetails.find((s: any) => s.item_id === item.id);
            const unitMultiplier = sd ? Number(sd.unit_multiplier) || 1 : 1;
            const packMultiplier = sd ? Number(sd.pack_multiplier) || 1 : 1;
            const qtyPerParcel = unitMultiplier * packMultiplier;
            
            const unitPrice = priceMode === 'lean' ? (sd?.retail_unit_price ?? 0) : (sd?.wholesale_unit_price ?? 0);
            const pricePerParcel = Number((unitPrice * qtyPerParcel).toFixed(2));
            
            return {
                ...item,
                pricePerUnit: unitPrice,
                pricePerParcel,
                qtyPerParcel
            };
        });
    }, [items, searchQuery, stockDetails, priceMode]);

    // Group by Vertical → Brand
    const grouped = useMemo(() => {
        const map = new Map<string, Map<string, typeof items>>();
        filteredItems.forEach(item => {
            const vert = verticals.find(v => v.id === item.vertical_id)?.name || 'Other';
            const brand = brands.find(b => b.id === item.brand_id)?.name || 'Unbranded';
            if (!map.has(vert)) map.set(vert, new Map());
            const bMap = map.get(vert)!;
            if (!bMap.has(brand)) bMap.set(brand, []);
            bMap.get(brand)!.push(item);
        });
        return map;
    }, [filteredItems, verticals, brands]);

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
    };

    // ── Generate Price List PDF ──
    const generatePriceListPdf = (): jsPDF => {
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        let y = 20;

        const reportTitle = customTitle.trim() || (activeBusiness || 'Price List');

        // Watermark
        doc.setFontSize(60);
        doc.setTextColor(240, 240, 240);
        doc.text(activeBusiness || 'VisualOS', pw / 2, ph / 2, { align: 'center', angle: 45 });
        doc.setTextColor(0, 0, 0);

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(reportTitle, pw / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${catalogueDate}  •  Pricing: ${priceMode === 'lean' ? 'Lean / Retail' : 'Bulk / Wholesale'}`, pw / 2, y, { align: 'center' });
        y += 8;

        if (customNote.trim()) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(80, 80, 80);
            const lines = doc.splitTextToSize(customNote.trim(), pw - 40);
            doc.text(lines, pw / 2, y, { align: 'center' });
            y += (lines.length * 4) + 4;
            doc.setTextColor(0, 0, 0);
        }

        // Columns
        const cols = [
            { x: 14, w: 75, label: 'Item' },
            { x: 94, w: 25, label: 'Price/Unit ₹' },
            { x: 124, w: 25, label: 'Qty/Parcel' },
            { x: 154, w: 25, label: 'Price/Parcel ₹' }
        ];

        // Header row
        doc.setFillColor(30, 41, 59);
        doc.rect(12, y - 3, pw - 24, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        cols.forEach(c => doc.text(c.label, c.x, y + 2));
        doc.setTextColor(0, 0, 0);
        y += 8;

        // Items grouped by vertical
        grouped.forEach((brandMap, vertName) => {
            let hasItems = false;
            brandMap.forEach(items => { if (items.some((i: any) => !deselectedItems.has(i.id))) hasItems = true; });
            if (!hasItems) return;

            // Vertical header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setFillColor(243, 244, 246);
            doc.rect(12, y - 3, pw - 24, 6, 'F');
            doc.text(vertName, 14, y + 1);
            y += 8;

            brandMap.forEach((brandItems, brandName) => {
                const selectedBrandItems = brandItems.filter((i: any) => !deselectedItems.has(i.id));
                if (selectedBrandItems.length === 0) return;

                selectedBrandItems.forEach((item: any) => {
                    if (y > ph - 20) { doc.addPage(); y = 15; }
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    const nameStr = `${item.item_name} ${brandName !== 'Unbranded' ? `(${brandName})` : ''}`;
                    doc.text(nameStr.substring(0, 50), 14, y);
                    doc.text(String(item.pricePerUnit), 94, y);
                    doc.text(String(item.qtyPerParcel), 124, y);
                    doc.text(String(item.pricePerParcel), 154, y);
                    y += 5.5;
                });
            });
            y += 3;
        });

        return doc;
    };

    // ── Generate Full Catalogue (HTML flipbook) ──
    const handleGenerateCatalogue = async (shareMode: 'download' | 'share') => {
        const itemsToGenerate = filteredItems.filter(i => !deselectedItems.has(i.id));
        if (itemsToGenerate.length === 0) { addToast('No items to generate', 'error'); return; }
        setIsGenerating(true);
        try {
            const profile: BusinessProfile = { business_name: activeBusiness || 'My Business' };

            const catalogueItems: CatalogueItem[] = await Promise.all(itemsToGenerate.map(async (item: any) => {
                let media: any[] = [];
                try { media = await DAL.item_media.getByItem(item.id!); } catch { /* no media */ }
                const vert = verticals.find((v: any) => v.id === item.vertical_id);
                const brand = brands.find((b: any) => b.id === item.brand_id);
                const product = products.find((p: any) => p.id === item.product_id);
                return {
                    id: item.id!,
                    item_name: item.item_name,
                    category: item.category || '',
                    product_name: product?.name,
                    brand_name: brand?.name,
                    vertical_name: vert?.name,
                    price_per_unit: item.pricePerUnit,
                    price_per_parcel: item.pricePerParcel,
                    qty_per_parcel: item.qtyPerParcel,
                    media,
                };
            }));

            const html = await generateFlipbookHtml(catalogueItems, profile, {
                title: customTitle.trim() || undefined,
                note: customNote.trim() || undefined,
                priceMode: priceMode
            });
            const blob = new Blob([html], { type: 'text/html' });
            const filename = `Catalogue-${catalogueDate}.html`;

            if (shareMode === 'share') {
                const file = new File([blob], filename, { type: 'text/html' });
                await shareFile(file, `${activeBusiness} — Product Catalogue`);
                addToast('Catalogue shared!', 'success');
            } else {
                downloadBlob(blob, filename);
                addToast('Catalogue downloaded!', 'success');
            }
        } catch (e: any) {
            addToast(`Generation failed: ${e.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Handle Price List generation ──
    const handleGeneratePriceList = async (shareMode: 'download' | 'share') => {
        if (filteredItems.length === 0) { addToast('No items to generate', 'error'); return; }
        setIsGenerating(true);
        try {
            const doc = generatePriceListPdf();
            if (shareMode === 'share') {
                const blob = doc.output('blob');
                const file = new File([blob], `PriceList-${catalogueDate}.pdf`, { type: 'application/pdf' });
                await shareFile(file, `${activeBusiness} — Price List`);
                addToast('Price list shared!', 'success');
            } else {
                doc.save(`PriceList-${catalogueDate}.pdf`);
                addToast('Price list downloaded!', 'success');
            }
        } catch (e: any) {
            addToast(`Generation failed: ${e.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerate = (shareMode: 'download' | 'share') => {
        if (mode === 'prices') handleGeneratePriceList(shareMode);
        else handleGenerateCatalogue(shareMode);
    };

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <Megaphone className="h-5 w-5 text-brand-500" />
                <h1 className="text-lg font-bold text-surface-900">Marketing</h1>

                {/* Mode toggle */}
                <div className="flex rounded-lg overflow-hidden border border-surface-300 ml-2">
                    <button onClick={() => setMode('prices')}
                        className={`px-4 py-1.5 text-xs font-medium transition-colors ${mode === 'prices' ? 'bg-surface-900 text-white' : 'text-surface-500 hover:bg-surface-100'}`}>
                        Prices Only
                    </button>
                    <button onClick={() => setMode('catalogue')}
                        className={`px-4 py-1.5 text-xs font-medium transition-colors ${mode === 'catalogue' ? 'bg-surface-900 text-white' : 'text-surface-500 hover:bg-surface-100'}`}>
                        Full Catalogue
                    </button>
                </div>

                <div className="flex-1" />

                {/* Date picker */}
                <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <input type="date" value={catalogueDate} onChange={e => setCatalogueDate(e.target.value)}
                        className="bg-surface-100 border border-surface-200 rounded-lg px-2 py-1 text-xs text-surface-700" />
                </div>

                {/* Generate buttons */}
                <button onClick={() => handleGenerate('download')} disabled={isGenerating}
                    className="text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50">
                    {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Generate
                </button>
                <button onClick={() => handleGenerate('share')} disabled={isGenerating}
                    className="text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-surface-100 text-surface-700 border border-surface-200 hover:bg-surface-200 transition-colors disabled:opacity-50">
                    <Share2 className="h-3.5 w-3.5" /> Share
                </button>
            </div>

            {/* Header Settings */}
            <div className="flex gap-4 p-4 glass rounded-xl flex-wrap items-start">
                <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                    <input 
                        className="input-field px-3 py-2 text-sm font-semibold border-brand-200" 
                        placeholder="Custom Title (e.g. Festival Offers)..." 
                        value={customTitle} 
                        onChange={e => setCustomTitle(e.target.value)} 
                    />
                    <textarea 
                        className="input-field px-3 py-2 text-xs resize-none h-[60px] border-brand-200" 
                        placeholder="Add a contextual note/description to display on the catalogue..." 
                        value={customNote} 
                        onChange={e => setCustomNote(e.target.value)} 
                    />
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-surface-600">Pricing Mode:</span>
                        <div className="flex rounded-lg overflow-hidden border border-surface-300 shadow-sm">
                            <button onClick={() => setPriceMode('lean')}
                                className={`px-4 py-1 text-xs font-medium transition-colors ${priceMode === 'lean' ? 'bg-emerald-600 text-white' : 'bg-white text-surface-600 hover:bg-surface-50'}`}>
                                Lean (Retail)
                            </button>
                            <button onClick={() => setPriceMode('bulk')}
                                className={`px-4 py-1 text-xs font-medium transition-colors ${priceMode === 'bulk' ? 'bg-violet-600 text-white' : 'bg-white text-surface-600 hover:bg-surface-50'}`}>
                                Bulk (WS)
                            </button>
                        </div>
                    </div>
                    <div className="text-[10px] text-surface-400">
                        {priceMode === 'lean' ? 'Uses Retail Pricing' : 'Uses Wholesale Pricing'}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input className="input-field pl-10" placeholder="Search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            {/* Info bar */}
            <div className="flex items-center gap-3 text-[11px] text-surface-500 bg-surface-100 p-2 rounded-lg">
                <span className="font-semibold text-brand-600">{filteredItems.filter(i => !deselectedItems.has(i.id)).length} selected</span>
                <span>/</span>
                <span>{filteredItems.length} total items</span>
                <span>·</span>
                {mode === 'catalogue' && <span className="flex items-center gap-1"><Image className="h-3 w-3" /> Includes images & specs</span>}
                {mode === 'prices' && <span>Prices Only (No Images)</span>}
            </div>

            {/* Items grouped */}
            <div className="space-y-2">
                {Array.from(grouped.entries()).map(([vertName, brandMap]) => (
                    <div key={vertName} className="glass rounded-xl overflow-hidden">
                        {/* Vertical header */}
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-50 cursor-pointer hover:bg-surface-100 transition-colors"
                            onClick={() => toggleGroup(vertName)}>
                            {expandedGroups.has(vertName) ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
                            <span className="text-sm font-semibold text-surface-900">{vertName}</span>
                            <span className="text-xs text-surface-400">
                                ({Array.from(brandMap.values()).reduce((s, a) => s + a.length, 0)} items)
                            </span>
                        </div>

                        {expandedGroups.has(vertName) && (
                            <div className="divide-y divide-surface-100">
                                {Array.from(brandMap.entries()).map(([brandName, brandItems]) => (
                                    <div key={brandName}>
                                        <div className="px-6 py-1.5 text-xs font-medium text-surface-500 bg-surface-50/50 flex items-center gap-1.5">
                                            <span className="text-surface-300">▸</span> {brandName}
                                            <span className="text-surface-300 ml-1">({brandItems.length})</span>
                                        </div>
                                        {/* Item rows */}
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-surface-50/80 border-b border-surface-100">
                                                    <th className="px-6 py-1 text-left w-10"></th>
                                                    <th className="px-2 py-1 text-left text-[11px] font-semibold text-surface-500">Item</th>
                                                    <th className="px-3 py-1 text-left text-[11px] font-semibold text-surface-500">Category</th>
                                                    <th className="px-3 py-1 text-right text-[11px] font-semibold text-surface-500">Price/Unit</th>
                                                    <th className="px-3 py-1 text-right text-[11px] font-semibold text-surface-500">Qty/Parcel</th>
                                                    <th className="px-3 py-1 text-right text-[11px] font-semibold text-surface-500">Price/Parcel</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {brandItems.map(item => {
                                                    const isSelected = !deselectedItems.has(item.id);
                                                    return (
                                                        <tr key={item.id} className={`hover:bg-brand-50/50 border-t border-surface-50 transition-colors cursor-pointer ${!isSelected ? 'opacity-40 grayscale' : ''}`}
                                                            onClick={() => toggleItemSelection(item.id)}>
                                                            <td className="px-6 py-2 text-brand-600" onClick={(e) => e.stopPropagation()}>
                                                                <input type="checkbox" checked={isSelected} onChange={() => toggleItemSelection(item.id)} className="w-4 h-4 rounded border-surface-300 accent-brand-600 cursor-pointer" />
                                                            </td>
                                                            <td className="px-2 py-2 text-surface-900 font-medium">{item.item_name}</td>
                                                            <td className="px-3 py-2 text-surface-500 text-[11px] max-w-[120px] truncate">{item.category}</td>
                                                            <td className="px-3 py-2 text-right text-surface-700">₹{item.pricePerUnit}</td>
                                                            <td className="px-3 py-2 text-right text-surface-700">{item.qtyPerParcel}</td>
                                                            <td className="px-3 py-2 text-right text-surface-900 font-bold w-[110px]">₹{item.pricePerParcel}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {grouped.size === 0 && (
                    <div className="glass rounded-xl p-12 text-center text-surface-400">
                        No items found
                    </div>
                )}
            </div>
        </div>
    );
}
