import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Category, categoryService } from '../services/categoryService';

interface CategoryState {
  // State
  categories: Category[];
  activeCategories: Category[];
  visibleCategories: Category[]; // Categories visible for ENTRY tickets
  loading: boolean;
  error: string | null;
  lastFetchTime: number | null;

  // Actions
  fetchCategories: (forceRefresh?: boolean) => Promise<void>;
  fetchVisibleCategories: (forceRefresh?: boolean) => Promise<void>;
  getActiveCategories: () => Category[];
  getVisibleCategories: () => Category[];
  getCategoryById: (id: string) => Category | undefined;
  toggleCategoryVisibility: (categoryId: string, isVisible: boolean) => Promise<void>;
  updateDisplayOrder: (categoryId: string, displayOrder: number) => Promise<void>;
  updateDisplayOrderEntry: (categoryId: string, displayOrderEntry: number) => Promise<void>; // Story B48-P4
  clearError: () => void;
  loadFromLocalStorage: () => void;
}

// Cache duration: 5 minutes (in-memory)
const CACHE_DURATION = 5 * 60 * 1000;

// LocalStorage keys for persistent cache
const STORAGE_KEY_CATEGORIES = 'recyclic_categories_cache';
const STORAGE_KEY_VISIBLE = 'recyclic_visible_categories_cache';
const STORAGE_KEY_TIMESTAMP = 'recyclic_categories_cache_timestamp';

// Helper: Save to localStorage
const saveToLocalStorage = (categories: Category[], visibleCategories: Category[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(visibleCategories));
    localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
  } catch (e) {
    console.warn('Failed to save categories to localStorage', e);
  }
};

// Helper: Load from localStorage
const loadFromLocalStorageHelper = (): { categories: Category[]; visibleCategories: Category[]; timestamp: number | null } => {
  try {
    const categoriesStr = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    const visibleStr = localStorage.getItem(STORAGE_KEY_VISIBLE);
    const timestampStr = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
    
    return {
      categories: categoriesStr ? JSON.parse(categoriesStr) : [],
      visibleCategories: visibleStr ? JSON.parse(visibleStr) : [],
      timestamp: timestampStr ? parseInt(timestampStr, 10) : null,
    };
  } catch (e) {
    console.warn('Failed to load categories from localStorage', e);
    return { categories: [], visibleCategories: [], timestamp: null };
  }
};

