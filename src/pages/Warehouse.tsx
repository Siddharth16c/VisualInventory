import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Map as MapIcon,
  Edit3,
  RefreshCw,
  Warehouse as WarehouseIcon,
  Package,
  AlertCircle
} from 'lucide-react';
import { DAL, emitDbChange } from '@/db/dal';
import type { StoragePlace, StorageZone, StorageSlot, ItemLocation, Item } from '@/db/types';
import { useAppStore } from '@/store/store';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

// Spatial components
import SpatialMapper from '@/components/warehouse/SpatialMapper';
import SpatialViewer3D from '@/components/warehouse/SpatialViewer3D';
import StockMovementDialog from '@/components/warehouse/StockMovementDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabType = 'view' | 'edit';

// ─── Main Warehouse Page ──────────────────────────────────────────────────────

export default function Warehouse() {
  const addToast = useAppStore(s => s.addToast);
  const queryClient = useQueryClient();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>('view');

  // Selected place (store)
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);

  // Selected floor
  const [selectedFloor, setSelectedFloor] = useState<number>(0);


  // Selected zone (for stock dialog)
  const [selectedZone, setSelectedZone] = useState<StorageZone | null>(null);

  // Stock dialog visibility
  const [showStockDialog, setShowStockDialog] = useState(false);

  // ─── Data Fetching (TanStack Query) ────────────────────────────────────────

  const places = useSupabaseQuery<StoragePlace[]>(
    ['storage_places'],
    () => DAL.storage_places.getAll(),
    []
  );

  const zones = useSupabaseQuery<StorageZone[]>(
    ['storage_zones'],
    () => DAL.storage_zones.getAll(),
    []
  );

  const slots = useSupabaseQuery<StorageSlot[]>(
    ['storage_slots'],
    () => DAL.storage_slots.getAll(),
    []
  );

  const itemLocations = useSupabaseQuery<ItemLocation[]>(
    ['item_locations'],
    () => DAL.item_locations.getAll(),
    []
  );

  const items = useSupabaseQuery<Item[]>(
    ['items'],
    () => DAL.items.getAll(),
    []
  );

  const [searchQuery, setSearchQuery] = useState('');

  // Derived state: Find all zone IDs where the searched item is located
  const searchHighlightedZoneIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<number>();

    const query = searchQuery.toLowerCase();

    // Use the itemLocations (which are denormalized from the view in your DAL)
    // to find zones containing matching items
    const matchedZoneIds = itemLocations
      .filter(loc => {
        const item = items.find(i => i.id === loc.item_id);
        return (
          item?.item_name.toLowerCase().includes(query) ||
          item?.keyword_id?.toLowerCase().includes(query)
        );
      })
      .map(loc => (loc as any).zone_id); // zone_id comes from the item_location_full view

    return new Set<number>(matchedZoneIds);
  }, [searchQuery, itemLocations, items]);

  // Set initial place if not selected
  if (selectedPlaceId === null && places.length > 0) {
    setSelectedPlaceId(places[0].id);
  }

  // ─── Derived State ─────────────────────────────────────────────────────────

  const selectedPlace = useMemo(() =>
    places.find(p => p.id === selectedPlaceId),
    [places, selectedPlaceId]
  );

  const floorCount = selectedPlace?.floor_count || 1;

  // Filter zones for current place and floor
  const filteredZones = useMemo(() =>
    zones.filter(z =>
      z.place_id === selectedPlaceId &&
      !z.deleted_at
    ),
    [zones, selectedPlaceId]
  );

  // Get slots for selected zone
  const selectedZoneSlots = useMemo(() => {
    if (!selectedZone) return [];
    return slots.filter(s => s.zone_id === selectedZone.id && !s.deleted_at);
  }, [selectedZone, slots]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['storage_places'] }),
        queryClient.invalidateQueries({ queryKey: ['storage_zones'] }),
        queryClient.invalidateQueries({ queryKey: ['storage_slots'] }),
        queryClient.invalidateQueries({ queryKey: ['item_locations'] }),
        queryClient.invalidateQueries({ queryKey: ['items'] }),
      ]);
      addToast('Data refreshed', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to refresh', 'error');
    }
  }, [queryClient, addToast]);

  const handleZoneClick = useCallback((zone: StorageZone) => {
    setSelectedZone(zone);
    setSelectedFloor(zone.floor_num);
    setShowStockDialog(true);
  }, []);

  const handleCloseStockDialog = useCallback(() => {
    setShowStockDialog(false);
    setSelectedZone(null);
  }, []);

  const handleZoneCreate = useCallback((zone: StorageZone) => {
    addToast(`Zone "${zone.zone_name}" created`, 'success');
  }, [addToast]);

  const handleZoneDelete = useCallback((zoneId: number) => {
    addToast('Zone deleted', 'success');
  }, [addToast]);

  const handleStockMove = useCallback(async (itemId: number, fromSlotId: number, toSlotId: number, parcelCount: number) => {
    addToast(`Moved ${parcelCount} parcels of item #${itemId}`, 'success');
    // Data will auto-refresh via emitDbChange from the dialog
  }, [addToast]);

  const handleStockRemove = useCallback(async (itemId: number, slotId: number, parcelCount: number) => {
    addToast(`Marked ${parcelCount} parcels as sold`, 'success');
    // Data will auto-refresh via emitDbChange from the dialog
  }, [addToast]);

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const totalZones = filteredZones.length;
  const totalSlots = slots.filter(s =>
    filteredZones.some(z => z.id === s.zone_id) && !s.deleted_at
  ).length;
  const totalItems = itemLocations.filter(loc =>
    !loc.deleted_at && loc.parcel_count > 0
  ).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="h-6 w-6 text-indigo-400" />
            <h1 className="text-xl font-bold text-surface-700">Storage Visualisation</h1>
          </div>

          {/* Place Selector */}
          {places.length > 0 && (
            <select
              value={selectedPlaceId || ''}
              onChange={(e) => {
                setSelectedPlaceId(Number(e.target.value));
                setSelectedFloor(0);
                setSelectedZone(null);
              }}
              className="input-field text-sm"
            >
              {places.map(place => (
                <option key={place.id} value={place.id}>
                  {place.place_name}
                </option>
              ))}
            </select>
          )}

          {/* Floor Tabs */}
          {selectedPlace && floorCount > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: floorCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedFloor(i)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${selectedFloor === i
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  F{i}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-900">
              <MapIcon className="h-4 w-4" />
              {totalZones} zones
            </span>
            <span className="flex items-center gap-1.5 text-slate-900">
              <Package className="h-4 w-4" />
              {totalSlots} slots
            </span>
            <span className="flex items-center gap-1.5 text-slate-900">
              <WarehouseIcon className="h-4 w-4" />
              {totalItems} items
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="text-slate-900 btn-ghost text-sm flex items-center gap-2"
            title="Refresh all data"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700 pb-4">
        <button
          onClick={() => setActiveTab('view')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'view'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
        >
          <MapIcon className="h-4 w-4" />
          Map View
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'edit'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
        >
          <Edit3 className="h-4 w-4" />
          Edit Map
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-700 bg-white/95">
        {activeTab === 'edit' ? (
          /* Edit Map: ALWAYS show SpatialMapper — it handles empty places with inline creation */
          <SpatialMapper
            places={places}
            zones={zones}
            onZoneCreate={handleZoneCreate}
            onZoneDelete={handleZoneDelete}
          />
        ) : places.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <AlertCircle className="h-12 w-12 text-slate-600" />
            <div className="text-center">
              <p className="text-surface-400 text-sm mb-2">No storage places configured</p>
              <p className="text-surface-500 text-xs">Create a storage place in Edit Map mode to get started</p>
            </div>
            <button
              onClick={() => setActiveTab('edit')}
              className="btn-primary text-sm"
            >
              Go to Edit Map
            </button>
          </div>
        ) : (
          <SpatialViewer3D
            places={places}
            zones={zones}
            items={items}
            itemLocations={itemLocations}
            onZoneClick={handleZoneClick}
            externalHighlightedZoneIds={searchHighlightedZoneIds}
          />
        )}
      </div>

      {/* Stock Movement Dialog */}
      {showStockDialog && selectedZone && (
        <StockMovementDialog
          isOpen={showStockDialog}
          onClose={handleCloseStockDialog}
          sourceZone={selectedZone}
          slots={selectedZoneSlots}
          itemLocations={itemLocations}
          items={items}
          zones={zones}
          onMove={handleStockMove}
          onRemove={handleStockRemove}
        />
      )}
    </div>
  );
}
