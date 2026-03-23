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
    <div className="animate-fade-in flex flex-col h-full gap-2 sm:gap-4">
      {/* Header - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700 pb-3 sm:pb-4 gap-3">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" />
            <h1 className="text-base sm:text-xl font-bold text-surface-700">Storage</h1>
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
              className="input-field text-xs sm:text-sm py-1 sm:py-1.5"
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
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all ${selectedFloor === i
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

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          {/* Stats - Compact on mobile */}
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-slate-400">
            <span className="flex items-center gap-1 text-slate-900">
              <MapIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{totalZones} zones</span>
              <span className="sm:hidden">{totalZones}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-900">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{totalSlots} slots</span>
              <span className="sm:hidden">{totalSlots}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-900 hidden sm:flex">
              <WarehouseIcon className="h-4 w-4" />
              {totalItems} items
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="text-slate-900 btn-ghost text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 py-1 sm:py-1.5"
            title="Refresh all data"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-700 pb-3 sm:pb-4">
        <button
          onClick={() => setActiveTab('view')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === 'view'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
        >
          <MapIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Map View</span>
          <span className="sm:hidden">View</span>
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === 'edit'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
        >
          <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Edit Map</span>
          <span className="sm:hidden">Edit</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-lg sm:rounded-xl border border-slate-700 bg-white/95">
        {activeTab === 'edit' ? (
          /* Edit Map: ALWAYS show SpatialMapper — it handles empty places with inline creation */
          <SpatialMapper
            places={places}
            zones={zones}
            onZoneCreate={handleZoneCreate}
            onZoneDelete={handleZoneDelete}
          />
        ) : places.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 sm:gap-4">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600" />
            <div className="text-center px-4">
              <p className="text-surface-400 text-xs sm:text-sm mb-2">No storage places configured</p>
              <p className="text-surface-500 text-[10px] sm:text-xs">Create a storage place in Edit Map mode to get started</p>
            </div>
            <button
              onClick={() => setActiveTab('edit')}
              className="btn-primary text-xs sm:text-sm"
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
