import { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import { ADMIN_CREDENTIALS, generateAdminToken, setAdminToken, setAdminSession } from '@/config/adminAuth';
import { useAppStore } from '@/store/store';

interface AdminLoginProps {
    onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const setActiveBusiness = useAppStore(s => s.setActiveBusiness);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        await new Promise(resolve => setTimeout(resolve, 300));

        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            const token = generateAdminToken();
            setAdminToken(token);
            setAdminSession(null);
            setActiveBusiness('VisualInventory Admin');
            onLogin();
        } else {
            setError('Invalid credentials');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50">
            <div className="w-full max-w-md p-8">
                <div className="bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-surface-900 px-6 py-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
                            <ShieldCheck className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white">Admin Access</h1>
                        <p className="text-surface-400 text-sm mt-1">VisualInventory Control Panel</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-surface-700">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-surface-900 focus:border-transparent"
                                    placeholder="Enter username"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-surface-700">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-surface-900 focus:border-transparent"
                                    placeholder="Enter password"
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className="w-full py-2.5 bg-surface-900 text-white rounded-lg font-medium hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Authenticating...' : 'Login to Admin Panel'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="px-6 pb-6">
                        <p className="text-xs text-surface-400 text-center">
                            This is a protected admin area. Unauthorized access is prohibited.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
