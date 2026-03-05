import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/store';
import { resolveFirmFromURL } from '@/config/firmConfig';
import { setSession } from '@/db/dal';
import { supabase } from '@/db/supabase';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ToastContainer from '@/components/ui/ToastContainer';
import AutoBackup from '@/components/AutoBackup';

// Pages
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

export default function App() {
    const sidebarOpen = useAppStore((s) => s.sidebarOpen);

    // Resolve firm from URL + fetch real UUID from DB
    useEffect(() => {
        const firm = resolveFirmFromURL();
        const store = useAppStore.getState();
        store.setActiveBusiness(firm.firmName);
        store.setUserRole(firm.role);

        // Fetch real firm UUID from the database
        (async () => {
            try {
                const { data: firms } = await supabase.from('firms').select('id, name, slug');
                if (firms && firms.length > 0) {
                    // Match by name or slug from URL config, or use first firm
                    const match = firms.find((f: any) =>
                        f.name === firm.firmName || f.slug === firm.slug
                    ) || firms[0];
                    setSession(match.id, firm.role); // Real UUID!
                    console.log(`[App] Firm resolved: ${match.name} (${match.id})`);
                } else {
                    console.warn('[App] No firms in DB — using config firmId as fallback');
                    setSession(firm.firmId, firm.role);
                }
            } catch (e) {
                console.warn('[App] Could not fetch firms from DB:', e);
                setSession(firm.firmId, firm.role);
            }
        })();
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <Sidebar />

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => useAppStore.getState().setSidebarOpen(false)}
                />
            )}

            <main className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
                    <Routes>
                        <Route path="/" element={<Navigate to="/billing" replace />} />
                        <Route path="/billing" element={<Billing />} />
                        <Route path="/inventory" element={<DBEditor />} />
                        <Route path="/fieldops" element={<FieldOps />} />
                        <Route path="/marketing" element={<Marketing />} />
                        <Route path="/suppliers" element={<Suppliers />} />
                        <Route path="/warehouse" element={<Warehouse />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/accounting" element={<Accounting />} />
                        <Route path="/splitviewer" element={<SplitViewer />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/media" element={<Media />} />
                    </Routes>
                </div>
            </main>

            <ToastContainer />
            <AutoBackup />
        </div>
    );
}
