import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { StoragePlace, StorageZone, Item, ItemLocation } from '@/db/types';
import {
  Building2,
  Layers,
  Package,
  Search,
  X,
  MapPin,
  Boxes,
  Tag
} from 'lucide-react';
import { DAL, emitDbChange } from '@/db/dal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpatialViewer3DProps {
  places: StoragePlace[];
  zones: StorageZone[];
  items: Item[];
  itemLocations: ItemLocation[];
  onZoneClick?: (zone: StorageZone) => void;
  externalHighlightedZoneIds?: Set<number>;
}

interface ZoneStockInfo {
  item: Item;
  location: ItemLocation;
  packagingType: string | null;
  parcelCount: number;
}

interface StockByZone {
  [zoneId: number]: ZoneStockInfo[];
}

// ─── Color Palette ────────────────────────────────────────────────────────────

const ZONE_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6', // teal
  '#84cc16', // lime
];

const getZoneColor = (index: number) => ZONE_COLORS[index % ZONE_COLORS.length];


// ─── 3D Components ────────────────────────────────────────────────────────────

function SlotMarker({
  position,
  label,
  onClick
}: {
  position: THREE.Vector3;
  label: string;
  onClick: () => void
}) {
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* The Visual Pin */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
        <meshStandardMaterial color="#6366f1" />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.5} />
      </mesh>

      {/* Floating Label */}
      <Html distanceFactor={10} position={[0, 1.3, 0]} center>
        <div className="bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded-full border border-indigo-500 whitespace-nowrap shadow-xl">
          {label}
        </div>
      </Html>
    </group>
  );
}
/**
 * FloorPlane - A single flat floor plane (no stacking)
 */
