import { Alert, Button, Group, Select, Stack, Text } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CategoryAdminListRowDto } from '../../../api/admin-categories-client';
import {
  buildReparentParentSelectData,
  parentIdFromReparentSelectValue,
  reparentSelectValueFromParentId,
} from './category-admin-display-model';

export type CategoryReparentDraftPanelProps = {
  readonly rows: readonly CategoryAdminListRowDto[];
  readonly categoryId: string;
  readonly initialParentId: string | null;
  /** Si défini, le bouton principal envoie le brouillon validé ; sinon mode préparation uniquement. */
  readonly onApply?: (categoryId: string, newParentId: string | null) => Promise<void>;
  readonly applyBusy?: boolean;
};

/** Reclassement hiérarchique (changement de parent), avec enregistrement optionnel côté serveur. */
export function CategoryReparentDraftPanel({
  rows,
  categoryId,
  initialParentId,
  onApply,
  applyBusy = false,
}: CategoryReparentDraftPanelProps): ReactNode {
  const selectData = useMemo(
    () => buildReparentParentSelectData(rows, categoryId),
    [rows, categoryId],
  );

  const [value, setValue] = useState(() => reparentSelectValueFromParentId(initialParentId));

  useEffect(() => {
    setValue(reparentSelectValueFromParentId(initialParentId));
  }, [categoryId, initialParentId]);

  const draftParentId = useMemo(() => parentIdFromReparentSelectValue(value), [value]);
  const unchanged =
    (draftParentId === null && initialParentId === null) || draftParentId === initialParentId;

  const handleApply = useCallback(async () => {
    if (!onApply || unchanged) return;
    await onApply(categoryId, draftParentId);
  }, [onApply, unchanged, categoryId, draftParentId]);

  const moving = rows.find((r) => r.id === categoryId);

  return (
    <Stack gap="md" data-testid="category-reparent-draft-panel">
      {moving ? (
        <Group gap="xs" align="baseline" wrap="wrap">
          <Text size="sm">
            Fiche : <strong>{moving.name}</strong>
          </Text>
          {moving.official_name ? (
            <Text size="xs" c="dimmed">
              ({moving.official_name})
            </Text>
          ) : null}
        </Group>
      ) : null}

      <Select
        label="Nouveau parent"
        description="Cette fiche et ses sous-catégories ne peuvent pas être choisies comme parent (évite les cycles)."
        data={selectData}
        value={value}
        onChange={(v) => setValue(v ?? reparentSelectValueFromParentId(null))}
        searchable
        nothingFoundMessage="Aucun résultat"
        data-testid="category-reparent-parent-select"
      />

      {!onApply ? (
        <Alert color="gray" title="Simulation uniquement" data-testid="category-reparent-readonly-notice">
          <Text size="sm">
            Choisissez un parent pour prévisualiser la hiérarchie. L&apos;enregistrement sur le serveur n&apos;est
            pas disponible dans ce contexte.
          </Text>
        </Alert>
      ) : null}

      {onApply ? (
        <Group justify="flex-end">
          <Button
            onClick={() => void handleApply()}
            loading={applyBusy}
            disabled={unchanged}
            data-testid="category-reparent-apply"
          >
            Enregistrer
          </Button>
        </Group>
      ) : null}
    </Stack>
  );
}
