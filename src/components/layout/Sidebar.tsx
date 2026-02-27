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
    Warehouse as WHIcon,
    Truck,
    Database,
    BarChart,
    BookOpen,
    PieChart,
    Columns
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
    { to: '/catalogue', icon: Boxes, label: 'Catalogue' },
    { to: '/warehouse', icon: WHIcon, label: 'Warehouse' },
    { to: '/suppliers', icon: Truck, label: 'Suppliers' },
    { to: '/dbeditor', icon: Database, label: 'DB Editor' },
    { to: '/reports', icon: BarChart, label: 'Reports' },
    { to: '/analytics', icon: PieChart, label: 'Analytics' },
    { to: '/docs', icon: BookOpen, label: 'Docs' },
    { to: '/splitviewer', icon: Columns, label: 'Split Viewer' },
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
            <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-300">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-900 shadow-md">
                    <Boxes className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-surface-900">
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
                                ? 'bg-surface-900 text-white shadow-sm'
                                : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                            }`
                        }
                    >
                        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-surface-300 p-4">
                <div className="flex items-center gap-2 text-xs text-surface-500">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                    <span>Offline-Ready</span>
                </div>
            </div>
        </aside>
    );
}
