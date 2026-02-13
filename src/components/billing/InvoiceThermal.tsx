import { forwardRef } from 'react';
import type { Order } from '@/db/dexie';
import type { CartItem } from '@/store/store';

interface InvoiceThermalProps {
    order: Order;
    items: CartItem[];
    width?: '58mm' | '80mm';
}

const InvoiceThermal = forwardRef<HTMLDivElement, InvoiceThermalProps>(({ order, items, width = '58mm' }, ref) => {
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
                <div style={{ fontSize: '9px' }}>Invoice #{order.id}</div>
                <div style={{ fontSize: '9px' }}>{new Date(order.order_date).toLocaleString('en-IN')}</div>
            </div>

            {/* Customer */}
            <div style={{ marginBottom: '4px', fontSize: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>To: </span>{order.prospect_name}
            </div>

            {/* Separator */}
            <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }} />

            {/* Items */}
            {items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '3px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{item.product.product_name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span>{item.qty} × ₹{item.unit_price.toFixed(2)}</span>
                        <span style={{ fontWeight: 'bold' }}>₹{(item.qty * item.unit_price - item.discount).toFixed(2)}</span>
                    </div>
                </div>
            ))}

            {/* Separator */}
            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

            {/* Totals */}
            <div style={{ fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal</span>
                    <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                {order.tax_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tax</span>
                        <span>₹{order.tax_amount.toFixed(2)}</span>
                    </div>
                )}
                {order.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Disc</span>
                        <span>-₹{order.discount_amount.toFixed(2)}</span>
                    </div>
                )}
                <div style={{ borderBottom: '1px dashed #000', margin: '3px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                    <span>TOTAL</span>
                    <span>₹{order.grand_total.toFixed(2)}</span>
                </div>
            </div>

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
