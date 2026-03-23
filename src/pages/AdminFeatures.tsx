import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import {
    FEATURE_DEFINITIONS,
    DEFAULT_ENABLED_FEATURES,
    getFeaturesByCategory,
    type FeatureFlag
} from '@/config/featuresConfig';
import {
    ShieldCheck,
    Building2,
    ToggleLeft,
    ToggleRight,
    RefreshCw,
    Save
} from 'lucide-react';

interface Firm {
    id: string;
    name: string;
    slug: string;
    enabled_features: Record<FeatureFlag, boolean> | null;
    address?: string;
    contact?: string;
    email?: string;
}

export default function AdminFeaturePanel() {
    const queryClient = useQueryClient();
    const addToast = useAppStore(s => s.addToast);
    const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
    const [editedFeatures, setEditedFeatures] = useState<Record<FeatureFlag, boolean>>({ ...DEFAULT_ENABLED_FEATURES });
    const [hasChanges, setHasChanges] = useState(false);

    const { data: firms = [], isLoading } = useQuery({
        queryKey: ['firms-admin'],
        queryFn: async () => {
            const data = await DAL.firms.getAll();
            return (data || []) as Firm[];
        },
    });

    const selectedFirm = firms.find(f => f.id === selectedFirmId);

    useEffect(() => {
        if (firms.length > 0 && !selectedFirmId) {
            setSelectedFirmId(firms[0].id);
        }
    }, [firms, selectedFirmId]);

    useEffect(() => {
        if (selectedFirm) {
            const features = selectedFirm.enabled_features || DEFAULT_ENABLED_FEATURES;
            setEditedFeatures(features);
            setHasChanges(false);
        }
    }, [selectedFirm]);

    const updateMutation = useMutation({
        mutationFn: async ({ firmId, features }: { firmId: string; features: Record<FeatureFlag, boolean> }) => {
            await DAL.firms.updateFeatures(firmId, features);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firms-admin'] });
            addToast('Features updated successfully', 'success');
            setHasChanges(false);
        },
        onError: (error) => {
            console.error('Update error:', error);
            addToast('Failed to update features', 'error');
        },
    });

    const toggleFeature = (featureKey: FeatureFlag) => {
        setEditedFeatures(prev => {
            const updated = { ...prev, [featureKey]: !prev[featureKey] };
            const originalFeatures = selectedFirm?.enabled_features || DEFAULT_ENABLED_FEATURES;
            setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalFeatures));
            return updated;
        });
    };

    const enableAllFeatures = () => {
        const allEnabled = FEATURE_DEFINITIONS.reduce((acc, f) => {
            acc[f.key] = !f.adminOnly;
            return acc;
        }, {} as Record<FeatureFlag, boolean>);
        setEditedFeatures(allEnabled);
        setHasChanges(true);
    };

    const disableAllFeatures = () => {
        const allDisabled = FEATURE_DEFINITIONS.reduce((acc, f) => {
            acc[f.key] = f.alwaysEnabled || false;
            return acc;
        }, {} as Record<FeatureFlag, boolean>);
        setEditedFeatures(allDisabled);
        setHasChanges(true);
    };

    const handleSaveFeatures = () => {
        if (selectedFirmId) {
            updateMutation.mutate({ firmId: selectedFirmId, features: editedFeatures });
        }
    };

    const featuresByCategory = getFeaturesByCategory();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-surface-400" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-surface-900">
                        <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-surface-900">Admin Panel</h1>
                        <p className="text-sm text-surface-500">Manage features per firm</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="bg-white rounded-xl border border-surface-200 p-4 flex-1">
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                        Select Firm
                    </label>
                    <select
                        value={selectedFirmId || ''}
                        onChange={(e) => setSelectedFirmId(e.target.value)}
                        className="w-full px-3 py-2 border text-surface-600 border-surface-300 rounded-lg focus:ring-2 focus:ring-surface-900 focus:border-transparent"
                    >
                        {firms.map(firm => (
                            <option key={firm.id} value={firm.id}>
                                {firm.name} ({firm.slug})
                            </option>
                        ))}
                    </select>
                </div>
                {hasChanges && (
                    <button
                        onClick={handleSaveFeatures}
                        disabled={updateMutation.isPending}
                        className="ml-4 flex items-center gap-2 px-4 py-2 bg-surface-900 text-white rounded-lg hover:bg-surface-700 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>

            {selectedFirm && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <button
                            onClick={enableAllFeatures}
                            className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                        >
                            Enable All
                        </button>
                        <button
                            onClick={disableAllFeatures}
                            className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                            Disable All
                        </button>
                        <button
                            onClick={() => {
                                setEditedFeatures({ ...DEFAULT_ENABLED_FEATURES });
                                setHasChanges(true);
                            }}
                            className="px-3 py-1.5 text-xs bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200"
                        >
                            Reset to Defaults
                        </button>
                    </div>

                    {Object.entries(featuresByCategory).map(([category, features]) => (
                        <div key={category} className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                            <div className="px-4 py-3 bg-surface-50 border-b border-surface-200">
                                <h3 className="text-sm font-semibold text-surface-900 capitalize">{category} Features</h3>
                            </div>
                            <div className="divide-y divide-surface-100">
                                {features.map(feature => {
                                    const isEnabled = editedFeatures[feature.key] ?? false;
                                    const isDisabled = feature.adminOnly || feature.alwaysEnabled;

                                    return (
                                        <div
                                            key={feature.key}
                                            className={`flex items-center justify-between px-4 py-3 ${isDisabled ? 'bg-surface-50 opacity-60' : 'hover:bg-surface-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <feature.icon className="h-5 w-5 text-surface-500" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-surface-900">
                                                            {feature.label}
                                                        </span>
                                                        {feature.adminOnly && (
                                                            <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">
                                                                Admin Only
                                                            </span>
                                                        )}
                                                        {feature.alwaysEnabled && (
                                                            <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">
                                                                Always On
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-surface-500">{feature.description}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => !isDisabled && toggleFeature(feature.key)}
                                                disabled={isDisabled}
                                                className={`p-1 rounded transition-colors ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                {isEnabled ? (
                                                    <ToggleRight className="h-7 w-7 text-emerald-500" />
                                                ) : (
                                                    <ToggleLeft className="h-7 w-7 text-surface-300" />
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                <div className="px-4 py-3 bg-surface-50 border-b border-surface-200">
                    <h3 className="text-sm font-semibold text-surface-900">All Firms Overview</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                    {firms.map(firm => {
                        const features = firm.enabled_features || DEFAULT_ENABLED_FEATURES;
                        const enabledCount = Object.values(features).filter(Boolean).length;
                        const totalCount = FEATURE_DEFINITIONS.filter(f => !f.adminOnly).length;

                        return (
                            <div
                                key={firm.id}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                    selectedFirmId === firm.id
                                        ? 'border-surface-900 bg-surface-50'
                                        : 'border-surface-200 hover:border-surface-300'
                                }`}
                                onClick={() => setSelectedFirmId(firm.id)}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="h-4 w-4 text-surface-500" />
                                    <span className="font-medium text-surface-900">{firm.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                    <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                            style={{ width: `${(enabledCount / totalCount) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs">{enabledCount}/{totalCount}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}