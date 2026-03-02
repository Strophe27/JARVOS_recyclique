/**
 * Tests PresetButtonGrid — Story 18-6 AC#3 (Vitest + RTL).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { PresetButtonGrid } from './PresetButtonGrid';
import type { PresetItem } from '../api/caisse';

function makePreset(overrides: Partial<PresetItem> = {}): PresetItem {
  return {
    id: 'preset-1',
    name: 'Don rapide',
    category_id: null,
    preset_price: 150,
    button_type: 'don',
    sort_order: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderGrid(presets: PresetItem[], onPresetClick = vi.fn()) {
  return render(
    <MantineProvider>
      <PresetButtonGrid presets={presets} onPresetClick={onPresetClick} />
    </MantineProvider>
  );
}

describe('PresetButtonGrid — rendu', () => {
  it('ne rend rien quand presets est vide', () => {
    renderGrid([]);
    expect(screen.queryByTestId('preset-grid')).not.toBeInTheDocument();
  });

  it('affiche le conteneur data-testid="preset-grid" avec des presets', () => {
    renderGrid([makePreset()]);
    expect(screen.getByTestId('preset-grid')).toBeInTheDocument();
  });

  it('affiche 3 boutons avec les bons data-testid', () => {
    const presets = [
      makePreset({ id: 'p1', name: 'Don 1' }),
      makePreset({ id: 'p2', name: 'Recyclage', button_type: 'recyclage' }),
      makePreset({ id: 'p3', name: 'Decheterie', button_type: 'decheterie' }),
    ];
    renderGrid(presets);
    expect(screen.getByTestId('preset-p1')).toBeInTheDocument();
    expect(screen.getByTestId('preset-p2')).toBeInTheDocument();
    expect(screen.getByTestId('preset-p3')).toBeInTheDocument();
  });

  it('affiche le prix formatte correctement', () => {
    renderGrid([makePreset({ preset_price: 150 })]);
    expect(screen.getByText(/1\.50/)).toBeInTheDocument();
  });

  it('affiche le nom du preset', () => {
    renderGrid([makePreset({ name: 'Don rapide' })]);
    expect(screen.getByText('Don rapide')).toBeInTheDocument();
  });
});

describe('PresetButtonGrid — interactions', () => {
  it('appelle onPresetClick avec le bon preset au clic', async () => {
    const onPresetClick = vi.fn();
    const preset = makePreset({ id: 'p1' });
    renderGrid([preset], onPresetClick);
    await userEvent.click(screen.getByTestId('preset-p1'));
    expect(onPresetClick).toHaveBeenCalledTimes(1);
    expect(onPresetClick).toHaveBeenCalledWith(preset);
  });
});

describe('PresetButtonGrid — couleurs par button_type', () => {
  it('button_type="don" => data-color="blue"', () => {
    renderGrid([makePreset({ id: 'p1', button_type: 'don' })]);
    const btn = screen.getByTestId('preset-p1');
    expect(btn).toHaveAttribute('data-color', 'blue');
  });

  it('button_type="don_18" => data-color="blue"', () => {
    renderGrid([makePreset({ id: 'p1', button_type: 'don_18' })]);
    expect(screen.getByTestId('preset-p1')).toHaveAttribute('data-color', 'blue');
  });

  it('button_type="recyclage" => data-color="green"', () => {
    renderGrid([makePreset({ id: 'p1', button_type: 'recyclage' })]);
    expect(screen.getByTestId('preset-p1')).toHaveAttribute('data-color', 'green');
  });

  it('button_type="decheterie" => data-color="orange"', () => {
    renderGrid([makePreset({ id: 'p1', button_type: 'decheterie' })]);
    expect(screen.getByTestId('preset-p1')).toHaveAttribute('data-color', 'orange');
  });

  it('button_type inconnu => data-color="gray"', () => {
    renderGrid([makePreset({ id: 'p1', button_type: 'autre' })]);
    expect(screen.getByTestId('preset-p1')).toHaveAttribute('data-color', 'gray');
  });
});
