import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/store';
import {
    LayoutDashboard,
    Package,
    Receipt,
    FileText,
    Image,
    Users,
    Map,
    TrendingUp,
    Settings,
    X,
    Boxes,
} from 'lucide-react';

const navItems = [
    { to: '/billing', icon: Receipt, label: 'Billing' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/pricelist', icon: FileText, label: 'Price List' },
    { to: '/media', icon: Image, label: 'Media' },
    { to: '/prospects', icon: Users, label: 'Prospects' },
    { to: '/routes', icon: Map, label: 'Routes' },
    { to: '/accounting', icon: TrendingUp, label: 'Accounting' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/maintenance', icon: Settings, label: 'Maintenance' },
];

export default function Sidebar() {
    const sidebarOpen = useAppStore((s) => s.sidebarOpen);

    return (
        <aside
            className={`
        fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        glass flex flex-col
      `}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-700/50">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20">
                    <Boxes className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-brand-400 to-brand-200 bg-clip-text text-transparent">
                        VisualOS
                    </h1>
                    <p className="text-[10px] text-surface-500 font-medium tracking-wider uppercase">Inventory Suite</p>
                </div>
                <button
                    onClick={() => useAppStore.getState().setSidebarOpen(false)}
                    className="ml-auto lg:hidden btn-ghost p-1.5"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => useAppStore.getState().setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${isActive
                                ? 'bg-brand-600/20 text-brand-400 shadow-sm'
                                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/80'
                            }`
                        }
                    >
                        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-surface-700/50 p-4">
                <div className="flex items-center gap-2 text-xs text-surface-500">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                    <span>Offline-Ready</span>
                </div>
            </div>
        </aside>
    );
}
