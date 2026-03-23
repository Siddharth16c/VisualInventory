export type UserRole = 'master_admin' | 'store_admin' | 'staff';

export interface User {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    firm_id: string | null;
    created_at: string;
}

export interface AuthState {
    user: User | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    username: string;
    password: string;
    firm_id?: string;
}

export interface FirmWithFeatures {
    id: string;
    name: string;
    slug: string;
    enabled_features: Record<string, boolean> | null;
    is_global?: boolean;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
    'master_admin': 3,
    'store_admin': 2,
    'staff': 1,
};

export function hasRole(user: User | null, requiredRole: UserRole): boolean {
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
}

export function isMasterAdmin(user: User | null): boolean {
    return user?.role === 'master_admin';
}

export function canManageFirms(user: User | null): boolean {
    return hasRole(user, 'master_admin');
}

export function canToggleFeatures(user: User | null): boolean {
    return hasRole(user, 'store_admin');
}

export const STAFF_ALLOWED_FEATURES = [
    'billing',
    'inventory',
    'suppliers',
    'warehouse',
];

export const GLOBAL_TABLES = [
    'suppliers',
    'variant_params_1',
    'variant_params_2',
    'variant_params_3',
];

export const STATIC_USERS: Array<{
    username: string;
    password: string;
    role: UserRole;
    firm_id: string | null;
    firm_name: string;
}> = [
    { username: 'admin', password: 'visualos2024', role: 'master_admin', firm_id: null, firm_name: 'All Firms' },
    { username: 'rs_admin', password: 'rs2024', role: 'store_admin', firm_id: '33b0fa7a-217c-4c85-982e-e5301906bda7', firm_name: 'R.S. Enterprises' },
    { username: 'kailash_admin', password: 'kailash2024', role: 'store_admin', firm_id: 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', firm_name: 'Kailash Fataka' },
    { username: 'kartik_admin', password: 'kartik2024', role: 'store_admin', firm_id: 'be17178e-4f92-4392-83de-1bfccdae1ff3', firm_name: 'Kartik Traders' },
    { username: 'staff', password: 'staff2024', role: 'staff', firm_id: '33b0fa7a-217c-4c85-982e-e5301906bda7', firm_name: 'R.S. Enterprises' },
];
