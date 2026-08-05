import type { LucideIcon } from 'lucide-react';
import {
    Receipt,
    Package,
    MapPin,
    Megaphone,
    Image,
    Truck,
    Warehouse as WHIcon,
    BarChart,
    TrendingUp,
    Columns,
    Settings,
    ShieldCheck,
} from 'lucide-react';

export type FeatureFlag =
    | 'billing'
    | 'inventory'
    | 'fieldops'
    | 'marketing'
    | 'media'
    | 'suppliers'
    | 'warehouse'
    | 'reports'
    | 'accounting'
    | 'splitviewer'
    | 'settings'
    | 'admin';

export type FeatureCategory = 'core' | 'operations' | 'analytics' | 'admin';

export interface FeatureDefinition {
    key: FeatureFlag;
    label: string;
    description: string;
    icon: LucideIcon;
    category: FeatureCategory;
    route: string;
    alwaysEnabled?: boolean;
    adminOnly?: boolean;
}

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
    {
        key: 'billing',
        label: 'Orders & Billing',
        description: 'Create orders, manage carts, print invoices, track payments',
        icon: Receipt,
        category: 'core',
        route: '/billing',
    },
    {
        key: 'inventory',
        label: 'Inventory',
        description: 'DB editor, stock management, item CRUD operations',
        icon: Package,
        category: 'core',
        route: '/inventory',
    },
    {
        key: 'fieldops',
        label: 'Field Operations',
        description: 'Visit planning, route management, prospect tracking',
        icon: MapPin,
        category: 'operations',
        route: '/fieldops',
    },
    {
        key: 'marketing',
        label: 'Marketing',
        description: 'Price lists, catalogues, promotional materials',
        icon: Megaphone,
        category: 'operations',
        route: '/marketing',
    },
    {
        key: 'media',
        label: 'Media',
        description: 'Product images, GIFs, watermarking, media library',
        icon: Image,
        category: 'operations',
        route: '/media',
    },
    {
        key: 'suppliers',
        label: 'Suppliers',
        description: 'Supplier management, purchase orders, procurement',
        icon: Truck,
        category: 'operations',
        route: '/suppliers',
    },
    {
        key: 'warehouse',
        label: 'Warehouse',
        description: '3D warehouse visualization, storage locations, slot management',
        icon: WHIcon,
        category: 'operations',
        route: '/warehouse',
    },
    {
        key: 'reports',
        label: 'Reports',
        description: 'Sales reports, stock snapshots, analytics dashboards',
        icon: BarChart,
        category: 'analytics',
        route: '/reports',
    },
    {
        key: 'accounting',
        label: 'Accounting',
        description: 'P&L tracking, costs, monthly accounts',
        icon: TrendingUp,
        category: 'analytics',
        route: '/accounting',
    },
    {
        key: 'splitviewer',
        label: 'Split Viewer',
        description: 'Side-by-side comparison view for data analysis',
        icon: Columns,
        category: 'analytics',
        route: '/splitviewer',
    },
    {
        key: 'settings',
        label: 'Maintenance',
        description: 'App configuration and preferences',
        icon: Settings,
        category: 'admin',
        route: '/settings',
        alwaysEnabled: true,
    },
    {
        key: 'admin',
        label: 'Admin Panel',
        description: 'Master admin: feature flags, firm management, user roles',
        icon: ShieldCheck,
        category: 'admin',
        route: '/admin',
        adminOnly: true,
    },
];

export const FEATURE_KEYS = FEATURE_DEFINITIONS.map(f => f.key);

export const DEFAULT_ENABLED_FEATURES: Record<FeatureFlag, boolean> = {
    billing: true,
    inventory: true,
    fieldops: true,
    marketing: true,
    media: true,
    suppliers: true,
    warehouse: true,
    reports: true,
    accounting: true,
    splitviewer: true,
    settings: true,
    admin: false,
};

export function getFeaturesByCategory(): Record<FeatureCategory, FeatureDefinition[]> {
    const result: Record<FeatureCategory, FeatureDefinition[]> = {
        core: [],
        operations: [],
        analytics: [],
        admin: [],
    };
    for (const feature of FEATURE_DEFINITIONS) {
        result[feature.category].push(feature);
    }
    return result;
}

export function isFeatureEnabled(
    featureKey: FeatureFlag,
    enabledFeatures: Record<string, boolean> | null | undefined,
    userRole: string
): boolean {
    if (userRole === 'master_admin') return true;
    
    const feature = FEATURE_DEFINITIONS.find(f => f.key === featureKey);
    if (feature?.alwaysEnabled) return true;
    if (feature?.adminOnly) return false;
    
    if (!enabledFeatures) return true;
    
    return enabledFeatures[featureKey] === true;
}
