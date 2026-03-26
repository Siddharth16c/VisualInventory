import { useState, useRef, useMemo, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { Model as WarehouseModel } from './models/Warehousef1-front-mesh';
import type { StoragePlace, StorageZone, Item, ItemLocation } from '@/db/types';
import { DAL, emitDbChange } from '@/db/dal';
import {
  Building2, Package, Search, X, MapPin, Boxes, Tag, 
  Axis3D, Crosshair, Layers, Box as BoxIcon, MoveRight, Trash2
} from 'lucide-react';
import { supabase } from '@/db/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpatialViewer3DProps {
  places: StoragePlace[];
  zones: StorageZone[];
  items: Item[];
  itemLocations: ItemLocation[];
  onZoneClick?: (zone: StorageZone) => void;
  externalHighlightedZoneIds?: Set<number>;
}

type ViewPlane = 'top' | 'front' | 'right';

// ─── Utility: 3D Intersection Math ────────────────────────────────────────────
// Checks if a 3D point falls inside a Sectional Label's Bounding Box
const isPointInBox = (x: number, y: number, z: number, box: { min: number[], max: number[] }) => {
  return x >= box.min[0] && x <= box.max[0] &&
         y >= box.min[1] && y <= box.max[1] &&
         z >= box.min[2] && z <= box.max[2];
};

// ─── 3D Components ────────────────────────────────────────────────────────────

function CameraController({ view, width, height, depth }: { view: ViewPlane, width: number, height: number, depth: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const cx = width / 2;
    const cy = height / 2;
    const cz = depth / 2;
    const orthoCam = camera as THREE.OrthographicCamera;
    orthoCam.zoom = typeof window !== 'undefined' ? (window.innerWidth < 1000 ? 15 : 25) : 20;

    if (view === 'top') {
      orthoCam.position.set(cx, height + 10, cz);
      orthoCam.up.set(0, 0, -1);
      orthoCam.lookAt(cx, 0, cz);
    } else if (view === 'front') {
      orthoCam.position.set(cx, cy, depth + 10);
      orthoCam.up.set(0, 1, 0);
      orthoCam.lookAt(cx, cy, 0);
    } else if (view === 'right') {
      orthoCam.position.set(width + 10, cy, cz);
      orthoCam.up.set(0, 1, 0);
      orthoCam.lookAt(0, cy, cz);
    }
    orthoCam.updateProjectionMatrix();
  }, [view, width, height, depth, camera]);
  return null;
}

/** Sectional Label (Volumetric Forcefield) */
function SectionBox({ zone, isSelected, isHighlighted, onClick }: any) {
  if (!zone.bounding_box) return null;
  const { min, max } = zone.bounding_box;
  const w = max[0] - min[0], h = max[1] - min[1], d = max[2] - min[2];
  const color = zone.zone_color || '#6366f1';
  
  // Highlight intensity if searched
  const opacity = isSelected ? 0.3 : isHighlighted ? 0.4 : 0.05;
  const emissive = isHighlighted ? color : '#000000';

  return (
    <group position={[min[0] + w/2, min[1] + h/2, min[2] + d/2]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} emissive={emissive} emissiveIntensity={isHighlighted ? 0.5 : 0}/>
        <Edges scale={1} threshold={15} color={isSelected || isHighlighted ? '#ffffff' : color} />
      </mesh>
      {isSelected && (
        <Html position={[0, h/2 + 0.2, 0]} center>
          <div className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-xl border border-indigo-500 whitespace-nowrap backdrop-blur-sm">
            {zone.zone_name}
          </div>
        </Html>
      )}
    </group>
  );
}

