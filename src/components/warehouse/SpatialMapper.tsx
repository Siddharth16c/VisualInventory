import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { DAL, emitDbChange } from '@/db/dal';
import type { StoragePlace, StorageZone, StoragePlaceType } from '@/db/types';
import {
  Map as MapIcon,
  Layers,
  Trash2,
  Plus,
  Save,
  X,
  Edit3,
  Square,
  MousePointer2,
  Building2,
  Warehouse
} from 'lucide-react';

// Extend Three.js with LineGeometry for smooth lines
extend({ OrbitControls });

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpatialMapperProps {
  places: StoragePlace[];
  zones: StorageZone[];
  onZoneCreate?: (zone: StorageZone) => void;
  onZoneDelete?: (zoneId: number) => void;
}

interface Point2D {
  x: number;
  y: number;
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

/**
 * FloorPlane - Renders the floor plan background image
 */
function FloorPlane({
  imageUrl,
  width = 20,
  height = 20,
  onClick
}: {
  imageUrl: string | null;
  width?: number;
  height?: number;
  onClick?: (point: Point2D) => void;
}) {
  const textureRef = useRef<THREE.Texture | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    if (!imageUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(imageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [imageUrl]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClick && meshRef.current) {
      const intersection = e.intersections?.[0];
      if (intersection) {
        const point = intersection.point;
        onClick({ x: point.x, y: point.z });
      }
    }
  };

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.1, 0]}
      onClick={handleClick}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        color={texture ? 0xffffff : 0x1e293b}
        transparent
        opacity={texture ? 0.9 : 1}
      />
    </mesh>
  );
}

/**
 * ZonePolygon - Renders a filled polygon zone with outline
 */
