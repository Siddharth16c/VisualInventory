/**
 * Firm Configuration — Domain / URL-based firm resolution
 *
 * Instead of auth credentials, the active firm is determined by the hostname.
 * Each firm gets its own subdomain (or the main domain for master admin).
 *
 * Real Firm UUIDs (from DB):
 * - Master HQ:           11111111-1111-1111-1111-111111111111
 * - R.S. Enterprises:    33b0fa7a-217c-4c85-982e-e5301906bda7
 * - Kailash Fataka:      a41012cc-d643-41ea-a0f4-7bb5c1f08a51
 * - Kartik Traders:      be17178e-4f92-4392-83de-1bfccdae1ff3
 */

export interface FirmConfig {
    firmId: string;
    firmName: string;
    role: 'master_admin' | 'store_owner';
    slug: string;
}

// ── Firm Registry ────────────────────────────────────────────────
// Map hostnames to firm configs. Add new firms here.
const FIRM_MAP: Record<string, FirmConfig> = {
    // Master admin — main domain
    'app.kailash.observer': {
        firmId: '11111111-1111-1111-1111-111111111111',
        firmName: 'Master HQ',
        role: 'master_admin',
        slug: 'master-hq',
    },
    'www.app.kailash.observer': {
        firmId: '11111111-1111-1111-1111-111111111111',
        firmName: 'Master HQ',
        role: 'master_admin',
        slug: 'master-hq',
    },

    // Firm subdomains
    'rs.kailash.observer': {
        firmId: '33b0fa7a-217c-4c85-982e-e5301906bda7',
        firmName: 'R.S. Enterprises',
        role: 'store_owner',
        slug: 'rs-enterprises',
    },
    'kailash.kailash.observer': {
        firmId: 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51',
        firmName: 'Kailash Cutlery',
        role: 'store_owner',
        slug: 'kailash-cutlery',
    },
    'kartik.kailash.observer': {
        firmId: 'be17178e-4f92-4392-83de-1bfccdae1ff3',
        firmName: 'Kartik Traders',
        role: 'store_owner',
        slug: 'kartik-traders',
    },
};

// ── Default (localhost / dev) ────────────────────────────────────
const DEFAULT_FIRM: FirmConfig = {
    firmId: '33b0fa7a-217c-4c85-982e-e5301906bda7',
    firmName: 'R.S. Enterprises',
    role: 'master_admin', // dev gets full access
    slug: 'rs-enterprises',
};

/**
 * Resolve the active firm from the current browser URL.
 * Falls back to DEFAULT_FIRM for localhost / unknown hosts.
 */
export function resolveFirmFromURL(): FirmConfig {
    const hostname = window.location.hostname.toLowerCase();

    // Check exact match first
    if (FIRM_MAP[hostname]) {
        return FIRM_MAP[hostname];
    }

    // Check if it's a known subdomain pattern
    for (const [key, config] of Object.entries(FIRM_MAP)) {
        if (hostname.endsWith(key)) {
            return config;
        }
    }

    // Localhost or unknown → default
    return DEFAULT_FIRM;
}

/**
 * Check if current session is master admin
 */
export function isMasterAdmin(): boolean {
    return resolveFirmFromURL().role === 'master_admin';
}

/**
 * Get all configured firms (for admin panel)
 */
export function getAllFirmConfigs(): FirmConfig[] {
    return Object.values(FIRM_MAP);
}
