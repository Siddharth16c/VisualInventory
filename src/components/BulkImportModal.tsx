import React, { useState } from 'react';
import Papa from 'papaparse';
import { DAL } from '@/db/dal';
import { db } from '@/db/db';
import * as schema from '@/db/schema';
import { sql } from 'drizzle-orm';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/store';

interface BulkImportModalProps {
    file: File;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BulkImportModal({ file, onClose, onSuccess }: BulkImportModalProps) {
    const addToast = useAppStore((s) => s.addToast);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isParsing, setIsParsing] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                setParsedData(data);
                analyzeData(data);
                setIsParsing(false);
            },
            error: (error) => {
                setError(error.message);
                setIsParsing(false);
            }
        });
    }, [file]);

    const analyzeData = (data: any[]) => {
        const uniqueVerticals = new Set();
        const uniqueBrands = new Set();
        const uniqueProducts = new Set();
        const uniquePackingUnits = new Set();

        data.forEach(row => {
            if (row['Vertical']) uniqueVerticals.add(row['Vertical'].trim());
            if (row['Brand Name']) uniqueBrands.add(row['Brand Name'].trim());
            if (row['Product Name']) uniqueProducts.add(row['Product Name'].trim());
            if (row['Packing Unit']) uniquePackingUnits.add(row['Packing Unit'].trim());
        });

        setStats({
            totalRows: data.length,
            verticals: uniqueVerticals.size,
            brands: uniqueBrands.size,
            products: uniqueProducts.size,
            packingUnits: uniquePackingUnits.size,
        });
    };

    const handleConfirm = async () => {
        setIsImporting(true);
        try {
            // Setup cache to avoid duplicate DB calls
            const verticalCache = new Map<string, number>();
            const brandCache = new Map<string, number>();
            const productCache = new Map<string, number>();
            const packingUnitCache = new Map<string, number>();

            // Helper to get or create
            const getOrCreate = async (table: any, nameCol: string, name: string, insertData: any) => {
                if (!name) return null;
                const existing = await db.select().from(table).where(sql`${table[nameCol]} = ${name} COLLATE NOCASE`).limit(1);
                if (existing.length > 0) return existing[0].id;

                const res = await db.insert(table).values(insertData).returning({ id: table.id });
                return res[0].id;
            };

            for (const row of parsedData) {
                const verticalName = row['Vertical']?.trim();
                const brandName = row['Brand Name']?.trim();
                const productName = row['Product Name']?.trim();
                const categoryName = row['Category']?.trim() || 'General';
                const packingUnitName = row['Packing Unit']?.trim();

                let verticalId = null;
                let brandId = null;
                let productId = null;
                let packingUnitId = null;

                // Verticals
                if (verticalName) {
                    if (!verticalCache.has(verticalName)) {
                        verticalId = await getOrCreate(schema.verticals, 'name', verticalName, { name: verticalName });
                        verticalCache.set(verticalName, verticalId);
                    }
                    verticalId = verticalCache.get(verticalName);
                }

                // Brands
                if (brandName) {
                    if (!brandCache.has(brandName)) {
                        brandId = await getOrCreate(schema.brands, 'name', brandName, { name: brandName, vertical_id: verticalId });
                        brandCache.set(brandName, brandId);
                    }
                    brandId = brandCache.get(brandName);
                }

                // Products
                if (productName) {
                    if (!productCache.has(productName)) {
                        productId = await getOrCreate(schema.products, 'name', productName, { name: productName, category: categoryName, vertical_id: verticalId });
                        productCache.set(productName, productId);
                    }
                    productId = productCache.get(productName);
                }

                // Packing Unit
                if (packingUnitName) {
                    if (!packingUnitCache.has(packingUnitName)) {
                        packingUnitId = await getOrCreate(schema.packing_units, 'unit_name', packingUnitName, { unit_name: packingUnitName, multiplier: parseInt(row['Units Per Pack']) || 1 });
                        packingUnitCache.set(packingUnitName, packingUnitId);
                    }
                    packingUnitId = packingUnitCache.get(packingUnitName);
                }

                // Prepare Item
                const itemData = {
                    item_name: row['Item Name'] || 'Unnamed Item',
                    category: categoryName,
                    product_id: productId,
                    brand_id: brandId,
                    vertical_id: verticalId,
                    packing_unit_id: packingUnitId,
                    p_unit: parseInt(row['Units Per Pack']) || 1,
                    P_unit_per_parcel: parseInt(row['Packs Per Parcel']) || 1,
                    stock_parcels: parseInt(row['Stock Parcels']) || 0,
                    stock_units: (parseInt(row['Stock Parcels']) || 0) * (parseInt(row['Packs Per Parcel']) || 1) * (parseInt(row['Units Per Pack']) || 1),
                    retail_price_unit: parseFloat(row['Retail Price (Unit)']) || 0,
                    wholesale_price_unit: parseFloat(row['Wholesale Price (Unit)']) || 0,
                    mrp: parseFloat(row['Maximum Retail Price (MRP)']) || 0,
                    createdAt: new Date().toISOString(),
                };

                // Insert into db
                await DAL.items.add(itemData as any);
                // Note: Skipping image handling (Variant parsing etc.) for MVP simplicity - it can be added later if OPFS is ready.
            }

            addToast(`Successfully imported ${parsedData.length} items.`, 'success');
            onSuccess();
            onClose();

        } catch (e: any) {
            console.error('Import process failed:', e);
            setError(`Database Error: ${e.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
                    <h2 className="text-lg font-semibold text-surface-900">Review Data Import</h2>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-200 text-surface-500 transition-colors">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {isParsing && (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                            <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
                            <p className="text-surface-600 font-medium">Parsing CSV File...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm flex gap-3 items-start border border-red-100">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {!isParsing && !error && stats && (
                        <div className="space-y-6">
                            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm border border-emerald-100">
                                <p className="font-semibold text-emerald-900 mb-1">Row Analysis Complete</p>
                                <p className="opacity-90">The app will safely map relationships. Missing reference data will be automatically generated.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl text-center">
                                    <p className="text-3xl font-bold text-brand-600">{stats.totalRows}</p>
                                    <p className="text-xs text-surface-500 font-medium uppercase tracking-wider mt-1">Total Items</p>
                                </div>
                                <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl text-center">
                                    <p className="text-3xl font-bold text-surface-700">{stats.products}</p>
                                    <p className="text-xs text-surface-500 font-medium uppercase tracking-wider mt-1">Products</p>
                                </div>
                                <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl text-center">
                                    <p className="text-3xl font-bold text-surface-700">{stats.brands}</p>
                                    <p className="text-xs text-surface-500 font-medium uppercase tracking-wider mt-1">Brands</p>
                                </div>
                                <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl text-center">
                                    <p className="text-3xl font-bold text-surface-700">{stats.verticals}</p>
                                    <p className="text-xs text-surface-500 font-medium uppercase tracking-wider mt-1">Verticals</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-surface-100 bg-surface-50 flex justify-end gap-3 mt-auto">
                    <button onClick={onClose} disabled={isImporting} className="btn-ghost">
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isParsing || !!error || isImporting || parsedData.length === 0}
                        className="btn-primary flex items-center gap-2"
                    >
                        {isImporting ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                        ) : (
                            'Confirm Import'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
