import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { DAL, emitDbChange } from '@/db/dal';
import type { StoragePlace, StorageZone, StoragePlaceType } from '@/db/types';
import {
  Map as MapIcon, Layers, Trash2, Plus, Save, X, Edit3, 
  Square, MousePointer2, Building2, BoxSelect, Maximize, Axis3D
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpatialMapperProps {
  places: StoragePlace[];
  zones: StorageZone[];
  onZoneCreate?: (zone: StorageZone) => void;
  onZoneDelete?: (zoneId: number) => void;
}

interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

type ViewPlane = 'top' | 'front' | 'right';

// ─── Color Palette ────────────────────────────────────────────────────────────
const ZONE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#8b5cf6'];
const getZoneColor = (index: number) => ZONE_COLORS[index % ZONE_COLORS.length];

// ─── 3D Components ────────────────────────────────────────────────────────────

function CameraController({ view, width, height, depth }: { view: ViewPlane, width: number, height: number, depth: number }) {
  const { camera } = useThree();
  
  useEffect(() => {
    const cx = width / 2;
    const cy = height / 2;
    const cz = depth / 2;

    const orthoCam = camera as THREE.OrthographicCamera;
    
    // Set frustum size based on room dimensions to keep it centered
    const maxDim = Math.max(width, height, depth);
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

/** Sectional Label Box (Rendered 3D Zone) */
function SectionBox({
  zone,
  isSelected,
  isHovered,
  onClick
}: {
  zone: StorageZone;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
}) {
  if (!zone.bounding_box) return null;
  const { min, max } = zone.bounding_box;
  
  const width = max[0] - min[0];
  const height = max[1] - min[1];
  const depth = max[2] - min[2];
  const centerX = min[0] + width / 2;
  const centerY = min[1] + height / 2;
  const centerZ = min[2] + depth / 2;

  const color = zone.zone_color || getZoneColor(zone.id);
  const opacity = isSelected ? 0.4 : isHovered ? 0.3 : 0.15;

  return (
    <group position={[centerX, centerY, centerZ]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
        <Edges scale={1} threshold={15} color={isSelected ? '#ffffff' : color} />
      </mesh>
      
      {isSelected && (
        <Html position={[0, height/2 + 0.2, 0]} center>
          <div className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-xl border border-slate-700 whitespace-nowrap backdrop-blur-sm">
            {zone.zone_name}
          </div>
        </Html>
      )}
    </group>
  );
}

/** The active drawing box */
function DrawingBox({ start, end, view, storeWidth, storeHeight, storeDepth }: any) {
  if (!start || !end) return null;

  // Calculate box based on the active drawing plane, inheriting the missing dimension
  let minX = Math.min(start.x, end.x), maxX = Math.max(start.x, end.x);
  let minY = Math.min(start.y, end.y), maxY = Math.max(start.y, end.y);
  let minZ = Math.min(start.z, end.z), maxZ = Math.max(start.z, end.z);

  if (view === 'top') { minY = 0; maxY = storeHeight; }
  if (view === 'front') { minZ = 0; maxZ = storeDepth; }
  if (view === 'right') { minX = 0; maxX = storeWidth; }

  const w = maxX - minX;
  const h = maxY - minY;
  const d = maxZ - minZ;

  return (
    <group position={[minX + w/2, minY + h/2, minZ + d/2]}>
      <mesh>
        <boxGeometry args={[Math.max(0.1, w), Math.max(0.1, h), Math.max(0.1, d)]} />
        <meshStandardMaterial color="#fbbf24" transparent opacity={0.4} side={THREE.DoubleSide} />
        <Edges scale={1} threshold={15} color="#fbbf24" />
      </mesh>
    </group>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function SpatialMapper({ places, zones, onZoneCreate, onZoneDelete }: SpatialMapperProps) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(places[0]?.id || null);
  const [activeView, setActiveView] = useState<ViewPlane>('top');
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<THREE.Vector3 | null>(null);
  const [drawEnd, setDrawEnd] = useState<THREE.Vector3 | null>(null);
  const [pendingBox, setPendingBox] = useState<BoundingBox | null>(null);
  
  // UI State
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneColor, setNewZoneColor] = useState(ZONE_COLORS[0]);

  // Derived dimensions
  const selectedPlace = useMemo(() => places.find(p => p.id === selectedPlaceId), [places, selectedPlaceId]);
  const pWidth = selectedPlace?.width_meters || 20;
  const pDepth = selectedPlace?.depth_meters || 20;
  const pHeight = selectedPlace?.height_meters || 5;

  const filteredZones = useMemo(() => zones.filter(z => z.place_id === selectedPlaceId && !z.deleted_at), [zones, selectedPlaceId]);
  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId]);

  // Dimensions UI Update
  const handleUpdateDimensions = async (w: number, d: number, h: number) => {
    if (!selectedPlaceId) return;
    await DAL.storage_places.update(selectedPlaceId, { width_meters: w, depth_meters: d, height_meters: h });
    emitDbChange('storage_places');
  };

  // Drawing Handlers
  const handlePointerDown = (e: any) => {
    if (!isDrawing) return;
    e.stopPropagation();
    setDrawStart(e.point);
    setDrawEnd(e.point);
  };

  const handlePointerMove = (e: any) => {
    if (!isDrawing || !drawStart) return;
    e.stopPropagation();
    setDrawEnd(e.point);
  };

  const handlePointerUp = (e: any) => {
    if (!isDrawing || !drawStart || !drawEnd) return;
    e.stopPropagation();
    
    // Generate the final Bounding Box
    let minX = Math.min(drawStart.x, drawEnd.x), maxX = Math.max(drawStart.x, drawEnd.x);
    let minY = Math.min(drawStart.y, drawEnd.y), maxY = Math.max(drawStart.y, drawEnd.y);
    let minZ = Math.min(drawStart.z, drawEnd.z), maxZ = Math.max(drawStart.z, drawEnd.z);

    if (activeView === 'top') { minY = 0; maxY = pHeight; }
    if (activeView === 'front') { minZ = 0; maxZ = pDepth; }
    if (activeView === 'right') { minX = 0; maxX = pWidth; }

    // Minimum size enforcement (prevent 0 thickness boxes)
    if (maxX - minX < 0.1) maxX = minX + 1;
    if (maxY - minY < 0.1) maxY = minY + 1;
    if (maxZ - minZ < 0.1) maxZ = minZ + 1;

    setPendingBox({
      min: [Number(minX.toFixed(2)), Number(minY.toFixed(2)), Number(minZ.toFixed(2))],
      max: [Number(maxX.toFixed(2)), Number(maxY.toFixed(2)), Number(maxZ.toFixed(2))]
    });
    
    setDrawStart(null);
    setDrawEnd(null);
  };

  const handleSaveZone = async () => {
    if (!selectedPlaceId || !pendingBox || !newZoneName.trim()) return;

    try {
      const newZone = await DAL.storage_zones.create({
        place_id: selectedPlaceId,
        floor_num: 0, // Legacy floor support, 3D replaces this conceptually
        zone_name: newZoneName.trim(),
        zone_slug: newZoneName.trim().toLowerCase().replace(/\s+/g, '-'),
        zone_color: newZoneColor,
        // @ts-ignore - bypassing standard types to inject the new jsonb schema
        bounding_box: pendingBox
      });

      emitDbChange('storage_zones');
      onZoneCreate?.(newZone);
      
      setIsDrawing(false);
      setPendingBox(null);
      setNewZoneName('');
      setSelectedZoneId(newZone.id);
    } catch (err: any) {
      alert('Failed to save Sectional Label: ' + err.message);
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar Controls */}
      <div className="w-72 flex-shrink-0 glass rounded-xl p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
          <Axis3D className="h-5 w-5 text-indigo-400" />
          <h2 className="font-bold text-slate-100">3D Spatial Mapper</h2>
        </div>

        {/* Place Dimensions */}
        {selectedPlace && (
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <label className="text-xs text-slate-400 block mb-2 font-medium">Store Dimensions Matrix (m)</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input type="number" value={pWidth} onChange={(e) => handleUpdateDimensions(Number(e.target.value), pDepth, pHeight)} className="input-field text-sm w-full text-center" />
                <span className="text-[10px] text-slate-500 block mt-1 text-center">Width (X)</span>
              </div>
              <div>
                <input type="number" value={pDepth} onChange={(e) => handleUpdateDimensions(pWidth, Number(e.target.value), pHeight)} className="input-field text-sm w-full text-center" />
                <span className="text-[10px] text-slate-500 block mt-1 text-center">Depth (Z)</span>
              </div>
              <div>
                <input type="number" value={pHeight} onChange={(e) => handleUpdateDimensions(pWidth, pDepth, Number(e.target.value))} className="input-field text-sm w-full text-center text-indigo-300 bg-indigo-900/20" />
                <span className="text-[10px] text-indigo-400 block mt-1 text-center">Height (Y)</span>
              </div>
            </div>
          </div>
        )}

        {/* Section Drawing Tool */}
        <div className="border-t border-slate-700 pt-3">
          {!isDrawing && !pendingBox ? (
            <button onClick={() => { setIsDrawing(true); setSelectedZoneId(null); }} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
              <BoxSelect className="h-4 w-4" /> Draw Section Label
            </button>
          ) : pendingBox ? (
            <div className="bg-slate-800 p-3 rounded-lg border border-indigo-500 shadow-lg space-y-3">
              <h3 className="text-xs font-bold text-indigo-400 uppercase">Save Section Volume</h3>
              <input type="text" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} placeholder="e.g. Front Right Stack" className="input-field w-full text-sm" autoFocus />
              
              {/* Parametric Tweaking */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <div className="text-slate-400">Min [X,Y,Z]</div>
                  <input type="number" value={pendingBox.min[0]} onChange={e => setPendingBox({...pendingBox, min: [Number(e.target.value), pendingBox.min[1], pendingBox.min[2]]})} className="w-full bg-slate-900 border border-slate-700 p-1 rounded text-slate-300" />
                  <input type="number" value={pendingBox.min[1]} onChange={e => setPendingBox({...pendingBox, min: [pendingBox.min[0], Number(e.target.value), pendingBox.min[2]]})} className="w-full bg-slate-900 border border-slate-700 p-1 rounded text-slate-300" />
                  <input type="number" value={pendingBox.min[2]} onChange={e => setPendingBox({...pendingBox, min: [pendingBox.min[0], pendingBox.min[1], Number(e.target.value)]})} className="w-full bg-slate-900 border border-slate-700 p-1 rounded text-slate-300" />
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400">Max [X,Y,Z]</div>
                  <input type="number" value={pendingBox.max[0]} onChange={e => setPendingBox({...pendingBox, max: [Number(e.target.value), pendingBox.max[1], pendingBox.max[2]]})} className="w-full bg-slate-900 border border-slate-700 p-1 rounded text-slate-300" />
                  <input type="number" value={pendingBox.max[1]} onChange={e => setPendingBox({...pendingBox, max: [pendingBox.max[0], Number(e.target.value), pendingBox.max[2]]})} className="w-full bg-slate-900 border border-slate-700 p-1 rounded text-slate-300" />
                  <input type="number" value={pendingBox.max[2]} onChange={e => setPendingBox({...pendingBox, max: [pendingBox.max[0], pendingBox.max[1], Number(e.target.value)]})} className="w-full bg-slate-900 border border-slate-700 p-1 rounded text-slate-300" />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSaveZone} disabled={!newZoneName} className="btn-primary flex-1 py-1.5 text-xs">Save</button>
                <button onClick={() => { setPendingBox(null); setIsDrawing(true); }} className="btn-ghost flex-1 py-1.5 text-xs">Redraw</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-amber-400 bg-amber-900/20 p-2 rounded border border-amber-500/30 flex gap-2">
                <MousePointer2 className="h-4 w-4 flex-shrink-0" />
                Click and drag on the grid to draw a 3D bounding box.
              </div>
              <button onClick={() => setIsDrawing(false)} className="btn-ghost w-full py-1.5 text-sm">Cancel</button>
            </div>
          )}
        </div>

        {/* Existing Sections List */}
        <div className="flex-1 min-h-0 overflow-y-auto pt-4 border-t border-slate-700 mt-2">
          <label className="text-xs text-slate-400 block mb-2">Sectional Labels ({filteredZones.length})</label>
          <div className="space-y-1">
            {filteredZones.map(zone => (
              <div key={zone.id} onClick={() => setSelectedZoneId(z => z === zone.id ? null : zone.id)}
                   className={`p-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 ${selectedZoneId === zone.id ? 'bg-indigo-600/30 border border-indigo-500' : 'bg-slate-800/50 hover:bg-slate-800'}`}>
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: zone.zone_color || getZoneColor(zone.id) }} />
                <span className="text-sm text-slate-200 flex-1 truncate">{zone.zone_name}</span>
                {zone.bounding_box && <span className="text-[10px] text-slate-500 font-mono">Vol</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Blueprint 3D Canvas */}
      <div className="flex-1 relative rounded-xl overflow-hidden shadow-inner border border-cyan-900/30" style={{ background: '#081221' }}>
        
        {/* Orthographic View Controls */}
        <div className="absolute top-4 left-4 z-10 flex bg-slate-900/80 backdrop-blur rounded-lg p-1 border border-slate-700 shadow-xl">
          {(['top', 'front', 'right'] as ViewPlane[]).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${activeView === v ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {v} View
            </button>
          ))}
        </div>

        <Canvas>
          <color attach="background" args={['#0a192f']} /> {/* Blueprint Dark Blue */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 10]} intensity={0.5} />
          
          <OrthographicCamera makeDefault near={-1000} far={1000} />
          <CameraController view={activeView} width={pWidth} height={pHeight} depth={pDepth} />

          {/* Blueprint Grid Systems */}
          <gridHelper args={[Math.max(pWidth, pDepth)*2, Math.max(pWidth, pDepth)*2, '#1e3a8a', '#102a52']} position={[pWidth/2, 0, pDepth/2]} />
          
          {/* Wireframe Outline of the Physical Store bounds */}
          <group position={[pWidth/2, pHeight/2, pDepth/2]}>
            <mesh>
              <boxGeometry args={[pWidth, pHeight, pDepth]} />
              <meshBasicMaterial color="#0ea5e9" wireframe transparent opacity={0.2} />
            </mesh>
          </group>

          {/* Drawing Catch Plane (Invisible Raycast Target based on View) */}
          {isDrawing && (
            <mesh 
              position={activeView === 'top' ? [pWidth/2, 0, pDepth/2] : activeView === 'front' ? [pWidth/2, pHeight/2, pDepth] : [0, pHeight/2, pDepth/2]}
              rotation={activeView === 'top' ? [-Math.PI/2, 0, 0] : activeView === 'right' ? [0, Math.PI/2, 0] : [0, 0, 0]}
              onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
            >
              <planeGeometry args={[1000, 1000]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          )}

          {/* Active Drawing Preview */}
          <DrawingBox start={drawStart} end={drawEnd} view={activeView} storeWidth={pWidth} storeHeight={pHeight} storeDepth={pDepth} />

          {/* Render Saved Sectional Labels */}
          {filteredZones.map(zone => (
            <SectionBox key={zone.id} zone={zone} isSelected={selectedZoneId === zone.id} isHovered={false} onClick={() => setSelectedZoneId(zone.id)} />
          ))}

        </Canvas>
      </div>
    </div>
  );
}