import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  mockPresets,
  type VirtualPreset
} from '../test/fixtures/virtualCatalogData';

// Adapter le type VirtualPreset vers PresetButtonWithCategory
interface VirtualPresetWithCategory extends VirtualPreset {
  category_name?: string;
  subcategory_name?: string;
}

interface VirtualPresetState {
  // State
  presets: VirtualPresetWithCategory[];
  activePresets: VirtualPresetWithCategory[];
  selectedPreset: VirtualPresetWithCategory | null;
  notes: string;
  loading: boolean;
  error: string | null;

  // Actions
  initializeVirtualData: () => void;
  fetchPresets: (forceRefresh?: boolean) => Promise<void>;
  selectPreset: (preset: VirtualPresetWithCategory | null) => void;
  setNotes: (notes: string) => void;
  clearSelection: () => void;
  getActivePresets: () => VirtualPresetWithCategory[];
  getPresetById: (id: string) => VirtualPresetWithCategory | undefined;
  clearError: () => void;
}

/**
 * Store virtuel pour les presets
 * Utilise les données mockées au lieu de faire des appels API
 */
export const useVirtualPresetStore = create<VirtualPresetState>()(
  devtools(
    (set, get) => ({
      // Initial state
      presets: [],
      activePresets: [],
      selectedPreset: null,
      notes: '',
      loading: false,
      error: null,

      // Initialize with mock data
      initializeVirtualData: () => {
        console.log('[VirtualPresetStore] Initializing with mock data');

        // Convertir les VirtualPreset en VirtualPresetWithCategory
        const presetsWithCategory: VirtualPresetWithCategory[] = mockPresets.map(preset => ({
          ...preset,
          category_name: preset.category, // Simplifié pour la démo
          subcategory_name: preset.subcategory
        }));

        set({
          presets: presetsWithCategory,
          activePresets: presetsWithCategory,
          loading: false,
          error: null
        });
      },

      // Mock fetch presets (no network call)
      fetchPresets: async (forceRefresh = false) => {
        console.log('[VirtualPresetStore] Fetching virtual presets (no network)');

        set({ loading: true, error: null });

        // Simulate network delay for realism
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          // Convertir les VirtualPreset en VirtualPresetWithCategory
          const presetsWithCategory: VirtualPresetWithCategory[] = mockPresets.map(preset => ({
            ...preset,
            category_name: preset.category,
            subcategory_name: preset.subcategory
          }));

          set({
            presets: presetsWithCategory,
            activePresets: presetsWithCategory,
            loading: false,
            error: null
          });
        } catch (error: any) {
          set({
            loading: false,
            error: 'Erreur lors du chargement des presets virtuels'
          });
        }
      },

      // Select preset
      selectPreset: (preset: VirtualPresetWithCategory | null) => {
        set({ selectedPreset: preset });
      },

      // Set notes
      setNotes: (notes: string) => {
        set({ notes });
      },

      // Clear selection
      clearSelection: () => {
        set({ selectedPreset: null, notes: '' });
      },

      // Get active presets
      getActivePresets: () => {
        return get().activePresets;
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
    { name: 'virtual-preset-store' }
  )
);

export default useVirtualPresetStore;















