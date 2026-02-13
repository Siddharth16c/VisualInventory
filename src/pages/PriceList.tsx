import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import { jsPDF } from 'jspdf';
import { shareFile, downloadBlob } from '@/utils/share';
import { Search, FileText, Download, Share2, Check, X } from 'lucide-react';

export default function PriceList() {
    const products = useLiveQuery(() => db.products.toArray()) || [];
    const addToast = useAppStore((s) => s.addToast);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [listTitle, setListTitle] = useState('Price List');

    const filtered = useMemo(
        () =>
            products.filter(
                (p) =>
                    p.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        [products, searchQuery]
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
            setSelected(new Set(filtered.map((p) => p.id!)));
        }
    };

    const selectedProducts = products.filter((p) => selected.has(p.id!));

    const generatePdf = (): jsPDF => {
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();

        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(listTitle, pw / 2, 20, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pw / 2, 28, { align: 'center' });

        // Table header
        let y = 40;
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 5, pw - 28, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('#', 16, y);
        doc.text('Product', 24, y);
        doc.text('Category', 90, y);
        doc.text('Unit', 130, y);
        doc.text('MRP', 150, y);
        doc.text('Price', 170, y);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        selectedProducts.forEach((p, idx) => {
            if (y > 275) {
                doc.addPage();
                y = 20;
            }
            doc.text(`${idx + 1}`, 16, y);
            doc.text(p.product_name.substring(0, 30), 24, y);
            doc.text((p.category || '-').substring(0, 15), 90, y);
            doc.text(p.unit || '-', 130, y);
            doc.text(`₹${p.mrp.toFixed(2)}`, 150, y);
            doc.text(`₹${p.selling_price.toFixed(2)}`, 170, y);
            y += 7;
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('VisualOS Inventory Suite', pw / 2, 290, { align: 'center' });

        return doc;
    };

    const handleDownload = () => {
        if (selected.size === 0) {
            addToast('Select at least one product', 'error');
            return;
        }
        const doc = generatePdf();
        doc.save(`pricelist-${Date.now()}.pdf`);
        addToast('Price list downloaded', 'success');
    };

    const handleShare = async () => {
        if (selected.size === 0) {
            addToast('Select at least one product', 'error');
            return;
        }
        const doc = generatePdf();
        const blob = doc.output('blob');
        const file = new File([blob], 'pricelist.pdf', { type: 'application/pdf' });
        await shareFile(file, `${listTitle} — ${selectedProducts.length} items`);
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <input
                    className="input-field max-w-xs text-lg font-semibold bg-transparent border-none focus:ring-0 p-0"
                    value={listTitle}
                    onChange={(e) => setListTitle(e.target.value)}
                    placeholder="Price List Title"
                />
                <div className="flex gap-2">
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                    <input
                        className="input-field pl-10"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button onClick={selectAll} className="btn-ghost text-xs">
                    {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-surface-400">{selected.size} selected</span>
            </div>

            {/* Product Selection List */}
            <div className="glass rounded-xl divide-y divide-surface-800 max-h-[60vh] overflow-y-auto">
                {filtered.length === 0 ? (
                    <p className="p-8 text-center text-surface-500">No products found</p>
                ) : (
                    filtered.map((p) => (
                        <div
                            key={p.id}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected.has(p.id!) ? 'bg-brand-600/10' : 'hover:bg-surface-800/50'
                                }`}
                            onClick={() => toggleSelect(p.id!)}
                        >
                            <div
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${selected.has(p.id!)
                                        ? 'bg-brand-600 border-brand-600'
                                        : 'border-surface-600'
                                    }`}
                            >
                                {selected.has(p.id!) && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.product_name}</p>
                                <p className="text-xs text-surface-500">{p.item_name} · {p.category}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-surface-500 line-through">₹{p.mrp?.toFixed(2)}</p>
                                <p className="text-sm font-semibold text-brand-400">₹{p.selling_price?.toFixed(2)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
