import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import DevFirmSwitcher from '@/components/layout/DevFirmSwitcher';
import Maintenance from '@/pages/Maintenance';

type SettingsTab = 'firm' | 'maintenance';

export default function Settings() {
    const [tab, setTab] = useState<SettingsTab>('firm');

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-brand-500" />
                <h1 className="text-lg font-bold text-surface-900">Settings</h1>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-surface-300">
                <button onClick={() => setTab('firm')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'firm' ? 'border-surface-900 text-surface-900' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
                    🏢 Firm Switcher
                </button>
                <button onClick={() => setTab('maintenance')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'maintenance' ? 'border-surface-900 text-surface-900' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
                    🛠️ Maintenance
                </button>
            </div>

            {/* Content */}
            {tab === 'firm' ? (
                <div className="glass rounded-xl p-6 max-w-lg space-y-4">
                    <h2 className="text-sm font-semibold text-surface-700">Active Firm / Business</h2>
                    <p className="text-xs text-surface-500">
                        Switch between firms to access their data. All inventory, orders, and prospects are scoped per firm.
                    </p>
                    <DevFirmSwitcher />
                    <p className="text-[11px] text-surface-400 mt-2">
                        Switching reloads the page so all data resets to the selected firm.
                    </p>
                </div>
            ) : (
                <Maintenance />
            )}
        </div>
    );
}
