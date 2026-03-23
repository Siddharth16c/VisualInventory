import { useState, useEffect } from 'react';
import { exportDatabaseFile } from '@/db/local/db';
import { useAppStore } from '@/store/store';
import { Download, X, AlertTriangle, Loader2 } from 'lucide-react';
import { downloadBlob } from '@/utils/share';

export default function AutoBackup() {
    const addToast = useAppStore((s) => s.addToast);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const checkBackup = () => {
            if (localStorage.getItem('visualOS_backupDisabled') === 'true') return;
            const snoozeUntil = localStorage.getItem('visualOS_backupSnoozeUntil');
            if (snoozeUntil && Date.now() < Number(snoozeUntil)) return;
            const lastBackupStr = localStorage.getItem('visualOS_lastBackupDate');
            const today = new Date().toISOString().split('T')[0];
            if (!lastBackupStr || lastBackupStr !== today) {
                setTimeout(() => setShowPrompt(true), 30000);
            }
        };
        const timer = setTimeout(checkBackup, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleBackup = async () => {
        setIsExporting(true);
        try {
            const blob = await exportDatabaseFile();

            // Generate filename with timestamp
            const dateStr = new Date().toISOString().split('T')[0];
            downloadBlob(blob, `visualos-backup-${dateStr}.json`);

            // Mark as backed up today
            localStorage.setItem('visualOS_lastBackupDate', dateStr);
            addToast('Backup created securely!', 'success');
            setShowPrompt(false);
        } catch (e: any) {
            addToast(`Export failed: ${e.message}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDismiss = () => {
        // Snooze for 3 days
        const snoozeMs = 3 * 24 * 60 * 60 * 1000;
        localStorage.setItem('visualOS_backupSnoozeUntil', String(Date.now() + snoozeMs));
        setShowPrompt(false);
    };

    const handleDisable = () => {
        localStorage.setItem('visualOS_backupDisabled', 'true');
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] max-w-sm w-full animate-slide-up">
            <div className="glass shadow-2xl rounded-2xl p-5 border border-amber-500/20">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        <h3 className="font-bold text-sm">Daily Backup Recommended</h3>
                    </div>
                    <button onClick={handleDismiss} className="text-surface-400 hover:text-surface-600 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="text-sm text-surface-600 mb-4 leading-relaxed">
                    You haven't downloaded a database backup today. It implies a high risk of losing your critical business entries if your browser clears its data.
                </p>

                <div className="flex gap-2">
                    <button
                        onClick={handleDismiss}
                        className="btn-ghost flex-1 text-xs px-3 py-2"
                        disabled={isExporting}
                    >
                        Snooze 3 Days
                    </button>
                    <button
                        onClick={handleBackup}
                        className="btn-primary flex-1 text-xs px-3 py-2 flex items-center justify-center gap-1.5"
                        disabled={isExporting}
                    >
                        {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        {isExporting ? 'Exporting...' : 'Download Backup'}
                    </button>
                </div>
                <button
                    onClick={handleDisable}
                    className="w-full text-center text-[10px] text-surface-500 hover:text-surface-400 mt-1 transition-colors"
                >
                    Don't show again
                </button>
            </div>
        </div>
    );
}
