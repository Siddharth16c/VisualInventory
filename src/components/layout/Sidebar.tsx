import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store/store';
import { useIsMasterAdmin } from '@/hooks/useFeatureFlag';
import { FEATURE_DEFINITIONS, isFeatureEnabled } from '@/config/featuresConfig';
import { X, Boxes } from 'lucide-react';

function NavItem({ 
    to, 
    icon: Icon, 
    label, 
    isExpanded 
}: { 
    to: string; 
    icon: React.ComponentType<{ className?: string }>; 
    label: string; 
    isExpanded: boolean;
}) {
    return (
        <NavLink
            to={to}
            onClick={() => useAppStore.getState().setSidebarOpen(false)}
            title={!isExpanded ? label : undefined}
            className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isExpanded ? 'px-3 py-2' : 'px-2 py-2 justify-center'}
                ${isActive
                    ? 'bg-surface-900 text-white shadow-sm'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                }`
            }
        >
            <Icon className="h-[17px] w-[17px] flex-shrink-0" />
            {isExpanded && <span className="truncate animate-fade-in">{label}</span>}
        </NavLink>
    );
}

export default function Sidebar() {
    const sidebarOpen = useAppStore((s) => s.sidebarOpen);
    const [hovered, setHovered] = useState(false);
    const isMasterAdmin = useIsMasterAdmin();
    const enabledFeatures = useAppStore((s) => s.enabledFeatures);
    const userRole = useAppStore((s) => s.userRole);

    const isExpanded = sidebarOpen || hovered;

    const visibleFeatures = useMemo(() => {
        return FEATURE_DEFINITIONS.filter(feature => {
            if (feature.adminOnly && !isMasterAdmin) return false;
            
            if (!isMasterAdmin && !feature.alwaysEnabled) {
                return isFeatureEnabled(feature.key, enabledFeatures, userRole);
            }
            
            return true;
        });
    }, [isMasterAdmin, enabledFeatures, userRole]);

    return (
        <aside
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`
                fixed inset-y-0 left-0 z-40 transform transition-all duration-300 ease-out
                lg:relative lg:translate-x-0 lg:z-auto
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${isExpanded ? 'w-56' : 'w-[52px]'}
                glass flex flex-col overflow-hidden
            `}
        >
            {/* Logo */}
            <div className={`flex items-center gap-3 px-3 py-4 border-b border-surface-300 ${isExpanded ? '' : 'justify-center'}`}>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-900 shadow-md">
                    <Boxes className="h-4 w-4 text-white" />
                </div>
                {isExpanded && (
                    <div className="min-w-0 animate-fade-in">
                        <h1 className="text-sm font-bold text-surface-900 truncate">VisualOS</h1>
                        <p className="text-[9px] text-surface-500 font-medium tracking-wider uppercase">Inventory Suite</p>
                    </div>
                )}
                {sidebarOpen && (
                    <button
                        onClick={() => useAppStore.getState().setSidebarOpen(false)}
                        className="ml-auto lg:hidden btn-ghost p-1"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-1.5 space-y-0.5">
                {visibleFeatures.map((feature) => (
                    <NavItem
                        key={feature.key}
                        to={feature.route}
                        icon={feature.icon}
                        label={feature.label}
                        isExpanded={isExpanded}
                    />
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-surface-300 p-3">
                <div className={`flex items-center gap-2 text-xs text-surface-500 ${isExpanded ? '' : 'justify-center'}`}>
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft flex-shrink-0" />
                    {isExpanded && <span className="animate-fade-in">Offline-Ready</span>}
                </div>
            </div>
        </aside>
    );
}