export const useCategoryStore = create<CategoryState>()(
  devtools(
    (set, get) => ({
      // Initial state
      categories: [],
      activeCategories: [],
      visibleCategories: [],
      loading: false,
      error: null,
      lastFetchTime: null,

      // Load categories from localStorage (called on init)
      loadFromLocalStorage: () => {
        const cached = loadFromLocalStorageHelper();
        if (cached.categories.length > 0) {
          const active = cached.categories.filter((cat) => cat.is_active);
          set({
            categories: cached.categories,
            activeCategories: active,
            visibleCategories: cached.visibleCategories.length > 0 ? cached.visibleCategories : active.filter((cat) => cat.is_visible !== false),
            lastFetchTime: cached.timestamp,
          });
        }
      },

      // Fetch categories with caching (stale-while-revalidate)
      fetchCategories: async (forceRefresh = false) => {
        const state = get();
        const now = Date.now();

        // Check if we have cached data and it's still fresh (in-memory)
        if (
          !forceRefresh &&
          state.lastFetchTime &&
          now - state.lastFetchTime < CACHE_DURATION &&
          state.categories.length > 0
        ) {
          // Return cached data
          return;
        }

        // If we have cached data, don't show loading (stale-while-revalidate)
        const hasCache = state.categories.length > 0;
        if (!hasCache) {
          set({ loading: true, error: null });
        }

        try {
          const allCategories = await categoryService.getCategories();
          const active = allCategories.filter((cat) => cat.is_active);

          set({
            categories: allCategories,
            activeCategories: active,
            loading: false,
            error: null,
            lastFetchTime: now,
          });

          // Save to localStorage for next time
          saveToLocalStorage(allCategories, state.visibleCategories.length > 0 ? state.visibleCategories : active.filter((cat) => cat.is_visible !== false));
        } catch (error: any) {
          // If we have cache, silently fail (stale-while-revalidate)
          if (hasCache) {
            console.warn('Failed to refresh categories, using cache', error);
            set({ loading: false });
            return;
          }
          // No cache, show error
          set({
            loading: false,
            error: error.response?.data?.detail || 'Erreur lors du chargement des catégories',
          });
        }
      },

      // Get active categories
      getActiveCategories: () => {
        return get().activeCategories;
      },

      // Fetch visible categories for ENTRY tickets (stale-while-revalidate)
      fetchVisibleCategories: async (forceRefresh = false) => {
        const state = get();
        const now = Date.now();

        // Check cache
        if (
          !forceRefresh &&
          state.lastFetchTime &&
          now - state.lastFetchTime < CACHE_DURATION &&
          state.visibleCategories.length > 0
        ) {
          return;
        }

        // If we have cached data, don't show loading (stale-while-revalidate)
        const hasCache = state.visibleCategories.length > 0;
        if (!hasCache) {
          set({ loading: true, error: null });
        }

        try {
          const visibleCategories = await categoryService.getCategoriesForEntryTickets(true);
          set({
            visibleCategories,
            loading: false,
            error: null,
            lastFetchTime: now,
          });
          // Save to localStorage
          saveToLocalStorage(state.categories, visibleCategories);
        } catch (error: any) {
          // Fallback: if endpoint fails (e.g., migration not run), use all active categories
          console.warn('Failed to fetch visible categories, falling back to active categories', error);
          try {
            // Try to fetch all categories and filter visible ones
            const allCategories = await categoryService.getCategories(true);
            const visible = allCategories.filter((cat) => cat.is_visible !== false);
            const result = visible.length > 0 ? visible : allCategories;
            set({
              visibleCategories: result,
              loading: false,
              error: null,
              lastFetchTime: now,
            });
            // Save to localStorage
            saveToLocalStorage(allCategories, result);
          } catch (fallbackError: any) {
            // If we have cache, silently fail (stale-while-revalidate)
            if (hasCache) {
              console.warn('Failed to refresh visible categories, using cache', fallbackError);
              set({ loading: false });
              return;
            }
            // No cache, show error
            set({
              loading: false,
              error: error.response?.data?.detail || 'Erreur lors du chargement des catégories visibles',
            });
          }
        }
      },

      // Get visible categories
      getVisibleCategories: () => {
        return get().visibleCategories;
      },

      // Get category by ID
      getCategoryById: (id: string) => {
        return get().categories.find((cat) => cat.id === id);
      },

      // Toggle category visibility
      toggleCategoryVisibility: async (categoryId: string, isVisible: boolean) => {
        // Mise à jour optimiste : mettre à jour immédiatement dans le store
        const state = get();
        const updatedCategories = state.categories.map((cat) =>
          cat.id === categoryId ? { ...cat, is_visible: isVisible } : cat
        );
        const updatedActiveCategories = updatedCategories.filter((cat) => cat.is_active);
        const updatedVisibleCategories = updatedActiveCategories.filter((cat) => cat.is_visible);

        // Mettre à jour le store immédiatement (sans loading pour éviter le re-render complet)
        set({
          categories: updatedCategories,
          activeCategories: updatedActiveCategories,
          visibleCategories: updatedVisibleCategories,
        });

        // Ensuite, synchroniser avec l'API en arrière-plan (sans bloquer l'UI)
        try {
          await categoryService.updateCategoryVisibility(categoryId, isVisible);
          // Si succès, on peut optionnellement recharger pour avoir les données à jour
          // Mais on ne force pas le rechargement pour éviter le scroll reset
        } catch (error: any) {
          // En cas d'erreur, restaurer l'état précédent
          set({
            categories: state.categories,
            activeCategories: state.activeCategories,
            visibleCategories: state.visibleCategories,
            error: error.response?.data?.detail || 'Erreur lors de la mise à jour de la visibilité',
          });
          throw error;
        }
      },

      // Update display order
      updateDisplayOrder: async (categoryId: string, displayOrder: number) => {
        // Mise à jour optimiste : mettre à jour immédiatement dans le store
        const state = get();
        const updatedCategories = state.categories.map((cat) =>
          cat.id === categoryId ? { ...cat, display_order: displayOrder } : cat
        );
        const updatedActiveCategories = updatedCategories.filter((cat) => cat.is_active);
        const updatedVisibleCategories = updatedActiveCategories.filter((cat) => cat.is_visible);

        // Mettre à jour le store immédiatement (sans loading pour éviter le re-render complet)
        set({
          categories: updatedCategories,
          activeCategories: updatedActiveCategories,
          visibleCategories: updatedVisibleCategories,
        });

        // Ensuite, synchroniser avec l'API en arrière-plan (sans bloquer l'UI)
        try {
          await categoryService.updateDisplayOrder(categoryId, displayOrder);
          // Si succès, on peut optionnellement recharger pour avoir les données à jour
          // Mais on ne force pas le rechargement pour éviter le scroll reset
        } catch (error: any) {
          // En cas d'erreur, restaurer l'état précédent
          set({
            categories: state.categories,
            activeCategories: state.activeCategories,
            visibleCategories: state.visibleCategories,
            error: error.response?.data?.detail || 'Erreur lors de la mise à jour de l\'ordre d\'affichage',
          });
          throw error;
        }
      },

      // Story B48-P4: Update display order for ENTRY/DEPOT
      updateDisplayOrderEntry: async (categoryId: string, displayOrderEntry: number) => {
        // Mise à jour optimiste : mettre à jour immédiatement dans le store
        const state = get();
        const updatedCategories = state.categories.map((cat) =>
          cat.id === categoryId ? { ...cat, display_order_entry: displayOrderEntry } : cat
        );
        const updatedActiveCategories = updatedCategories.filter((cat) => cat.is_active);
        const updatedVisibleCategories = updatedActiveCategories.filter((cat) => cat.is_visible);

        // Mettre à jour le store immédiatement (sans loading pour éviter le re-render complet)
        set({
          categories: updatedCategories,
          activeCategories: updatedActiveCategories,
          visibleCategories: updatedVisibleCategories,
        });

        // Ensuite, synchroniser avec l'API en arrière-plan (sans bloquer l'UI)
        try {
          await categoryService.updateDisplayOrderEntry(categoryId, displayOrderEntry);
          // Si succès, on peut optionnellement recharger pour avoir les données à jour
          // Mais on ne force pas le rechargement pour éviter le scroll reset
        } catch (error: any) {
          // En cas d'erreur, restaurer l'état précédent
          set({
            categories: state.categories,
            activeCategories: state.activeCategories,
            visibleCategories: state.visibleCategories,
            error: error.response?.data?.detail || 'Erreur lors de la mise à jour de l\'ordre d\'affichage ENTRY',
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'categoryStore' }
  )
);

// Auto-load from localStorage on store creation
useCategoryStore.getState().loadFromLocalStorage();

export default useCategoryStore;
