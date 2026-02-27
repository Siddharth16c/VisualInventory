import { useState, useEffect } from 'react';
import { db } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import { Download, X, AlertTriangle, Loader2 } from 'lucide-react';
import { downloadBlob } from '@/utils/share';

export default function AutoBackup() {
    const addToast = useAppStore((s) => s.addToast);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const checkBackup = () => {
            const lastBackupStr = localStorage.getItem('visualOS_lastBackupDate');
            const today = new Date().toISOString().split('T')[0];

            // If we've never backed up, or the last backup wasn't today
            if (!lastBackupStr || lastBackupStr !== today) {
                // Show prompt after a short delay so it doesn't interrupt immediate use
                setTimeout(() => setShowPrompt(true), 15000);
            }
        };

        // Delay the initial check slightly when the component mounts
        const timer = setTimeout(checkBackup, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleBackup = async () => {
        setIsExporting(true);
        try {
            const backup: Record<string, any[]> = {};

            const tableNames = [
                'items', 'products', 'prospects', 'orders', 'order_items',
                'travel_records', 'visits', 'costs', 'account',
                'marketing_catalogues', 'verticals', 'brands',
                'packing_units', 'variant_params_1', 'variant_params_2', 'variant_params_3', 'bills', 'business_config',
            ];

            for (const name of tableNames) {
                const table = (db as any)[name];
                if (table) {
                    backup[name] = await table.toArray();
                }
            }

            // Handle product_media separately
            const mediaItems = await db.product_media.toArray();
            backup['product_media'] = await Promise.all(
                mediaItems.map(async (m) => {
                    const arrayBuffer = await (m.data as Blob).arrayBuffer();
                    const base64 = btoa(
                        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                    );
                    return { ...m, data: base64, _blob_encoded: true };
                })
            );

            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob([json], { type: 'application/json' });

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
        // Still prompt them next time they open the app today (unless they specifically mute it, but we'll be persistent for safety)
        // We'll just dismiss for this session.
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
                        Remind Later
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
            </div>
        </div>
    );
}
