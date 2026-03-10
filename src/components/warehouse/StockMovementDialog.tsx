import { useState, useMemo } from 'react';
import { X, Package, MoveRight, Trash2, MapPin, Boxes } from 'lucide-react';
import type { StorageZone, StorageSlot, ItemLocation, Item } from '@/db/types';
import { DAL, emitDbChange } from '@/db/dal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockMovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceZone: StorageZone;
  slots: StorageSlot[];
  itemLocations: ItemLocation[];
  items: Item[];
  zones: StorageZone[];
  onMove?: (itemId: number, fromSlotId: number, toSlotId: number, parcelCount: number) => void;
  onRemove?: (itemId: number, slotId: number, parcelCount: number) => void;
}

interface SelectedItem {
  locationId: number;
  itemId: number;
  slotId: number;
  selected: boolean;
  quantity: number;
  maxQuantity: number;
  itemName: string;
  packagingType: string | null;
}

type ActionType = 'move' | 'remove' | null;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function StockMovementDialog({
  isOpen,
  onClose,
  sourceZone,
  slots,
  itemLocations,
  items,
  zones,
  onMove,
  onRemove,
}: StockMovementDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [destinationZoneId, setDestinationZoneId] = useState<number | ''>('');
  const [destinationSlotId, setDestinationSlotId] = useState<number | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get slot IDs for this zone
  const zoneSlotIds = useMemo(() => new Set(slots.map(s => s.id)), [slots]);

  // Build selectable items list
  const selectableItems = useMemo<SelectedItem[]>(() => {
    return itemLocations
      .filter(loc => zoneSlotIds.has(loc.slot_id) && !loc.deleted_at && loc.parcel_count > 0)
      .map(loc => {
        const item = items.find(i => i.id === loc.item_id);
        return {
          locationId: loc.id,
          itemId: loc.item_id,
          slotId: loc.slot_id,
          selected: false,
          quantity: 1,
          maxQuantity: loc.parcel_count,
          itemName: item?.item_name ?? `Item #${loc.item_id}`,
          packagingType: loc.packaging_type ?? item?.metadata?.packaging_type ?? null,
        };
      });
  }, [itemLocations, zoneSlotIds, items]);

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(selectableItems);

  // Update selectable items when props change
  useMemo(() => {
    setSelectedItems(selectableItems);
  }, [selectableItems]);

  // Get available destination zones (exclude source zone)
  const destinationZones = useMemo(() =>
    zones.filter(z => z.id !== sourceZone.id && !z.deleted_at),
    [zones, sourceZone.id]
  );

  // Get slots for selected destination zone
  const destinationZoneSlots = useMemo(() => {
    if (!destinationZoneId) return [];
    return slots.filter(s => s.zone_id === destinationZoneId && !s.deleted_at);
  }, [destinationZoneId, slots]);

  // Handlers
  const toggleItemSelection = (locationId: number) => {
    setSelectedItems(prev => prev.map(item =>
      item.locationId === locationId
        ? { ...item, selected: !item.selected }
        : item
    ));
  };

  const updateItemQuantity = (locationId: number, quantity: number) => {
    setSelectedItems(prev => prev.map(item =>
      item.locationId === locationId
        ? { ...item, quantity: Math.max(1, Math.min(quantity, item.maxQuantity)) }
        : item
    ));
  };

  const handleActionSelect = (action: ActionType) => {
    setSelectedAction(action);
    setError(null);
    if (action === 'move') {
      setDestinationZoneId('');
      setDestinationSlotId('');
    }
  };

  const resetForm = () => {
    setSelectedAction(null);
    setDestinationZoneId('');
    setDestinationSlotId('');
    setSelectedItems(selectableItems);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleConfirm = async () => {
    const itemsToProcess = selectedItems.filter(i => i.selected);

    if (itemsToProcess.length === 0) {
      setError('Please select at least one item');
      return;
    }

    if (selectedAction === 'move') {
      if (!destinationSlotId) {
        setError('Please select a destination slot');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      for (const item of itemsToProcess) {
        if (selectedAction === 'move') {
          // Use DAL to move items
          await DAL.item_locations.move({
            item_id: item.itemId,
            from_slot_id: item.slotId,
            to_slot_id: destinationSlotId as number,
            parcel_count: item.quantity,
          });

          // This triggers TanStack Query to re-fetch in Warehouse.tsx
          emitDbChange('item_locations');
          emitDbChange('stock_movements');

          // Call optional callback
          onMove?.(item.itemId, item.slotId, destinationSlotId as number, item.quantity);
        } else if (selectedAction === 'remove') {
          // Use DAL to remove items (sold)
          await DAL.item_locations.remove({
            item_id: item.itemId,
            slot_id: item.slotId,
            parcel_count: item.quantity,
            reason: 'sale',
          });

          // Also log a stock movement record for sales
          const itemDetails = items.find(i => i.id === item.itemId);
          const qtyChange = -(item.quantity * (itemDetails?.p_unit_per_parcel ?? 1) * (itemDetails?.p_unit ?? 1));

          await DAL.stock_movements.log({
            item_id: item.itemId,
            movement_type: 'sale',
            qty_change: qtyChange,
            parcel_change: -item.quantity,
            from_location_id: item.slotId,
            notes: `Sold from ${sourceZone.zone_name}`,
          });

          // Call optional callback
          onRemove?.(item.itemId, item.slotId, item.quantity);
        }
      }

      // Emit change events
      emitDbChange('stock_movements');
      emitDbChange('item_locations');

      // Close dialog on success
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = selectedItems.filter(i => i.selected).length;
  const totalParcelsToMove = selectedItems
    .filter(i => i.selected)
    .reduce((sum, i) => sum + i.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-xl shadow-2xl border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <Package className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Stock Movement
              </h2>
              <p className="text-sm text-slate-400">
                From: {sourceZone.zone_name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Action Selection */}
          <div className="flex gap-3">
            <button
              onClick={() => handleActionSelect('move')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${selectedAction === 'move'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'
                }`}
            >
              <MoveRight className="h-4 w-4" />
              Move to Zone
            </button>
            <button
              onClick={() => handleActionSelect('remove')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${selectedAction === 'remove'
                ? 'bg-red-600/20 border-red-500 text-red-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'
                }`}
            >
              <Trash2 className="h-4 w-4" />
              Remove (Sold)
            </button>
          </div>

          {/* Destination Selection (only for move) */}
          {selectedAction === 'move' && (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
              <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-400" />
                Destination
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Zone</label>
                  <select
                    value={destinationZoneId}
                    onChange={(e) => {
                      setDestinationZoneId(e.target.value ? Number(e.target.value) : '');
                      setDestinationSlotId('');
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select zone...</option>
                    {destinationZones.map(zone => (
                      <option key={zone.id} value={zone.id}>
                        {zone.zone_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Slot</label>
                  <select
                    value={destinationSlotId}
                    onChange={(e) => setDestinationSlotId(e.target.value ? Number(e.target.value) : '')}
                    disabled={!destinationZoneId}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select slot...</option>
                    {destinationZoneSlots.map(slot => (
                      <option key={slot.id} value={slot.id}>
                        {slot.slot_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Boxes className="h-4 w-4 text-indigo-400" />
                Items in Zone
              </h3>
              <span className="text-xs text-slate-500">
                {selectableItems.length} items available
              </span>
            </div>

            {selectableItems.length === 0 ? (
              <div className="text-center py-8 bg-slate-800/30 rounded-lg border border-slate-700 border-dashed">
                <Package className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No items in this zone</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedItems.map((item) => (
                  <div
                    key={item.locationId}
                    className={`p-3 rounded-lg border transition-all ${item.selected
                      ? 'bg-indigo-600/10 border-indigo-500/50'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItemSelection(item.locationId)}
                        className="mt-1 h-4 w-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm text-slate-200 truncate">
                            {item.itemName}
                          </h4>
                          {item.packagingType && (
                            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                              {item.packagingType}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">
                            Available: {item.maxQuantity} parcels
                          </span>

                          {item.selected && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Qty:</span>
                              <input
                                type="number"
                                min={1}
                                max={item.maxQuantity}
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.locationId, Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-600/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Summary */}
          {selectedCount > 0 && (
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-300">
                <span className="font-medium">{selectedCount}</span> items selected,
                <span className="font-medium"> {totalParcelsToMove}</span> parcels to
                <span className={`font-medium ${selectedAction === 'remove' ? 'text-red-400' : 'text-indigo-400'}`}>
                  {selectedAction === 'move' ? ' move' : selectedAction === 'remove' ? ' remove (sold)' : ' ...'}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !selectedAction || selectedCount === 0}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${selectedAction === 'remove'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {selectedAction === 'move' && <MoveRight className="h-4 w-4" />}
                {selectedAction === 'remove' && <Trash2 className="h-4 w-4" />}
                {selectedAction === 'move' ? 'Move Items' : selectedAction === 'remove' ? 'Mark as Sold' : 'Confirm'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
