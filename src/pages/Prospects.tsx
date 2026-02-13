import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Prospect } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import { Plus, Search, Pencil, Trash2, X, MapPin, Phone, Building } from 'lucide-react';

function ProspectModal({ prospect, onClose }: { prospect: Prospect | null; onClose: () => void }) {
    const addToast = useAppStore((s) => s.addToast);
    const [form, setForm] = useState<Partial<Prospect>>(
        prospect || { prospectname: '', area_town: '', contact: '', business_type: '', notes: '' }
    );

    const handleSave = async () => {
        if (!form.prospectname) {
            addToast('Name is required', 'error');
            return;
        }
        try {
            if (prospect?.id) {
                await db.prospects.update(prospect.id, form);
                addToast('Prospect updated', 'success');
            } else {
                await db.prospects.add({ ...form, createdAt: new Date().toISOString() } as Prospect);
                addToast('Prospect added', 'success');
            }
            onClose();
        } catch {
            addToast('Save failed', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
                <div className="flex justify-between mb-5">
                    <h3 className="text-lg font-semibold">{prospect ? 'Edit Prospect' : 'Add Prospect'}</h3>
                    <button onClick={onClose} className="btn-ghost p-1.5"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-surface-400 mb-1 block">Name *</label>
                        <input className="input-field" value={form.prospectname || ''} onChange={(e) => setForm({ ...form, prospectname: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Area / Town</label>
                            <input className="input-field" value={form.area_town || ''} onChange={(e) => setForm({ ...form, area_town: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Contact</label>
                            <input className="input-field" value={form.contact || ''} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-surface-400 mb-1 block">Business Type</label>
                        <input className="input-field" value={form.business_type || ''} onChange={(e) => setForm({ ...form, business_type: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-surface-400 mb-1 block">Notes</label>
                        <textarea className="input-field h-20 resize-none" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                </div>
                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleSave} className="btn-primary flex-1">Save</button>
                </div>
            </div>
        </div>
    );
}

export default function Prospects() {
    const prospects = useLiveQuery(() => db.prospects.toArray()) || [];
    const addToast = useAppStore((s) => s.addToast);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editProspect, setEditProspect] = useState<Prospect | null>(null);

    const filtered = prospects.filter(
        (p) =>
            p.prospectname.toLowerCase().includes(search.toLowerCase()) ||
            p.area_town?.toLowerCase().includes(search.toLowerCase()) ||
            p.business_type?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async (id: number) => {
        if (confirm('Delete this prospect?')) {
            await db.prospects.delete(id);
            addToast('Prospect deleted', 'info');
        }
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                    <input className="input-field pl-10" placeholder="Search prospects..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <button onClick={() => { setEditProspect(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Prospect
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.length === 0 ? (
                    <div className="col-span-full glass rounded-xl p-12 text-center">
                        <p className="text-surface-500">No prospects found</p>
                    </div>
                ) : (
                    filtered.map((p) => (
                        <div key={p.id} className="glass rounded-xl p-4 card-hover">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-semibold text-surface-100">{p.prospectname}</h3>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditProspect(p); setShowModal(true); }} className="btn-ghost p-1"><Pencil className="h-4 w-4 text-brand-400" /></button>
                                    <button onClick={() => handleDelete(p.id!)} className="btn-ghost p-1"><Trash2 className="h-4 w-4 text-red-400" /></button>
                                </div>
                            </div>
                            <div className="space-y-1.5 text-sm text-surface-400">
                                {p.area_town && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{p.area_town}</div>}
                                {p.contact && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{p.contact}</div>}
                                {p.business_type && <div className="flex items-center gap-2"><Building className="h-3.5 w-3.5" />{p.business_type}</div>}
                            </div>
                            {p.notes && <p className="text-xs text-surface-500 mt-2 line-clamp-2">{p.notes}</p>}
                        </div>
                    ))
                )}
            </div>

            {showModal && <ProspectModal prospect={editProspect} onClose={() => { setShowModal(false); setEditProspect(null); }} />}
        </div>
    );
}
