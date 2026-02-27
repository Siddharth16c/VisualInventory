import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { hierarchy, treemap, type HierarchyNode } from 'd3-hierarchy';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BrandTile {
    brand_id: number;
    brand_name: string;
    vertical_id: number;
    vertical_name: string;
    revenue: number;
    order_count: number;
    share?: number;        // filled by parent
}

interface TileBox {
    x0: number; y0: number; x1: number; y1: number;
    data: BrandTile;
    depth: number;
}

interface BrandHeatmapProps {
    brands: BrandTile[];
    width: number;          // canvas width in world units
    height: number;         // canvas height in world units
    onBrandClick?: (b: BrandTile) => void;
    selectedBrandId?: number | null;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

const VERTICAL_PALETTE = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4',
    '#f97316', '#a855f7', '#14b8a6', '#ef4444', '#8b5cf6',
];

function verticalColor(verticalId: number): THREE.Color {
    return new THREE.Color(VERTICAL_PALETTE[verticalId % VERTICAL_PALETTE.length]);
}

function revenueToEmissive(share: number): THREE.Color {
    // Low share = dark, high share = glowing hue
    const val = Math.min(share * 3, 1);
    const base = new THREE.Color().setHSL(0.6 - val * 0.4, 0.8, 0.12 + val * 0.18);
    return base;
}

// ─── Single tile mesh ─────────────────────────────────────────────────────────

function Tile({ tile, onTileClick, isSelected }: {
    tile: TileBox;
    onTileClick: (b: BrandTile) => void;
    isSelected: boolean;
}) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const w = tile.x1 - tile.x0;
    const h = tile.y1 - tile.y0;
    const cx = tile.x0 + w / 2;
    const cy = tile.y0 + h / 2;
    const depth = tile.depth === 1 ? 0.06 : 0.04; // vertical group vs brand tile

    const baseColor = verticalColor(tile.data.vertical_id);
    const emissive = revenueToEmissive(tile.data.share ?? 0);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const targetScale = isSelected ? 1.03 : 1;
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    });

    if (w < 0.05 || h < 0.05) return null; // skip tiny tiles

    return (
        <group position={[cx, cy, 0]}>
            <RoundedBox
                ref={meshRef}
                args={[w - 0.02, h - 0.02, depth]}
                radius={0.015}
                smoothness={4}
                onClick={() => onTileClick(tile.data)}
            >
                <meshStandardMaterial
                    color={baseColor}
                    emissive={emissive}
                    emissiveIntensity={isSelected ? 1.8 : 1}
                    roughness={0.3}
                    metalness={0.25}
                    transparent
                    opacity={0.88}
                />
            </RoundedBox>

            {/* Brand name label */}
            {w > 0.25 && h > 0.15 && (
                <Text
                    position={[0, h * 0.18, depth + 0.01]}
                    fontSize={Math.min(w, h) * 0.18}
                    maxWidth={w * 0.9}
                    color="#f1f5f9"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/inter.woff"
                    characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,-_ "
                >
                    {tile.data.brand_name.length > 12 ? tile.data.brand_name.slice(0, 11) + '…' : tile.data.brand_name}
                </Text>
            )}

            {/* Revenue share label */}
            {w > 0.3 && h > 0.22 && (
                <Text
                    position={[0, -h * 0.12, depth + 0.01]}
                    fontSize={Math.min(w, h) * 0.14}
                    color="#94a3b8"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/inter.woff"
                    characters="0123456789.%Rs., "
                >
                    {`Rs.${tile.data.revenue >= 1000 ? (tile.data.revenue / 1000).toFixed(1) + 'k' : tile.data.revenue.toFixed(0)}`}
                </Text>
            )}

            {/* Share % */}
            {w > 0.35 && h > 0.28 && (
                <Text
                    position={[0, -h * 0.3, depth + 0.01]}
                    fontSize={Math.min(w, h) * 0.11}
                    color="#64748b"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/inter.woff"
                    characters="0123456789.% "
                >
                    {`${((tile.data.share ?? 0) * 100).toFixed(1)}%`}
                </Text>
            )}
        </group>
    );
}

// ─── Main heatmap component ───────────────────────────────────────────────────

export default function BrandHeatmap({
    brands, width, height, onBrandClick, selectedBrandId
}: BrandHeatmapProps) {
    // Compute d3 treemap layout
    const tiles: TileBox[] = useMemo(() => {
        if (!brands.length) return [];

        const totalRevenue = brands.reduce((s, b) => s + b.revenue, 0);
        const brandsWithShare = brands.map(b => ({
            ...b,
            share: totalRevenue > 0 ? b.revenue / totalRevenue : 0,
            value: Math.max(b.revenue, 1), // 0-revenue brands get minimum tile
        }));

        // Build d3 hierarchy: root → verticals → brands
        const grouped: Record<string, typeof brandsWithShare> = {};
        for (const b of brandsWithShare) {
            const key = b.vertical_name;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(b);
        }

        const root = hierarchy({
            name: 'root',
            children: Object.entries(grouped).map(([name, children]) => ({
                name,
                children: children.map(b => ({ ...b, children: [] })),
            })),
        })
            .sum((d: any) => d.value ?? 0)
            .sort((a: HierarchyNode<any>, b: HierarchyNode<any>) => (b.value ?? 0) - (a.value ?? 0));

        const layout = treemap<any>()
            .size([width, height])
            .paddingOuter(0.04)
            .paddingInner(0.02)
            .paddingTop(0.04)
            .round(false);

        layout(root);

        const result: TileBox[] = [];
        root.leaves().forEach((leaf: HierarchyNode<any>) => {
            const l = leaf as any;
            result.push({
                x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1,
                data: l.data,
                depth: l.depth,
            });
        });
        return result;
    }, [brands, width, height]);

    if (!tiles.length) {
        return (
            <Text position={[0, 0, 0]} fontSize={0.12} color="#475569" anchorX="center" anchorY="middle">
                No brand revenue data for this period
            </Text>
        );
    }

    // Offset so origin is at centre (canvas draws from top-left)
    const offsetX = -width / 2;
    const offsetY = -height / 2;

    return (
        <group position={[offsetX, offsetY, 0]}>
            {tiles.map((tile, i) => (
                <Tile
                    key={`${tile.data.brand_id}-${i}`}
                    tile={tile}
                    onTileClick={b => onBrandClick?.(b)}
                    isSelected={selectedBrandId === tile.data.brand_id}
                />
            ))}
        </group>
    );
}
