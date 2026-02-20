import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Item, type PackingUnit } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import { jsPDF } from 'jspdf';
import { shareFile } from '@/utils/share';
import { Search, Download, Share2, Check } from 'lucide-react';

type PriceMode = 'lean' | 'bulk';


export default function PriceList() {
    const items = useLiveQuery(() => db.items.toArray()) || [];
    const allBrands = useLiveQuery(() => db.brands.toArray()) || [];
    const allProducts = useLiveQuery(() => db.products.toArray()) || [];
    const packingUnits = useLiveQuery(() => db.packing_units.toArray()) || [];
    const allVP1 = useLiveQuery(() => db.variant_params_1.toArray()) || [];
    const addToast = useAppStore((s) => s.addToast);
    const activeBusiness = useAppStore((s) => s.activeBusiness);

    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [listTitle, setListTitle] = useState(activeBusiness || 'Price List');
    const [priceMode, setPriceMode] = useState<PriceMode>('lean');

    // Lookup maps
    const brandMap = useMemo(() => {
        const m = new Map<number, string>();
        allBrands.forEach((b) => m.set(b.id!, b.name));
        return m;
    }, [allBrands]);

    const productMap = useMemo(() => {
        const m = new Map<number, string>();
        allProducts.forEach((p) => m.set(p.id!, p.name));
        return m;
    }, [allProducts]);

    const packingMap = useMemo(() => {
        const m = new Map<number, PackingUnit>();
        packingUnits.forEach((pu) => m.set(pu.id!, pu));
        return m;
    }, [packingUnits]);

    const vp1Map = useMemo(() => {
        const m = new Map<number, string>();
        allVP1.forEach((v) => m.set(v.id!, v.name));
        return m;
    }, [allVP1]);

    const filtered = useMemo(
        () =>
            items.filter(
                (i) =>
                    i.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    i.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (i.product_id && (productMap.get(i.product_id) || '').toLowerCase().includes(searchQuery.toLowerCase()))
            ),
        [items, searchQuery, productMap]
    );

    const toggleSelect = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map((i) => i.id!)));
        }
    };

    const selectedItems = items.filter((i) => selected.has(i.id!));

    // Group selected items by product for PDF display
    const groupedSelected = useMemo(() => {
        const map = new Map<string, Item[]>();
        selectedItems.forEach((item) => {
            const groupKey = item.product_id ? productMap.get(item.product_id) || 'Other' : 'Other';
            if (!map.has(groupKey)) map.set(groupKey, []);
            map.get(groupKey)!.push(item);
        });
        return map;
    }, [selectedItems, productMap]);

    const getUnitPrice = (item: Item) =>
        priceMode === 'lean' ? item.retail_price_unit : item.wholesale_price_unit;

    const getContainerPrice = (item: Item) =>
        priceMode === 'lean' ? item.retail_price_container : item.wholesale_price_container;

    const generatePdf = (): jsPDF => {
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();

        // Title — business name
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(listTitle, pw / 2, 18, { align: 'center' });

        // Mode label
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(`${priceMode === 'lean' ? 'Lean (Retail)' : 'Bulk (Wholesale)'} Pricing`, pw / 2, 25, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        let y = 35;

        // Column headers helper
        const printHeader = () => {
            doc.setFillColor(20, 20, 20);
            doc.setTextColor(255, 255, 255);
            doc.rect(10, y - 5, pw - 20, 8, 'F');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('Item Name', 12, y);
            doc.text('Brand', 70, y);
            doc.text('Variant', 100, y);
            doc.text('Unit Price', 128, y);
            doc.text('Pkg Price', 155, y);
            doc.text('Units/Parcel', 180, y);
            y += 8;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
        };

        let idx = 0;
        for (const [groupName, groupItems] of groupedSelected.entries()) {
            // Product group header
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            doc.rect(10, y - 5, pw - 20, 8, 'F');
            doc.text(groupName, 14, y);
            y += 10;

            printHeader();

            doc.setFontSize(7);
            groupItems.forEach((item) => {
                if (y > 275) {
                    doc.addPage();
                    y = 20;
                    printHeader();
                    doc.setFontSize(7);
                }
                idx++;

                const brand = item.brand_id ? brandMap.get(item.brand_id) || '-' : '-';
                const variant = item.variant_param1_id ? vp1Map.get(item.variant_param1_id) || '-' : '-';
                const unitP = getUnitPrice(item);
                const containerP = getContainerPrice(item);
                const parcelP = containerP * item.P_unit_per_parcel;

                // Alternate row shading
                if (idx % 2 === 0) {
                    doc.setFillColor(248, 248, 248);
                    doc.rect(10, y - 4, pw - 20, 7, 'F');
                }

                doc.text(item.item_name.substring(0, 28), 12, y);
                doc.text(brand.substring(0, 14), 70, y);
                doc.text(variant.substring(0, 12), 100, y);
                doc.text(`Rs.${unitP.toFixed(2)}`, 128, y);
                doc.text(`Rs.${containerP.toFixed(2)}`, 155, y);
                doc.text(`${item.P_unit_per_parcel}`, 180, y);
                y += 7;
            });

            y += 4; // gap between groups
        }

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(activeBusiness, pw / 2, 290, { align: 'center' });

        return doc;
    };

    const handleDownload = () => {
        if (selected.size === 0) {
            addToast('Select at least one item', 'error');
            return;
        }
        const doc = generatePdf();
        doc.save(`pricelist-${Date.now()}.pdf`);
        addToast('Price list downloaded', 'success');
    };

    const handleShare = async () => {
        if (selected.size === 0) {
            addToast('Select at least one item', 'error');
            return;
        }
        const doc = generatePdf();
        const blob = doc.output('blob');
        const file = new File([blob], 'pricelist.pdf', { type: 'application/pdf' });
        await shareFile(file, `${listTitle} - ${selectedItems.length} items`);
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <input
                    className="input-field max-w-xs text-lg font-semibold bg-transparent border-none focus:ring-0 p-0 text-surface-900"
                    value={listTitle}
                    onChange={(e) => setListTitle(e.target.value)}
                    placeholder="Price List Heading"
                />
                <div className="flex gap-2">
                    {/* Price mode toggle */}
                    <div className="flex border border-surface-300 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setPriceMode('lean')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${priceMode === 'lean' ? 'bg-surface-900 text-white' : 'text-surface-600 hover:bg-surface-100'}`}
                        >
                            Lean
                        </button>
                        <button
                            onClick={() => setPriceMode('bulk')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${priceMode === 'bulk' ? 'bg-surface-900 text-white' : 'text-surface-600 hover:bg-surface-100'}`}
                        >
                            Bulk
                        </button>
                    </div>
                    <button onClick={handleDownload} className="btn-primary text-sm flex items-center gap-2">
                        <Download className="h-4 w-4" /> Download PDF
                    </button>
                    <button onClick={handleShare} className="btn-secondary text-sm flex items-center gap-2">
                        <Share2 className="h-4 w-4" /> Share
                    </button>
                </div>
            </div>

            {/* Search + Select All */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                    <input
                        className="input-field pl-10"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button onClick={selectAll} className="btn-ghost text-xs">
                    {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-surface-400">{selected.size} selected</span>
            </div>

            {/* Item Selection List */}
            <div className="glass rounded-xl divide-y divide-surface-200 max-h-[60vh] overflow-y-auto">
                {filtered.length === 0 ? (
                    <p className="p-8 text-center text-surface-400">No items found</p>
                ) : (
                    filtered.map((item) => {
                        const isSelected = selected.has(item.id!);
                        const brand = item.brand_id ? brandMap.get(item.brand_id) || '' : '';
                        const product = item.product_id ? productMap.get(item.product_id) || '' : '';
                        const unitP = getUnitPrice(item);
                        const containerP = getContainerPrice(item);
                        const puName = item.packing_unit_id ? packingMap.get(item.packing_unit_id)?.unit_name || '' : '';

                        return (
                            <div
                                key={item.id}
                                className={`px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-surface-50' : 'hover:bg-surface-50'}`}
                                onClick={() => toggleSelect(item.id!)}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-surface-900 border-surface-900' : 'border-surface-300'}`}
                                    >
                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-surface-900">
                                            {product && <span className="text-surface-500 mr-1">{product}</span>}
                                            {item.item_name}
                                        </p>
                                        <p className="text-xs text-surface-400">
                                            {item.variant_param1_id && `${vp1Map.get(item.variant_param1_id) || ''} · `}
                                            {brand && `${brand} · `}
                                            {puName && `${item.P_unit_per_parcel} ${puName}`}
                                        </p>
                                    </div>
                                    <div className="text-right text-xs flex-shrink-0">
                                        <p className="text-surface-600">Rs.{containerP.toFixed(2)}</p>
                                        {containerP !== unitP && unitP > 0 && (
                                            <p className="text-surface-400">Rs.{unitP.toFixed(2)}/u</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
