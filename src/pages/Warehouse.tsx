import { useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Package, X, Search, ToggleLeft, ToggleRight, Layers } from 'lucide-react';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';

// ─── Color helpers ────────────────────────────────────────────────────────────
const SECTION_PALETTE = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316'];
const sectionColor = (s: string) => SECTION_PALETTE[s.charCodeAt(0) % SECTION_PALETTE.length];
const EMPTY_COLOR = '#1e293b';
const HIGHLIGHT_COLOR = '#fbbf24';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Cell { id?: number; floor: number; section: string; row_num: number; col_num: number; item_id: number | null; parcel_count: number; items?: { item_name: string; retail_price_container: number } }
interface LayoutConfig { id: number; name: string; floors: number; sections_per_floor: number; rows_per_section: number; cols_per_row: number }

// ─── 3D Parcel Box ────────────────────────────────────────────────────────────
function ParcelBox({ cell, isHighlighted, onClick }: { cell: Cell; isHighlighted: boolean; onClick: () => void }) {
    const h = Math.max(0.1, Math.min((cell.parcel_count / 10) * 0.8 + 0.1, 1.2));
    const color = isHighlighted ? HIGHLIGHT_COLOR : cell.item_id ? sectionColor(cell.section) : EMPTY_COLOR;
    const cx = cell.col_num * 1.1;
    const rz = -(cell.row_num * 1.1);

    return (
        <group position={[cx, h / 2, rz]} onClick={onClick}>
            <RoundedBox args={[0.9, h, 0.9]} radius={0.05} smoothness={3}>
                <meshStandardMaterial color={color} emissive={isHighlighted ? '#f59e0b' : (cell.item_id ? color : '#000')} emissiveIntensity={isHighlighted ? 0.6 : 0.1} roughness={0.5} metalness={0.2} />
            </RoundedBox>
            {cell.parcel_count > 0 && (
                <Text position={[0, 0.05, 0.46]} fontSize={0.18} color="#f1f5f9" anchorX="center" anchorY="middle" font="/fonts/inter.woff" characters="0123456789">
                    {String(cell.parcel_count)}
                </Text>
            )}
        </group>
    );
}

// ─── 2D Grid Cell ────────────────────────────────────────────────────────────
function GridCell2D({ cell, isHighlighted, onClick }: { cell: Cell; isHighlighted: boolean; onClick: () => void }) {
    const bg = isHighlighted ? '#fbbf24' : cell.item_id ? sectionColor(cell.section) : '#1e293b';
    const title = cell.items?.item_name ?? (cell.item_id ? `Item #${cell.item_id}` : '');
    return (
        <div
            title={title ? `${title} (${cell.parcel_count} parcels)` : 'Empty'}
            onClick={onClick}
            style={{ background: bg, border: `1px solid ${isHighlighted ? '#f59e0b' : '#334155'}`, opacity: cell.item_id ? 1 : 0.35 }}
            className="rounded cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center text-[9px] font-bold text-white select-none"
        >
            {cell.parcel_count > 0 ? cell.parcel_count : ''}
        </div>
    );
}

