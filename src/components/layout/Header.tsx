import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/store';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/inventory': 'Inventory',
    '/billing': 'Billing',
    '/pricelist': 'Price List',
    '/media': 'Media Studio',
    '/prospects': 'Prospects',
    '/routes': 'Routes & Visits',
    '/accounting': 'Accounting',
    '/maintenance': 'Maintenance',
};

export default function Header() {
    const location = useLocation();
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const title = pageTitles[location.pathname] || 'VisualOS';

    return (
        <header className="no-print flex items-center gap-4 border-b border-surface-300 px-4 py-3 lg:px-6 bg-white">
            <button
                onClick={() => useAppStore.getState().toggleSidebar()}
                className="btn-ghost p-2 lg:hidden"
            >
                <Menu className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold text-surface-900">{title}</h2>

            <div className="ml-auto flex items-center gap-3">
                <div
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${isOnline
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                >
                    {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
            </div>
        </header>
    );
}
