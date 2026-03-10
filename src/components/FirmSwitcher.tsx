import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/store';
import { setAdminSession } from '@/config/adminAuth';
import { setSession } from '@/db/dal';
import { DEFAULT_ENABLED_FEATURES, type FeatureFlag } from '@/config/featuresConfig';

interface Firm {
    id: string;
    name: string;
    slug: string;
    enabled_features: Record<FeatureFlag, boolean> | null;
}

interface FirmSwitcherProps {
    firms: Firm[];
    currentFirmId: string | null;
    onSwitch: (firmId: string) => void;
}

export function FirmSwitcher({ firms, currentFirmId, onSwitch }: FirmSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [switching, setSwitching] = useState(false);
    const setActiveBusiness = useAppStore(s => s.setActiveBusiness);
    const setFirmId = useAppStore(s => s.setFirmId);
    const setEnabledFeatures = useAppStore(s => s.setEnabledFeatures);

    const currentFirm = firms.find(f => f.id === currentFirmId);

    const handleSwitch = async (firm: Firm) => {
        if (firm.id === currentFirmId) {
            setIsOpen(false);
            return;
        }

        setSwitching(true);
        try {
            setSession(firm.id, 'master_admin');
            setFirmId(firm.id);
            setActiveBusiness(firm.name);

            const features = firm.enabled_features || DEFAULT_ENABLED_FEATURES;
            setEnabledFeatures(features as Record<FeatureFlag, boolean>);

            setAdminSession(firm.id);
            onSwitch(firm.id);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to switch firm:', error);
        } finally {
            setSwitching(false);
        }
    };

    const handleResetToAdmin = () => {
        setSession('master', 'master_admin');
        setFirmId('master');
        setActiveBusiness('VisualInventory Admin');
        setEnabledFeatures(DEFAULT_ENABLED_FEATURES);
        setAdminSession(null);
        onSwitch('master');
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={switching}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors text-sm"
            >
                <Building2 className="h-4 w-4 text-surface-500" />
                <span className="font-medium text-surface-500">
                    {currentFirm?.name || 'Select Firm'}
                </span>
                {switching ? (
                    <RefreshCw className="h-4 w-4 text-surface-400 animate-spin" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-surface-400" />
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-surface-200 rounded-lg shadow-lg z-20 overflow-hidden">
                        <div className="p-2 border-b border-surface-100 bg-surface-50">
                            <p className="text-xs text-surface-500 font-medium">Switch to Firm</p>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                            <button
                                onClick={handleResetToAdmin}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-50 ${currentFirmId === 'master' ? 'bg-surface-100' : ''
                                    }`}
                            >
                                <ShieldCheck className="h-4 w-4 text-purple-500" />
                                <span className="font-medium text-surface-500">Admin Dashboard</span>
                                {currentFirmId === 'master' && (
                                    <Check className="h-4 w-4 text-emerald-500 ml-auto" />
                                )}
                            </button>

                            <div className="border-t border-surface-100 my-1" />

                            {firms.map((firm) => (
                                <button
                                    key={firm.id}
                                    onClick={() => handleSwitch(firm)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-50 ${currentFirmId === firm.id ? 'bg-surface-100' : ''
                                        }`}
                                >
                                    <Building2 className="h-4 w-4 text-surface-400" />
                                    <span className='text-surface-500'>{firm.name}</span>
                                    {currentFirmId === firm.id && (
                                        <Check className="h-4 w-4 text-emerald-500 ml-auto" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