function ZonePolygon({
  zone,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut
}: {
  zone: StorageZone;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.Line>(null);

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

  // Create outline
  const lineGeometry = useMemo(() => {
    if (coords.length < 3) return null;
    const points = coords.map(([x, y]) => new THREE.Vector3(x, 0.05, y));
    points.push(new THREE.Vector3(coords[0][0], 0.05, coords[0][1]));
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [coords]);

  const color = zone.zone_color || getZoneColor(zone.id);
  const fillOpacity = isSelected ? 0.6 : isHovered ? 0.45 : 0.3;
  const zOffset = isSelected ? 0.1 : isHovered ? 0.05 : 0;

  if (!geometry || !lineGeometry) return null;

  return (
    <group
      position={[0, zOffset, 0]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); onPointerOver(); }}
      onPointerOut={(e) => { e.stopPropagation(); onPointerOut(); }}
    >
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial
          color={color}
          transparent
          opacity={fillOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Line
        points={coords.map(([x, y]) => [x, 0.06, y])}
        color={isSelected ? '#fbbf24' : color}
        lineWidth={isSelected ? 3 : 2}
      />
      {isSelected && (
        <Html position={[0, 0.5, 0]} center>
          <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {zone.zone_name}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * DrawingPolygon - Shows the polygon being drawn
 */
function DrawingPolygon({
  points,
  isClosed
}: {
  points: Point2D[];
  isClosed: boolean;
}) {
  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const vectors = points.map(p => new THREE.Vector3(p.x, 0.05, p.y));
    if (isClosed && points.length >= 3) {
      vectors.push(new THREE.Vector3(points[0].x, 0.05, points[0].y));
    }
    return new THREE.BufferGeometry().setFromPoints(vectors);
  }, [points, isClosed]);

  const shapeGeometry = useMemo(() => {
    if (points.length < 3) return null;
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    if (isClosed) {
      shape.closePath();
    }
    return new THREE.ShapeGeometry(shape);
  }, [points, isClosed]);

  if (!geometry) return null;

  const linePoints = points.map(p => new THREE.Vector3(p.x, 0.06, p.y));
  if (isClosed && points.length >= 3) {
    linePoints.push(new THREE.Vector3(points[0].x, 0.06, points[0].y));
  }

  return (
    <group>
      {/* Draw lines */}
      <Line
        points={linePoints}
        color="#fbbf24"
        lineWidth={2}
      />

      {/* Draw points */}
      {points.map((point, i) => (
        <mesh key={i} position={[point.x, 0.1, point.y]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={i === 0 ? '#10b981' : '#fbbf24'} emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Draw filled preview */}
      {shapeGeometry && (
        <mesh
          geometry={shapeGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial
            color="#fbbf24"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * GridHelper - Shows a reference grid on the floor
 */
function GridHelper({ size = 20, divisions = 20 }) {
  return (
    <gridHelper
      args={[size, divisions, 0x334155, 0x1e293b]}
      position={[0, -0.05, 0]}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SpatialMapper({
  places,
  zones,
  onZoneCreate,
  onZoneDelete
}: SpatialMapperProps) {
  // State
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(places[0]?.id || null);
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point2D[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<number | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneColor, setNewZoneColor] = useState(ZONE_COLORS[0]);
  const [showNewZoneForm, setShowNewZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<StorageZone | null>(null);

  // Create Place form state
  const [showCreatePlace, setShowCreatePlace] = useState(places.length === 0);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceSlug, setNewPlaceSlug] = useState('');
  const [newPlaceType, setNewPlaceType] = useState<StoragePlaceType>('shop');
  const [newPlaceFloors, setNewPlaceFloors] = useState(1);
  const [creatingPlace, setCreatingPlace] = useState(false);

  // ─── Rehydration fix: auto-select first place when places loads ────────────
  // This runs when `places` prop changes (e.g. after tab switch triggers re-fetch)
  useEffect(() => {
    if (places.length > 0 && !selectedPlaceId) {
      setSelectedPlaceId(places[0].id);
    }
    // Also hide the create form if we now have places
    if (places.length > 0) {
      setShowCreatePlace(false);
    }
  }, [places, selectedPlaceId]);

  const handleCreatePlace = async () => {
    if (!newPlaceName.trim()) return;
    setCreatingPlace(true);
    try {
      const place = await DAL.storage_places.create({
        place_name: newPlaceName.trim(),
        place_slug: (newPlaceSlug.trim() || newPlaceName.trim().substring(0, 3)).toUpperCase(),
        place_type: newPlaceType,
        floor_count: newPlaceFloors,
      });
      emitDbChange('storage_places');
      setSelectedPlaceId(place.id);
      setNewPlaceName('');
      setNewPlaceSlug('');
      setNewPlaceFloors(1);
      setShowCreatePlace(false);
    } catch (err: any) {
      console.error('Failed to create place:', err);
      alert('Failed to create place: ' + err.message);
    } finally {
      setCreatingPlace(false);
    }
  };

  // Derived state
  const selectedPlace = useMemo(() =>
    places.find(p => p.id === selectedPlaceId),
    [places, selectedPlaceId]
  );

  const filteredZones = useMemo(() =>
    zones.filter(z =>
      z.place_id === selectedPlaceId &&
      z.floor_num === selectedFloor &&
      !z.deleted_at
    ),
    [zones, selectedPlaceId, selectedFloor]
  );

  const selectedZone = useMemo(() =>
    zones.find(z => z.id === selectedZoneId),
    [zones, selectedZoneId]
  );

  // Handlers
  const handleCanvasClick = useCallback((point: Point2D) => {
    if (!isDrawing) return;

    // Check if clicking near first point to close polygon
    if (drawingPoints.length >= 3) {
      const firstPoint = drawingPoints[0];
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) +
        Math.pow(point.y - firstPoint.y, 2)
      );
      if (distance < 0.5) {
        // Close the polygon
        setDrawingPoints(prev => [...prev]);
        setShowNewZoneForm(true);
        return;
      }
    }

    setDrawingPoints(prev => [...prev, point]);
  }, [isDrawing, drawingPoints]);

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setDrawingPoints([]);
    setSelectedZoneId(null);
    setShowNewZoneForm(false);
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    setShowNewZoneForm(false);
  };

  const handleSaveZone = async () => {
    // 1. Validation check
    if (!selectedPlaceId || drawingPoints.length < 3 || !newZoneName.trim()) return;

    try {
      // 2. Format drawing points into a coordinate array [x, y][]
      const coords = drawingPoints.map(p => [p.x, p.y]);

      // 3. Create the initial StorageZone entry
      const newZone = await DAL.storage_zones.create({
        place_id: selectedPlaceId,
        floor_num: selectedFloor,
        zone_name: newZoneName.trim(),
        zone_slug: newZoneName.trim().toLowerCase().replace(/\s+/g, '-'),
        // Include coords in create payload as a fallback
        polygon_coords: coords,
        zone_color: newZoneColor,
        notes: '',
      });

      // 4. Explicitly store/verify polygon coordinates using savePolygon 
      // This ensures the spatial data is properly committed to the JSONB field
      await DAL.storage_zones.savePolygon(
        newZone.id,
        coords,
        newZoneColor
      );

      // 5. Reactive Updates: Notify the rest of the app 
      emitDbChange('storage_zones');

      // 6. Component-level update (passed from parent)
      onZoneCreate?.(newZone);

      // 7. Reset UI State and select the new zone
      setIsDrawing(false);
      setDrawingPoints([]);
      setNewZoneName('');
      setShowNewZoneForm(false);
      setSelectedZoneId(newZone.id); // Triggers immediate 3D render of the new polygon

    } catch (err: any) {
      console.error('Failed to create zone:', err);
      // Replace with your Toast library if available
      alert('Failed to create zone: ' + err.message);
    }
  };

  const handleDeleteZone = async (zoneId: number) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;

    try {
      await DAL.storage_zones.softDelete(zoneId);
      emitDbChange('storage_zones');
      onZoneDelete?.(zoneId);
      if (selectedZoneId === zoneId) {
        setSelectedZoneId(null);
      }
    } catch (err: any) {
      console.error('Failed to delete zone:', err);
      alert('Failed to delete zone: ' + err.message);
    }
  };

  const handleUpdateZone = async () => {
    if (!editingZone || !newZoneName.trim()) return;

    try {
      await DAL.storage_zones.update(editingZone.id, {
        zone_name: newZoneName.trim(),
        zone_slug: newZoneName.trim().toLowerCase().replace(/\s+/g, '-'),
        zone_color: newZoneColor,
      });

      emitDbChange('storage_zones');
      setEditingZone(null);
      setNewZoneName('');
    } catch (err: any) {
      console.error('Failed to update zone:', err);
      alert('Failed to update zone: ' + err.message);
    }
  };

  // Calculate floor count for selected place
  const floorCount = selectedPlace?.floor_count || 1;

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 glass rounded-xl p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
          <MapIcon className="h-5 w-5 text-indigo-400" />
          <h2 className="font-bold text-surface-500">Spatial Mapper</h2>
        </div>

        {/* Place Selector */}
        <div>
          <label className="text-xs text-surface-400 block mb-1.5">Storage Place</label>
          {places.length > 0 ? (
            <div className="flex gap-1">
              <select
                className="input-field text-sm flex-1"
                value={selectedPlaceId || ''}
                onChange={(e) => {
                  Warehouse
                  setSelectedPlaceId(Number(e.target.value));
                  setSelectedFloor(0);
                  setSelectedZoneId(null);
                  setIsDrawing(false);
                }}
              >
                {places.map(place => (
                  <option key={place.id} value={place.id}>
                    {place.place_name} ({place.place_type})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowCreatePlace(true)}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
                title="Add new place"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-surface-500 italic">No places yet — create one below</p>
          )}
        </div>

        {/* Create Place Form */}
        {showCreatePlace && (
          <div className="p-3 bg-indigo-600/10 border border-indigo-500/30 rounded-lg space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">New Storage Place</span>
            </div>
            <input
              type="text"
              value={newPlaceName}
              onChange={(e) => {
                setNewPlaceName(e.target.value);
                if (!newPlaceSlug) setNewPlaceSlug(e.target.value.substring(0, 3).toUpperCase());
              }}
              placeholder="Place name (e.g. KT Shop)"
              className="input-field text-sm w-full"
              autoFocus
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlaceSlug}
                onChange={(e) => setNewPlaceSlug(e.target.value.toUpperCase())}
                placeholder="Slug (KT)"
                className="input-field text-sm w-20"
                maxLength={4}
              />
              <select
                value={newPlaceType}
                onChange={(e) => setNewPlaceType(e.target.value as StoragePlaceType)}
                className="input-field text-sm flex-1"
              >
                <option value="shop">Shop</option>
                <option value="warehouse">Warehouse</option>
                <option value="godown">Godown</option>
              </select>
              <input
                type="number"
                value={newPlaceFloors}
                onChange={(e) => setNewPlaceFloors(Math.max(1, Number(e.target.value)))}
                className="input-field text-sm w-14 text-center"
                min={1}
                max={10}
                title="Floor count"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreatePlace}
                disabled={!newPlaceName.trim() || creatingPlace}
                className="btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1"
              >
                {creatingPlace ? 'Creating...' : <><Save className="h-3 w-3" /> Create Place</>}
              </button>
              {places.length > 0 && (
                <button
                  onClick={() => setShowCreatePlace(false)}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floor Selector */}
        {selectedPlace && (
          <div>
            <label className="text-xs text-surface-400 block mb-1.5 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Floor
            </label>
            <div className="flex gap-1">
              {Array.from({ length: floorCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedFloor(i);
                    setSelectedZoneId(null);
                    setIsDrawing(false);
                  }}
                  className={`flex-1 py-1.5 text-xs rounded transition-colors ${selectedFloor === i
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-surface-400 hover:bg-slate-700'
                    }`}
                >
                  F{i}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Drawing Controls */}
        <div className="border-t border-slate-700 pt-3">
          {!isDrawing ? (
            <button
              onClick={handleStartDrawing}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
              disabled={!selectedPlaceId}
            >
              <Plus className="h-4 w-4" /> Draw New Zone
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelDrawing}
                className="btn-ghost flex-1 text-sm flex items-center justify-center gap-1"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              {drawingPoints.length >= 3 && (
                <button
                  onClick={() => setShowNewZoneForm(true)}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"
                >
                  <Save className="h-4 w-4" /> Save
                </button>
              )}
            </div>
          )}

          {isDrawing && (
            <p className="text-xs text-surface-400 mt-2">
              {drawingPoints.length < 3
                ? `Click to add point ${drawingPoints.length + 1} (need 3+ points)`
                : 'Click near first point to close, or click Save'
              }
            </p>
          )}
        </div>

        {/* Zones List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <label className="text-xs text-surface-400 block mb-1.5">
            Zones ({filteredZones.length})
          </label>
          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredZones.map(zone => (
              <div
                key={zone.id}
                className={`p-2 rounded-lg cursor-pointer transition-all group ${selectedZoneId === zone.id
                  ? 'bg-indigo-600/30 border border-indigo-500/50'
                  : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                  }`}
                onClick={() => setSelectedZoneId(zone.id === selectedZoneId ? null : zone.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: zone.zone_color || getZoneColor(zone.id) }}
                  />
                  <span className="text-sm text-surface-100 flex-1 truncate">
                    {zone.zone_name}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingZone(zone);
                        setNewZoneName(zone.zone_name);
                        setNewZoneColor(zone.zone_color || getZoneColor(zone.id));
                      }}
                      className="p-1 hover:bg-slate-700 rounded"
                      title="Edit"
                    >
                      <Edit3 className="h-3 w-3 text-surface-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteZone(zone.id);
                      }}
                      className="p-1 hover:bg-red-900/50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </button>
                  </div>
                </div>
                {zone.zone_label && (
                  <p className="text-xs text-surface-500 mt-0.5 ml-5">
                    {zone.zone_label}
                  </p>
                )}
              </div>
            ))}
            {filteredZones.length === 0 && (
              <p className="text-xs text-surface-500 text-center py-4">
                No zones on this floor
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative rounded-xl overflow-hidden" style={{ background: '#0f172a' }}>
        <Canvas
          camera={{ position: [15, 15, 15], fov: 45 }}
          style={{ height: '100%' }}
        >
          <color attach="background" args={['#fdfefeff']} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-5, 5, -5]} intensity={0.5} color="#6366f1" />

          <GridHelper size={30} divisions={30} />

          <FloorPlane
            imageUrl={selectedPlace?.top_view_image_url || null}
            width={20}
            height={20}
            onClick={handleCanvasClick}
          />

          {/* Render saved zones */}
          {filteredZones.map(zone => (
            <ZonePolygon
              key={zone.id}
              zone={zone}
              isSelected={selectedZoneId === zone.id}
              isHovered={hoveredZoneId === zone.id}
              onClick={() => setSelectedZoneId(zone.id === selectedZoneId ? null : zone.id)}
              onPointerOver={() => setHoveredZoneId(zone.id)}
              onPointerOut={() => setHoveredZoneId(null)}
            />
          ))}

          {/* Render drawing polygon */}
          {isDrawing && (
            <DrawingPolygon
              points={drawingPoints}
              isClosed={drawingPoints.length >= 3}
            />
          )}

          <OrbitControls
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2.1}
            enablePan
            enableZoom
            enableRotate
          />
        </Canvas>

        {/* Overlay UI */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="bg-slate-900 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-surface-300">
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-3 w-3" />
              <span className='text-slate-200 h-full'>Click {isDrawing ? 'to draw polygon' : 'zones to select'}</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <div className="bg-slate-900 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-surface-400 space-y-1">
            <div className="flex items-center gap-2">
              <Square className="h-3 w-3 text-indigo-300" />
              <span className='text-slate-200'>Zone</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className='text-slate-200'>Drawing Point</span>
            </div>
          </div>
        </div>
      </div>

      {/* New Zone Modal */}
      {showNewZoneForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass rounded-xl p-5 w-80">
            <h3 className="text-sm font-bold text-surface-100 mb-4">Save New Zone</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-400 block mb-1">Zone Name</label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g., Front Section"
                  className="input-field text-sm w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-surface-400 block mb-1">Color</label>
                <div className="flex gap-1 flex-wrap">
                  {ZONE_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewZoneColor(color)}
                      className={`w-6 h-6 rounded transition-transform ${newZoneColor === color ? 'ring-2 ring-white scale-110' : ''
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveZone}
                  disabled={!newZoneName.trim()}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"
                >
                  <Save className="h-4 w-4" /> Save Zone
                </button>
                <button
                  onClick={() => setShowNewZoneForm(false)}
                  className="btn-ghost flex-1 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Zone Modal */}
      {editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass rounded-xl p-5 w-80">
            <h3 className="text-sm font-bold text-surface-100 mb-4">Edit Zone</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-400 block mb-1">Zone Name</label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="input-field text-sm w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-surface-400 block mb-1">Color</label>
                <div className="flex gap-1 flex-wrap">
                  {ZONE_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewZoneColor(color)}
                      className={`w-6 h-6 rounded transition-transform ${newZoneColor === color ? 'ring-2 ring-white scale-110' : ''
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleUpdateZone}
                  disabled={!newZoneName.trim()}
                  className="btn-primary flex-1 text-sm"
                >
                  Update
                </button>
                <button
                  onClick={() => {
                    setEditingZone(null);
                    setNewZoneName('');
                  }}
                  className="btn-ghost flex-1 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
