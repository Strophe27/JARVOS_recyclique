/**
 * Grille de boutons presets — Story 18-6.
 * Couleur par button_type : don=bleu, recyclage=vert, decheterie=orange, defaut=gris.
 */
import type { PresetItem } from '../api/caisse';
import { Button, SimpleGrid, Stack, Text } from '@mantine/core';

interface PresetButtonGridProps {
  presets: PresetItem[];
  onPresetClick: (preset: PresetItem) => void;
}

function getPresetColor(buttonType: string): string {
  const t = buttonType.toLowerCase();
  if (t === 'don' || t === 'don_18') return 'blue';
  if (t === 'recyclage') return 'green';
  if (t === 'decheterie') return 'orange';
  return 'gray';
}

export function PresetButtonGrid({ presets, onPresetClick }: PresetButtonGridProps) {
  if (presets.length === 0) return null;

  return (
    <SimpleGrid cols={4} spacing="xs" data-testid="preset-grid" mb="sm">
      {presets.map((preset) => (
        <Button
          key={preset.id}
          variant="light"
          color={getPresetColor(preset.button_type)}
          size="sm"
          data-testid={`preset-${preset.id}`}
          data-color={getPresetColor(preset.button_type)}
          onClick={() => onPresetClick(preset)}
        >
          <Stack gap={0} align="center">
            <Text size="xs" fw={600} lineClamp={1}>{preset.name}</Text>
            <Text size="xs">{(preset.preset_price / 100).toFixed(2)} \u20ac</Text>
          </Stack>
        </Button>
      ))}
    </SimpleGrid>
  );
}
