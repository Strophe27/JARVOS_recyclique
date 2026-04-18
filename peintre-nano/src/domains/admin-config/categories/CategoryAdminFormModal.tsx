import { Button, Group, Modal, NumberInput, Select, Stack, Switch, Text, TextInput } from '@mantine/core';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  CategoryAdminListRowDto,
  CategoryV1CreateRequestBody,
  CategoryV1UpdateRequestBody,
} from '../../../api/admin-categories-client';
import {
  buildParentSelectDataForCreate,
  buildReparentParentSelectData,
  parentIdFromReparentSelectValue,
  reparentSelectValueFromParentId,
} from './category-admin-display-model';

export type CategoryFormSavePayload =
  | { mode: 'create'; body: CategoryV1CreateRequestBody }
  | { mode: 'edit'; categoryId: string; body: CategoryV1UpdateRequestBody };

export type CategoryAdminFormModalProps = {
  readonly opened: boolean;
  readonly mode: 'create' | 'edit';
  readonly category: CategoryAdminListRowDto | null;
  readonly rows: readonly CategoryAdminListRowDto[];
  readonly saving: boolean;
  readonly onClose: () => void;
  readonly onSave: (payload: CategoryFormSavePayload) => Promise<void>;
};

function parseOptionalPrice(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function CategoryAdminFormModal({
  opened,
  mode,
  category,
  rows,
  saving,
  onClose,
  onSave,
}: CategoryAdminFormModalProps): ReactNode {
  const [name, setName] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [parentSelect, setParentSelect] = useState('');
  const [price, setPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [displayOrderEntry, setDisplayOrderEntry] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [shortcutKey, setShortcutKey] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const parentData = useMemo(() => {
    if (mode === 'create' || !category) return buildParentSelectDataForCreate(rows);
    return buildReparentParentSelectData(rows, category.id);
  }, [mode, rows, category]);

  useEffect(() => {
    if (!opened) return;
    setNameError(null);
    if (mode === 'edit' && category) {
      setName(category.name);
      setOfficialName(category.official_name ?? '');
      setParentSelect(reparentSelectValueFromParentId(category.parent_id ?? null));
      setPrice(category.price != null ? String(category.price) : '');
      setMaxPrice(category.max_price != null ? String(category.max_price) : '');
      setDisplayOrder(category.display_order);
      setDisplayOrderEntry(category.display_order_entry);
      setIsVisible(category.is_visible);
      setIsActive(category.is_active);
      setShortcutKey(category.shortcut_key ?? '');
    } else if (mode === 'create') {
      setName('');
      setOfficialName('');
      setParentSelect(reparentSelectValueFromParentId(null));
      setPrice('');
      setMaxPrice('');
      setDisplayOrder(0);
      setDisplayOrderEntry(0);
      setIsVisible(true);
      setIsActive(true);
      setShortcutKey('');
    }
  }, [opened, mode, category]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Le nom est obligatoire.');
      return;
    }
    setNameError(null);
    const pid = parentIdFromReparentSelectValue(parentSelect);
    const official = officialName.trim() || null;
    const sk = shortcutKey.trim() || null;
    const p = parseOptionalPrice(price);
    const mp = parseOptionalPrice(maxPrice);

    if (mode === 'create') {
      const body: CategoryV1CreateRequestBody = {
        name: trimmed,
        official_name: official,
        parent_id: pid,
        price: p,
        max_price: mp,
        display_order: displayOrder,
        display_order_entry: displayOrderEntry,
        is_visible: isVisible,
        shortcut_key: sk,
      };
      await onSave({ mode: 'create', body });
    } else if (mode === 'edit' && category) {
      const body: CategoryV1UpdateRequestBody = {
        name: trimmed,
        official_name: official,
        parent_id: pid,
        price: p,
        max_price: mp,
        display_order: displayOrder,
        display_order_entry: displayOrderEntry,
        is_visible: isVisible,
        is_active: isActive,
        shortcut_key: sk,
      };
      await onSave({ mode: 'edit', categoryId: category.id, body });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'create' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
      size="lg"
    >
      <Stack gap="md" data-testid="category-admin-form">
        <TextInput
          label="Nom court (affichage rapide)"
          description="Texte affiché sur les boutons et listes à la caisse et à la réception dépôt. Court et lisible pour l’équipe."
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError ?? undefined}
          data-testid="category-form-name"
        />
        <TextInput
          label="Nom officiel / libellé long / mention réglementaire"
          description="Utilisé pour la comptabilité, les exports et tout document où le libellé légal ou détaillé est requis. Laisser vide pour réutiliser le nom court seul."
          value={officialName}
          onChange={(e) => setOfficialName(e.target.value)}
        />
        <Select
          label="Parent"
          description="Racine si aucun parent. Les cycles sont interdits."
          data={parentData}
          value={parentSelect}
          onChange={(v) => setParentSelect(v ?? reparentSelectValueFromParentId(null))}
          searchable
          nothingFoundMessage="Aucun résultat"
          data-testid="category-form-parent"
        />
        <Group grow>
          <TextInput
            label="Tarif (EUR)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ex. 2,50"
          />
          <TextInput
            label="Plafond (EUR)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Optionnel"
          />
        </Group>
        <Group grow>
          <NumberInput
            label="Ordre caisse"
            description="Affichage ticket de vente."
            value={displayOrder}
            onChange={(v) => setDisplayOrder(typeof v === 'number' ? v : 0)}
            min={0}
            data-testid="category-form-display-order"
          />
          <NumberInput
            label="Ordre réception"
            description="Affichage ticket de dépôt."
            value={displayOrderEntry}
            onChange={(v) => setDisplayOrderEntry(typeof v === 'number' ? v : 0)}
            min={0}
            data-testid="category-form-display-order-entry"
          />
        </Group>
        <Switch
          label="Visible à la réception (dépôt)"
          checked={isVisible}
          onChange={(e) => setIsVisible(e.currentTarget.checked)}
        />
        {mode === 'edit' ? (
          <Switch
            label="Proposée à la caisse (actif)"
            description="is_active : proposée à l’encaissement ou non. Distinct de la visibilité réception ci-dessus."
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
          />
        ) : null}
        <TextInput
          label="Raccourci clavier"
          value={shortcutKey}
          onChange={(e) => setShortcutKey(e.target.value)}
          maxLength={8}
        />
        <Text size="xs" c="dimmed">
          Les montants utilisent le point ou la virgule comme séparateur décimal.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={() => void handleSubmit()} loading={saving} data-testid="category-form-submit">
            Enregistrer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
