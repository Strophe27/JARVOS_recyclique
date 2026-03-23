/**
 * Grille de boutons presets — Story 18-6, Story 19.7 (vide / erreur / prix affiché = prix appliqué).
 * Couleur par button_type : don=bleu, recyclage=vert, decheterie=orange, defaut=gris (charte caisse 1.4.4).
 */
import type { CategoryItem, PresetItem } from '../api/caisse';
import { resolvePresetUnitPriceCents } from './categorySalePrice';
import { Alert, Button, SimpleGrid, Stack, Text } from '@mantine/core';

interface PresetButtonGridProps {
  presets: PresetItem[];
  categories: CategoryItem[];
  onPresetClick: (preset: PresetItem) => void;
  /** Erreur réseau / API sur GET presets (ne pas laisser la zone muette — Story 19.7). */
  loadError?: string | null;
}

function getPresetColor(buttonType: string): string {
  const t = buttonType.toLowerCase();
  if (t === 'don' || t === 'don_18') return 'blue';
  if (t === 'recyclage') return 'green';
  if (t === 'decheterie') return 'orange';
  return 'gray';
}

export function PresetButtonGrid({
  presets,
  categories,
  onPresetClick,
  loadError,
}: PresetButtonGridProps) {
  if (loadError) {
    return (
      <Alert
        color="red"
        variant="light"
        mb="sm"
        role="alert"
        data-testid="presets-load-error"
      >
        Presets indisponibles : {loadError}
      </Alert>
    );
  }

  if (presets.length === 0) {
    return (
      <Alert
        color="gray"
        variant="light"
        mb="sm"
        data-testid="preset-empty-message"
      >
        Aucun preset configuré. Les boutons rapides (Don, Recyclage, Déchèterie, etc.) apparaîtront ici
        une fois activés en administration.
      </Alert>
    );
  }

  return (
    <SimpleGrid cols={4} spacing="xs" data-testid="preset-grid" mb="sm">
      {presets.map((preset) => {
        const unitCents = resolvePresetUnitPriceCents(preset, categories);
        return (
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
              <Text size="xs" fw={600} lineClamp={1}>
                {preset.name}
              </Text>
              <Text size="xs">{(unitCents / 100).toFixed(2)} \u20ac</Text>
            </Stack>
          </Button>
        );
      })}
    </SimpleGrid>
  );
}
