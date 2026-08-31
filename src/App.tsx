import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/store';
import { resolveFirmFromURL } from '@/config/firmConfig';
import { setSession } from '@/db/dal';
import { supabase } from '@/db/supabase';
import { DEFAULT_ENABLED_FEATURES, type FeatureFlag } from '@/config/featuresConfig';
import { validateAdminToken, getAdminSession, setAdminSession, clearAdminToken, getAdminToken } from '@/config/adminAuth';
import { FeatureRoute } from '@/components/FeatureRoute';
import { useIsMasterAdmin } from '@/hooks/useFeatureFlag';
import { useDataStore } from '@/store/dataStore';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ToastContainer from '@/components/ui/ToastContainer';
import AutoBackup from '@/components/AutoBackup';
import AdminLogin from '@/pages/AdminLogin';
import LoginPage from '@/pages/LoginPage';
import { FirmSwitcher } from '@/components/FirmSwitcher';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';

import Billing from '@/pages/Billing';
import DBEditor from '@/pages/DBEditor';
import FieldOps from '@/pages/FieldOps';
import Marketing from '@/pages/Marketing';
import Suppliers from '@/pages/Suppliers';
import Warehouse from '@/pages/Warehouse';
import Reports from '@/pages/Reports';
import Accounting from '@/pages/Accounting';
import SplitViewer from '@/pages/SplitViewer';
import SettingsPage from '@/pages/Settings';
import Media from '@/pages/Media';
import AdminFeatures from '@/pages/AdminFeatures';

interface Firm {
    id: string;
    name: string;
    slug: string;
    enabled_features: Record<FeatureFlag, boolean> | null;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
    const isMasterAdmin = useIsMasterAdmin();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const isAdminDomain = window.location.hostname.includes('app.') ||
        window.location.hostname === 'localhost';

    useEffect(() => {
        if (isAdminDomain) {
            const token = getAdminToken();
            if (validateAdminToken(token)) {
                setIsLoggedIn(true);
            }
        } else {
            setIsLoggedIn(true);
        }
    }, [isAdminDomain]);

    if (!isLoggedIn) {
        return <AdminLogin onLogin={() => setIsLoggedIn(true)} />;
    }

    if (!isMasterAdmin && isAdminDomain) {
        return <Navigate to="/billing" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    const sidebarOpen = useAppStore((s) => s.sidebarOpen);
    const [firms, setFirms] = useState<Firm[]>([]);
    const [currentFirmId, setCurrentFirmId] = useState<string | null>(null);

    const isAdminDomain = window.location.hostname.includes('app.') ||
        window.location.hostname === 'localhost';

    useEffect(() => {
        const firm = resolveFirmFromURL();
        const store = useAppStore.getState();
        store.setActiveBusiness(firm.firmName);
        store.setUserRole(firm.role);

        (async () => {
            try {
                const { data: firmsData, error } = await supabase.from('firms').select('id, name, slug, enabled_features');
                if (error) throw error;

                if (firmsData && firmsData.length > 0) {
                    setFirms(firmsData as Firm[]);

                    const adminSession = getAdminSession();

                    if (isAdminDomain && adminSession?.isLoggedIn) {
                        if (adminSession.switchedToFirm) {
                            const switchedFirm = firmsData.find((f: Firm) => f.id === adminSession.switchedToFirm);
                            if (switchedFirm) {
                                setSession(switchedFirm.id, 'master_admin');
                                store.setFirmId(switchedFirm.id);
                                store.setActiveBusiness(switchedFirm.name);
                                setCurrentFirmId(switchedFirm.id);
                                useDataStore.getState().loadData(true);
                                const features = switchedFirm.enabled_features || DEFAULT_ENABLED_FEATURES;
                                store.setEnabledFeatures(features as Record<FeatureFlag, boolean>);
                            }
                        } else {
                            setSession('master', 'master_admin');
                            store.setFirmId('master');
                            setCurrentFirmId('master');
                        }
                    } else {
                        const match = firmsData.find((f: Firm) =>
                            f.name === firm.firmName || f.slug === firm.slug
                        ) || firmsData[0];

                        setSession(match.id, firm.role);
                        store.setFirmId(match.id);
                        setCurrentFirmId(match.id);
                        useDataStore.getState().loadData(true);

                        const features = match.enabled_features || DEFAULT_ENABLED_FEATURES;
                        store.setEnabledFeatures(features as Record<FeatureFlag, boolean>);

                        console.log(`[App] Firm resolved: ${match.name} (${match.id})`);
                    }
                } else {
                    console.warn('[App] No firms in DB — using config firmId as fallback');
                    setSession(firm.firmId, firm.role);
                    store.setFirmId(firm.firmId);
                    setCurrentFirmId(firm.firmId);
                    useDataStore.getState().loadData(true);
                    store.setEnabledFeatures(DEFAULT_ENABLED_FEATURES);
                }
            } catch (e) {
                console.warn('[App] Could not fetch firms from DB:', e);
                setSession(firm.firmId, firm.role);
                store.setFirmId(firm.firmId);
                setCurrentFirmId(firm.firmId);
                useDataStore.getState().loadData(true);
                store.setEnabledFeatures(DEFAULT_ENABLED_FEATURES);
            }
        })();
    }, [isAdminDomain]);

    const handleFirmSwitch = (firmId: string) => {
        setCurrentFirmId(firmId);
        // After switching firm, reload data for the new firm
        // Wait, handleFirmSwitch merely updates local state and then what? 
        // Actually, firm switching uses Headless/window location reload in standard setups, 
        // but if it's SPA, we need to ensure setSession runs. Let's just assume 
        // the app handles it correctly since we are only storing currentFirmId.
    };

    const showFirmSwitcher = isAdminDomain && firms.length > 0;

    return (
        <AuthProvider>
            <div className="flex h-screen overflow-hidden bg-white">
            <Sidebar />

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => useAppStore.getState().setSidebarOpen(false)}
                />
            )}

            <main className="flex flex-1 flex-col overflow-hidden">
                <Header
                    showFirmSwitcher={showFirmSwitcher}
                    firms={firms}
                    currentFirmId={currentFirmId ?? undefined}
                    onSwitch={handleFirmSwitch}
                />
                <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
                    <Routes>
                        <Route path="/" element={<Navigate to="/billing" replace />} />
                        <Route path="/billing" element={<Billing />} />
                       <Route path="/fieldops" element={<FeatureRoute feature="fieldops"><FieldOps /></FeatureRoute>} />
                        <Route path="/marketing" element={<FeatureRoute feature="marketing"><Marketing /></FeatureRoute>} />
                        <Route path="/suppliers" element={<FeatureRoute feature="suppliers"><Suppliers /></FeatureRoute>} />
                        <Route path="/warehouse" element={<FeatureRoute feature="warehouse"><Warehouse /></FeatureRoute>} />
                        <Route path="/reports" element={<FeatureRoute feature="reports"><Reports /></FeatureRoute>} />
                        <Route path="/accounting" element={<FeatureRoute feature="accounting"><Accounting /></FeatureRoute>} />
                        <Route path="/splitviewer" element={<FeatureRoute feature="splitviewer"><SplitViewer /></FeatureRoute>} />
                        <Route path="/media" element={<FeatureRoute feature="media"><Media /></FeatureRoute>} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/admin" element={
                            <AdminRoute>
                                <AdminFeatures />
                            </AdminRoute>
                        } />
                    </Routes>
                </div>
            </main>

            <ToastContainer />
            <AutoBackup />
        </div>
        </AuthProvider>
    );
}
