/**
 * Firm Configuration — Domain / URL-based firm resolution
 *
 * Instead of auth credentials, the active firm is determined by the hostname.
 * Each firm gets its own subdomain (or the main domain for master admin).
 *
 * This config is the single source of truth for firm identity.
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
    // Production subdomains
    'firma.kailash.observer': {
        firmId: 'firm-a',
        firmName: 'R.S. Enterprises',
        role: 'store_owner',
        slug: 'rs-enterprises',
    },
    'firmb.kailash.observer': {
        firmId: 'firm-b',
        firmName: 'Kailash Cutlery',
        role: 'store_owner',
        slug: 'kailash-cutlery',
    },
    'firmc.kailash.observer': {
        firmId: 'firm-c',
        firmName: 'Kartik Traders',
        role: 'store_owner',
        slug: 'kartik-traders',
    },

    // Master admin — main domain
    'app.kailash.observer': {
        firmId: 'master',
        firmName: 'VisualInventory Admin',
        role: 'master_admin',
        slug: 'admin',
    },
    'www.app.kailash.observer': {
        firmId: 'master',
        firmName: 'VisualInventory Admin',
        role: 'master_admin',
        slug: 'admin',
    },
};

// ── Default (localhost / dev) ────────────────────────────────────
const DEFAULT_FIRM: FirmConfig = {
    firmId: 'firm-a',
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
