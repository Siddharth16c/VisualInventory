import { useState, useEffect, useMemo } from 'react';
import { X, Search, PackagePlus, Box, Plus } from 'lucide-react';
import { DAL, emitDbChange } from '@/db/dal';
import { PACKAGE_TYPE_LABELS, type PackageType, type StorageZone, type Item, type StorageSlot } from '@/db/types';

interface PlaceStockDialogProps {
    isOpen: boolean;
    onClose: () => void;
    zone: StorageZone;
    items: Item[];
}

export default function PlaceStockDialog({ isOpen, onClose, zone, items }: PlaceStockDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [slotId, setSlotId] = useState<number | ''>('');
    const [packagingType, setPackagingType] = useState<PackageType | ''>('');

    const [slots, setSlots] = useState<StorageSlot[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch slots for this specific zone
    useEffect(() => {
        if (isOpen && zone) {
            (DAL as any).storage_slots.getAll(zone.id).then(setSlots);
        }
    }, [isOpen, zone]);

    // Filter items based on search
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items.slice(0, 50); // Show first 50 by default
        const query = searchQuery.toLowerCase();
        return items.filter(i =>
            i.item_name.toLowerCase().includes(query) ||
            i.keyword_id?.toLowerCase().includes(query)
        ).slice(0, 50);
    }, [items, searchQuery]);

    const handleSave = async () => {
        if (!selectedItemId || quantity <= 0) return;
        setIsSaving(true);

        try {
            let finalSlotId = slotId as number;

            // Auto-generate a "General Area" slot if the merchant hasn't made any slots yet
            if (!finalSlotId) {
                if (slots.length > 0) {
                    finalSlotId = slots[0].id; // Fallback to first available
                } else {
                    const newSlot = await (DAL as any).storage_slots.create({
                        zone_id: zone.id,
                        slot_name: 'General Area',
                        notes: 'Auto-generated for loose stock'
                    });
                    finalSlotId = newSlot.id;
                }
            }

            await (DAL as any).item_locations.create({
                item_id: selectedItemId,
                slot_id: finalSlotId,
                parcel_count: quantity,
                packaging_type: packagingType || null,
                is_primary: true
            });

            emitDbChange('item_locations');
            onClose();
        } catch (err: any) {
            alert("Failed to place stock: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const selectedItem = items.find(i => i.id === selectedItemId);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <PackagePlus className="text-emerald-400" size={20} />
                        <h2 className="font-bold text-slate-100">Place Stock in {zone.zone_name}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {/* Step 1: Find Item */}
                    <div>
                        <label className="text-xs text-slate-400 block mb-1.5 font-medium">1. Select Item from Inventory</label>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name or keyword ID..."
                                className="input-field w-full pl-9"
                            />
                        </div>

                        {!selectedItemId && (
                            <div className="max-h-40 overflow-y-auto border border-slate-700 rounded-lg bg-slate-800/50">
                                {filteredItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedItemId(item.id)}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-700 flex justify-between items-center border-b border-slate-700/50 last:border-0"
                                    >
                                        <span className="text-sm text-slate-200 truncate pr-2">{item.item_name}</span>
                                        <span className="text-xs text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                                            Available: {item.stock_parcels}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedItem && (
                            <div className="flex justify-between items-center p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Box className="text-emerald-400" size={16} />
                                    <span className="text-sm font-medium text-emerald-100">{selectedItem.item_name}</span>
                                </div>
                                <button onClick={() => setSelectedItemId(null)} className="text-xs text-emerald-400 hover:text-emerald-300 underline">Change</button>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Placement Details */}
                    {selectedItemId && (
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Parcels to Place</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={quantity}
                                        onChange={e => setQuantity(Number(e.target.value))}
                                        className="input-field w-full text-lg font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Specific Slot (Optional)</label>
                                    <select
                                        value={slotId}
                                        onChange={e => setSlotId(Number(e.target.value))}
                                        className="input-field w-full"
                                    >
                                        <option value="">-- General Area --</option>
                                        {slots.map(s => <option key={s.id} value={s.id}>{s.slot_name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Packaging State (Optional)</label>
                                <select
                                    value={packagingType}
                                    onChange={e => setPackagingType(e.target.value as PackageType)}
                                    className="input-field w-full"
                                >
                                    <option value="">Loose / Unpackaged</option>
                                    {Object.entries(PACKAGE_TYPE_LABELS).map(([val, lab]) => (
                                        <option key={val} value={val}>{lab}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedItemId || quantity <= 0 || isSaving}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={16} /> {isSaving ? 'Placing...' : 'Place in Zone'}
                    </button>
                </div>
            </div>
        </div>
    );
}