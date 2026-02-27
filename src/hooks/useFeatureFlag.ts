import { useAppStore } from '@/store/store';

/**
 * Check whether a feature is enabled for the current user's firm.
 *
 * Feature flags are stored in `firms.enabled_features` as a JSON object.
 * The master_admin always has all features enabled.
 *
 * Usage:
 *   const canUseBilling = useFeatureFlag('billing');
 */
export function useFeatureFlag(flag: string): boolean {
    const userRole = useAppStore(s => s.userRole);
    // Master admin bypasses all flags
    if (userRole === 'master_admin') return true;

    // For now, we keep a snapshot of enabled_features in the business config
    // loaded by App.tsx into activeBusiness config. We read from the store.
    // TODO: store `enabled_features` in the AuthSlice after login — for now default true
    return true; // Will be wired to firms.enabled_features after first login
}
