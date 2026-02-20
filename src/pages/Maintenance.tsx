import { useState } from 'react';
import { db } from '@/db/dexie';
import { getStorageEstimate } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import { Download, Upload, Database, HardDrive, Loader2, AlertTriangle, Settings, Tag, Layers, Package, Box } from 'lucide-react';
import { downloadBlob } from '@/utils/share';
import StaticDataManager from '@/components/StaticDataManager';

export default function Maintenance() {
    const addToast = useAppStore((s) => s.addToast);
    const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [activeManager, setActiveManager] = useState<string | null>(null);

    const loadStorageInfo = async () => {
        const info = await getStorageEstimate();
        setStorageInfo(info);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const backup: Record<string, any[]> = {};

            // Export all tables (including item_types)
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

            // Handle product_media separately (has Blob data)
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
            downloadBlob(blob, `visualos-backup-${new Date().toISOString().split('T')[0]}.json`);
            addToast('Backup exported successfully', 'success');
        } catch (e) {
            addToast('Export failed', 'error');
            console.error(e);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const text = await file.text();
            let backup: Record<string, any[]>;

            try {
                backup = JSON.parse(text);
            } catch {
                addToast('Invalid JSON file', 'error');
                setIsImporting(false);
                return;
            }

            if (typeof backup !== 'object' || backup === null) {
                addToast('Invalid backup format', 'error');
                setIsImporting(false);
                return;
            }

            // Confirm before overwriting
            if (!confirm('This will replace ALL existing data. Continue?')) {
                setIsImporting(false);
                return;
            }

            // Clear all tables then import
            const tableNames = Object.keys(backup);
            for (const name of tableNames) {
                const table = (db as any)[name];
                if (table) {
                    await table.clear();

                    let items = backup[name];

                    // Decode base64 blobs for product_media
                    if (name === 'product_media') {
                        items = items.map((m: any) => {
                            if (m._blob_encoded && typeof m.data === 'string') {
                                const binary = atob(m.data);
                                const bytes = new Uint8Array(binary.length);
                                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                const restored = { ...m, data: new Blob([bytes], { type: m.mime_type }) };
                                delete restored._blob_encoded;
                                return restored;
                            }
                            return m;
                        });
                    }

                    // Remove IDs to let auto-increment work, or keep them if needed
                    await table.bulkAdd(items);
                }
            }

            addToast('Backup imported successfully!', 'success');
        } catch (e: any) {
            addToast(`Import failed: ${e.message}`, 'error');
            console.error(e);
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    const refDataButtons = [
        { key: 'verticals', label: 'Verticals', icon: Layers, desc: 'Stationery, Cutlery, Fireworks...' },
        { key: 'products', label: 'Products', icon: Package, desc: 'Notebooks, Pens, Sky Shot...' },
        { key: 'brands', label: 'Brands', icon: Tag, desc: 'Reegal, Prime, Supreme...' },
        { key: 'variant_params_1', label: 'Variant 1 (Pages)', icon: Box, desc: '172pg, 140pg, 72pg, 280pg...' },
        { key: 'variant_params_2', label: 'Variant 2 (Types)', icon: Box, desc: 'Square Line, 4 Line, Plain...' },
        { key: 'variant_params_3', label: 'Variant 3 (Size)', icon: Box, desc: 'A4, A5, Jumbo, Long, Big...' },
        { key: 'packing_units', label: 'Packing Units', icon: Package, desc: 'Dozen (×12), Box (×20)...' },
    ];

    return (
        <div className="animate-fade-in space-y-6 max-w-2xl">
            <p className="text-sm text-surface-500">
                Manage reference data, export &amp; import your database, and monitor local storage.
            </p>

            {/* Reference Data Management */}
            <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                    <Settings className="h-5 w-5 text-brand-600" />
                    <div>
                        <h3 className="text-sm font-semibold text-brand-600">Reference Data</h3>
                        <p className="text-xs text-surface-500">Add, edit, or delete verticals, brands, item types, and packing units</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {refDataButtons.map(({ key, label, icon: Icon, desc }) => (
                        <button
                            key={key}
                            onClick={() => setActiveManager(key)}
                            className="glass rounded-lg p-3 text-left hover:bg-surface-100 transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className="h-4 w-4 text-brand-600 group-hover:text-brand-500" />
                                <span className="text-sm font-medium text-brand-600">{label}</span>
                            </div>
                            <p className="text-xs text-surface-500 truncate">{desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Storage Info */}
            <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                    <HardDrive className="h-5 w-5 text-brand-600" />
                    <h3 className="text-sm font-semibold text-brand-600">Storage Usage</h3>
                    <button onClick={loadStorageInfo} className="ml-auto btn-ghost text-xs px-2 py-1">Refresh</button>
                </div>
                {storageInfo ? (
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-surface-500">Used</span>
                            <span className="text-brand-600">{formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}</span>
                        </div>
                        <div className="w-full bg-surface-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-brand-600 to-brand-400 h-3 rounded-full transition-all"
                                style={{ width: `${Math.min((storageInfo.usage / storageInfo.quota) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-surface-500">Click "Refresh" to check storage</p>
                )}
            </div>

            {/* Export */}
            <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                    <Download className="h-5 w-5 text-emerald-400" />
                    <div>
                        <h3 className="text-sm font-semibold text-emerald-400">Export Backup</h3>
                        <p className="text-xs text-surface-500">Download entire database as JSON file</p>
                    </div>
                </div>
                <button onClick={handleExport} disabled={isExporting} className="btn-primary flex items-center gap-2">
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {isExporting ? 'Exporting...' : 'Export Database'}
                </button>
            </div>

            {/* Import */}
            <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                    <Upload className="h-5 w-5 text-amber-400" />
                    <div>
                        <h3 className="text-sm font-semibold text-amber-400">Import Backup</h3>
                        <p className="text-xs text-surface-500">Restore from a previously exported JSON file</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">Importing will replace all existing data!</p>
                </div>
                <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isImporting ? 'Importing...' : 'Select Backup File'}
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={isImporting} />
                </label>
            </div>

            {/* DB Info */}
            <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                    <Database className="h-5 w-5 text-brand-400" />
                    <h3 className="text-sm font-semibold text-brand-400">Database Info</h3>
                </div>
                <div className="text-sm text-surface-500 space-y-1">
                    <p>Database: <span className="text-surface-900">VisualOS_DB</span></p>
                    <p>Engine: <span className="text-surface-900">Dexie.js (IndexedDB)</span></p>
                    <p>Schema: <span className="text-surface-900">v7</span></p>
                    <p>Persistence: <span className="text-surface-900">navigator.storage.persist()</span></p>
                </div>
            </div>

            {/* Static Data Manager Modal */}
            {activeManager && (
                <StaticDataManager
                    tableKey={activeManager}
                    onClose={() => setActiveManager(null)}
                />
            )}
        </div>
    );
}
