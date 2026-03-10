import { useState, useEffect, useCallback } from 'react';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import {
    Plus, Calendar, MapPin, X, Navigation, CheckCircle, ExternalLink,
    Map as MapIcon, Users, Eye, ChevronDown, Clock, Phone, Tag, Pencil, Trash2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────
interface Route { id: number; name: string; description?: string; color_tag?: string; area_towns?: string[]; firm_id: string }
interface Prospect { id: number; prospectname: string; area_town?: string; contact?: string; route_id?: number; business_type?: string }
interface Visit { id: number; prospect_id: number; route_id?: number; visit_date: string; outcome?: string; notes?: string; next_visit_plan?: string }

// ─── Route Card ────────────────────────────────────────────────────
function RouteCard({ route, prospects, isSelected, onSelect, onMaps }: {
    route: Route; prospects: Prospect[]; isSelected: boolean; onSelect: () => void; onMaps: () => void;
}) {
    const rpCount = prospects.filter(p => p.route_id === route.id).length;
    const color = route.color_tag || '#6366f1';
    return (
        <div onClick={onSelect}
            className="rounded-xl p-3 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
            style={{
                background: isSelected ? `linear-gradient(135deg, ${color}18, ${color}08)` : 'rgba(30,41,59,0.5)',
                border: isSelected ? `2px solid ${color}` : '1px solid rgba(51,65,85,0.4)',
                boxShadow: isSelected ? `0 0 20px ${color}20` : 'none',
            }}>
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}25` }}>
                    <MapIcon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-100 truncate">{route.name}</p>
                    <p className="text-[11px] text-surface-500">{rpCount} prospects · {route.description || 'No description'}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); onMaps(); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Open in Google Maps">
                    <ExternalLink className="h-3.5 w-3.5 text-surface-400" />
                </button>
            </div>
        </div>
    );
}

// ─── Visit Card ────────────────────────────────────────────────────
function VisitCard({ visit, prospectName }: { visit: Visit; prospectName: string }) {
    const outcomeColors: Record<string, string> = {
        order_placed: '#22c55e', follow_up: '#f59e0b', no_response: '#64748b', rejected: '#ef4444',
    };
    const outcomeLabels: Record<string, string> = {
        order_placed: '🟢 Order Placed', follow_up: '🟡 Follow Up', no_response: '⚪ No Response', rejected: '🔴 Rejected',
    };
    return (
        <div className="rounded-lg p-2.5 transition-all hover:bg-white/[0.03]"
            style={{ background: 'rgba(30,41,59,0.3)', borderLeft: `3px solid ${outcomeColors[visit.outcome ?? ''] ?? '#475569'}` }}>
            <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-surface-500 flex-shrink-0" />
                <span className="text-xs font-medium text-surface-300">{visit.visit_date}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${outcomeColors[visit.outcome ?? ''] ?? '#475569'}20`, color: outcomeColors[visit.outcome ?? ''] ?? '#94a3b8' }}>
                    {outcomeLabels[visit.outcome ?? ''] ?? visit.outcome ?? '—'}
                </span>
            </div>
            <p className="text-xs text-surface-200 mt-1 ml-5">{prospectName}</p>
            {visit.notes && <p className="text-[11px] text-surface-500 mt-0.5 ml-5 italic">{visit.notes}</p>}
            {visit.next_visit_plan && <p className="text-[11px] text-surface-400 mt-0.5 ml-5 flex items-center gap-1"><Clock className="h-3 w-3" /> Next: {visit.next_visit_plan}</p>}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function Routes_() {
    const addToast = useAppStore(s => s.addToast);

    const [routes, setRoutes] = useState<Route[]>([]);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
    const [showVisitModal, setShowVisitModal] = useState(false);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [visitForm, setVisitForm] = useState({ prospect_id: '', visit_date: new Date().toISOString().split('T')[0], outcome: '', notes: '', next_visit_plan: '' });
    const [routeForm, setRouteForm] = useState({ name: '', description: '', color_tag: '#6366f1' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [r, p, v] = await Promise.all([DAL.routes.getAll(), DAL.prospects.getAll(), DAL.visits.getAll()]);
            setRoutes(r); setProspects(p); setVisits(v);
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setLoading(false); }
    }, [addToast]);

    useEffect(() => { load(); }, [load]);

    const routeProspects = selectedRoute ? prospects.filter(p => p.route_id === selectedRoute) : [];
    const routeVisits = selectedRoute ? visits.filter(v => routeProspects.some(p => p.id === v.prospect_id)).sort((a, b) => b.visit_date.localeCompare(a.visit_date)) : [];

    const openGoogleMaps = (routeId: number) => {
        const rp = prospects.filter(p => p.route_id === routeId);
        const towns = [...new Set(rp.map(p => p.area_town).filter(Boolean))];
        if (!towns.length) { addToast('No prospect towns on this route', 'info'); return; }
        window.open(`https://www.google.com/maps/dir/${towns.map(t => encodeURIComponent(t!)).join('/')}`, '_blank');
    };

    const saveVisit = async () => {
        if (!visitForm.prospect_id) { addToast('Select a prospect', 'error'); return; }
        try {
            await DAL.visits.add({ ...visitForm, prospect_id: Number(visitForm.prospect_id), route_id: selectedRoute ?? undefined } as any);
            addToast('Visit logged ✓', 'success');
            setShowVisitModal(false);
            setVisitForm({ prospect_id: '', visit_date: new Date().toISOString().split('T')[0], outcome: '', notes: '', next_visit_plan: '' });
            load();
        } catch (e: any) { addToast(e.message, 'error'); }
    };

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

    if (loading) return <div className="flex items-center justify-center h-64 text-surface-400 text-sm">Loading routes…</div>;

    return (
        <div className="animate-fade-in flex flex-col gap-3" style={{ height: 'calc(100vh - 64px)' }}>
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
                <MapIcon className="h-5 w-5 text-indigo-400" />
                <h1 className="text-sm font-bold text-surface-100">Routes & Visits</h1>
                <span className="text-xs text-surface-500">{routes.length} routes · {visits.length} visits</span>
                <div className="flex-1" />
                <button onClick={() => setShowRouteModal(true)} className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg">
                    <Plus className="h-3.5 w-3.5" /> New Route
                </button>
                <button onClick={() => { if (selectedRoute) setShowVisitModal(true); else addToast('Select a route first', 'info'); }}
                    className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-surface-600">
                    <Calendar className="h-3.5 w-3.5" /> Log Visit
                </button>
            </div>

            {/* Body: Routes list | Detail panel */}
            <div className="flex flex-1 min-h-0 gap-3">
                {/* Routes sidebar */}
                <div className="w-64 xl:w-72 overflow-y-auto space-y-1.5 flex-shrink-0 pr-1">
                    {routes.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                            <MapIcon className="h-10 w-10 text-surface-600" />
                            <p className="text-surface-400 text-sm">No routes yet</p>
                            <button onClick={() => setShowRouteModal(true)} className="btn-primary text-xs">Create First Route</button>
                        </div>
                    ) : routes.map(r => (
                        <RouteCard key={r.id} route={r} prospects={prospects} isSelected={selectedRoute === r.id}
                            onSelect={() => setSelectedRoute(r.id)} onMaps={() => openGoogleMaps(r.id)} />
                    ))}
                </div>

                {/* Detail panel */}
                <div className="flex-1 min-w-0 overflow-y-auto rounded-xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.3)' }}>
                    {!selectedRoute ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                            <Navigation className="h-10 w-10 text-surface-600" />
                            <p className="text-surface-400 text-sm">Select a route to see its prospects and visit history</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Route prospects */}
                            <div>
                                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Prospects on this route</h3>
                                {routeProspects.length === 0 ? <p className="text-xs text-surface-500 italic">No prospects assigned. Go to DB Editor → prospects to assign route_id.</p> : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {routeProspects.map(p => (
                                            <div key={p.id} className="rounded-lg p-2.5 flex items-center gap-2.5" style={{ background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(51,65,85,0.3)' }}>
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                                                    {p.prospectname.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-surface-200 truncate">{p.prospectname}</p>
                                                    <p className="text-[10px] text-surface-500 truncate flex items-center gap-1">{p.area_town && <><MapPin className="h-2.5 w-2.5" />{p.area_town}</>}{p.contact && <><Phone className="h-2.5 w-2.5 ml-1" />{p.contact}</>}</p>
                                                </div>
                                                {p.business_type && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-800 text-surface-400">{p.business_type}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Visit history */}
                            <div>
                                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Visit History</h3>
                                {routeVisits.length === 0 ? <p className="text-xs text-surface-500 italic">No visits logged for this route yet.</p> : (
                                    <div className="space-y-1.5">
                                        {routeVisits.map(v => <VisitCard key={v.id} visit={v} prospectName={prospects.find(p => p.id === v.prospect_id)?.prospectname ?? '—'} />)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── New Route Modal ─────────────────────────────────── */}
            {showRouteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowRouteModal(false)}>
                    <div className="rounded-2xl p-5 w-80" style={{ background: '#1e293b', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-surface-100">New Route</h3>
                            <button onClick={() => setShowRouteModal(false)}><X className="h-4 w-4 text-surface-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <div><label className="text-[11px] text-surface-400 block mb-1">Route Name *</label><input className="input-field text-sm w-full" value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))} /></div>
                            <div><label className="text-[11px] text-surface-400 block mb-1">Description</label><input className="input-field text-sm w-full" value={routeForm.description} onChange={e => setRouteForm(f => ({ ...f, description: e.target.value }))} /></div>
                            <div><label className="text-[11px] text-surface-400 block mb-1">Color Tag</label><input type="color" value={routeForm.color_tag} onChange={e => setRouteForm(f => ({ ...f, color_tag: e.target.value }))} className="w-full h-8 rounded cursor-pointer" /></div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={saveRoute} className="btn-primary flex-1 text-sm py-2 rounded-lg">Create</button>
                            <button onClick={() => setShowRouteModal(false)} className="btn-ghost flex-1 text-sm py-2 rounded-lg">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Log Visit Modal ────────────────────────────────── */}
            {showVisitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowVisitModal(false)}>
                    <div className="rounded-2xl p-5 w-80" style={{ background: '#1e293b', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-surface-100">Log Visit</h3>
                            <button onClick={() => setShowVisitModal(false)}><X className="h-4 w-4 text-surface-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] text-surface-400 block mb-1">Prospect *</label>
                                <select className="input-field text-sm w-full" value={visitForm.prospect_id} onChange={e => setVisitForm(f => ({ ...f, prospect_id: e.target.value }))}>
                                    <option value="">Select…</option>
                                    {routeProspects.map(p => <option key={p.id} value={p.id}>{p.prospectname}</option>)}
                                </select>
                            </div>
                            <div><label className="text-[11px] text-surface-400 block mb-1">Date</label><input type="date" className="input-field text-sm w-full" value={visitForm.visit_date} onChange={e => setVisitForm(f => ({ ...f, visit_date: e.target.value }))} /></div>
                            <div>
                                <label className="text-[11px] text-surface-400 block mb-1">Outcome</label>
                                <select className="input-field text-sm w-full" value={visitForm.outcome} onChange={e => setVisitForm(f => ({ ...f, outcome: e.target.value }))}>
                                    <option value="">Select…</option>
                                    <option value="order_placed">🟢 Order Placed</option>
                                    <option value="follow_up">🟡 Follow Up</option>
                                    <option value="no_response">⚪ No Response</option>
                                    <option value="rejected">🔴 Rejected</option>
                                </select>
                            </div>
                            <div><label className="text-[11px] text-surface-400 block mb-1">Notes</label><textarea className="input-field text-sm w-full h-14 resize-none" value={visitForm.notes} onChange={e => setVisitForm(f => ({ ...f, notes: e.target.value }))} /></div>
                            <div><label className="text-[11px] text-surface-400 block mb-1">Next Visit Plan</label><input type="date" className="input-field text-sm w-full" value={visitForm.next_visit_plan} onChange={e => setVisitForm(f => ({ ...f, next_visit_plan: e.target.value }))} /></div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={saveVisit} className="btn-primary flex-1 text-sm py-2 rounded-lg">Save</button>
                            <button onClick={() => setShowVisitModal(false)} className="btn-ghost flex-1 text-sm py-2 rounded-lg">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
