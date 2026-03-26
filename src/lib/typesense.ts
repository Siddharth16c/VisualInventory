/**
 * Typesense Client — Search index for items
 * 
 * Falls back to Supabase FTS (DAL.items.search) if Typesense is unavailable
 * 
 * Environment variables:
 * - VITE_TYPESENSE_HOST: Typesense server hostname (e.g., typesense.yourdomain.com)
 * - VITE_TYPESENSE_SEARCH_KEY: Read-only search API key
 */

import Typesense from 'typesense';

// Type for the Typesense client instance
type TypesenseClient = InstanceType<typeof Typesense.Client>;

// Initialize Typesense client
const getTypesenseClient = () => {
  const host = import.meta.env.VITE_TYPESENSE_HOST;
  const apiKey = import.meta.env.VITE_TYPESENSE_SEARCH_KEY;

  if (!host || !apiKey) {
    console.warn('[Typesense] Missing environment variables — search will fall back to Supabase FTS');
    return null;
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
    connectionTimeoutSeconds: 2,
  });
};

// Lazy-initialized client
let typesenseClient: TypesenseClient | null = null;

const getClient = (): TypesenseClient | null => {
  if (!typesenseClient) {
    typesenseClient = getTypesenseClient();
  }
  return typesenseClient;
};

export interface TypesenseSearchFilters {
  query?: string;
  brand?: string;
  vertical?: string;
  subcategory?: string;
  firmId: string;
  limit?: number;
}

export interface TypesenseSearchHit {
  document: {
    id: number;
    firm_id: string;
    item_name: string;
    keyword_id?: string;
    brand_name?: string;
    vertical_name?: string;
    subcategory_name?: string;
    stock_parcels: number;
    retail_price_unit: number;
    wholesale_price_unit: number;
    reorder_threshold: number;
  };
  highlight?: Record<string, any>;
  text_match: number;
}

export interface TypesenseSearchResponse {
  hits: TypesenseSearchHit[];
  found: number;
  page: number;
  search_time_ms: number;
}

/**
 * Search items via Typesense with fallback to Supabase FTS
 * 
 * @param filters Search filters including query, brand, vertical, subcategory
 * @param fallbackSearchFn Function to call if Typesense fails (should be DAL.items.search)
 * @returns Search results from Typesense or fallback
 */
export async function searchItemsWithFallback(
  filters: TypesenseSearchFilters,
  fallbackSearchFn: (filters: any) => Promise<any[]>
): Promise<TypesenseSearchHit[] | any[]> {
  const client = getClient();

  // If no Typesense client (missing env vars), use fallback immediately
  if (!client) {
    console.log('[Typesense] Client unavailable — using Supabase FTS fallback');
    return fallbackSearchFn({
      query: filters.query,
      brand_id: filters.brand ? parseInt(filters.brand) : undefined,
      vertical_id: filters.vertical ? parseInt(filters.vertical) : undefined,
      subcategory_id: filters.subcategory ? parseInt(filters.subcategory) : undefined,
      limit: filters.limit ?? 30,
    });
  }

  try {
    // Build filter_by string for Typesense
    const filterBy: string[] = [`firm_id:=${filters.firmId}`];
    if (filters.brand) filterBy.push(`brand_name:=${filters.brand}`);
    if (filters.vertical) filterBy.push(`vertical_name:=${filters.vertical}`);
    if (filters.subcategory) filterBy.push(`subcategory_name:=${filters.subcategory}`);

    const searchParameters = {
      q: filters.query || '*',
      query_by: 'item_name,keyword_id,brand_name,subcategory_name',
      filter_by: filterBy.join(' && '),
      per_page: filters.limit ?? 30,
      typo_tokens_threshold: 1,
    };

    const response = await client
      .collections('items')
      .documents()
      .search(searchParameters);

    // If Typesense returns results, use them
    if (response.hits && response.hits.length > 0) {
      console.log(`[Typesense] Found ${response.found} results`);
      return response.hits as TypesenseSearchHit[];
    }

    // If no results from Typesense, try fallback
    console.log('[Typesense] No results — trying Supabase FTS fallback');
    return fallbackSearchFn({
      query: filters.query,
      brand_id: filters.brand ? parseInt(filters.brand) : undefined,
      vertical_id: filters.vertical ? parseInt(filters.vertical) : undefined,
      subcategory_id: filters.subcategory ? parseInt(filters.subcategory) : undefined,
      limit: filters.limit ?? 30,
    });
  } catch (error) {
    console.error('[Typesense] Search error — falling back to Supabase FTS:', error);
    
    // On any error (network, auth, etc.), fall back to Supabase
    return fallbackSearchFn({
      query: filters.query,
      brand_id: filters.brand ? parseInt(filters.brand) : undefined,
      vertical_id: filters.vertical ? parseInt(filters.vertical) : undefined,
      subcategory_id: filters.subcategory ? parseInt(filters.subcategory) : undefined,
      limit: filters.limit ?? 30,
    });
  }
}

/**
 * Direct Typesense search — no fallback
 * Use this when you know Typesense is available and want raw results
 */
export async function searchItemsDirect(
  filters: TypesenseSearchFilters
): Promise<TypesenseSearchResponse | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const filterBy: string[] = [`firm_id:=${filters.firmId}`];
    if (filters.brand) filterBy.push(`brand_name:=${filters.brand}`);
    if (filters.vertical) filterBy.push(`vertical_name:=${filters.vertical}`);
    if (filters.subcategory) filterBy.push(`subcategory_name:=${filters.subcategory}`);

    const response = await client
      .collections('items')
      .documents()
      .search({
        q: filters.query || '*',
        query_by: 'item_name,keyword_id,brand_name,subcategory_name',
        filter_by: filterBy.join(' && '),
        per_page: filters.limit ?? 30,
        typo_tokens_threshold: 1,
      });

    return {
      hits: response.hits as TypesenseSearchHit[],
      found: response.found,
      page: response.page,
      search_time_ms: response.search_time_ms,
    };
  } catch (error) {
    console.error('[Typesense] Direct search error:', error);
    return null;
  }
}

/**
 * Check if Typesense is healthy and reachable
 */
export async function checkTypesenseHealth(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const health = await client.health.retrieve();
    return health.ok === true;
  } catch {
    return false;
  }
}

export default {
  searchItemsWithFallback,
  searchItemsDirect,
  checkTypesenseHealth,
};