// ─── Cell Editor Modal ────────────────────────────────────────────────────────
function CellEditor({ cell, items, warehouseId, layout, onClose, onSaved }: {
    cell: Cell; items: any[]; warehouseId: number; layout: LayoutConfig; onClose: () => void; onSaved: () => void;
}) {
    const addToast = useAppStore(s => s.addToast);
    const [itemId, setItemId] = useState<string>(String(cell.item_id ?? ''));
    const [count, setCount] = useState(cell.parcel_count);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await DAL.warehouse.updateCell(warehouseId, cell.floor, cell.section, cell.row_num, cell.col_num, itemId ? Number(itemId) : null, count);
            addToast('Cell updated', 'success');
            onSaved();
            onClose();
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="glass rounded-xl p-5 w-72" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-surface-100">
                        {`${cell.section}${cell.row_num + 1}-${cell.col_num + 1} · Floor ${cell.floor + 1}`}
                    </span>
                    <button onClick={onClose}><X className="h-4 w-4 text-surface-400" /></button>
                </div>
                <label className="text-xs text-surface-400 block mb-1">Item</label>
                <select value={itemId} onChange={e => setItemId(e.target.value)} className="input-field text-sm w-full mb-3">
                    <option value="">— Empty —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
                <label className="text-xs text-surface-400 block mb-1">Parcel Count</label>
                <input type="number" min="0" value={count} onChange={e => setCount(Number(e.target.value))} className="input-field text-sm w-full mb-4" />
                <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Warehouse Page ──────────────────────────────────────────────────────
export default function Warehouse() {
    const addToast = useAppStore(s => s.addToast);
    const [layouts, setLayouts] = useState<LayoutConfig[]>([]);
    const [activeLayout, setActiveLayout] = useState<LayoutConfig | null>(null);
    const [cells, setCells] = useState<Cell[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [floor, setFloor] = useState(0);
    const [view3D, setView3D] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
    const [editCell, setEditCell] = useState<Cell | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNewLayout, setShowNewLayout] = useState(false);
    const [newLayout, setNewLayout] = useState({ name: 'Main Warehouse', floors: 1, sections_per_floor: 4, rows_per_section: 8, cols_per_row: 5 });

    const loadLayouts = useCallback(async () => {
        try {
            const data = await DAL.warehouse.getLayouts();
            setLayouts(data);
            if (data.length > 0 && !activeLayout) setActiveLayout(data[0]);
        } catch (e: any) { addToast(e.message, 'error'); }
    }, [addToast, activeLayout]);

    const loadCells = useCallback(async () => {
        if (!activeLayout) return;
        setLoading(true);
        try {
            const [cellData, itemData] = await Promise.all([
                DAL.warehouse.getCells(activeLayout.id),
                DAL.items.getAll(),
            ]);
            setCells(cellData);
            setItems(itemData);
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setLoading(false); }
    }, [activeLayout, addToast]);

    useEffect(() => { loadLayouts(); }, []);
    useEffect(() => { loadCells(); }, [loadCells]);

    // Search: highlight all cells containing the searched item
    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (!q.trim() || !activeLayout) { setHighlightedCells(new Set()); return; }
        const matched = items.filter(i => i.item_name.toLowerCase().includes(q.toLowerCase()));
        if (!matched.length) { setHighlightedCells(new Set()); return; }
        const keys = new Set<string>();
        for (const item of matched) {
            const found = await DAL.warehouse.searchItem(activeLayout.id, item.id);
            found.forEach((c: any) => keys.add(`${c.floor}-${c.section}-${c.row_num}-${c.col_num}`));
        }
        setHighlightedCells(keys);
    };

    const cellKey = (c: Cell) => `${c.floor}-${c.section}-${c.row_num}-${c.col_num}`;

    // Current floor cells
    const floorCells = useMemo(() => cells.filter(c => c.floor === floor), [cells, floor]);

    // Build a cell map for fast lookup
    const cellMap = useMemo(() => {
        const m: Record<string, Cell> = {};
        floorCells.forEach(c => { m[cellKey(c)] = c; });
        return m;
    }, [floorCells]);

    // Generate virtual grid from layout config
    const sections = useMemo(() => {
        if (!activeLayout) return [];
        return Array.from({ length: activeLayout.sections_per_floor }, (_, si) => {
            const sectionLetter = String.fromCharCode(65 + si); // A, B, C…
            return {
                name: sectionLetter,
                rows: Array.from({ length: activeLayout.rows_per_section }, (_, ri) =>
                    Array.from({ length: activeLayout.cols_per_row }, (_, ci) => {
                        const key = `${floor}-${sectionLetter}-${ri}-${ci}`;
                        return cellMap[key] ?? { floor, section: sectionLetter, row_num: ri, col_num: ci, item_id: null, parcel_count: 0 };
                    })
                ),
            };
        });
    }, [activeLayout, cellMap, floor]);

    // Stats
    const usedCells = cells.filter(c => c.item_id !== null && c.parcel_count > 0).length;
    const totalCells = activeLayout ? activeLayout.sections_per_floor * activeLayout.rows_per_section * activeLayout.cols_per_row * activeLayout.floors : 0;
    const totalParcels = cells.reduce((s, c) => s + c.parcel_count, 0);

    const handleCreateLayout = async () => {
        try {
            await DAL.warehouse.addLayout(newLayout);
            addToast('Warehouse created!', 'success');
            setShowNewLayout(false);
            loadLayouts();
        } catch (e: any) { addToast(e.message, 'error'); }
    };

    if (!layouts.length && !loading) {
        return (
            <div className="animate-fade-in flex flex-col items-center justify-center gap-4 h-full">
                <Package className="h-12 w-12 text-surface-600" />
                <p className="text-surface-400 text-sm">No warehouse configured yet</p>
                <button onClick={() => setShowNewLayout(true)} className="btn-primary text-sm">Create Warehouse</button>
                {showNewLayout && (
                    <div className="glass rounded-xl p-5 w-80 flex flex-col gap-3">
                        <p className="text-sm font-bold text-surface-200">New Warehouse</p>
                        {[
                            { key: 'name', label: 'Name', type: 'text' },
                            { key: 'floors', label: 'Floors', type: 'number' },
                            { key: 'sections_per_floor', label: 'Sections per Floor', type: 'number' },
                            { key: 'rows_per_section', label: 'Rows per Section', type: 'number' },
                            { key: 'cols_per_row', label: 'Columns per Row', type: 'number' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="text-xs text-surface-400 block mb-0.5">{f.label}</label>
                                <input type={f.type} className="input-field text-sm w-full"
                                    value={(newLayout as any)[f.key]}
                                    onChange={e => setNewLayout(prev => ({ ...prev, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} />
                            </div>
                        ))}
                        <button onClick={handleCreateLayout} className="btn-primary text-sm">Create</button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="animate-fade-in flex flex-col gap-3" style={{ height: 'calc(100vh - 64px)' }}>
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2">
                <Package className="h-5 w-5 text-indigo-400" />
                <h1 className="text-sm font-bold text-surface-100">Warehouse</h1>
                {/* Layout selector */}
                <select className="input-field text-xs py-1" value={activeLayout?.id ?? ''} onChange={e => setActiveLayout(layouts.find(l => l.id === Number(e.target.value)) ?? null)}>
                    {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button onClick={() => setShowNewLayout(v => !v)} className="btn-ghost text-xs">+ New</button>

                {/* Floor tabs */}
                {activeLayout && Array.from({ length: activeLayout.floors }, (_, i) => (
                    <button key={i} onClick={() => setFloor(i)} className={`text-xs px-2.5 py-1 rounded-full ${floor === i ? 'bg-indigo-600 text-white' : 'btn-ghost text-surface-400'}`}>
                        <Layers className="h-3 w-3 inline mr-0.5" /> Floor {i + 1}
                    </button>
                ))}

                <div className="flex-1" />

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-surface-400" />
                    <input
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search item…"
                        className="input-field text-xs pl-6 py-1 w-36"
                    />
                </div>

                {/* 2D / 3D toggle */}
                <button onClick={() => setView3D(v => !v)} className="btn-ghost text-xs flex items-center gap-1">
                    {view3D ? <ToggleRight className="h-4 w-4 text-indigo-400" /> : <ToggleLeft className="h-4 w-4" />}
                    {view3D ? '3D' : '2D'}
                </button>
            </div>

            {/* Stats bar */}
            <div className="flex gap-4 text-xs text-surface-400 px-1">
                <span>Used: <strong className="text-surface-200">{usedCells}</strong> / {totalCells} cells</span>
                <span>Utilisation: <strong className="text-indigo-300">{totalCells > 0 ? ((usedCells / totalCells) * 100).toFixed(1) : 0}%</strong></span>
                <span>Total Parcels: <strong className="text-green-300">{totalParcels}</strong></span>
                {highlightedCells.size > 0 && <span className="text-amber-400">🔍 {highlightedCells.size} cells highlighted</span>}
            </div>

            {/* New layout form */}
            {showNewLayout && (
                <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-end">
                    {[
                        { key: 'name', label: 'Name', type: 'text' },
                        { key: 'floors', label: 'Floors', type: 'number' },
                        { key: 'sections_per_floor', label: 'Sections', type: 'number' },
                        { key: 'rows_per_section', label: 'Rows', type: 'number' },
                        { key: 'cols_per_row', label: 'Cols', type: 'number' },
                    ].map(f => (
                        <div key={f.key} className="flex-1 min-w-[100px]">
                            <label className="text-xs text-surface-400 block mb-0.5">{f.label}</label>
                            <input type={f.type} className="input-field text-xs py-1 w-full"
                                value={(newLayout as any)[f.key]}
                                onChange={e => setNewLayout(prev => ({ ...prev, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} />
                        </div>
                    ))}
                    <button onClick={handleCreateLayout} className="btn-primary text-xs py-1 px-3">Create</button>
                    <button onClick={() => setShowNewLayout(false)} className="btn-ghost text-xs py-1">Cancel</button>
                </div>
            )}

            {/* Main view */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl" style={{ border: '1px solid rgba(99,102,241,0.15)', background: '#0f172a' }}>
                {loading ? (
                    <div className="flex items-center justify-center h-full text-surface-500 text-sm">Loading warehouse…</div>
                ) : view3D ? (
                    /* ── 3D View ──────────────────────────────────────── */
                    <Canvas camera={{ position: [8, 8, 12], fov: 45 }} style={{ height: '100%' }}>
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[10, 10, 5]} intensity={1.2} />
                        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#6366f1" />
                        {/* Floor plate */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[activeLayout ? activeLayout.cols_per_row * 0.55 : 0, -0.05, -(activeLayout ? activeLayout.rows_per_section * 0.55 : 0)]}>
                            <planeGeometry args={[(activeLayout?.cols_per_row ?? 5) * 1.1 + 1, (activeLayout?.rows_per_section ?? 8) * 1.1 + 1]} />
                            <meshStandardMaterial color="#1e293b" />
                        </mesh>
                        {/* Section groups */}
                        {sections.map((sec, si) => (
                            <group key={sec.name} position={[0, 0, -(si * (activeLayout!.rows_per_section * 1.1 + 1.5))]}>
                                {sec.rows.map((row, ri) =>
                                    row.map((cell, ci) => (
                                        <ParcelBox
                                            key={`${ri}-${ci}`}
                                            cell={cell}
                                            isHighlighted={highlightedCells.has(cellKey(cell))}
                                            onClick={() => setEditCell(cell)}
                                        />
                                    ))
                                )}
                                <Text position={[-1.2, 1, -(activeLayout!.rows_per_section * 0.55)]} fontSize={0.4} color={sectionColor(sec.name)} anchorX="center" rotation={[0, 0.3, 0]}>
                                    {`Section ${sec.name}`}
                                </Text>
                            </group>
                        ))}
                        <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
                    </Canvas>
                ) : (
                    /* ── 2D Grid View ─────────────────────────────────── */
                    <div className="h-full overflow-auto p-3 flex flex-wrap gap-4">
                        {sections.map(sec => (
                            <div key={sec.name} className="flex-1 min-w-[140px]">
                                <div className="text-xs font-bold mb-1.5 flex items-center gap-1.5">
                                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: sectionColor(sec.name) }} />
                                    <span style={{ color: sectionColor(sec.name) }}>Section {sec.name}</span>
                                </div>
                                <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${activeLayout?.cols_per_row ?? 5}, minmax(0,1fr))` }}>
                                    {sec.rows.map((row, ri) =>
                                        row.map((cell, ci) => (
                                            <GridCell2D
                                                key={`${ri}-${ci}`}
                                                cell={cell}
                                                isHighlighted={highlightedCells.has(cellKey(cell))}
                                                onClick={() => setEditCell(cell)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex gap-3 text-xs text-surface-500 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-[#1e293b] border border-[#334155]" /> Empty</span>
                {['A', 'B', 'C', 'D'].map(s => (
                    <span key={s} className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: sectionColor(s) }} /> Section {s}
                    </span>
                ))}
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-amber-400" /> Search match</span>
                <span className="ml-auto">Height (3D) = parcel count · Click any cell to assign an item</span>
            </div>

            {/* Cell editor modal */}
            {editCell && (
                <CellEditor
                    cell={editCell}
                    items={items}
                    warehouseId={activeLayout!.id}
                    layout={activeLayout!}
                    onClose={() => setEditCell(null)}
                    onSaved={loadCells}
                />
            )}
        </div>
    );
}
