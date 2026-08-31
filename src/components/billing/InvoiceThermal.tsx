import { forwardRef } from 'react';
import type { Order } from '@/db/types';
import type { CartItem } from '@/store/store';

interface InvoiceThermalProps {
    order: Order;
    items: CartItem[];
    variantMap?: Map<number, string>;
    width?: '58mm' | '80mm';
}

const InvoiceThermal = forwardRef<HTMLDivElement, InvoiceThermalProps>(({ order, items, variantMap, width = '58mm' }, ref) => {
    const paperWidth = width === '80mm' ? '80mm' : '58mm';

    return (
        <div
            ref={ref}
            className="bg-white text-black mx-auto"
            style={{
                width: paperWidth,
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '11px',
                lineHeight: '1.4',
                padding: '3mm',
            }}
        >
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '4px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>VisualOS Store</div>
                <div style={{ fontSize: '9px' }}>{order.status === 'quote' ? 'Quote' : 'Invoice'} #{order.id}</div>
                <div style={{ fontSize: '9px' }}>{new Date(order.order_date).toLocaleString('en-IN')}</div>
            </div>

            {/* Customer */}
            <div style={{ marginBottom: '4px', fontSize: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>To: </span>{order.prospect_name}
            </div>

            {/* Pricing Mode */}
            <div style={{ marginBottom: '4px', fontSize: '9px' }}>
                Mode: {order.pricing_mode === 'wholesale' ? 'Bulk' : 'Lean'}
            </div>

            {/* Separator */}
            <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }} />

            {/* Items */}
            {items.map((ci, idx) => (
                <div key={idx} style={{ marginBottom: '3px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>
                        {ci.item.item_name}
                        {ci.item.variant_param1_id && variantMap?.has(ci.item.variant_param1_id) && (
                            <span style={{ fontWeight: 'normal', marginLeft: '4px' }}>({variantMap.get(ci.item.variant_param1_id)})</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span>{ci.qty} × Rs.{ci.unit_price.toFixed(2)}</span>
                        <span style={{ fontWeight: 'bold' }}>Rs.{(ci.qty * ci.unit_price - ci.discount).toFixed(2)}</span>
                    </div>
                </div>
            ))}

            {/* Separator */}
            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

            {/* Totals */}
            

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '9px', borderTop: '1px dashed #000', paddingTop: '4px' }}>
                <div>Thank you!</div>
                <div>VisualOS Inventory</div>
            </div>
        </div>
    );
});

InvoiceThermal.displayName = 'InvoiceThermal';
export default InvoiceThermal;
