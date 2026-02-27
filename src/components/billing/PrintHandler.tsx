import { useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import type { Order } from '@/db/dexie';
import type { CartItem } from '@/store/store';
import { useAppStore } from '@/store/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import InvoiceA4 from './InvoiceA4';
import InvoiceThermal from './InvoiceThermal';
import { X, Printer, FileText, Smartphone } from 'lucide-react';
import { shareFile } from '@/utils/share';

interface PrintHandlerProps {
    order: Order;
    items: CartItem[];
    onClose: () => void;
}

export default function PrintHandler({ order, items, onClose }: PrintHandlerProps) {
    const a4Ref = useRef<HTMLDivElement>(null);
    const thermalRef = useRef<HTMLDivElement>(null);
    const addToast = useAppStore((s) => s.addToast);

    // Fetch variants for display
    const variants = useLiveQuery(() => db.variant_params_1.toArray()) || ([] as any[]);
    const variantMap = new Map<number, string>();
    variants.forEach(v => variantMap.set(v.id!, v.name));

    const isQuote = order.status === 'quote';
    const label = isQuote ? 'Quote' : 'Invoice';

    const handleA4Print = useReactToPrint({
        contentRef: a4Ref,
        documentTitle: `${label}-${order.id}`,
    });

    const handleThermalPrint = useReactToPrint({
        contentRef: thermalRef,
        documentTitle: `Thermal-${label}-${order.id}`,
    });

    // Generate thermal-compatible PDF for RawBT
    const handleRawBTPdf = async () => {
        try {
            const doc = new jsPDF({ unit: 'mm', format: [58, 200] });
            let y = 5;
            const lh = 4;
            const pw = 54;

            doc.setFont('Courier', 'normal');
            doc.setFontSize(10);

            // Header
            doc.setFontSize(12);
            doc.text('VisualOS Store', pw / 2, y, { align: 'center' });
            y += lh + 1;
            doc.setFontSize(8);
            doc.text(`${label} #${order.id}`, pw / 2, y, { align: 'center' });
            y += lh;
            doc.text(new Date(order.order_date).toLocaleString('en-IN'), pw / 2, y, { align: 'center' });
            y += lh + 2;

            // Customer
            doc.setFontSize(9);
            doc.text(`To: ${order.prospect_name}`, 2, y);
            y += lh + 2;

            // Dashed line
            doc.setLineDashPattern([1, 1], 0);
            doc.line(2, y, pw, y);
            y += lh;

            // Items
            items.forEach((item) => {
                doc.setFontSize(9);
                doc.text(item.item.item_name.substring(0, 20), 2, y);
                y += lh;
                doc.setFontSize(8);
                const lineText = `${item.qty} x ${item.unit_price.toFixed(2)}`;
                const lineTotal = `${(item.qty * item.unit_price - item.discount).toFixed(2)}`;
                doc.text(lineText, 2, y);
                doc.text(lineTotal, pw, y, { align: 'right' });
                y += lh + 1;
            });

            // Separator
            doc.line(2, y, pw, y);
            y += lh;

            // Totals
            doc.setFontSize(8);
            doc.text('Subtotal', 2, y);
            doc.text(order.subtotal.toFixed(2), pw, y, { align: 'right' });
            y += lh;

            if (order.tax_amount > 0) {
                doc.text('Tax', 2, y);
                doc.text(order.tax_amount.toFixed(2), pw, y, { align: 'right' });
                y += lh;
            }

            if (order.discount_amount > 0) {
                doc.text('Discount', 2, y);
                doc.text(`-${order.discount_amount.toFixed(2)}`, pw, y, { align: 'right' });
                y += lh;
            }

            doc.line(2, y, pw, y);
            y += lh;

            doc.setFontSize(11);
            doc.setFont('Courier', 'bold');
            doc.text('TOTAL', 2, y);
            doc.text(`Rs.${order.grand_total.toFixed(2)}`, pw, y, { align: 'right' });
            y += lh + 3;

            // Footer
            doc.setFontSize(7);
            doc.setFont('Courier', 'normal');
            doc.text('Thank you!', pw / 2, y, { align: 'center' });

            // Trim page height
            const trimmedDoc = new jsPDF({ unit: 'mm', format: [58, y + 10] });
            trimmedDoc.setFont('Courier', 'normal');
            // Re-render on trimmed page (simpler: just save original)
            doc.save(`thermal-${label.toLowerCase()}-${order.id}.pdf`);
            addToast('Thermal PDF generated! Open with RawBT', 'success');
        } catch (e) {
            addToast('Failed to generate thermal PDF', 'error');
        }
    };

    const handleShareInvoice = async () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`${label} #${order.id}`, 20, 20);
            doc.setFontSize(12);
            doc.text(`Date: ${new Date(order.order_date).toLocaleDateString('en-IN')}`, 20, 30);
            doc.text(`Customer: ${order.prospect_name}`, 20, 38);
            doc.text(`Total: Rs.${order.grand_total.toFixed(2)}`, 20, 46);

            let y = 58;
            items.forEach((item, idx) => {
                doc.text(`${idx + 1}. ${item.item.item_name} — ${item.qty} x Rs.${item.unit_price.toFixed(2)} = Rs.${(item.qty * item.unit_price - item.discount).toFixed(2)}`, 20, y);
                y += 8;
            });

            const blob = doc.output('blob');
            const file = new File([blob], `${label.toLowerCase()}-${order.id}.pdf`, { type: 'application/pdf' });
            await shareFile(file, `${label} #${order.id} — Rs.${order.grand_total.toFixed(2)}`);
        } catch (e) {
            addToast('Share failed', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col">
            {/* Toolbar */}
            <div className="bg-white flex items-center justify-between px-4 py-3 border-b border-surface-200 shadow-sm">
                <h3 className="text-sm font-semibold text-surface-900">{label} #{order.id}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleA4Print()} className="btn-primary text-xs flex items-center gap-1.5">
                        <Printer className="h-3.5 w-3.5" /> A4 Print
                    </button>
                    <button onClick={() => handleThermalPrint()} className="btn-secondary text-xs flex items-center gap-1.5">
                        <Printer className="h-3.5 w-3.5" /> Thermal
                    </button>
                    <button onClick={handleRawBTPdf} className="btn-secondary text-xs flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5" /> RawBT PDF
                    </button>
                    <button onClick={handleShareInvoice} className="btn-secondary text-xs flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Share
                    </button>
                    <button onClick={onClose} className="btn-ghost p-1.5 ml-2">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-8">
                <div className="shadow-2xl rounded-lg overflow-hidden">
                    <InvoiceA4 ref={a4Ref} order={order} items={items} variantMap={variantMap} />
                </div>
                <div className="shadow-2xl rounded-lg overflow-hidden">
                    <InvoiceThermal ref={thermalRef} order={order} items={items} variantMap={variantMap} />
                </div>
            </div>
        </div>
    );
}
