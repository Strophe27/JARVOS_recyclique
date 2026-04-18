import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  mockCategories,
  mockPresets,
  getMockActiveCategories,
  getMockPresetsByCategory,
  type VirtualCategory,
  type VirtualPreset
} from '../test/fixtures/virtualCatalogData';

interface VirtualCategoryState {
  // State
  categories: VirtualCategory[];
  activeCategories: VirtualCategory[];
  visibleCategories: VirtualCategory[];
  presets: VirtualPreset[];
  loading: boolean;
  error: string | null;

  // Actions
  initializeVirtualData: () => void;
  fetchCategories: (forceRefresh?: boolean) => Promise<void>;
  fetchVisibleCategories: (forceRefresh?: boolean) => Promise<void>;
  getActiveCategories: () => VirtualCategory[];
  getVisibleCategories: () => VirtualCategory[];
  getCategoryById: (id: string) => VirtualCategory | undefined;
  getPresetsByCategory: (categoryId: string) => VirtualPreset[];
  getAllPresets: () => VirtualPreset[];
  getPresetById: (id: string) => VirtualPreset | undefined;
  clearError: () => void;
}

/**
 * Store virtuel pour les catégories et presets
 * Utilise les données mockées au lieu de faire des appels API
 */
export const useVirtualCategoryStore = create<VirtualCategoryState>()(
  devtools(
    (set, get) => ({
      // Initial state
      categories: [],
      activeCategories: [],
      visibleCategories: [],
      presets: [],
      loading: false,
      error: null,

      // Initialize with mock data
      initializeVirtualData: () => {
        console.log('[VirtualCategoryStore] Initializing with mock data');
        set({
          categories: mockCategories,
          activeCategories: getMockActiveCategories(),
          visibleCategories: getMockActiveCategories(),
          presets: mockPresets,
          loading: false,
          error: null
        });
      },

      // Mock fetch categories (no network call)
      fetchCategories: async (forceRefresh = false) => {
        console.log('[VirtualCategoryStore] Fetching virtual categories (no network)');

        set({ loading: true, error: null });

        // Simulate network delay for realism
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
          const active = getMockActiveCategories();
          set({
            categories: mockCategories,
            activeCategories: active,
            loading: false,
            error: null
          });
        } catch (error: any) {
          set({
            loading: false,
            error: 'Erreur lors du chargement des catégories virtuelles'
          });
        }
      },

      // Mock fetch visible categories
      fetchVisibleCategories: async (forceRefresh = false) => {
        console.log('[VirtualCategoryStore] Fetching virtual visible categories (no network)');

        set({ loading: true, error: null });

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 150));

        try {
          const visible = getMockActiveCategories();
          set({
            visibleCategories: visible,
            loading: false,
            error: null
          });
        } catch (error: any) {
          set({
            loading: false,
            error: 'Erreur lors du chargement des catégories visibles virtuelles'
          });
        }
      },

      // Get active categories
      getActiveCategories: () => {
        return get().activeCategories;
      },

      // Get visible categories
      getVisibleCategories: () => {
        return get().visibleCategories;
      },

      // Get category by ID
      getCategoryById: (id: string) => {
        return get().categories.find((cat) => cat.id === id);
      },

      // Get presets by category
      getPresetsByCategory: (categoryId: string) => {
        return getMockPresetsByCategory(categoryId);
      },

      // Get all presets
      getAllPresets: () => {
        return get().presets;
      },

      // Get preset by ID
      getPresetById: (id: string) => {
        return get().presets.find((preset) => preset.id === id);
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      }
    }),
    { name: 'virtual-category-store' }
  )
);

export default useVirtualCategoryStore;