function FloorPlane({
  isSelected,
  imageUrl,
  width = 20,
  height = 20,
}: {
  isSelected: boolean;
  imageUrl: string | null;
  width?: number;
  height?: number;
}) {
  const texture = useMemo(() => {
    if (!imageUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(imageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [imageUrl]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        color={texture ? 0xffffff : 0x475569}
        transparent
        opacity={texture ? 0.95 : 0.85}
      />
    </mesh>
  );
}

function CameraController({ targetPoint }: { targetPoint: THREE.Vector3 | null }) {
  const { camera, controls } = useThree();

  useFrame((state) => {
    if (targetPoint && controls) {
      // Smoothly move the camera to a "birds-eye" view of the point
      const idealOffset = new THREE.Vector3(targetPoint.x + 10, targetPoint.y + 15, targetPoint.z + 10);
      camera.position.lerp(idealOffset, 0.05);

      // Smoothly move the OrbitControls target to the center of the zone
      (controls as any).target.lerp(targetPoint, 0.05);
      (controls as any).update();
    }
  });

  return null;
}

/**
 * ZonePolygon - Renders a colored polygon zone
 */
function ZonePolygon({
  zone,
  floorY,
  isHighlighted,
  isSelected,
  stockCount,
  onClick,
  onPointerOver,
  onPointerOut
}: {
  zone: StorageZone;
  floorY: number;
  isHighlighted: boolean;
  isSelected: boolean;
  stockCount: number;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const coords = zone.polygon_coords || [];

  // Create shape from polygon coordinates
  const { shape, geometry } = useMemo(() => {
    if (coords.length < 3) return { shape: null, geometry: null };

    const shape = new THREE.Shape();
    shape.moveTo(coords[0][0], coords[0][1]);
    for (let i = 1; i < coords.length; i++) {
      shape.lineTo(coords[i][0], coords[i][1]);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    return { shape, geometry };
  }, [coords]);

  // Create outline points for Line component
  const linePoints = useMemo(() => {
    if (coords.length < 3) return [];
    const points = coords.map(([x, y]) => [x, 0.02, y] as [number, number, number]);
    points.push([coords[0][0], 0.02, coords[0][1]]);
    return points;
  }, [coords]);

  const baseColor = zone.zone_color || getZoneColor(zone.id);
  const fillOpacity = isSelected ? 0.7 : isHighlighted ? 0.6 : 0.4;
  const zOffset = isSelected ? 0.05 : 0.02;
  const pulseScale = isHighlighted ? 1.02 : 1;

  // Pulse animation for highlighted zones
  useFrame((state) => {
    if (groupRef.current && isHighlighted) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.01;
      groupRef.current.scale.setScalar(scale);
    }
  });

  if (!geometry || linePoints.length === 0) return null;

  return (
    <group
      ref={groupRef}
      position={[0, floorY + zOffset, 0]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); onPointerOver(); }}
      onPointerOut={(e) => { e.stopPropagation(); onPointerOut(); }}
    >
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[pulseScale, pulseScale, 1]}
      >
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={fillOpacity}
          side={THREE.DoubleSide}
          emissive={isHighlighted ? baseColor : '#000000'}
          emissiveIntensity={isHighlighted ? 0.3 : 0}
        />
      </mesh>

      <Line
        points={linePoints}
        color={isSelected ? '#fbbf24' : isHighlighted ? '#ffffff' : baseColor}
        lineWidth={isSelected ? 3 : isHighlighted ? 2.5 : 2}
      />

      {/* Zone label with stock count */}
      <Html position={[0, 0.3, 0]} center>
        <div className={`px-2 py-1 rounded-lg text-xs font-medium shadow-lg transition-all ${isSelected
          ? 'bg-amber-500 text-white'
          : isHighlighted
            ? 'bg-white text-slate-900'
            : 'bg-slate-800/90 text-slate-200'
          }`}>
          <div className="flex items-center gap-1">
            <span>{zone.zone_name}</span>
            {stockCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                {stockCount}
              </span>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Scene - Main 3D scene component (single flat floor view)
 */
function Scene({
  selectedPlace,
  selectedFloor,
  zones,
  highlightedZoneIds,
  selectedZoneId,
  stockByZone,
  onZoneClick,
  onZoneHover
}: {
  selectedPlace: StoragePlace | null;
  selectedFloor: number;
  zones: StorageZone[];
  highlightedZoneIds: Set<number>;
  selectedZoneId: number | null;
  stockByZone: StockByZone;
  onZoneClick: (zone: StorageZone) => void;
  onZoneHover: (zoneId: number | null) => void;
}) {
  // Only show zones for the currently selected floor
  const floorZones = zones.filter(z => z.floor_num === selectedFloor);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#818cf8" />

      {/* Grid — lighter colors */}
      <gridHelper
        args={[30, 30, 0x475569, 0x334155]}
        position={[0, -0.1, 0]}
      />

      {/* Single flat floor plane */}
      <FloorPlane
        isSelected={true}
        imageUrl={selectedPlace?.top_view_image_url || null}
        width={20}
        height={20}
      />

      {/* Render zones for selected floor only */}
      {floorZones.map(zone => {
        const stockCount = stockByZone[zone.id]?.length || 0;
        return (
          <ZonePolygon
            key={zone.id}
            zone={zone}
            floorY={0}
            isHighlighted={highlightedZoneIds.has(zone.id)}
            isSelected={selectedZoneId === zone.id}
            stockCount={stockCount}
            onClick={() => onZoneClick(zone)}
            onPointerOver={() => onZoneHover(zone.id)}
            onPointerOut={() => onZoneHover(null)}
          />
        );
      })}

      <OrbitControls
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.1}
        enablePan
        enableZoom
        enableRotate
      />
    </>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function SpatialViewer3D({
  places,
  zones,
  items,
  itemLocations,
  onZoneClick,
  externalHighlightedZoneIds
}: SpatialViewer3DProps) {
  // State
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(places[0]?.id || null);
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<{
    x: number;
    z: number;
    zone_id: number | null
  } | null>(null);

  const [newSlotName, setNewSlotName] = useState('');

  // Rehydration fix: auto-select first place if places prop updates
  useEffect(() => {
    if (places.length > 0 && !selectedPlaceId) {
      setSelectedPlaceId(places[0].id);
    }
  }, [places, selectedPlaceId]);

  // Derived state
  const selectedPlace = useMemo(() =>
    places.find(p => p.id === selectedPlaceId),
    [places, selectedPlaceId]
  );

  // Inside SpatialViewer3D
  const handleFloorClick = useCallback((point: { x: number; y: number }) => {
    if (!isAddingMarker) return;

    // We map the 3D point (x, z) to our pending marker state
    // Note: Three.js uses Y as up, so floor coordinates are X and Z
    setPendingMarker({
      x: point.x,
      z: point.y, // This is the 'z' coordinate from the 3D plane
      zone_id: hoveredZoneId // Auto-associates with the zone the mouse is currently over
    });
  }, [isAddingMarker, hoveredZoneId]);

  const filteredZones = useMemo(() =>
    zones.filter(z =>
      z.place_id === selectedPlaceId &&
      !z.deleted_at
    ),
    [zones, selectedPlaceId]
  );

  const handleSaveSlot = async () => {
    if (!pendingMarker || !newSlotName.trim()) return;

    try {
      // 1. Create the slot in Layer 3
      const newSlot = await DAL.storage_slots.create({
        zone_id: pendingMarker.zone_id || 0, // Fallback if not over a zone
        slot_name: newSlotName.trim(),
        notes: JSON.stringify({ x: pendingMarker.x, z: pendingMarker.z }) // Store coords in notes or metadata
      });

      emitDbChange('storage_slots');
      setPendingMarker(null);
      setNewSlotName('');
      setIsAddingMarker(false);
    } catch (err) {
      alert("Error saving landmark: " + err);
    }
  };

  const selectedZone = useMemo(() =>
    zones.find(z => z.id === selectedZoneId),
    [zones, selectedZoneId]
  );

  // Compute stock by zone using the itemLocations prop (derived from item_location_full view)
  const stockByZone = useMemo<StockByZone>(() => {
    const result: StockByZone = {};

    // Initialize empty arrays for all zones to ensure they are hoverable
    zones.forEach(zone => {
      result[zone.id] = [];
    });

    // Populate result with items from the itemLocations prop
    // Note: itemLocations here should be cast/treated as ItemLocationFull[]
    itemLocations.forEach((loc: any) => {
      if (loc.deleted_at || !loc.zone_id) return;

      const item = items.find(i => i.id === loc.item_id);
      if (!item) return;

      if (result[loc.zone_id]) {
        result[loc.zone_id].push({
          item: item,
          location: loc,
          packagingType: loc.packaging_type,
          parcelCount: loc.parcel_count
        });
      }
    });

    return result;
  }, [itemLocations, items, zones]);


  // Get stock for selected zone
  const selectedZoneStock = useMemo(() => {
    if (!selectedZoneId) return [];
    return stockByZone[selectedZoneId] || [];
  }, [selectedZoneId, stockByZone]);

  // Compute highlighted zones from search
  const highlightedZoneIds = useMemo(() => {
    const highlighted = new Set<number>();

    if (!searchQuery.trim()) return highlighted;

    const query = searchQuery.toLowerCase();

    // Search in zones
    zones.forEach(zone => {
      if (zone.zone_name.toLowerCase().includes(query) ||
        zone.zone_slug.toLowerCase().includes(query) ||
        zone.zone_label?.toLowerCase().includes(query)) {
        highlighted.add(zone.id);
      }
    });

    // Search in items and highlight their zones
    items.forEach(item => {
      if (item.item_name.toLowerCase().includes(query) ||
        item.keyword_id?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)) {
        // Find zones containing this item
        itemLocations.forEach(loc => {
          if (loc.item_id === item.id && !loc.deleted_at) {
            // Map slot to zone (simplified - in production use proper mapping)
            zones.forEach(zone => {
              highlighted.add(zone.id);
            });
          }
        });
      }
    });

    return highlighted;
  }, [searchQuery, zones, items, itemLocations]);

  // Inside the component logic
  const combinedHighlights = useMemo(() => {
    const highlights = new Set(highlightedZoneIds); // Local search (zone names)
    externalHighlightedZoneIds?.forEach(id => highlights.add(id)); // External search (items)
    return highlights;
  }, [highlightedZoneIds, externalHighlightedZoneIds]);

  // The ZonePolygon component already has logic to pulse when isHighlighted is true.
  // It uses useFrame to scale the mesh:
  // useFrame((state) => {
  //   if (groupRef.current && isHighlighted) {
  //     const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.01;
  //     groupRef.current.scale.setScalar(scale);
  //   }
  // });

  const cameraTarget = useMemo(() => {
    const activeId = selectedZoneId || Array.from(combinedHighlights)[0];
    if (!activeId) return null;

    const zone = zones.find(z => z.id === activeId);
    if (!zone || !zone.polygon_coords || zone.polygon_coords.length === 0) return null;

    // Calculate the average center of the polygon
    const sum = zone.polygon_coords.reduce((acc, curr) => [acc[0] + curr[0], acc[1] + curr[1]], [0, 0]);
    const centerX = sum[0] / zone.polygon_coords.length;
    const centerZ = sum[1] / zone.polygon_coords.length;

    // Calculate vertical offset based on floor
    const floorY = (selectedPlace?.floor_count ? selectedPlace.floor_count - 1 - zone.floor_num : 0) * 0.5;

    return new THREE.Vector3(centerX, floorY, centerZ);
  }, [selectedZoneId, combinedHighlights, zones, selectedPlace]);

  // Handlers
  const handleZoneClick = useCallback((zone: StorageZone) => {
    setSelectedZoneId(zone.id === selectedZoneId ? null : zone.id);
    onZoneClick?.(zone);
  }, [selectedZoneId, onZoneClick]);

  const handleZoneHover = useCallback((zoneId: number | null) => {
    setHoveredZoneId(zoneId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedZoneId(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header with store tabs and search */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-700 bg-slate-900">
        {/* Store tabs */}
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-400" />
          <div className="flex gap-1">
            {places.map(place => (
              <button
                key={place.id}
                onClick={() => {
                  setSelectedPlaceId(place.id);
                  setSelectedZoneId(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedPlaceId === place.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
              >
                {place.place_name}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search zones, items, or keywords..."
              className="text-slate-200 w-full pl-10 pr-4 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-slate-400 hover:text-slate-200" />
              </button>
            )}
          </div>
        </div>

        {/* Floor pills + Stats */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {/* Floor selector */}
          {selectedPlace && selectedPlace.floor_count > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: selectedPlace.floor_count }, (_, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedFloor(i); setSelectedZoneId(null); }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${selectedFloor === i
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                >
                  F{i}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-slate-200" />
            <span className='text-slate-200'>{filteredZones.filter(z => z.floor_num === selectedFloor).length} Zones</span>
          </div>
          {highlightedZoneIds.size > 0 && (
            <div className="flex items-center gap-1 text-amber-400">
              <Tag className="h-4 w-4" />
              <span>{highlightedZoneIds.size} Match</span>
            </div>
          )}
        </div>
      </div>
      {/* Naming Popup (fixed overlay) */}
      {pendingMarker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-80 shadow-2xl">
            <h3 className="text-slate-100 font-bold mb-4">Name this Landmark</h3>
            <input
              autoFocus
              value={newSlotName}
              onChange={(e) => setNewSlotName(e.target.value)}
              placeholder="e.g., Near Pillar, Stack B"
              className="input-field w-full mb-4"
            />
            <div className="flex gap-2">
              <button onClick={handleSaveSlot} className="btn-primary flex-1 py-2 text-sm">Save Position</button>
              <button onClick={() => setPendingMarker(null)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main content: canvas + zone panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Canvas */}
        <div className="flex-1 relative" style={{ background: '#1e293b' }}>
          {/* Landmark toggle button (bottom-right of canvas) */}
          <button
            onClick={() => setIsAddingMarker(!isAddingMarker)}
            className={`absolute bottom-4 right-4 z-10 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium transition-all shadow-lg ${isAddingMarker
              ? 'bg-amber-500 text-white ring-2 ring-amber-300'
              : 'bg-slate-700/90 backdrop-blur-sm text-slate-200 hover:bg-slate-600'
              }`}
          >
            <MapPin className="h-4 w-4" />
            {isAddingMarker ? 'Cancel Placing' : 'Place Landmark'}
          </button>

          <Canvas camera={{ position: [15, 20, 15], fov: 45 }} style={{ height: '100%' }}
          >
            <color attach="background" args={['#fdfefeff']} />
            <Scene
              selectedPlace={selectedPlace ?? null}
              selectedFloor={selectedFloor}
              zones={filteredZones}
              highlightedZoneIds={combinedHighlights}
              selectedZoneId={selectedZoneId}
              stockByZone={stockByZone}
              onZoneClick={handleZoneClick}
              onZoneHover={handleZoneHover}
            />
            <CameraController targetPoint={cameraTarget} />
          </Canvas>

          {/* Legend (bottom-left) */}
          <div className="absolute bottom-4 left-4 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-indigo-500/40 border border-indigo-500" />
                <span className='text-slate-200'>Zone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500" />
                <span className='text-slate-200'>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-white/40 border border-white animate-pulse" />
                <span className='text-slate-200'>Search Match</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zone detail panel */}
        {selectedZone && (
          <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col">
            {/* Panel header */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">{selectedZone.zone_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedZone.zone_label || `${selectedPlace?.place_slug}-F${selectedZone.floor_num}-${selectedZone.zone_slug}`}
                  </p>
                </div>
                <button onClick={clearSelection} className="p-1 hover:bg-slate-800 rounded">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: selectedZone.zone_color || getZoneColor(selectedZone.id) }}
                />
                <span className="text-xs text-slate-400">Floor {selectedZone.floor_num}</span>
              </div>
            </div>

            {/* Stock list */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 mb-3">
                <Boxes className="h-4 w-4 text-indigo-400" />
                <h4 className="text-sm font-medium text-slate-200">Stock Items</h4>
                <span className="ml-auto text-xs text-slate-500">{selectedZoneStock.length} items</span>
              </div>

              {selectedZoneStock.length > 0 ? (
                <div className="space-y-2">
                  {selectedZoneStock.map((stock, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-sm text-slate-200">{stock.item.item_name}</div>
                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                          {(stock.location as any).slot_name || `Slot #${stock.location.slot_id}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {stock.packagingType || 'Unpackaged'}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-200">
                          <Boxes className="h-3 w-3" />
                          {stock.parcelCount}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
                        <button className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] rounded transition-colors">Move</button>
                        <button className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] rounded transition-colors">Sell</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No stock in this zone</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
