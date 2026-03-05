import { useState, lazy, Suspense } from 'react';
import { BarChart3, LayoutDashboard, Download, Activity, Loader2 } from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import ReportDownloads from '@/pages/ReportDownloads';

// Lazy-load Analytics since it pulls in Three.js (~heavy)
const Analytics = lazy(() => import('@/pages/Analytics'));

type ReportsTab = 'kpis' | 'downloads' | 'analytics';

export default function Reports() {
    const [tab, setTab] = useState<ReportsTab>('kpis');

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header + tabs */}
            <div className="flex items-center gap-3 flex-wrap">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
                <h1 className="text-lg font-bold text-surface-900">Reports</h1>
            </div>

            <div className="flex border-b border-surface-300">
                <button onClick={() => setTab('kpis')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'kpis' ? 'border-surface-900 text-surface-900' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
                    <LayoutDashboard className="h-4 w-4 inline mr-1.5" /> KPIs
                </button>
                <button onClick={() => setTab('downloads')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'downloads' ? 'border-surface-900 text-surface-900' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
                    <Download className="h-4 w-4 inline mr-1.5" /> Downloads
                </button>
                <button onClick={() => setTab('analytics')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'analytics' ? 'border-surface-900 text-surface-900' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
                    <Activity className="h-4 w-4 inline mr-1.5" /> Analytics
                </button>
            </div>

            {/* Tab content */}
            {tab === 'kpis' && <Dashboard />}
            {tab === 'downloads' && <ReportDownloads />}
            {tab === 'analytics' && (
                <Suspense fallback={
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
                        <span className="ml-2 text-sm text-surface-500">Loading Analytics…</span>
                    </div>
                }>
                    <Analytics />
                </Suspense>
            )}
        </div>
    );
}
