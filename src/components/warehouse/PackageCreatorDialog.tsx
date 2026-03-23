import { useState, useMemo } from 'react';
import { X, Archive, Search, Plus, Trash2, PackageCheck } from 'lucide-react';
import { DAL, emitDbChange } from '@/db/dal';
import { PACKAGE_TYPE_LABELS, type PackageType, type StorageZone, type ItemLocation, type Item } from '@/db/types';

interface PackageCreatorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    zone: StorageZone;
    availableItems: { item: Item; location: ItemLocation }[];
}

export default function PackageCreatorDialog({ isOpen, onClose, zone, availableItems }: PackageCreatorDialogProps) {
    const [label, setLabel] = useState('');
    const [type, setType] = useState<PackageType>('cardboard_box');
    const [selectedEntries, setSelectedEntries] = useState<{ itemId: number; locationId: number; count: number }[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddBundleItem = (loc: ItemLocation) => {
        if (selectedEntries.find(e => e.locationId === loc.id)) return;
        setSelectedEntries([...selectedEntries, { itemId: loc.item_id, locationId: loc.id, count: 1 }]);
    };

    const handleSave = async () => {
        if (!label || selectedEntries.length === 0) return;
        setIsSaving(true);
        try {
            const pkg = await (DAL as any).storage_packages.create({
                zone_id: zone.id,
                package_type: type,
                package_label: label,
            });

            for (const entry of selectedEntries) {
                await (DAL as any).storage_packages.addItem({
                    package_id: pkg.id,
                    item_id: entry.itemId,
                    parcel_count: entry.count,
                    location_id: entry.locationId
                });
            }

            emitDbChange('storage_packages');
            onClose();
        } catch (err) {
            alert("Failed to create package");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Archive className="text-indigo-400" size={20} />
                        <h2 className="font-bold text-slate-100">Create Inventory Package</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Package Label</label>
                            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Holi Bundle A" className="input-field w-full" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Container Type</label>
                            <select value={type} onChange={e => setType(e.target.value as PackageType)} className="input-field w-full">
                                {Object.entries(PACKAGE_TYPE_LABELS).map(([val, lab]) => (
                                    <option key={val} value={val}>{lab}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">Add Items from {zone.zone_name}</h3>
                        <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                            {availableItems.map(ai => (
                                <div key={ai.location.id} className="flex justify-between items-center p-2 bg-slate-800 rounded-lg border border-slate-700">
                                    <span className="text-sm text-slate-200">{ai.item.item_name}</span>
                                    <button onClick={() => handleAddBundleItem(ai.location)} className="text-indigo-400 hover:text-indigo-300 p-1"><Plus size={18} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedEntries.length > 0 && (
                        <div className="border-t border-slate-700 pt-4">
                            <h3 className="text-sm font-semibold text-indigo-400 mb-3">Selected for Package</h3>
                            <div className="space-y-2">
                                {selectedEntries.map(entry => (
                                    <div key={entry.locationId} className="flex items-center gap-3">
                                        <span className="flex-1 text-sm text-slate-300">{availableItems.find(i => i.location.id === entry.locationId)?.item.item_name}</span>
                                        <input type="number" value={entry.count} onChange={e => {
                                            const val = parseInt(e.target.value);
                                            setSelectedEntries(prev => prev.map(p => p.locationId === entry.locationId ? { ...p, count: val } : p));
                                        }} className="w-16 bg-slate-800 border border-slate-700 rounded text-center text-sm" />
                                        <button onClick={() => setSelectedEntries(prev => prev.filter(p => p.locationId !== entry.locationId))} className="text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving || !label || selectedEntries.length === 0} className="btn-primary flex items-center gap-2 px-6">
                        <PackageCheck size={18} /> {isSaving ? 'Creating...' : 'Create Package'}
                    </button>
                </div>
            </div>
        </div>
    );
}