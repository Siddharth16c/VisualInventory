import { useState, useEffect, useCallback } from 'react';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import {
    Plus, Calendar, MapPin, X, ExternalLink, ChevronRight, ChevronDown,
    Phone, Tag, Clock, Users, Navigation, Pencil, Trash2, ClipboardList,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────
interface Route { id: number; name: string; description?: string; color_tag?: string; firm_id?: string }
interface Prospect { id: number; prospectname: string; area_town?: string; contact?: string; route_id?: number; business_type?: string; notes?: string }
interface Visit { id: number; prospect_id: number; route_id?: number; visit_date: string; outcome?: string; notes?: string; next_visit_plan?: string; firm_id?: string }

// ─── Outcome labels ──────────────────────────────────────────────
const OUTCOMES: Record<string, { label: string; color: string; emoji: string }> = {
    order_placed: { label: 'Order Placed', color: '#22c55e', emoji: '🟢' },
    follow_up: { label: 'Follow Up', color: '#f59e0b', emoji: '🟡' },
    no_response: { label: 'No Response', color: '#64748b', emoji: '⚪' },
    rejected: { label: 'Rejected', color: '#ef4444', emoji: '🔴' },
};

// ─── Prospect Card ────────────────────────────────────────────────
function ProspectCard({ prospect, visits, onEdit, onLogVisit }: {
    prospect: Prospect; visits: Visit[]; onEdit: () => void; onLogVisit: () => void;
}) {
    const recentVisits = visits.filter(v => v.prospect_id === prospect.id).sort((a, b) => b.visit_date.localeCompare(a.visit_date));
    const lastVisit = recentVisits[0];
    return (
        <div className="rounded-lg p-3 bg-white border border-surface-100 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-brand-50 text-brand-600 flex-shrink-0">
                    {prospect.prospectname.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900 truncate">{prospect.prospectname}</p>
                    <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
                        {prospect.contact && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{prospect.contact}</span>}
                        {prospect.business_type && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{prospect.business_type}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={onLogVisit} title="Log visit" className="p-1 rounded hover:bg-surface-100 transition-colors text-surface-400 hover:text-brand-600">
                        <ClipboardList className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={onEdit} title="Edit" className="p-1 rounded hover:bg-surface-100 transition-colors text-surface-400 hover:text-brand-600">
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            {lastVisit && (
                <div className="mt-2 ml-10 text-[11px] text-surface-500 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Last: {lastVisit.visit_date}
                    {lastVisit.outcome && <span className="ml-1">{OUTCOMES[lastVisit.outcome]?.emoji ?? ''} {OUTCOMES[lastVisit.outcome]?.label ?? lastVisit.outcome}</span>}
                </div>
            )}
        </div>
    );
}

// ─── Main FieldOps Page ──────────────────────────────────────────
export default function FieldOps() {
    const addToast = useAppStore(s => s.addToast);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set());
    const [expandedTowns, setExpandedTowns] = useState<Set<string>>(new Set());

    // Modals
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [showVisitModal, setShowVisitModal] = useState(false);
    const [showProspectModal, setShowProspectModal] = useState(false);
    const [editProspect, setEditProspect] = useState<Prospect | null>(null);
    const [visitContext, setVisitContext] = useState<{ routeId: number; prospectId?: number }>({ routeId: 0 });

    // Forms
    const [routeForm, setRouteForm] = useState({ name: '', description: '', color_tag: '#6366f1' });
    const [visitForm, setVisitForm] = useState({ prospect_id: '', visit_date: new Date().toISOString().split('T')[0], outcome: '', notes: '', next_visit_plan: '' });
    const [prospectForm, setProspectForm] = useState<Partial<Prospect>>({ prospectname: '', area_town: '', contact: '', business_type: '', notes: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [r, p, v] = await Promise.all([DAL.routes.getAll(), DAL.prospects.getAll(), DAL.visits.getAll()]);
            setRoutes(r); setProspects(p); setVisits(v);
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setLoading(false); }
    }, [addToast]);

    useEffect(() => { load(); }, [load]);

    // ── Helpers ──
    const toggleRoute = (id: number) => {
        setExpandedRoutes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleTown = (key: string) => {
        setExpandedTowns(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
    };

    const getRouteTowns = (routeId: number): Map<string, Prospect[]> => {
        const rp = prospects.filter(p => p.route_id === routeId);
        const map = new Map<string, Prospect[]>();
        rp.forEach(p => {
            const town = p.area_town || 'Unassigned';
            if (!map.has(town)) map.set(town, []);
            map.get(town)!.push(p);
        });
        return map;
    };

    const openGoogleMaps = (routeId: number) => {
        const rp = prospects.filter(p => p.route_id === routeId);
        const towns = [...new Set(rp.map(p => p.area_town).filter(Boolean))];
        if (!towns.length) { addToast('No prospect towns on this route', 'info'); return; }
        window.open(`https://www.google.com/maps/dir/${towns.map(t => encodeURIComponent(t!)).join('/')}`, '_blank');
    };

    // ── Future visits ──
    const today = new Date().toISOString().split('T')[0];
    const futureVisits = visits
        .filter(v => v.next_visit_plan && v.next_visit_plan >= today)
        .sort((a, b) => (a.next_visit_plan ?? '').localeCompare(b.next_visit_plan ?? ''));

    // ── Past visits (recent 20) ──
    const pastVisits = visits
        .filter(v => v.visit_date <= today)
        .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
        .slice(0, 20);

    // ── CRUD handlers ──
    const saveRoute = async () => {
        if (!routeForm.name) { addToast('Route name required', 'error'); return; }
        try {
            await DAL.routes.add(routeForm as any);
            addToast('Route created ✓', 'success');
            setShowRouteModal(false);
            setRouteForm({ name: '', description: '', color_tag: '#6366f1' });
            load();
        } catch (e: any) { addToast(e.message, 'error'); }
    };

    const saveVisit = async () => {
        if (!visitForm.prospect_id) { addToast('Select a prospect', 'error'); return; }
        try {
            await DAL.visits.add({
                ...visitForm,
                prospect_id: Number(visitForm.prospect_id),
                route_id: visitContext.routeId || undefined,
            } as any);
            addToast('Visit logged ✓', 'success');
            setShowVisitModal(false);
            setVisitForm({ prospect_id: '', visit_date: new Date().toISOString().split('T')[0], outcome: '', notes: '', next_visit_plan: '' });
            load();
        } catch (e: any) { addToast(e.message, 'error'); }
    };

    const saveProspect = async () => {
        if (!prospectForm.prospectname) { addToast('Name required', 'error'); return; }
        try {
            if (editProspect?.id) {
                await DAL.prospects.update(editProspect.id, prospectForm as any);
                addToast('Prospect updated', 'success');
            } else {
                await DAL.prospects.add(prospectForm as any);
                addToast('Prospect added', 'success');
            }
            setShowProspectModal(false);
            setEditProspect(null);
            setProspectForm({ prospectname: '', area_town: '', contact: '', business_type: '', notes: '' });
            load();
        } catch (e: any) { addToast(e.message, 'error'); }
    };

    const deleteRoute = async (id: number) => {
        if (!confirm('Delete this route? Prospects will be unassigned.')) return;
        try { await DAL.routes.delete(id); addToast('Route deleted', 'success'); load(); }
        catch (e: any) { addToast(e.message, 'error'); }
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-surface-400 text-sm">Loading field ops…</div>;

    // ── Unassigned prospects ──
    const unassigned = prospects.filter(p => !p.route_id || !routes.some(r => r.id === p.route_id));

    return (
        <div className="animate-fade-in space-y-4" style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <MapPin className="h-5 w-5 text-brand-500" />
                <h1 className="text-lg font-bold text-surface-900">Field Ops</h1>
                <span className="text-xs text-surface-500">{routes.length} routes · {prospects.length} prospects · {visits.length} visits</span>
                <div className="flex-1" />
                <button onClick={() => { setEditProspect(null); setProspectForm({ prospectname: '', area_town: '', contact: '', business_type: '', notes: '' }); setShowProspectModal(true); }}
                    className="text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-surface-100 text-surface-700 border border-surface-200 hover:bg-surface-200 transition-colors">
                    <Users className="h-3.5 w-3.5" /> Add Prospect
                </button>
                <button onClick={() => setShowRouteModal(true)}
                    className="text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> New Route
                </button>
            </div>

            {/* ── Routes Hierarchy ── */}
            <div className="space-y-2">
                {routes.map(route => {
                    const isExpanded = expandedRoutes.has(route.id);
                    const towns = getRouteTowns(route.id);
                    const totalProspects = Array.from(towns.values()).reduce((s, a) => s + a.length, 0);
                    const color = route.color_tag || '#6366f1';
                    const townNames = [...towns.keys()].filter(t => t !== 'Unassigned');

                    return (
                        <div key={route.id} className="rounded-xl border border-surface-200 overflow-hidden bg-white">
                            {/* Route header */}
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors"
                                onClick={() => toggleRoute(route.id)}>
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-surface-900">{route.name}</span>
                                    {townNames.length > 0 && (
                                        <span className="text-xs text-surface-500 ml-2">
                                            ▸ {townNames.join(', ')}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-surface-500 flex-shrink-0">{totalProspects} prospect{totalProspects !== 1 ? 's' : ''}</span>
                                <button onClick={e => { e.stopPropagation(); openGoogleMaps(route.id); }}
                                    className="p-1 rounded hover:bg-surface-200 transition-colors" title="Google Maps">
                                    <ExternalLink className="h-3.5 w-3.5 text-surface-400" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); setVisitContext({ routeId: route.id }); setShowVisitModal(true); }}
                                    className="p-1 rounded hover:bg-surface-200 transition-colors" title="Log a visit">
                                    <Calendar className="h-3.5 w-3.5 text-surface-400" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); deleteRoute(route.id); }}
                                    className="p-1 rounded hover:bg-red-50 transition-colors" title="Delete route">
                                    <Trash2 className="h-3.5 w-3.5 text-surface-300 hover:text-red-500" />
                                </button>
                            </div>

                            {/* Expanded: Towns → Prospects */}
                            {isExpanded && (
                                <div className="border-t border-surface-100 px-4 py-2 space-y-2">
                                    {towns.size === 0 ? (
                                        <p className="text-xs text-surface-500 italic py-2">No prospects assigned to this route yet.</p>
                                    ) : (
                                        Array.from(towns.entries()).map(([town, townProspects]) => {
                                            const townKey = `${route.id}:${town}`;
                                            const isTownExpanded = expandedTowns.has(townKey);
                                            return (
                                                <div key={townKey}>
                                                    <div className="flex items-center gap-2 cursor-pointer py-1 hover:bg-surface-50 rounded px-2 -mx-2"
                                                        onClick={() => toggleTown(townKey)}>
                                                        {isTownExpanded ? <ChevronDown className="h-3 w-3 text-surface-400" /> : <ChevronRight className="h-3 w-3 text-surface-400" />}
                                                        <MapPin className="h-3 w-3 text-surface-400" />
                                                        <span className="text-xs font-medium text-surface-700">{town}</span>
                                                        <span className="text-[11px] text-surface-400">({townProspects.length})</span>
                                                    </div>
                                                    {isTownExpanded && (
                                                        <div className="ml-6 mt-1 space-y-1.5">
                                                            {townProspects.map(p => (
                                                                <ProspectCard key={p.id} prospect={p} visits={visits}
                                                                    onEdit={() => { setEditProspect(p); setProspectForm(p); setShowProspectModal(true); }}
                                                                    onLogVisit={() => { setVisitContext({ routeId: route.id, prospectId: p.id }); setVisitForm(f => ({ ...f, prospect_id: String(p.id) })); setShowVisitModal(true); }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Unassigned prospects */}
                {unassigned.length > 0 && (
                    <div className="rounded-xl border border-dashed border-surface-300 bg-surface-50 overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-100 transition-colors"
                            onClick={() => toggleRoute(-1)}>
                            {expandedRoutes.has(-1) ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
                            <span className="text-sm font-medium text-surface-500">Unassigned Prospects</span>
                            <span className="text-xs text-surface-400">{unassigned.length}</span>
                        </div>
                        {expandedRoutes.has(-1) && (
                            <div className="border-t border-surface-200 px-4 py-2 space-y-1.5">
                                {unassigned.map(p => (
                                    <ProspectCard key={p.id} prospect={p} visits={visits}
                                        onEdit={() => { setEditProspect(p); setProspectForm(p); setShowProspectModal(true); }}
                                        onLogVisit={() => { setVisitContext({ routeId: 0, prospectId: p.id }); setVisitForm(f => ({ ...f, prospect_id: String(p.id) })); setShowVisitModal(true); }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Visit History ── */}
            {pastVisits.length > 0 && (
                <div className="rounded-xl border border-surface-200 bg-white p-4">
                    <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Visit History (Recent)
                    </h3>
                    <div className="space-y-1.5">
                        {pastVisits.map(v => {
                            const p = prospects.find(pr => pr.id === v.prospect_id);
                            const r = routes.find(rt => rt.id === v.route_id);
                            const o = OUTCOMES[v.outcome ?? ''];
                            return (
                                <div key={v.id} className="flex items-center gap-2 text-xs text-surface-600 py-1 px-2 rounded hover:bg-surface-50">
                                    <span className="w-[75px] text-surface-400 flex-shrink-0">{v.visit_date}</span>
                                    <span className="text-surface-300">→</span>
                                    {r && <span className="text-surface-500">{r.name}</span>}
                                    <span className="text-surface-300">→</span>
                                    <span className="font-medium text-surface-800">{p?.prospectname ?? '—'}</span>
                                    {o && <span className="ml-auto" style={{ color: o.color }}>{o.emoji} {o.label}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Future Plans ── */}
            {futureVisits.length > 0 && (
                <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                    <h3 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Future Plans
                    </h3>
                    <div className="space-y-1.5">
                        {futureVisits.map(v => {
                            const p = prospects.find(pr => pr.id === v.prospect_id);
                            const r = routes.find(rt => rt.id === v.route_id);
                            return (
                                <div key={v.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-white border border-brand-100">
                                    <Calendar className="h-3 w-3 text-brand-500" />
                                    <span className="font-medium text-brand-700">{v.next_visit_plan}</span>
                                    <span className="text-surface-300">→</span>
                                    {r && <span className="text-surface-600">{r.name}</span>}
                                    <span className="text-surface-300">→</span>
                                    <span className="text-surface-800">{p?.prospectname ?? '—'}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── New Route Modal ── */}
            {showRouteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowRouteModal(false)}>
                    <div className="glass rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-surface-900">New Route</h3>
                            <button onClick={() => setShowRouteModal(false)}><X className="h-4 w-4 text-surface-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <div><label className="text-xs text-surface-500 block mb-1">Route Name *</label><input className="input-field text-sm w-full" value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))} /></div>
                            <div><label className="text-xs text-surface-500 block mb-1">Description</label><input className="input-field text-sm w-full" value={routeForm.description} onChange={e => setRouteForm(f => ({ ...f, description: e.target.value }))} /></div>
                            <div><label className="text-xs text-surface-500 block mb-1">Color</label><input type="color" value={routeForm.color_tag} onChange={e => setRouteForm(f => ({ ...f, color_tag: e.target.value }))} className="w-full h-8 rounded cursor-pointer" /></div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={saveRoute} className="btn-primary flex-1 text-sm py-2 rounded-lg">Create</button>
                            <button onClick={() => setShowRouteModal(false)} className="btn-secondary flex-1 text-sm py-2 rounded-lg">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Log Visit Modal ── */}
            {showVisitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowVisitModal(false)}>
                    <div className="glass rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-surface-900">Log Visit</h3>
                            <button onClick={() => setShowVisitModal(false)}><X className="h-4 w-4 text-surface-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-surface-500 block mb-1">Prospect *</label>
                                <select className="input-field text-sm w-full" value={visitForm.prospect_id} onChange={e => setVisitForm(f => ({ ...f, prospect_id: e.target.value }))}>
                                    <option value="">Select…</option>
                                    {(visitContext.routeId ? prospects.filter(p => p.route_id === visitContext.routeId) : prospects).map(p => (
                                        <option key={p.id} value={p.id}>{p.prospectname}</option>
                                    ))}
                                </select>
                            </div>
                            <div><label className="text-xs text-surface-500 block mb-1">Date</label><input type="date" className="input-field text-sm w-full" value={visitForm.visit_date} onChange={e => setVisitForm(f => ({ ...f, visit_date: e.target.value }))} /></div>
                            <div>
                                <label className="text-xs text-surface-500 block mb-1">Outcome</label>
                                <select className="input-field text-sm w-full" value={visitForm.outcome} onChange={e => setVisitForm(f => ({ ...f, outcome: e.target.value }))}>
                                    <option value="">Select…</option>
                                    <option value="order_placed">🟢 Order Placed</option>
                                    <option value="follow_up">🟡 Follow Up</option>
                                    <option value="no_response">⚪ No Response</option>
                                    <option value="rejected">🔴 Rejected</option>
                                </select>
                            </div>
                            <div><label className="text-xs text-surface-500 block mb-1">Notes</label><textarea className="input-field text-sm w-full h-14 resize-none" value={visitForm.notes} onChange={e => setVisitForm(f => ({ ...f, notes: e.target.value }))} /></div>
                            <div><label className="text-xs text-surface-500 block mb-1">Next Visit Plan</label><input type="date" className="input-field text-sm w-full" value={visitForm.next_visit_plan} onChange={e => setVisitForm(f => ({ ...f, next_visit_plan: e.target.value }))} /></div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={saveVisit} className="btn-primary flex-1 text-sm py-2 rounded-lg">Save Visit</button>
                            <button onClick={() => setShowVisitModal(false)} className="btn-secondary flex-1 text-sm py-2 rounded-lg">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Prospect Modal ── */}
            {showProspectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowProspectModal(false)}>
                    <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-surface-900">{editProspect ? 'Edit Prospect' : 'Add Prospect'}</h3>
                            <button onClick={() => setShowProspectModal(false)}><X className="h-4 w-4 text-surface-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <div><label className="text-xs text-surface-500 block mb-1">Name *</label><input className="input-field w-full" value={prospectForm.prospectname || ''} onChange={e => setProspectForm(f => ({ ...f, prospectname: e.target.value }))} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs text-surface-500 block mb-1">Area / Town</label><input className="input-field w-full" value={prospectForm.area_town || ''} onChange={e => setProspectForm(f => ({ ...f, area_town: e.target.value }))} /></div>
                                <div><label className="text-xs text-surface-500 block mb-1">Contact</label><input className="input-field w-full" value={prospectForm.contact || ''} onChange={e => setProspectForm(f => ({ ...f, contact: e.target.value }))} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs text-surface-500 block mb-1">Business Type</label><input className="input-field w-full" value={prospectForm.business_type || ''} onChange={e => setProspectForm(f => ({ ...f, business_type: e.target.value }))} /></div>
                                <div>
                                    <label className="text-xs text-surface-500 block mb-1">Route</label>
                                    <select className="input-field w-full" value={prospectForm.route_id ?? ''} onChange={e => setProspectForm(f => ({ ...f, route_id: e.target.value ? Number(e.target.value) : undefined }))}>
                                        <option value="">None</option>
                                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-xs text-surface-500 block mb-1">Notes</label><textarea className="input-field w-full h-16 resize-none" value={prospectForm.notes || ''} onChange={e => setProspectForm(f => ({ ...f, notes: e.target.value }))} /></div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={saveProspect} className="btn-primary flex-1 text-sm py-2 rounded-lg">Save</button>
                            <button onClick={() => setShowProspectModal(false)} className="btn-secondary flex-1 text-sm py-2 rounded-lg">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
