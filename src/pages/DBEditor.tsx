import { useState } from 'react';
import SchemaGraph from '@/components/db-editor/SchemaGraph';
import TableGrid from '@/components/db-editor/TableGrid';
import { Database, ArrowLeft } from 'lucide-react';

const TABLE_LABELS: Record<string, string> = {
    verticals: 'Verticals',
    brands: 'Brands',
    products: 'Products',
    packing_units: 'Packing Units',
    items: 'Items',
    prospects: 'Prospects',
    routes: 'Routes',
    suppliers: 'Suppliers',
    costs: 'Costs',
    orders: 'Orders',
    order_items: 'Order Items',
    bills: 'Bills',
    visits: 'Visits',
    product_media: 'Product Media',
    purchase_orders: 'Purchase Orders',
    purchase_order_items: 'Purchase Order Items',
    account: 'Account',
};

const DOMAIN_COLORS: Record<string, string> = {
    verticals: '#3b82f6', brands: '#3b82f6', products: '#3b82f6', packing_units: '#3b82f6',
    items: '#22c55e',
    product_media: '#06b6d4',
    prospects: '#a855f7', routes: '#a855f7', visits: '#a855f7',
    orders: '#a855f7', order_items: '#a855f7', bills: '#a855f7',
    costs: '#f97316', account: '#f97316',
    suppliers: '#6b7280', purchase_orders: '#6b7280', purchase_order_items: '#6b7280',
};

export default function DBEditor() {
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'schema' | 'grid'>('schema');

    const color = selectedTable ? DOMAIN_COLORS[selectedTable] ?? '#64748b' : '#64748b';

    const handleTableSelect = (table: string) => {
        setSelectedTable(table);
        setMobileView('grid');
    };

    return (
        <div className="animate-fade-in flex flex-col h-full gap-0" style={{ height: 'calc(100vh - 60px)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-surface-200/10">
                <Database className="h-5 w-5 text-indigo-500" />
                <h1 className="text-base font-bold text-surface-900">DB Editor</h1>
                <span className="text-surface-600 font-medium text-sm">Click a table in the schema to open its data grid</span>
                <div className="flex-1" />
                {/* Mobile toggle */}
                <div className="flex md:hidden gap-1">
                    <button
                        onClick={() => setMobileView('schema')}
                        className={`text-xs px-3 py-1 rounded-full ${mobileView === 'schema' ? 'bg-indigo-600 text-white' : 'btn-ghost'}`}
                    >
                        Schema
                    </button>
                    <button
                        onClick={() => setMobileView('grid')}
                        disabled={!selectedTable}
                        className={`text-xs px-3 py-1 rounded-full ${mobileView === 'grid' ? 'bg-indigo-600 text-white' : 'btn-ghost'} disabled:opacity-40`}
                    >
                        Grid
                    </button>
                </div>
            </div>

            {/* Body — split */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Schema graph (left on desktop, full on mobile schema view) */}
                <div className={`
                    ${mobileView === 'grid' ? 'hidden md:flex' : 'flex'}
                    flex-col md:w-[42%] lg:w-[38%] border-r border-surface-200/50
                `} style={{ minHeight: 0 }}>
                    <div className="px-3 py-1.5 text-sm font-medium text-surface-800 border-b border-surface-200/50 bg-surface-50">
                        Entity Relationship Diagram — click any table
                    </div>
                    <div className="flex-1 min-h-0">
                        <SchemaGraph
                            onTableSelect={handleTableSelect}
                            selectedTable={selectedTable}
                        />
                    </div>
                </div>

                {/* Data grid (right on desktop, full on mobile grid view) */}
                <div className={`
                    ${mobileView === 'schema' ? 'hidden md:flex' : 'flex'}
                    flex-col flex-1 min-w-0 min-h-0 p-3
                `}>
                    {selectedTable ? (
                        <>
                            {/* Table header */}
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={() => { setSelectedTable(null); setMobileView('schema'); }} className="md:hidden btn-ghost p-1">
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                                <span
                                    className="text-base font-bold px-3 py-1 rounded-md shadow-sm"
                                    style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                                >
                                    {TABLE_LABELS[selectedTable] ?? selectedTable}
                                </span>
                                <span className="text-surface-600 font-medium text-sm">
                                    {['verticals', 'brands', 'products', 'packing_units', 'items', 'prospects', 'routes', 'costs'].includes(selectedTable)
                                        ? '✏️ Editable — click cells to edit, Save All to persist'
                                        : '👁️ View-only — manage from its dedicated page'}
                                </span>
                            </div>
                            <div className="flex-1 min-h-0">
                                <TableGrid key={selectedTable} tableName={selectedTable} />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-4 bg-surface-50/50 rounded-lg border border-surface-200 relative overflow-hidden">
                            <div className="absolute inset-0 bg-grid-surface-200/50 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
                            <Database className="h-16 w-16 text-indigo-500 opacity-80" />
                            <div className="z-10">
                                <p className="text-surface-900 font-bold text-lg mb-2">
                                    Select a table to edit
                                </p>
                                <p className="text-surface-600 font-medium text-sm max-w-sm mx-auto">
                                    Click any table in the schema diagram on the left to view and edit its rows directly.
                                </p>
                                <p className="text-surface-500 text-xs mt-4">
                                    FK columns show dropdowns • Required fields glow red • Save All persists to Supabase
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
