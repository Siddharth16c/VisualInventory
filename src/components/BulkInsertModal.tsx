import { useState } from 'react';
import { db, type Item } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import { Upload, X, Copy, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

interface BulkInsertModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function BulkInsertModal({ onClose, onSuccess }: BulkInsertModalProps) {
    const addToast = useAppStore((s) => s.addToast);
    const [textData, setTextData] = useState('');
    const [parsedItems, setParsedItems] = useState<Partial<Item>[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Expected columns (simple version)
    // Name, Category, Retail Price (Unit), Wholesale Price (Unit), Parcels, p_unit, pkg_per_parcel
    const EXPECTED_HEADERS = ['Name', 'Category', 'Retail', 'Wholesale', 'Parcels', 'Units/Pkg', 'Pkgs/Parcel'];

    const handleParse = () => {
        setIsParsing(true);
        try {
            const rows = textData.split('\n').map(r => r.trim()).filter(Boolean);
            if (rows.length === 0) {
                addToast('No data found', 'error');
                return;
            }

            const items: Partial<Item>[] = [];
            // Skip header if it looks like one
            const startIndex = rows[0].toLowerCase().includes('name') || rows[0].toLowerCase().includes('category') ? 1 : 0;

            for (let i = startIndex; i < rows.length; i++) {
                // Split by Tab (Excel) or Comma
                const cols = rows[i].split(/\t|,/).map(c => c.trim());
                if (cols.length < 2) continue; // Skip invalid rows (must have at least name and category)

                const name = cols[0];
                const category = cols[1] || 'Uncategorized';
                const retail = parseFloat(cols[2]) || 0;
                const wholesale = parseFloat(cols[3]) || retail; // fallback to retail
                const parcels = parseInt(cols[4]) || 0;
                const pUnit = parseInt(cols[5]) || 1;
                const pkgPerParcel = parseInt(cols[6]) || 1;

                items.push({
                    item_name: name,
                    category,
                    retail_price_unit: retail,
                    wholesale_price_unit: wholesale,
                    retail_price_container: retail * pUnit,
                    wholesale_price_container: wholesale * pUnit,
                    stock_parcels: parcels,
                    p_unit: pUnit,
                    P_unit_per_parcel: pkgPerParcel,
                    stock_units: pUnit * pkgPerParcel * parcels,
                    mrp: 0,
                    createdAt: new Date().toISOString(),
                });
            }

            setParsedItems(items);
            if (items.length === 0) addToast('Could not parse any valid items', 'error');
        } catch (e) {
            addToast('Error parsing data', 'error');
        } finally {
            setIsParsing(false);
        }
    };

    const handleImport = async () => {
        if (parsedItems.length === 0) return;
        setIsImporting(true);
        const batchId = `import_${Date.now()}`;

        try {
            const itemsToInsert: Item[] = parsedItems.map(p => ({
                ...p,
                metadata: { import_batch_id: batchId },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })) as Item[];

            await db.items.bulkAdd(itemsToInsert);

            // Try to auto-create missing categories/verticals
            const uniqueCategories = new Set(itemsToInsert.map(i => i.category));
            const existingVerticals = await db.verticals.toArray();
            const existingCatNames = new Set(existingVerticals.map(v => v.name));

            for (const cat of uniqueCategories) {
                if (!existingCatNames.has(cat) && cat !== 'Uncategorized') {
                    await db.verticals.add({ name: cat });
                }
            }

            addToast(`Successfully imported ${itemsToInsert.length} items`, 'success');
            onSuccess();
            onClose();
        } catch (e: any) {
            addToast(`Import failed: ${e.message}`, 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const handleRollback = async () => {
        // Find most recent batch id
        const allItems = await db.items.toArray();
        const batches = allItems
            .map(i => i.metadata?.import_batch_id)
            .filter(Boolean) as string[];

        if (batches.length === 0) {
            addToast('No recent imports found to rollback', 'info');
            return;
        }

        const latestBatch = batches.sort().pop();
        if (!confirm(`Rollback (delete) all items from import batch ${latestBatch}?`)) return;

        try {
            const toDelete = allItems.filter(i => i.metadata?.import_batch_id === latestBatch).map(i => i.id!);
            await db.items.bulkDelete(toDelete);
            addToast(`Rolled back ${toDelete.length} items`, 'success');
            onSuccess();
        } catch (e: any) {
            addToast(`Rollback failed: ${e.message}`, 'error');
        }
    };

    const copyTemplate = () => {
        navigator.clipboard.writeText(EXPECTED_HEADERS.join('\t'));
        addToast('Template copied to clipboard! Paste in Excel.', 'success');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="glass rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                <div className="flex items-center justify-between p-4 border-b border-surface-200">
                    <div className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-brand-600" />
                        <h2 className="text-lg font-bold text-surface-900">Bulk Insert Items</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleRollback} className="btn-secondary text-xs flex items-center gap-1.5" title="Undo the last bulk import">
                            <RotateCcw className="h-3.5 w-3.5" /> Rollback Last
                        </button>
                        <button onClick={onClose} className="p-1 hover:bg-surface-100 rounded-lg">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> How to use
                        </h3>
                        <p className="text-xs text-blue-800 mb-3">
                            Copy data from Excel or Google Sheets and paste it below. Make sure your columns match the expected format.
                            Categories that don't exist will be created automatically.
                        </p>
                        <div className="flex items-center justify-between bg-white p-2 border border-blue-100 rounded-lg">
                            <code className="text-xs text-blue-600">{EXPECTED_HEADERS.join(' → ')}</code>
                            <button onClick={copyTemplate} className="btn-ghost text-xs flex items-center gap-1 px-2 py-1">
                                <Copy className="h-3.5 w-3.5" /> Copy Headers
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">Paste Data (TSV/CSV)</label>
                        <textarea
                            className="w-full h-40 p-3 bg-white border border-surface-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-mono whitespace-pre"
                            placeholder={"Apsara Pencil\tStationery\t5.00\t4.50\t10\t10\t1\nCamlin Marker\tStationery\t25.00\t20.00\t5\t10\t1"}
                            value={textData}
                            onChange={(e) => setTextData(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleParse}
                            disabled={!textData.trim() || isParsing}
                            className="btn-secondary text-sm disabled:opacity-50"
                        >
                            Preview Data
                        </button>
                    </div>

                    {parsedItems.length > 0 && (
                        <div className="border border-surface-200 rounded-xl overflow-hidden mt-4 bg-white">
                            <div className="bg-surface-50 px-4 py-2 border-b border-surface-200 flex justify-between items-center">
                                <span className="text-sm font-semibold text-surface-900">Preview ({parsedItems.length} items)</span>
                                <span className="text-xs text-surface-500">Scroll to view all</span>
                            </div>
                            <div className="max-h-64 overflow-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-surface-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 border-b border-surface-200">Name</th>
                                            <th className="px-3 py-2 border-b border-surface-200">Category</th>
                                            <th className="px-3 py-2 border-b border-surface-200">Retail</th>
                                            <th className="px-3 py-2 border-b border-surface-200">Stock (Parcels)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {parsedItems.map((item, i) => (
                                            <tr key={i} className="hover:bg-surface-50">
                                                <td className="px-3 py-2">{item.item_name}</td>
                                                <td className="px-3 py-2">{item.category}</td>
                                                <td className="px-3 py-2">Rs.{item.retail_price_unit?.toFixed(2)}</td>
                                                <td className="px-3 py-2">{item.stock_parcels}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-surface-200 bg-surface-50 flex justify-end gap-3">
                    <button onClick={onClose} className="btn-ghost">Cancel</button>
                    <button
                        onClick={handleImport}
                        disabled={parsedItems.length === 0 || isImporting}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                        {isImporting ? 'Importing...' : <><CheckCircle className="h-4 w-4" /> Import {parsedItems.length} Items</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
