/**
 * Typesense Sync Utilities
 * 
 * One-time bulk sync + real-time incremental sync for items
 * 
 * Usage:
 *   import { syncItemsToTypesense, syncSingleItem } from '@/lib/typesense-sync';
 *   
 *   // Bulk sync (run once after Typesense server is live)
 *   await syncItemsToTypesense('firm-uuid-here');
 *   
 *   // Real-time sync (call after item save/update)
 *   await syncSingleItem(123);
 * 
 * Environment variables required:
 * - VITE_TYPESENSE_HOST: Typesense server hostname
 * - VITE_TYPESENSE_ADMIN_KEY: Admin API key (for write operations)
 */

import Typesense from 'typesense';
import { supabase } from '@/db/supabase';

// Type for the Typesense client instance
type TypesenseClient = InstanceType<typeof Typesense.Client>;

// Initialize Typesense admin client (requires admin key for writes)
const getTypesenseAdminClient = () => {
  const host = import.meta.env.VITE_TYPESENSE_HOST;
  const apiKey = import.meta.env.VITE_TYPESENSE_ADMIN_KEY;

  if (!host || !apiKey) {
    throw new Error('[Typesense Sync] Missing VITE_TYPESENSE_HOST or VITE_TYPESENSE_ADMIN_KEY environment variables');
  }

  return new Typesense.Client({
    nodes: [
      {
        host,
        port: 443,
        protocol: 'https',
      },
    ],
    apiKey,
    connectionTimeoutSeconds: 10,
  });
};

// Lazy-initialized admin client
let typesenseAdminClient: TypesenseClient | null = null;

const getAdminClient = (): TypesenseClient => {
  if (!typesenseAdminClient) {
    typesenseAdminClient = getTypesenseAdminClient();
  }
  return typesenseAdminClient;
};

// Typesense batch limit
const BATCH_SIZE = 100;

/**
 * Typesense document shape for items collection
 */
interface TypesenseItemDocument {
  id: number;
  firm_id: string;
  item_name: string;
  keyword_id?: string;
  brand_name?: string;
  vertical_name?: string;
  subcategory_name?: string;
  stock_parcels: number;
  stock_units: number;
  retail_price_unit: number;
  retail_price_container: number;
  wholesale_price_unit: number;
  wholesale_price_container: number;
  mrp: number;
  reorder_threshold: number;
  p_unit: number;
  p_unit_per_parcel: number;
}

/**
 * Transform Supabase item_full_chain row to Typesense document
 */
function transformToTypesenseDoc(row: any): TypesenseItemDocument {
  return {
    id: row.item_id ?? row.id,
    firm_id: row.firm_id,
    item_name: row.item_name ?? '',
    keyword_id: row.keyword_id ?? undefined,
    brand_name: row.brand_name ?? undefined,
    vertical_name: row.vertical_name ?? undefined,
    subcategory_name: row.subcategory_name ?? undefined,
    stock_parcels: row.stock_parcels ?? 0,
    stock_units: row.stock_units ?? 0,
    retail_price_unit: row.retail_price_unit ?? 0,
    retail_price_container: row.retail_price_container ?? 0,
    wholesale_price_unit: row.wholesale_price_unit ?? 0,
    wholesale_price_container: row.wholesale_price_container ?? 0,
    mrp: row.mrp ?? 0,
    reorder_threshold: row.reorder_threshold ?? 0,
    p_unit: row.p_unit ?? 1,
    p_unit_per_parcel: row.p_unit_per_parcel ?? 1,
  };
}

/**
 * Bulk sync all items from Supabase to Typesense
 * 
 * @param firmId The firm UUID to sync items for
 * @param options.onProgress Callback for progress updates (current, total)
 * @param options.onBatchComplete Callback after each batch completes
 * @returns Summary of sync operation
 */
export async function syncItemsToTypesense(
  firmId: string,
  options?: {
    onProgress?: (current: number, total: number) => void;
    onBatchComplete?: (batchNumber: number, batchSize: number) => void;
  }
): Promise<{
  success: boolean;
  totalSynced: number;
  batchesProcessed: number;
  errors: string[];
}> {
  const client = getAdminClient();
  const errors: string[] = [];
  let totalSynced = 0;
  let batchesProcessed = 0;

  console.log(`[Typesense Sync] Starting bulk sync for firm: ${firmId}`);

  try {
    // Get total count first
    const { count, error: countError } = await supabase
      .from('item_full_chain')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId);

    if (countError) {
      throw new Error(`Failed to get item count: ${countError.message}`);
    }

    const totalItems = count ?? 0;
    console.log(`[Typesense Sync] Found ${totalItems} items to sync`);

    if (totalItems === 0) {
      return { success: true, totalSynced: 0, batchesProcessed: 0, errors: [] };
    }

    // Process in batches
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch batch from Supabase
      const { data: rows, error: fetchError } = await supabase
        .from('item_full_chain')
        .select('*')
        .eq('firm_id', firmId)
        .order('item_id', { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        errors.push(`Batch ${batchesProcessed + 1} fetch error: ${fetchError.message}`);
        break;
      }

      if (!rows || rows.length === 0) {
        hasMore = false;
        break;
      }

      // Transform to Typesense documents
      const documents = rows.map(transformToTypesenseDoc);

      try {
        // Import batch to Typesense
        const importResults = await client
          .collections('items')
          .documents()
          .import(documents, { action: 'upsert' });

        // Check for individual document errors
        const batchErrors = importResults.filter((r: any) => !r.success);
        if (batchErrors.length > 0) {
          errors.push(`Batch ${batchesProcessed + 1}: ${batchErrors.length} document(s) failed`);
          batchErrors.forEach((err: any) => {
            console.error('[Typesense Sync] Import error:', err.error);
          });
        }

        totalSynced += documents.length - batchErrors.length;
        batchesProcessed++;

        // Progress callbacks
        options?.onProgress?.(totalSynced, totalItems);
        options?.onBatchComplete?.(batchesProcessed, documents.length);

        console.log(`[Typesense Sync] Batch ${batchesProcessed} complete: ${documents.length} items`);

        // Check if we've processed all items
        if (rows.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          offset += BATCH_SIZE;
        }

        // Small delay to avoid overwhelming the server
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (importError: any) {
        errors.push(`Batch ${batchesProcessed + 1} import error: ${importError.message}`);
        console.error('[Typesense Sync] Import failed:', importError);
        break;
      }
    }

    const success = errors.length === 0;
    console.log(`[Typesense Sync] Complete. Synced ${totalSynced}/${totalItems} items in ${batchesProcessed} batches`);

    return {
      success,
      totalSynced,
      batchesProcessed,
      errors,
    };

  } catch (error: any) {
    console.error('[Typesense Sync] Fatal error:', error);
    errors.push(`Fatal error: ${error.message}`);
    return {
      success: false,
      totalSynced,
      batchesProcessed,
      errors,
    };
  }
}

