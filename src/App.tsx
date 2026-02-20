import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/store';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import ToastContainer from '@/components/ui/ToastContainer';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import Billing from '@/pages/Billing';
import PriceList from '@/pages/PriceList';
import Media from '@/pages/Media';
import Prospects from '@/pages/Prospects';
import Routes_ from '@/pages/Routes';
import Accounting from '@/pages/Accounting';
import Maintenance from '@/pages/Maintenance';
import Catalogue from '@/pages/Catalogue';

export default function App() {
    const sidebarOpen = useAppStore((s) => s.sidebarOpen);

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => useAppStore.getState().setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
                    <Routes>
                        <Route path="/" element={<Navigate to="/billing" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/billing" element={<Billing />} />
                        <Route path="/pricelist" element={<PriceList />} />
                        <Route path="/media" element={<Media />} />
                        <Route path="/prospects" element={<Prospects />} />
                        <Route path="/prospects" element={<Prospects />} />
                        <Route path="/routes" element={<Routes_ />} />
                        <Route path="/accounting" element={<Accounting />} />
                        <Route path="/catalogue" element={<Catalogue />} />
                        <Route path="/maintenance" element={<Maintenance />} />
                    </Routes>
                </div>
                {/* Mobile Bottom Nav */}
                <MobileNav />
            </main>

            <ToastContainer />
        </div>
    );
}
