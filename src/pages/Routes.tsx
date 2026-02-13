import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Visit, type TravelRecord } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import { Plus, Calendar, MapPin, X, Navigation, CheckCircle } from 'lucide-react';

export default function Routes_() {
    const visits = useLiveQuery(() => db.visits.orderBy('visit_date').reverse().limit(50).toArray()) || [];
    const travelRecords = useLiveQuery(() => db.travel_records.orderBy('travel_date').reverse().limit(50).toArray()) || [];
    const prospects = useLiveQuery(() => db.prospects.toArray()) || [];
    const addToast = useAppStore((s) => s.addToast);

    const [showVisitModal, setShowVisitModal] = useState(false);
    const [showTravelModal, setShowTravelModal] = useState(false);

    const [visitForm, setVisitForm] = useState<Partial<Visit>>({
        prospect_id: 0,
        visit_date: new Date().toISOString().split('T')[0],
        outcome: '',
        notes: '',
    });

    const [travelForm, setTravelForm] = useState<Partial<TravelRecord>>({
        travel_date: new Date().toISOString().split('T')[0],
        route_name: '',
        is_ideal: false,
        notes: '',
    });

    const handleSaveVisit = async () => {
        if (!visitForm.prospect_id) {
            addToast('Select a prospect', 'error');
            return;
        }
        await db.visits.add(visitForm as Visit);
        addToast('Visit logged', 'success');
        setShowVisitModal(false);
    };

    const handleSaveTravel = async () => {
        if (!travelForm.route_name) {
            addToast('Route name required', 'error');
            return;
        }
        await db.travel_records.add(travelForm as TravelRecord);
        addToast('Travel recorded', 'success');
        setShowTravelModal(false);
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-3">
                <button onClick={() => setShowVisitModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Log Visit
                </button>
                <button onClick={() => setShowTravelModal(true)} className="btn-secondary flex items-center gap-2">
                    <Navigation className="h-4 w-4" /> Log Travel
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Visits */}
                <div>
                    <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">Recent Visits</h3>
                    <div className="space-y-2">
                        {visits.length === 0 ? (
                            <div className="glass rounded-xl p-8 text-center text-surface-500 text-sm">No visits yet</div>
                        ) : (
                            visits.map((v) => {
                                const prospect = prospects.find((p) => p.id === v.prospect_id);
                                return (
                                    <div key={v.id} className="glass rounded-xl p-3 card-hover">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-4 w-4 text-brand-400 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{prospect?.prospectname || 'Unknown'}</p>
                                                <p className="text-xs text-surface-500">{v.visit_date} · {v.outcome}</p>
                                            </div>
                                        </div>
                                        {v.notes && <p className="text-xs text-surface-500 mt-1 ml-7">{v.notes}</p>}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Travel Records */}
                <div>
                    <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">Travel Records</h3>
                    <div className="space-y-2">
                        {travelRecords.length === 0 ? (
                            <div className="glass rounded-xl p-8 text-center text-surface-500 text-sm">No travel records yet</div>
                        ) : (
                            travelRecords.map((t) => (
                                <div key={t.id} className="glass rounded-xl p-3 card-hover">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{t.route_name || `Route #${t.route_id}`}</p>
                                            <p className="text-xs text-surface-500">{t.travel_date}</p>
                                        </div>
                                        {t.is_ideal && (
                                            <span className="badge-success"><CheckCircle className="h-3 w-3" /> Ideal</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Visit Modal */}
            {showVisitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
                        <div className="flex justify-between mb-5">
                            <h3 className="text-lg font-semibold">Log Visit</h3>
                            <button onClick={() => setShowVisitModal(false)} className="btn-ghost p-1.5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Prospect</label>
                                <select className="input-field" value={visitForm.prospect_id || ''} onChange={(e) => setVisitForm({ ...visitForm, prospect_id: parseInt(e.target.value) || 0 })}>
                                    <option value="">Select...</option>
                                    {prospects.map((p) => <option key={p.id} value={p.id}>{p.prospectname}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Date</label>
                                <input type="date" className="input-field" value={visitForm.visit_date || ''} onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Outcome</label>
                                <select className="input-field" value={visitForm.outcome || ''} onChange={(e) => setVisitForm({ ...visitForm, outcome: e.target.value })}>
                                    <option value="">Select...</option>
                                    <option value="order_placed">Order Placed</option>
                                    <option value="follow_up">Follow Up</option>
                                    <option value="no_response">No Response</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Notes</label>
                                <textarea className="input-field h-16 resize-none" value={visitForm.notes || ''} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowVisitModal(false)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSaveVisit} className="btn-primary flex-1">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Travel Modal */}
            {showTravelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
                        <div className="flex justify-between mb-5">
                            <h3 className="text-lg font-semibold">Log Travel</h3>
                            <button onClick={() => setShowTravelModal(false)} className="btn-ghost p-1.5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Route Name</label>
                                <input className="input-field" value={travelForm.route_name || ''} onChange={(e) => setTravelForm({ ...travelForm, route_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Date</label>
                                <input type="date" className="input-field" value={travelForm.travel_date || ''} onChange={(e) => setTravelForm({ ...travelForm, travel_date: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={travelForm.is_ideal || false} onChange={(e) => setTravelForm({ ...travelForm, is_ideal: e.target.checked })} className="rounded" />
                                <label className="text-sm text-surface-300">Ideal route</label>
                            </div>
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Notes</label>
                                <textarea className="input-field h-16 resize-none" value={travelForm.notes || ''} onChange={(e) => setTravelForm({ ...travelForm, notes: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowTravelModal(false)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSaveTravel} className="btn-primary flex-1">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