/** Physical Stock Box (Rendered Item) */
function PhysicalStock({ location, item, isSelected, onClick }: any) {
  if (location.pos_x == null) return null; // Unplaced stock

  const w = location.dim_w || 0.6;
  const d = location.dim_d || 0.6;
  const baseH = location.dim_h || 0.5;
  const totalH = baseH * location.parcel_count; // Scale height by quantity

  const color = isSelected ? '#fbbf24' : '#94a3b8';

  return (
    <group position={[location.pos_x, location.pos_y, location.pos_z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh>
        <boxGeometry args={[w, totalH, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
        <Edges scale={1} color="#334155" />
      </mesh>
      {isSelected && (
        <Html position={[0, totalH/2 + 0.3, 0]} center>
          <div className="bg-amber-500 text-slate-900 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
            {item.item_name} (x{location.parcel_count})
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SpatialViewer3D({ places, zones, items, itemLocations, externalHighlightedZoneIds }: SpatialViewer3DProps) {
  // Navigation State
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(places[0]?.id || null);
  const [activeView, setActiveView] = useState<ViewPlane>('top');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection State
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  // Placement Mode State
  const [placementMode, setPlacementMode] = useState<{ itemId: number, qty: number } | null>(null);
  const [ghostPos, setGhostPos] = useState<{x: number, y: number, z: number, normalY: number} | null>(null);

  useEffect(() => { if (places.length > 0 && !selectedPlaceId) setSelectedPlaceId(places[0].id); }, [places, selectedPlaceId]);

  // Derived Dimensions
  const selectedPlace = useMemo(() => places.find(p => p.id === selectedPlaceId), [places, selectedPlaceId]);
  const pWidth = selectedPlace?.width_meters || 20;
  const pDepth = selectedPlace?.depth_meters || 20;
  const pHeight = selectedPlace?.height_meters || 5;

  const filteredZones = useMemo(() => zones.filter(z => z.place_id === selectedPlaceId && !z.deleted_at), [zones, selectedPlaceId]);
  
  // Map floating items to their respective volumetric zones
  const itemsInZone = useMemo(() => {
    if (!selectedZoneId) return [];
    const zone = filteredZones.find(z => z.id === selectedZoneId);
    if (!zone?.bounding_box) return [];

    return itemLocations.filter(loc => {
      if (loc.deleted_at || loc.pos_x == null || loc.parcel_count <= 0) return false;
      return isPointInBox(loc.pos_x, loc.pos_y!, loc.pos_z!, zone.bounding_box!);
    });
  }, [selectedZoneId, filteredZones, itemLocations]);

  const selectedItemLoc = useMemo(() => itemLocations.find(l => l.id === selectedLocationId), [selectedLocationId, itemLocations]);
  const selectedItemDetails = useMemo(() => items.find(i => i.id === selectedItemLoc?.item_id), [selectedItemLoc, items]);

  // Search Logic -> Glow Volumetric Boxes
  const highlightedZoneIds = useMemo(() => {
    const highlights = new Set<number>(externalHighlightedZoneIds || []);
    if (!searchQuery.trim()) return highlights;
    const query = searchQuery.toLowerCase();

    // 1. Search Zone Names directly
    filteredZones.forEach(z => { if (z.zone_name.toLowerCase().includes(query)) highlights.add(z.id); });

    // 2. Search Items and find which Zone Volume they are inside
    const matchedItems = items.filter(i => i.item_name.toLowerCase().includes(query) || i.keyword_id?.toLowerCase().includes(query));
    matchedItems.forEach(item => {
      itemLocations.forEach(loc => {
        if (loc.item_id === item.id && loc.pos_x != null) {
          filteredZones.forEach(z => {
            if (z.bounding_box && isPointInBox(loc.pos_x!, loc.pos_y!, loc.pos_z!, z.bounding_box)) {
              highlights.add(z.id);
            }
          });
        }
      });
    });
    return highlights;
  }, [searchQuery, filteredZones, items, itemLocations, externalHighlightedZoneIds]);

  // ─── 3D Interaction Handlers ──────────────────────────────────────────────

  const handlePointerMove = (e: any) => {
    if (!placementMode) return;
    e.stopPropagation();
    // Snap to 0.5m grid for neatness
    const snapX = Math.round(e.point.x * 2) / 2;
    const snapZ = Math.round(e.point.z * 2) / 2;
    setGhostPos({ x: snapX, y: e.point.y, z: snapZ, normalY: e.face?.normal?.y || 0 });
  };

  const handleDropStock = async (e: any) => {
    if (!placementMode || !ghostPos) return;
    e.stopPropagation();

    const w = 0.6, d = 0.6, baseH = 0.5;
    const stackH = baseH * placementMode.qty;

    // Raycast Logic: If clicked on top of another box (normalY is positive), stack it.
    // Otherwise, place it on the floor.
    let finalY = (ghostPos.normalY > 0.5) ? ghostPos.y + (stackH / 2) : (stackH / 2);

    try {
      // Use raw Supabase insert to bypass the strict slot_id unique constraint for floating stock
      await supabase.from('item_locations').insert({
        firm_id: getFirmId(),
        item_id: placementMode.itemId,
        parcel_count: placementMode.qty,
        pos_x: ghostPos.x,
        pos_y: finalY,
        pos_z: ghostPos.z,
        dim_w: w, dim_d: d, dim_h: baseH,
        is_primary: true
      });
      
      emitDbChange('item_locations');
      setPlacementMode(null);
      setGhostPos(null);
    } catch (err: any) {
      alert("Failed to place stock: " + err.message);
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Left Sidebar (Controls & Placement) */}
      <div className="w-72 flex-shrink-0 glass rounded-xl p-4 flex flex-col gap-4 overflow-y-auto z-10">
        
        {/* Navigation */}
        <div className="space-y-3 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <select className="input-field text-sm flex-1 font-bold" value={selectedPlaceId || ''} onChange={(e) => setSelectedPlaceId(Number(e.target.value))}>
              {places.map(p => <option key={p.id} value={p.id}>{p.place_name}</option>)}
            </select>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Items or Sections..." className="text-slate-200 w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm" />
          </div>
        </div>

        {/* Drop Placement Tool */}
        <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-lg p-3">
          <h3 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2 mb-3">
            <Crosshair className="h-4 w-4" /> Drop Stock Tool
          </h3>
          
          {placementMode ? (
            <div className="space-y-2 text-sm">
              <div className="bg-slate-800 p-2 rounded border border-slate-600 text-slate-200 flex justify-between">
                <span>{items.find(i => i.id === placementMode.itemId)?.item_name}</span>
                <span className="font-bold text-amber-400">x{placementMode.qty}</span>
              </div>
              <div className="text-xs text-emerald-300 animate-pulse text-center pt-2">
                Move cursor over 3D map to drop.<br/>Click on boxes to stack.
              </div>
              <button onClick={() => setPlacementMode(null)} className="btn-ghost w-full py-1.5 mt-2">Cancel Drop</button>
            </div>
          ) : (
            <div className="space-y-2">
              <select id="dropItem" className="input-field text-sm w-full">
                <option value="">-- Select Item --</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.item_name}</option>)}
              </select>
              <div className="flex gap-2">
                <input id="dropQty" type="number" defaultValue={1} min={1} className="input-field text-sm w-20" placeholder="Qty" />
                <button onClick={() => {
                  const id = Number((document.getElementById('dropItem') as HTMLSelectElement).value);
                  const qty = Number((document.getElementById('dropQty') as HTMLInputElement).value);
                  if (id && qty) setPlacementMode({ itemId: id, qty });
                }} className="btn-primary flex-1 text-xs">Activate Drop Mode</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blueprint 3D Canvas */}
      <div className="flex-1 relative rounded-xl overflow-hidden shadow-inner border border-cyan-900/30" style={{ background: '#081221' }}>
        
        {/* Orthographic View Controls */}
        <div className="absolute top-4 left-4 z-10 flex bg-slate-900/80 backdrop-blur rounded-lg p-1 border border-slate-700 shadow-xl">
          {(['top', 'front', 'right'] as ViewPlane[]).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${activeView === v ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {v}
            </button>
          ))}
        </div>

        <Canvas>
          <color attach="background" args={['#0a192f']} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 10]} intensity={0.5} />
          
          <OrthographicCamera makeDefault near={-1000} far={1000} />
          <CameraController view={activeView} width={pWidth} height={pHeight} depth={pDepth} />

          {/* 3D Warehouse Model */}
          <Suspense fallback={null}>
            <group position={[pWidth/2, 0, pDepth/2]} scale={[1, 1, 1]}>
              <WarehouseModel />
            </group>
          </Suspense>

          {/* Blueprint Grids & Walls */}
          <gridHelper args={[Math.max(pWidth, pDepth)*2, Math.max(pWidth, pDepth)*2, '#1e3a8a', '#102a52']} position={[pWidth/2, 0, pDepth/2]} />

          {/* Raycast Floor (Catches drops if floor is clicked) */}
          <mesh 
            position={[pWidth/2, 0, pDepth/2]} rotation={[-Math.PI/2, 0, 0]} 
            onPointerMove={handlePointerMove} onPointerUp={handleDropStock}
          >
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial visible={false} />
          </mesh>

          {/* Sectional Labels (Zones 2.0) */}
          {filteredZones.map(zone => (
            <SectionBox 
              key={zone.id} zone={zone} 
              isSelected={selectedZoneId === zone.id} 
              isHighlighted={highlightedZoneIds.has(zone.id)} 
              onClick={() => { setSelectedZoneId(zone.id); setSelectedLocationId(null); }} 
            />
          ))}

          {/* Physical Stock Items */}
          {itemLocations.map(loc => (
            <PhysicalStock 
              key={loc.id} location={loc} item={items.find(i => i.id === loc.item_id)} 
              isSelected={selectedLocationId === loc.id}
              onClick={() => { setSelectedLocationId(loc.id); setSelectedZoneId(null); }}
            />
          ))}

          {/* Ghost Placement Box */}
          {placementMode && ghostPos && (
            <group position={[ghostPos.x, (ghostPos.normalY > 0.5 ? ghostPos.y + (0.5 * placementMode.qty / 2) : (0.5 * placementMode.qty / 2)), ghostPos.z]}>
              <mesh>
                <boxGeometry args={[0.6, 0.5 * placementMode.qty, 0.6]} />
                <meshStandardMaterial color="#10b981" transparent opacity={0.6} />
                <Edges color="#34d399" />
              </mesh>
            </group>
          )}
        </Canvas>
      </div>

      {/* Right Sidebar (Dynamic Data Display) */}
      {(selectedZoneId || selectedLocationId) && (
        <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col z-20 shadow-2xl">
          
          {/* Context: Section Data */}
          {selectedZoneId && (
            <>
              <div className="p-4 border-b border-slate-700 flex justify-between items-start bg-indigo-900/20">
                <div>
                  <h3 className="font-bold text-indigo-400 flex items-center gap-2">
                    <Layers className="h-4 w-4" /> {filteredZones.find(z => z.id === selectedZoneId)?.zone_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Volumetric Section</p>
                </div>
                <button onClick={() => setSelectedZoneId(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">Items Inside Space</div>
                {itemsInZone.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-700 rounded-lg text-slate-500 text-sm">Space is empty</div>
                ) : (
                  itemsInZone.map(loc => {
                    const itm = items.find(i => i.id === loc.item_id);
                    if (!itm) return null;
                    const qtyPerParcel = (itm.p_unit_per_parcel || 1) * (itm.p_unit || 1);
                    return (
                      <div key={loc.id} className="p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-indigo-500/50 cursor-pointer" onClick={() => { setSelectedLocationId(loc.id); setSelectedZoneId(null); }}>
                        <div className="font-semibold text-sm text-slate-200 truncate">{itm.item_name}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] px-2 py-0.5 bg-slate-700 rounded-full text-slate-300">{loc.packaging_type || 'Box'}</span>
                          <div className="text-xs text-amber-400 font-bold flex items-center gap-1"><Boxes className="h-3 w-3"/> {loc.parcel_count} parcels</div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 text-right">({qtyPerParcel} units per parcel)</div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Context: Specific Item Data */}
          {selectedLocationId && selectedItemLoc && selectedItemDetails && (
            <>
              <div className="p-4 border-b border-slate-700 flex justify-between items-start bg-amber-900/20">
                <div>
                  <h3 className="font-bold text-amber-400 flex items-center gap-2">
                    <BoxIcon className="h-4 w-4" /> {selectedItemDetails.item_name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">ID: {selectedItemDetails.keyword_id}</p>
                </div>
                <button onClick={() => setSelectedLocationId(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4"/></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                    <div className="text-xs text-slate-400 mb-1">Parcels</div>
                    <div className="text-xl font-bold text-slate-100">{selectedItemLoc.parcel_count}</div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                    <div className="text-xs text-slate-400 mb-1">Packaging</div>
                    <div className="text-sm font-bold text-slate-300 mt-2">{selectedItemLoc.packaging_type || 'Standard'}</div>
                  </div>
                </div>

                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 space-y-2">
                  <div className="flex justify-between"><span>Category:</span> <span className="font-semibold text-slate-100">{selectedItemDetails.category}</span></div>
                  <div className="flex justify-between"><span>Qty per Parcel:</span> <span className="font-semibold text-slate-100">{(selectedItemDetails.p_unit_per_parcel || 1) * (selectedItemDetails.p_unit || 1)}</span></div>
                  <div className="flex justify-between"><span>Global Coords:</span> <span className="font-mono text-emerald-400">[{selectedItemLoc.pos_x}, {selectedItemLoc.pos_y}, {selectedItemLoc.pos_z}]</span></div>
                </div>

                <div className="pt-4 border-t border-slate-700 flex gap-2">
                  <button className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded font-bold flex justify-center items-center gap-2">
                    <MoveRight className="h-3 w-3" /> Move
                  </button>
                  <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-bold flex justify-center items-center gap-2">
                    Sell Units
                  </button>
                </div>
                <button className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 text-xs rounded font-bold flex justify-center items-center gap-2 mt-2" onClick={async () => {
                    await DAL.item_locations.softDelete(selectedItemLoc.id);
                    emitDbChange('item_locations');
                    setSelectedLocationId(null);
                }}>
                  <Trash2 className="h-3 w-3" /> Delete from Space
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

import { useAppStore } from '@/store/store';

function getFirmId() {
  return useAppStore.getState().firmId;
}
