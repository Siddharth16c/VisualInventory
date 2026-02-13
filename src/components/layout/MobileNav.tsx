import { NavLink } from 'react-router-dom';
import { Receipt, Package, FileText, Users, LayoutDashboard } from 'lucide-react';

const mobileNavItems = [
    { to: '/billing', icon: Receipt, label: 'Billing' },
    { to: '/inventory', icon: Package, label: 'Stock' },
    { to: '/pricelist', icon: FileText, label: 'Prices' },
    { to: '/prospects', icon: Users, label: 'Clients' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
];

export default function MobileNav() {
    return (
        <nav className="no-print fixed bottom-0 left-0 right-0 z-30 lg:hidden glass border-t border-surface-700/50">
            <div className="flex items-center justify-around py-2">
                {mobileNavItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium
              ${isActive ? 'text-brand-400' : 'text-surface-500'}`
                        }
                    >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