/**
 * Sync a single item to Typesense (for real-time updates after save/update)
 * 
 * @param itemId The item ID to sync
 * @returns True if successful
 */
export async function syncSingleItem(itemId: number): Promise<boolean> {
  const client = getAdminClient();

  console.log(`[Typesense Sync] Syncing single item: ${itemId}`);

  try {
    // Fetch item from Supabase
    const { data: row, error } = await supabase
      .from('item_full_chain')
      .select('*')
      .eq('item_id', itemId)
      .single();

    if (error) {
      console.error(`[Typesense Sync] Failed to fetch item ${itemId}:`, error.message);
      return false;
    }

    if (!row) {
      console.warn(`[Typesense Sync] Item ${itemId} not found in database`);
      return false;
    }

    // Transform and upsert to Typesense
    const document = transformToTypesenseDoc(row);
    
    await client
      .collections('items')
      .documents()
      .upsert(document);

    console.log(`[Typesense Sync] Item ${itemId} synced successfully`);
    return true;

  } catch (error: any) {
    console.error(`[Typesense Sync] Failed to sync item ${itemId}:`, error.message);
    return false;
  }
}

/**
 * Delete a single item from Typesense index
 * 
 * @param itemId The item ID to delete
 * @returns True if successful
 */
export async function deleteItemFromTypesense(itemId: number): Promise<boolean> {
  const client = getAdminClient();

  console.log(`[Typesense Sync] Deleting item from index: ${itemId}`);

  try {
    await client
      .collections('items')
      .documents(itemId.toString())
      .delete();

    console.log(`[Typesense Sync] Item ${itemId} deleted from index`);
    return true;

  } catch (error: any) {
    // 404 is okay — item wasn't in index
    if (error.httpStatus === 404) {
      console.log(`[Typesense Sync] Item ${itemId} not in index (already deleted)`);
      return true;
    }

    console.error(`[Typesense Sync] Failed to delete item ${itemId}:`, error.message);
    return false;
  }
}

/**
 * Verify the items collection exists in Typesense
 * Creates it if it doesn't exist (requires admin key)
 */
export async function ensureItemsCollection(): Promise<boolean> {
  const client = getAdminClient();

  try {
    // Check if collection exists
    const collections = await client.collections().retrieve();
    const exists = collections.some((c: any) => c.name === 'items');

    if (exists) {
      console.log('[Typesense Sync] Collection "items" already exists');
      return true;
    }

    // Create collection
    console.log('[Typesense Sync] Creating "items" collection...');

    await client.collections().create({
      name: 'items',
      fields: [
        { name: 'id', type: 'int32' },
        { name: 'firm_id', type: 'string', facet: true },
        { name: 'item_name', type: 'string' },
        { name: 'keyword_id', type: 'string', optional: true },
        { name: 'brand_name', type: 'string', optional: true, facet: true },
        { name: 'vertical_name', type: 'string', optional: true, facet: true },
        { name: 'subcategory_name', type: 'string', optional: true, facet: true },
        { name: 'stock_parcels', type: 'int32' },
        { name: 'stock_units', type: 'int32' },
        { name: 'retail_price_unit', type: 'float' },
        { name: 'retail_price_container', type: 'float' },
        { name: 'wholesale_price_unit', type: 'float' },
        { name: 'wholesale_price_container', type: 'float' },
        { name: 'mrp', type: 'float' },
        { name: 'reorder_threshold', type: 'int32' },
        { name: 'p_unit', type: 'int32' },
        { name: 'p_unit_per_parcel', type: 'int32' },
      ],
      // @ts-ignore - Typesense type issue, works at runtime
      default_sorting_field: 'stock_parcels',
    });

    console.log('[Typesense Sync] Collection "items" created successfully');
    return true;

  } catch (error: any) {
    console.error('[Typesense Sync] Failed to ensure collection:', error.message);
    return false;
  }
}

export default {
  syncItemsToTypesense,
  syncSingleItem,
  deleteItemFromTypesense,
  ensureItemsCollection,
};
