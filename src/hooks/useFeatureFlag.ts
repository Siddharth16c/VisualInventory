import { useAppStore } from '@/store/store';
import { isFeatureEnabled, type FeatureFlag } from '@/config/featuresConfig';

export function useFeatureFlag(flag: FeatureFlag): boolean {
    const userRole = useAppStore(s => s.userRole);
    const enabledFeatures = useAppStore(s => s.enabledFeatures);
    
    return isFeatureEnabled(flag, enabledFeatures, userRole);
}

export function useAllFeatureFlags(): Record<FeatureFlag, boolean> {
    const userRole = useAppStore(s => s.userRole);
    const enabledFeatures = useAppStore(s => s.enabledFeatures);
    
    const { FEATURE_KEYS, FEATURE_DEFINITIONS } = require('@/config/featuresConfig');
    
    const result: Record<string, boolean> = {};
    for (const key of FEATURE_KEYS) {
        result[key] = isFeatureEnabled(key, enabledFeatures, userRole);
    }
    return result;
}

export function useIsMasterAdmin(): boolean {
    return useAppStore(s => s.userRole) === 'master_admin';
}
