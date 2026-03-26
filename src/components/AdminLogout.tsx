import { LogOut } from 'lucide-react';
import { clearAdminToken } from '@/config/adminAuth';
import { useAppStore } from '@/store/store';

export function AdminLogout() {
    const setActiveBusiness = useAppStore(s => s.setActiveBusiness);
    
    const handleLogout = () => {
        clearAdminToken();
        window.location.reload();
    };
    
    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
        </button>
    );
}
