import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import type { FirmWithFeatures } from '@/auth/types';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isLoading, error, firms, currentFirmId } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
    const [showFirmSelect, setShowFirmSelect] = useState(false);

    const filteredFirms = firms.filter(f => f.id !== '11111111-1111-1111-111111111111');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            return;
        }
        await login(username, password, selectedFirmId || undefined);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50">
                <Loader2 className="h-8 w-8 animate-spin text-surface-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 p-8">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden">
                    <div className="bg-surface-900 px-6 py-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
                            <Lock className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white">VisualInventory</h1>
                        <p className="text-surface-400 text-sm mt-1">Sign in to your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-surface-700">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-surface-900 focus:border-transparent"
                                    placeholder="Enter username"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-surface-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                                <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-surface-900 focus:border-transparent"
                                placeholder="Enter password"
                            />
                            </div>
                        </div>

                        {filteredFirms.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-surface-700">Select Firm</label>
                                <select
                                    value={selectedFirmId || ''}
                                    onChange={(e) => setSelectedFirmId(e.target.value || null)}
                                    className="w-full px-3 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-surface-900 focus:border-transparent"
                                >
                                    <option value="">All Firms</option>
                                    {filteredFirms.map(firm => (
                                        <option key={firm.id} value={firm.id}>
                                            {firm.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !username || !password}
                            className="w-full py-2.5 bg-surface-900 text-white rounded-lg font-medium hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="px-6 pb-6 text-center">
                        <p className="text-xs text-surface-400">
                            {filteredFirms.length > 0 ? 'Select a firm if you have multiple firm access' : 'Contact admin for multi-firm access'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
