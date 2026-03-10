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

    // Data — from Supabase via DAL
    const items = useSupabaseQuery(['items'], () => DAL.items.getAll(), []);
    const verticals = useSupabaseQuery(['verticals'], () => DAL.verticals.getAll(), []);
    const brands = useSupabaseQuery(['brands'], () => DAL.brands.getAll(), []);
    const products = useSupabaseQuery(['products'], () => DAL.products.getAll(), []);

    // Filter
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const q = searchQuery.toLowerCase();
        return items.filter(i =>
            i.item_name.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q)
        );
    }, [items, searchQuery]);

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

        // Watermark
        doc.setFontSize(60);
        doc.setTextColor(240, 240, 240);
        doc.text(activeBusiness || 'VisualOS', pw / 2, ph / 2, { align: 'center', angle: 45 });
        doc.setTextColor(0, 0, 0);

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(activeBusiness || 'Price List', pw / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${catalogueDate}`, pw / 2, y, { align: 'center' });
        y += 12;

        // Columns
        const cols = [
            { x: 14, w: 80, label: 'Item' },
            { x: 94, w: 40, label: 'Brand' },
            { x: 134, w: 35, label: 'Price/Unit ₹' },
            { x: 169, w: 35, label: 'Price/Pkg ₹' },
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
            // Vertical header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setFillColor(243, 244, 246);
            doc.rect(12, y - 3, pw - 24, 6, 'F');
            doc.text(vertName, 14, y + 1);
            y += 8;

            brandMap.forEach((brandItems, brandName) => {
                brandItems.forEach(item => {
                    if (y > ph - 20) { doc.addPage(); y = 15; }
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.text(item.item_name.substring(0, 40), 14, y);
                    doc.text(brandName.substring(0, 20), 94, y);
                    doc.text(String(item.retail_price_unit || 0), 134, y);
                    doc.text(String(item.retail_price_container || 0), 169, y);
                    y += 5.5;
                });
            });
            y += 3;
        });

        return doc;
    };

    // ── Generate Full Catalogue (HTML flipbook) ──
    const handleGenerateCatalogue = async (shareMode: 'download' | 'share') => {
        if (filteredItems.length === 0) { addToast('No items to generate', 'error'); return; }
        setIsGenerating(true);
        try {
            const profile: BusinessProfile = { business_name: activeBusiness || 'My Business' };

            const catalogueItems: CatalogueItem[] = await Promise.all(filteredItems.map(async (item: any) => {
                let media: any[] = [];
                try { media = await DAL.product_media.getByItem(item.id!); } catch { /* no media */ }
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
                    retail_price: item.retail_price_container || item.retail_price_unit,
                    wholesale_price: item.wholesale_price_container || item.wholesale_price_unit,
                    media,
                };
            }));

            const html = await generateFlipbookHtml(catalogueItems, profile);
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

            {/* Search */}
            <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input className="input-field pl-10" placeholder="Search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            {/* Info bar */}
            <div className="flex items-center gap-3 text-xs text-surface-500">
                <span>{filteredItems.length} items</span>
                <span>·</span>
                <span>Grouped by Vertical → Brand</span>
                {mode === 'catalogue' && <span className="flex items-center gap-1"><Image className="h-3 w-3" /> Includes images & full specs</span>}
                {mode === 'prices' && <span>Price/Unit + Price/Package (no MRP)</span>}
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
                                            <tbody>
                                                {brandItems.map(item => (
                                                    <tr key={item.id} className="hover:bg-surface-50 border-t border-surface-50">
                                                        <td className="px-6 py-2 text-surface-900 font-medium">{item.item_name}</td>
                                                        <td className="px-3 py-2 text-surface-500 text-xs">{item.category}</td>
                                                        <td className="px-3 py-2 text-right text-surface-700">
                                                            <span className="text-xs text-surface-400 mr-1">unit:</span>
                                                            ₹{item.retail_price_unit || 0}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-surface-900 font-medium">
                                                            <span className="text-xs text-surface-400 mr-1">pkg:</span>
                                                            ₹{item.retail_price_container || 0}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-surface-400 text-xs w-[80px]">
                                                            {item.stock_parcels} in stock
                                                        </td>
                                                    </tr>
                                                ))}
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
