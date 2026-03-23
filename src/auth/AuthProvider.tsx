import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import { useAppStore } from '@/store/store';
import type { User, FirmWithFeatures, UserRole } from './types';
import { STATIC_USERS } from './types';
import { DEFAULT_ENABLED_FEATURES, type FeatureFlag } from '@/config/featuresConfig';

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    error: string | null;
    firms: FirmWithFeatures[];
    currentFirmId: string | null;
    login: (username: string, password: string, firmId?: string) => Promise<void>;
    logout: () => void;
    switchFirm: (firmId: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

const STORAGE_KEY = 'visualinventory_auth';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [firms, setFirms] = useState<FirmWithFeatures[]>([]);
    const [currentFirmId, setCurrentFirmId] = useState<string | null>(null);

    useEffect(() => {
        checkSession();
    }, []);

    const fetchFirms = async () => {
        try {
            const { data, error } = await supabase
                .from('firms')
                .select('id, name, slug, enabled_features')
                .order('name');

            if (error) throw error;
            setFirms(data || []);
        } catch (err) {
            console.error('Failed to fetch firms:', err);
        }
    };

    const checkSession = async () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            setIsLoading(false);
            return;
        }

        try {
            const session = JSON.parse(stored);
            if (Date.now() > session.expiresAt) {
                localStorage.removeItem(STORAGE_KEY);
                setIsLoading(false);
                return;
            }

            const matchedUser = STATIC_USERS.find(u => u.username === session.username);
            if (!matchedUser) {
                localStorage.removeItem(STORAGE_KEY);
                setIsLoading(false);
                return;
            }

            const userData: User = {
                id: `static-${matchedUser.username}`,
                email: `${matchedUser.username}@visualinventory.local`,
                username: matchedUser.username,
                role: matchedUser.role,
                firm_id: matchedUser.firm_id,
                created_at: new Date().toISOString(),
            };

            setUser(userData);
            setIsLoggedIn(true);
            setCurrentFirmId(matchedUser.firm_id);

            await fetchFirms();

            const firm = (await supabase.from('firms').select('*').eq('id', matchedUser.firm_id).single()).data;
            const enabledFeatures = (firm?.enabled_features as Record<FeatureFlag, boolean>) || DEFAULT_ENABLED_FEATURES;

            const store = useAppStore.getState();
            store.setFirmId(matchedUser.firm_id);
            store.setUserRole(matchedUser.role);
            store.setEnabledFeatures(enabledFeatures);
            store.setActiveBusiness(firm?.name || matchedUser.firm_name);
            store.setLoggedIn(true);
        } catch (err) {
            console.error('Session check failed:', err);
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (username: string, password: string, firmId?: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const matchedUser = STATIC_USERS.find(
                u => u.username === username && u.password === password
            );

            if (!matchedUser) {
                setError('Invalid username or password');
                setIsLoading(false);
                return;
            }

            let targetFirmId = matchedUser.firm_id;
            let targetFirmName = matchedUser.firm_name;

            if (matchedUser.role === 'master_admin' && firmId) {
                targetFirmId = firmId;
                const firm = (await supabase.from('firms').select('*').eq('id', firmId).single()).data;
                targetFirmName = firm?.name || 'Unknown Firm';
            }

            const userData: User = {
                id: `static-${matchedUser.username}`,
                email: `${matchedUser.username}@visualinventory.local`,
                username: matchedUser.username,
                role: matchedUser.role,
                firm_id: targetFirmId,
                created_at: new Date().toISOString(),
            };

            setUser(userData);
            setIsLoggedIn(true);
            setCurrentFirmId(targetFirmId);

            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                username: matchedUser.username,
                firmId: targetFirmId,
                expiresAt: Date.now() + SESSION_EXPIRY_MS,
            }));

            await fetchFirms();

            let enabledFeatures = DEFAULT_ENABLED_FEATURES;
            if (targetFirmId) {
                const { data: firm } = await supabase.from('firms').select('*').eq('id', targetFirmId).single();
                enabledFeatures = (firm?.enabled_features as Record<FeatureFlag, boolean>) || DEFAULT_ENABLED_FEATURES;
                targetFirmName = firm?.name || targetFirmName;
            }

            const store = useAppStore.getState();
            store.setFirmId(targetFirmId);
            store.setUserRole(matchedUser.role);
            store.setEnabledFeatures(enabledFeatures);
            store.setActiveBusiness(targetFirmName);
            store.setLoggedIn(true);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        setIsLoggedIn(false);
        setCurrentFirmId(null);
        setFirms([]);
        setError(null);

        const store = useAppStore.getState();
        store.setFirmId(null);
        store.setUserRole('staff');
        store.setEnabledFeatures(DEFAULT_ENABLED_FEATURES);
        store.setActiveBusiness('');
        store.setLoggedIn(false);
    };

    const switchFirm = async (firmId: string) => {
        if (!user) return;

        const firm = firms.find(f => f.id === firmId);
        if (!firm) return;

        setCurrentFirmId(firmId);
        const enabledFeatures = (firm.enabled_features as Record<FeatureFlag, boolean>) || DEFAULT_ENABLED_FEATURES;

        const store = useAppStore.getState();
        store.setFirmId(firmId);
        store.setEnabledFeatures(enabledFeatures);
        store.setActiveBusiness(firm.name);

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const session = JSON.parse(stored);
            session.firmId = firmId;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }
    };

    const contextValue: AuthContextType = {
        user,
        isLoggedIn,
        isLoading,
        error,
        firms,
        currentFirmId,
        login,
        logout,
        switchFirm,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}
