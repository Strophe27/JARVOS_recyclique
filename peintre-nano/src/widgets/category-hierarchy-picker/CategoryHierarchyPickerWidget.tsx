import { Alert, Stack, Text } from '@mantine/core';
import { useEffect, useState, type ReactNode } from 'react';
import { getReceptionCategories, type ReceptionCategoryRow } from '../../api/reception-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CategoryHierarchyPicker } from './CategoryHierarchyPicker';

/**
 * Widget CREOS — `widget_type`: **`category-hierarchy-picker`**.
 *
 * `widgetProps` serialisables :
 * - `presentation`: **`kiosk_drill`** uniquement pour ce wrapper (historique `reception_rail` ignoré au profit du drill)
 * - `category_source`: `legacy_categories` | `reception_categories` (défaut `legacy_categories`)
 * - `browse_reset_epoch`: nombre (kiosque legacy uniquement ; la démo réception gère son epoch en interne)
 *
 * Les wizards importent plutôt le composant core `CategoryHierarchyPicker` avec callbacks typés.
 */
export function CategoryHierarchyPickerWidget({ widgetProps }: RegisteredWidgetProps): ReactNode {
  const p = widgetProps ?? {};
  const categorySource = p['category_source'] === 'reception_categories' ? 'reception_categories' : 'legacy_categories';
  const browseResetEpoch = typeof p['browse_reset_epoch'] === 'number' ? p['browse_reset_epoch'] : 0;

  if (categorySource === 'reception_categories') {
    return <CategoryHierarchyReceptionCreosStub />;
  }

  return (
    <CategoryHierarchyPicker
      presentation="kiosk_drill"
      categorySource="legacy_categories"
      browseResetEpoch={browseResetEpoch}
      onPickCategoryCode={() => undefined}
    />
  );
}

/** Démo CREOS hors ticket — drill réception (`GET /v1/reception/categories`), même UX que la caisse. */
function CategoryHierarchyReceptionCreosStub(): ReactNode {
  const auth = useAuthPort();
  const [categories, setCategories] = useState<ReceptionCategoryRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [browseEpoch, setBrowseEpoch] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const r = await getReceptionCategories(auth);
      if (disposed) return;
      if (!r.ok) {
        setLoadErr(typeof r.detail === 'string' ? r.detail : 'Chargement impossible');
        setCategories([]);
        return;
      }
      setLoadErr(null);
      setCategories(r.categories);
      setBrowseEpoch((e) => e + 1);
    })();
    return () => {
      disposed = true;
    };
  }, [auth]);

  if (loadErr) {
    return (
      <Alert color="orange" title="Catégories réception">
        {loadErr}
      </Alert>
    );
  }

  return (
    <Stack gap="sm" data-testid="category-hierarchy-picker-widget-reception-stub">
      <Text size="xs" c="dimmed">
        Démo CREOS (hors ticket) — grille drill alignée caisse.
      </Text>
      {pickedId ? (
        <Text size="sm">
          Catégorie choisie : <strong>{pickedId}</strong>
        </Text>
      ) : null}
      <CategoryHierarchyPicker
        presentation="kiosk_drill"
        categorySource="reception_categories"
        categoriesRows={categories}
        browseResetEpoch={browseEpoch}
        onPickCategoryCode={(code) => {
          setPickedId(code);
        }}
      />
    </Stack>
  );
}
