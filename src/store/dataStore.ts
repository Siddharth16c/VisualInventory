import { create } from 'zustand';
import { DAL, getFirmId } from '@/db/dal';

interface DataStore {
  items: any[];
  products: any[];
  brands: any[];
  verticals: any[];
  lastLoaded: number | null;
  lastFirmId: string | null;
  isLoading: boolean;
  
  loadData: (forceRefresh?: boolean) => Promise<void>;
  searchItems: (query: string) => any[];
}

export const useDataStore = create<DataStore>((set, get) => ({
  items: [],
  products: [],
  brands: [],
  verticals: [],
  lastLoaded: null,
  lastFirmId: null,
  isLoading: false,

  loadData: async (forceRefresh = false) => {
    const currentFirmId = getFirmId();
    if (!currentFirmId) return; // Cannot load without firmId

    const age = Date.now() - (get().lastLoaded ?? 0);
    const firmChanged = get().lastFirmId !== currentFirmId;
    
    // Skip if data is fresh (<30 min) and we didn't switch firms
    if (!forceRefresh && !firmChanged && age < 30 * 60 * 1000) return;

    set({ isLoading: true });
    
    try {
      // Fetch all heavy read tables concurrently
      const [items, products, brands, verticals] = await Promise.all([
        DAL.items.getAll(),
        DAL.products.getAll(),
        DAL.brands.getAll(),
        DAL.verticals.getAll(),
      ]);

      set({ 
        items, 
        products, 
        brands, 
        verticals, 
        lastLoaded: Date.now(),
        lastFirmId: currentFirmId,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to load base data into store:', error);
      set({ isLoading: false });
      // If error (e.g., firm_id missing), we shouldn't throw to crash the app, 
      // but maybe just clear or handle it gracefully.
    }
  },

  searchItems: (query) => {
    const q = query.toLowerCase();
    return get().items.filter((i: any) =>
      i.item_name?.toLowerCase().includes(q) ||
      i.keyword_id?.toLowerCase().includes(q)
    );
  }
}));
