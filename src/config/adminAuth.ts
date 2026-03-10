export const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'visualos2026', // Change this in production
};

export const ADMIN_TOKEN_KEY = 'visualos_admin_token';
export const ADMIN_SESSION_KEY = 'visualos_admin_session';

export function generateAdminToken(): string {
    return btoa(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

export function validateAdminToken(token: string | null): boolean {
    if (!token) return false;
    try {
        const decoded = atob(token);
        const [timestamp] = decoded.split('-');
        const tokenAge = Date.now() - parseInt(timestamp, 10);
        return tokenAge < 24 * 60 * 60 * 1000; // 24 hour expiry
    } catch {
        return false;
    }
}

export function getAdminToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function getAdminSession(): { isLoggedIn: boolean; switchedToFirm: string | null } | null {
    try {
        const session = localStorage.getItem(ADMIN_SESSION_KEY);
        return session ? JSON.parse(session) : null;
    } catch {
        return null;
    }
}

export function setAdminSession(switchedToFirm: string | null): void {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        isLoggedIn: true,
        switchedToFirm,
        updatedAt: Date.now(),
    }));
}
