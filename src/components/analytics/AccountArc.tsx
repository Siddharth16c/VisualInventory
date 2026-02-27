import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export interface AccountFlowData {
    revenue: number;
    collected: number;
    due: number;
    procurement: number;
    opex: number;
    total_cost: number;
    profit: number;
    margin: number;
}

interface ArcRingProps {
    radius: number;
    tube: number;
    fill: number;       // 0-1
    color: string;
    emissive: string;
    rotationOffset: number;
}

function ArcRing({ radius, tube, fill, color, emissive, rotationOffset }: ArcRingProps) {
    const ref = useRef<THREE.Mesh>(null!);
    const targetAngle = useRef(0);

    useMemo(() => {
        targetAngle.current = fill * Math.PI * 2;
    }, [fill]);

    useFrame((_, delta) => {
        if (!ref.current) return;
        const geo = ref.current.geometry as THREE.TorusGeometry;
        // Animate arc opening (recreate geometry each frame while animating)
        // For a simpler approach, use rotation scale trick
        ref.current.rotation.z += delta * 0.003; // very slow idle drift
    });

    const arc = Math.max(0.001, fill) * Math.PI * 2;
    const geo = useMemo(() => new THREE.TorusGeometry(radius, tube, 12, 128, arc), [radius, tube, arc]);

    return (
        <mesh
            ref={ref}
            geometry={geo}
            rotation={[0, 0, rotationOffset - Math.PI / 2]}
        >
            <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={0.5}
                roughness={0.2}
                metalness={0.6}
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

interface AccountArcProps {
    data: AccountFlowData;
}

export default function AccountArc({ data }: AccountArcProps) {
    const { revenue, total_cost, profit, margin, collected, due } = data;

    const costRatio = revenue > 0 ? Math.min(total_cost / revenue, 1) : 0;
    const profitRatio = revenue > 0 ? Math.max(profit / revenue, 0) : 0;
    const collectedRatio = revenue > 0 ? Math.min(collected / revenue, 1) : 0;

    const fmt = (v: number) => v >= 100000
        ? `Rs.${(v / 100000).toFixed(1)}L`
        : v >= 1000
            ? `Rs.${(v / 1000).toFixed(1)}k`
            : `Rs.${v.toFixed(0)}`;

    return (
        <group>
            {/* Track rings (dim background) */}
            <mesh rotation={[0, 0, 0]}>
                <torusGeometry args={[0.85, 0.055, 12, 128, Math.PI * 2]} />
                <meshStandardMaterial color="#1e293b" roughness={1} transparent opacity={0.4} />
            </mesh>
            <mesh rotation={[0, 0, 0]}>
                <torusGeometry args={[0.62, 0.055, 12, 128, Math.PI * 2]} />
                <meshStandardMaterial color="#1e293b" roughness={1} transparent opacity={0.4} />
            </mesh>
            <mesh rotation={[0, 0, 0]}>
                <torusGeometry args={[0.39, 0.055, 12, 128, Math.PI * 2]} />
                <meshStandardMaterial color="#1e293b" roughness={1} transparent opacity={0.4} />
            </mesh>

            {/* Revenue arc (outer, white) — full circle = 100% revenue */}
            <ArcRing radius={0.85} tube={0.06} fill={1} color="#e2e8f0" emissive="#94a3b8" rotationOffset={0} />

            {/* Cost arc (middle, red) — proportion of revenue */}
            <ArcRing radius={0.62} tube={0.06} fill={costRatio} color="#ef4444" emissive="#dc2626" rotationOffset={0} />

            {/* Profit arc (inner, green) */}
            <ArcRing radius={0.39} tube={0.06} fill={Math.max(profitRatio, 0)} color="#22c55e" emissive="#16a34a" rotationOffset={0} />

            {/* Collected arc (outer-outer, cyan dashed effect) */}
            <ArcRing radius={1.05} tube={0.028} fill={collectedRatio} color="#06b6d4" emissive="#0891b2" rotationOffset={0} />

            {/* Center labels */}
            <Text position={[0, 0.18, 0.02]} fontSize={0.11} color="#f1f5f9" anchorX="center" anchorY="middle" font="/fonts/inter.woff"
                characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.%Rs., ">
                {fmt(revenue)}
            </Text>
            <Text position={[0, 0.04, 0.02]} fontSize={0.068} color="#94a3b8" anchorX="center" anchorY="middle" font="/fonts/inter.woff"
                characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.%Rs., ">
                Revenue
            </Text>
            <Text position={[0, -0.1, 0.02]} fontSize={0.1} color={profit >= 0 ? '#22c55e' : '#ef4444'} anchorX="center" anchorY="middle"
                font="/fonts/inter.woff" characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.%Rs.,- ">
                {`${margin.toFixed(1)}%`}
            </Text>
            <Text position={[0, -0.22, 0.02]} fontSize={0.062} color="#64748b" anchorX="center" anchorY="middle" font="/fonts/inter.woff"
                characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.%Rs., ">
                Margin
            </Text>

            {/* Legend at bottom */}
            {[
                { label: 'Revenue', color: '#e2e8f0', y: -0.78 },
                { label: `Cost ${fmt(total_cost)}`, color: '#ef4444', y: -0.90 },
                { label: `Profit ${fmt(profit)}`, color: '#22c55e', y: -1.02 },
                { label: `Collected ${fmt(collected)}`, color: '#06b6d4', y: -1.14 },
                { label: `Due ${fmt(due)}`, color: '#f59e0b', y: -1.26 },
            ].map(item => (
                <Text key={item.label} position={[0, item.y, 0]} fontSize={0.065} color={item.color}
                    anchorX="center" anchorY="middle" font="/fonts/inter.woff"
                    characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.%Rs.,- ">
                    {item.label}
                </Text>
            ))}
        </group>
    );
}
