import { useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    type NodeMouseHandler,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ─── Node Style Helpers ─────────────────────────────────────────────────────

const domain = {
    reference: { bg: '#1e3a5f', border: '#3b82f6', label: '#93c5fd' },  // blue
    items: { bg: '#14532d', border: '#22c55e', label: '#86efac' },  // green
    crm: { bg: '#3b1f6a', border: '#a855f7', label: '#d8b4fe' },  // purple
    finance: { bg: '#78350f', border: '#f97316', label: '#fdba74' },  // orange
    media: { bg: '#0f3460', border: '#06b6d4', label: '#67e8f9' },  // cyan
    global: { bg: '#1f2937', border: '#6b7280', label: '#d1d5db' },  // grey
};

function makeNode(
    id: string,
    label: string,
    x: number,
    y: number,
    d: typeof domain[keyof typeof domain],
    fields: string[],
): Node {
    return {
        id,
        position: { x, y },
        data: {
            label: (
                <div style={{ textAlign: 'left', minWidth: 140 }}>
                    <div style={{
                        fontWeight: 700, fontSize: 13, color: d.label,
                        borderBottom: `1px solid ${d.border}30`, paddingBottom: 4, marginBottom: 4
                    }}>
                        {label}
                    </div>
                    {fields.map(f => (
                        <div key={f} style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.6 }}>
                            {f}
                        </div>
                    ))}
                </div>
            ),
        },
        style: {
            background: d.bg,
            border: `1.5px solid ${d.border}`,
            borderRadius: 8,
            padding: '10px 12px',
            cursor: 'pointer',
            boxShadow: `0 0 12px ${d.border}30`,
        },
    };
}

// ─── Nodes ──────────────────────────────────────────────────────────────────

const initialNodes: Node[] = [
    // Reference
    makeNode('verticals', 'verticals', 50, 50, domain.reference, ['id', 'name']),
    makeNode('brands', 'brands', 250, 50, domain.reference, ['id', 'name', 'vertical_id↗']),
    makeNode('products', 'products', 450, 50, domain.reference, ['id', 'name', 'vertical_id↗', 'category']),
    makeNode('packing_units', 'packing_units', 650, 50, domain.reference, ['id', 'unit_name', 'multiplier']),

    // Items
    makeNode('items', 'items', 300, 210, domain.items, [
        'id', 'item_name', 'category',
        'product_id↗', 'brand_id↗', 'vertical_id↗',
        'packing_unit_id↗', 'p_unit', 'p_unit_per_parcel',
        'stock_parcels', 'stock_units', 'retail_price_unit',
        'retail_price_container', 'wholesale_price_unit', 'mrp',
    ]),

    // Product Media
    makeNode('product_media', 'product_media', 650, 210, domain.media, [
        'id', 'item_id↗', 'media_role', 'storage_path', 'filename', 'mime_type',
    ]),

    // CRM
    makeNode('routes', 'routes', 50, 430, domain.crm, ['id', 'name', 'area_towns[]', 'color_tag']),
    makeNode('prospects', 'prospects', 250, 430, domain.crm, ['id', 'prospectname', 'area_town', 'contact', 'business_type', 'route_id↗']),
    makeNode('visits', 'visits', 500, 430, domain.crm, ['id', 'prospect_id↗', 'route_id↗', 'visit_date', 'outcome', 'next_visit_plan']),

    // Orders
    makeNode('orders', 'orders', 250, 620, domain.crm, ['id', 'prospect_id↗', 'status', 'grand_total', 'payment_status']),
    makeNode('order_items', 'order_items', 500, 620, domain.crm, ['id', 'order_id↗', 'item_id↗', 'qty', 'unit_price', 'total']),
    makeNode('bills', 'bills', 50, 620, domain.crm, ['id', 'order_id↗', 'bill_number', 'print_format']),

    // Finance
    makeNode('costs', 'costs', 50, 820, domain.finance, ['id', 'cost_type', 'amount', 'date', 'order_id↗']),
    makeNode('account', 'account', 300, 820, domain.finance, ['id', 'month_year', 'total_revenue', 'total_cost', 'profit']),

    // Global
    makeNode('suppliers', 'suppliers (global)', 700, 430, domain.global, ['id', 'name', 'contact', 'vertical_id↗']),
    makeNode('purchase_orders', 'purchase_orders', 700, 620, domain.global, ['id', 'supplier_id↗', 'order_date', 'total_cost']),
    makeNode('purchase_order_items', 'purchase_order_items', 700, 820, domain.global, ['id', 'purchase_order_id↗', 'item_id↗', 'qty']),
];

// ─── Edges ──────────────────────────────────────────────────────────────────

function fk(source: string, target: string, label?: string): Edge {
    return {
        id: `${source}→${target}`,
        source, target,
        label,
        style: { stroke: '#475569', strokeWidth: 1.5 },
        labelStyle: { fill: '#64748b', fontSize: 9 },
        animated: false,
        type: 'smoothstep',
    };
}

const initialEdges: Edge[] = [
    fk('brands', 'verticals', 'vertical_id'),
    fk('products', 'verticals', 'vertical_id'),
    fk('items', 'products', 'product_id'),
    fk('items', 'brands', 'brand_id'),
    fk('items', 'verticals', 'vertical_id'),
    fk('items', 'packing_units', 'packing_unit_id'),
    fk('product_media', 'items', 'item_id'),
    fk('prospects', 'routes', 'route_id'),
    fk('visits', 'prospects', 'prospect_id'),
    fk('visits', 'routes', 'route_id'),
    fk('orders', 'prospects', 'prospect_id'),
    fk('order_items', 'orders', 'order_id'),
    fk('order_items', 'items', 'item_id'),
    fk('bills', 'orders', 'order_id'),
    fk('costs', 'orders', 'order_id'),
    fk('suppliers', 'verticals', 'vertical_id'),
    fk('purchase_orders', 'suppliers', 'supplier_id'),
    fk('purchase_order_items', 'purchase_orders', 'purchase_order_id'),
    fk('purchase_order_items', 'items', 'item_id'),
];

// ─── Component ──────────────────────────────────────────────────────────────

interface SchemaGraphProps {
    onTableSelect: (tableName: string) => void;
    selectedTable: string | null;
}

export default function SchemaGraph({ onTableSelect, selectedTable }: SchemaGraphProps) {
    const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
        onTableSelect(node.id);
    }, [onTableSelect]);

    // Highlight the selected node
    const nodes = initialNodes.map(n => ({
        ...n,
        style: {
            ...n.style,
            boxShadow: n.id === selectedTable
                ? '0 0 0 2px #f59e0b, 0 0 20px #f59e0b60'
                : (n.style as any).boxShadow,
            transform: n.id === selectedTable ? 'scale(1.03)' : undefined,
        },
    }));

    return (
        <div style={{ width: '100%', height: '100%', background: '#0f172a' }}>
            <ReactFlow
                nodes={nodes}
                edges={initialEdges}
                onNodeClick={onNodeClick}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={2}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} color="#1e293b" />
                <Controls style={{ background: '#1e293b', border: '1px solid #334155' }} />
                <MiniMap
                    nodeColor={(n) => (n.style as any)?.border ?? '#334155'}
                    style={{ background: '#1e293b', border: '1px solid #334155' }}
                />
            </ReactFlow>
        </div>
    );
}
