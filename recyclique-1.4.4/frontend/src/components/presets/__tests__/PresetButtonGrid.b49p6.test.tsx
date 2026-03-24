/**
 * Story B49-P6: Tests pour filtrage presets avec hiddenPresetIds
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import PresetButtonGrid from '../PresetButtonGrid';
import * as presetStore from '../../../stores/presetStore';

// Mock the preset store
vi.mock('../../../stores/presetStore');

const mockPresets = [
  {
    id: 'don-0',
    name: 'Don 0€',
    category_id: 'cat1',
    preset_price: 0,
    button_type: 'donation' as const,
    sort_order: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category_name: 'Donation',
  },
  {
    id: 'don-18',
    name: 'Don -18 ans',
    category_id: 'cat1',
    preset_price: 0,
    button_type: 'donation' as const,
    sort_order: 2,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category_name: 'Donation',
  },
  {
    id: 'recyclage',
    name: 'Recyclage',
    category_id: 'cat2',
    preset_price: 0,
    button_type: 'recycling' as const,
    sort_order: 3,
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    category_name: 'Recycling',
  },
  {
    id: 'decheterie',
    name: 'Déchèterie',
    category_id: 'cat2',
    preset_price: 0,
    button_type: 'recycling' as const,
    sort_order: 4,
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    category_name: 'Recycling',
  },
];

describe('PresetButtonGrid - B49-P6 Filtrage Presets', () => {
  const mockOnPresetSelected = vi.fn();
  const mockFetchPresets = vi.fn();
  const mockSelectPreset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(presetStore.usePresetStore).mockReturnValue({
      activePresets: [],
      presets: [],
      selectedPreset: null,
      notes: '',
      loading: false,
      error: null,
      lastFetchTime: Date.now(),
      fetchPresets: mockFetchPresets,
      selectPreset: mockSelectPreset,
      setNotes: vi.fn(),
      clearSelection: vi.fn(),
      getActivePresets: () => [],
      getPresetById: (id: string) => mockPresets.find((p) => p.id === id),
      clearError: vi.fn(),
    });
  });

  it('affiche tous les presets par défaut (hiddenPresetIds vide)', async () => {
    render(
      <PresetButtonGrid 
        onPresetSelected={mockOnPresetSelected}
        fallbackButtons={mockPresets}
        hiddenPresetIds={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Don 0€')).toBeInTheDocument();
      expect(screen.getByText('Don -18 ans')).toBeInTheDocument();
      expect(screen.getByText('Recyclage')).toBeInTheDocument();
      expect(screen.getByText('Déchèterie')).toBeInTheDocument();
    });
  });

  it('filtre les presets Recyclage et Déchèterie avec hiddenPresetIds', async () => {
    render(
      <PresetButtonGrid 
        onPresetSelected={mockOnPresetSelected}
        fallbackButtons={mockPresets}
        hiddenPresetIds={['recyclage', 'decheterie']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Don 0€')).toBeInTheDocument();
      expect(screen.getByText('Don -18 ans')).toBeInTheDocument();
      expect(screen.queryByText('Recyclage')).not.toBeInTheDocument();
      expect(screen.queryByText('Déchèterie')).not.toBeInTheDocument();
    });
  });

  it('filtre les presets Don et Don-18 avec hiddenPresetIds', async () => {
    render(
      <PresetButtonGrid 
        onPresetSelected={mockOnPresetSelected}
        fallbackButtons={mockPresets}
        hiddenPresetIds={['don-0', 'don-18']}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Don 0€')).not.toBeInTheDocument();
      expect(screen.queryByText('Don -18 ans')).not.toBeInTheDocument();
      expect(screen.getByText('Recyclage')).toBeInTheDocument();
      expect(screen.getByText('Déchèterie')).toBeInTheDocument();
    });
  });

  it('fonctionne avec activePresets au lieu de fallbackButtons', async () => {
    vi.mocked(presetStore.usePresetStore).mockReturnValue({
      activePresets: mockPresets,
      presets: mockPresets,
      selectedPreset: null,
      notes: '',
      loading: false,
      error: null,
      lastFetchTime: Date.now(),
      fetchPresets: mockFetchPresets,
      selectPreset: mockSelectPreset,
      setNotes: vi.fn(),
      clearSelection: vi.fn(),
      getActivePresets: () => mockPresets,
      getPresetById: (id: string) => mockPresets.find((p) => p.id === id),
      clearError: vi.fn(),
    });

    render(
      <PresetButtonGrid 
        onPresetSelected={mockOnPresetSelected}
        hiddenPresetIds={['recyclage']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Don 0€')).toBeInTheDocument();
      expect(screen.getByText('Don -18 ans')).toBeInTheDocument();
      expect(screen.queryByText('Recyclage')).not.toBeInTheDocument();
      expect(screen.getByText('Déchèterie')).toBeInTheDocument();
    });
  });
});

