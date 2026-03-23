import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/store';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FirmSwitcher } from '@/components/FirmSwitcher'; // Adjust path if needed

const pageTitles: Record<string, string> = {
    '/billing': 'Orders & Billing',
    '/inventory': 'Inventory',
    '/fieldops': 'Field Ops',
    '/marketing': 'Marketing',
    '/suppliers': 'Suppliers',
    '/warehouse': 'Warehouse',
    '/reports': 'Reports & Analytics',
    '/accounting': 'Accounting',
    '/splitviewer': 'Split Viewer',
    '/settings': 'Settings',
};

// Define the props coming from App.tsx
interface HeaderProps {
    showFirmSwitcher?: boolean;
    firms?: any[]; // Replace 'any' with your Firm type if available
    currentFirmId?: string;
    onSwitch?: (firmId: string) => void;
}

export default function Header({ showFirmSwitcher, firms, currentFirmId, onSwitch }: HeaderProps) {
    const location = useLocation();
    const activeBusiness = useAppStore((s) => s.activeBusiness);
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

    return (
        <header className="no-print flex items-center justify-between w-full border-b border-surface-300 px-4 py-3 lg:px-6 bg-white h-[60px]">

            {/* --- LEFT SIDE: Menu & Firm Switcher --- */}
            <div className="flex items-center gap-4 flex-shrink-0">
                <button
                    onClick={() => useAppStore.getState().toggleSidebar()}
                    className="btn-ghost p-2 lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Inject the actual FirmSwitcher component here */}
                {showFirmSwitcher && firms && onSwitch && (
                    <div className="w-[200px]"> {/* Optional wrapper to control width */}
                        <FirmSwitcher
                            firms={firms}
                            currentFirmId={currentFirmId ?? null}
                            onSwitch={onSwitch}
                        />
                    </div>
                )}
            </div>

            {/* --- RIGHT SIDE: Firm Label & App Status --- */}
            <div className="flex items-center gap-3 flex-shrink-0 pl-4">
                {/* Firm name badge */}
                <span className="hidden sm:inline text-xs font-medium text-surface-500 bg-surface-100 px-2.5 py-1 rounded-full max-w-[180px] truncate">
                    {activeBusiness}
                </span>

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