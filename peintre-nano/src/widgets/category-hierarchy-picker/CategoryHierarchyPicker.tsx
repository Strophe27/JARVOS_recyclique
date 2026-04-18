import { Alert, Button, Grid, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { fetchCategoriesList, type CategoryListItem } from '../../api/dashboard-legacy-stats-client';
import type { ReceptionCategoryRow } from '../../api/reception-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import classes from './CategoryHierarchyPicker.module.css';
import { receptionRootCategoriesOrdered } from './reception-roots';

/** Même ordre position → touche que le legacy caisse. */
const KIOSK_CATEGORY_POSITION_KEYS = [
  'A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
  'Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
  'W', 'X', 'C', 'V', 'B', 'N',
] as const;

function kioskCategoryEffectiveShortcutKey(category: CategoryListItem, indexInVisibleList: number): string {
  const fromDb = category.shortcut_key != null ? String(category.shortcut_key).trim() : '';
  if (fromDb.length > 0) return fromDb;
  if (indexInVisibleList >= 0 && indexInVisibleList < KIOSK_CATEGORY_POSITION_KEYS.length) {
    return KIOSK_CATEGORY_POSITION_KEYS[indexInVisibleList]!;
  }
  return '';
}

const RECEPTION_POSITION_SHORTCUT_KEYS = [
  'A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
  'Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
  'W', 'X', 'C', 'V', 'B', 'N',
] as const;

function getReceptionShortcutKeyForIndex(index: number): string | null {
  return RECEPTION_POSITION_SHORTCUT_KEYS[index] ?? null;
}

function getReceptionShortcutIndex(key: string): number {
  return RECEPTION_POSITION_SHORTCUT_KEYS.indexOf(key.toUpperCase() as (typeof RECEPTION_POSITION_SHORTCUT_KEYS)[number]);
}

function shouldPreventReceptionShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.contentEditable === 'true'
  ) {
    return true;
  }
  return target.getAttribute('role') === 'textbox';
}

type CategoryHierarchyPickerKioskShared = {
  readonly presentation: 'kiosk_drill';
  readonly browseResetEpoch: number;
  readonly disabled?: boolean;
  readonly onPickCategoryCode: (
    categoryCode: string,
    categoryDisplayName: string,
    categoryMeta: CategoryListItem | null,
  ) => void;
  readonly onDrillIntoChildren?: () => void;
  readonly onBrowseDepthChange?: (parentId: string | null) => void;
  readonly onContinueWithoutGrid?: () => void;
};

/** Caisse / GET `/v1/categories/` — chargement interne au picker. */
export type CategoryHierarchyPickerKioskLegacyProps = CategoryHierarchyPickerKioskShared & {
  readonly categorySource: 'legacy_categories';
};

/** Réception / GET `/v1/reception/categories` — lignes fournies par le wizard (chargement hors picker). */
export type CategoryHierarchyPickerKioskReceptionProps = CategoryHierarchyPickerKioskShared & {
  readonly categorySource: 'reception_categories';
  readonly categoriesRows: readonly ReceptionCategoryRow[];
  readonly gridTestId?: string;
  readonly tileTestIdPrefix?: string;
  readonly loadingTestId?: string;
  readonly errorTestId?: string;
  readonly emptyTestId?: string;
  readonly backButtonTestId?: string;
  readonly manualFallbackTestId?: string;
};

export type CategoryHierarchyPickerKioskProps = CategoryHierarchyPickerKioskLegacyProps | CategoryHierarchyPickerKioskReceptionProps;

function normalizeReceptionRowsToList(rows: readonly ReceptionCategoryRow[]): CategoryListItem[] {
  return rows.map((r, i) => ({
    id: r.id,
    name: r.name,
    parent_id: r.parent_id ?? null,
    is_active: true,
    display_order: i,
    shortcut_key: null,
    price: null,
    max_price: null,
  }));
}

const EMPTY_RECEPTION_ROWS: readonly ReceptionCategoryRow[] = [];

export type CategoryHierarchyPickerReceptionRailProps = {
  readonly presentation: 'reception_rail';
  readonly disabled?: boolean;
  readonly categories: ReceptionCategoryRow[];
  readonly rootCategories: ReceptionCategoryRow[];
  readonly activeChildren: ReceptionCategoryRow[];
  readonly activeRoot: ReceptionCategoryRow | null;
  readonly activeRootId: string | null;
  readonly categoryId: string | null;
  readonly workflowStage: 'root' | 'child' | 'poids';
  readonly hasHierarchy: boolean;
  readonly ticketId: string | null;
  readonly dataStale: boolean;
  readonly editingLigneId: string | null;
  /** Empêche les raccourcis positionnels quand le champ poids est actif (aligné ancien flux réception). */
  readonly poidsInputWrapperRef?: RefObject<HTMLDivElement>;
  readonly rootGridRef: RefObject<HTMLDivElement>;
  readonly childGridRef: RefObject<HTMLDivElement>;
  readonly onSelectRootCategory: (rootId: string) => void;
  readonly onSelectRootCategoryFromKeyboard: (rootId: string) => void;
  readonly onRootTileKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, rootId: string, index: number) => void;
  readonly onSubcategoryTileKeyDown: (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    categoryIdForTile: string,
    index: number,
  ) => void;
  readonly selectCategoryAndFocusPoids: (categoryId: string | null) => void;
  readonly onReturnToRootStage: () => void;
};

export type CategoryHierarchyPickerProps = CategoryHierarchyPickerKioskProps | CategoryHierarchyPickerReceptionRailProps;

function CategoryHierarchyPickerKioskDrill(props: CategoryHierarchyPickerKioskProps): ReactNode {
  const {
    browseResetEpoch,
    onPickCategoryCode,
    onDrillIntoChildren,
    onBrowseDepthChange,
    onContinueWithoutGrid,
  } = props;
  const disabled = props.disabled === true;
  const isReception = props.categorySource === 'reception_categories';
  const gridTestId = isReception ? props.gridTestId ?? 'reception-kiosk-category-grid' : 'cashflow-kiosk-category-grid';
  const tileTestIdPrefix = isReception ? props.tileTestIdPrefix ?? 'reception-kiosk-category' : 'cashflow-kiosk-category';
  const loadingTestId = isReception ? props.loadingTestId ?? 'reception-kiosk-category-loading' : 'cashflow-kiosk-category-loading';
  const errorTestId = isReception ? props.errorTestId ?? 'reception-kiosk-category-error' : 'cashflow-kiosk-category-error';
  const emptyTestId = isReception ? props.emptyTestId ?? 'reception-kiosk-category-empty' : 'cashflow-kiosk-category-empty';
  const backButtonTestId = isReception ? props.backButtonTestId ?? 'reception-kiosk-category-back' : 'cashflow-kiosk-category-back';
  const manualFallbackTestId = isReception
    ? props.manualFallbackTestId ?? 'reception-kiosk-category-manual-fallback'
    : 'cashflow-kiosk-category-manual-fallback';

  const auth = useAuthPort();
  const authRef = useRef(auth);
  authRef.current = auth;
  const [legacyRows, setLegacyRows] = useState<CategoryListItem[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(() => props.categorySource === 'legacy_categories');
  const [legacyFetchErr, setLegacyFetchErr] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const receptionCategoriesInput =
    props.categorySource === 'reception_categories' ? props.categoriesRows : EMPTY_RECEPTION_ROWS;
  const receptionNormalized = useMemo(
    () => normalizeReceptionRowsToList(receptionCategoriesInput),
    [receptionCategoriesInput],
  );

  const rows = props.categorySource === 'legacy_categories' ? legacyRows : receptionNormalized;
  const loading = props.categorySource === 'legacy_categories' ? legacyLoading : false;
  const fetchErr = props.categorySource === 'legacy_categories' ? legacyFetchErr : null;

  useEffect(() => {
    setParentId(null);
  }, [browseResetEpoch]);

  useEffect(() => {
    onBrowseDepthChange?.(parentId);
  }, [parentId, onBrowseDepthChange]);

  useEffect(() => {
    if (props.categorySource !== 'legacy_categories') return;
    const ac = new AbortController();
    let disposed = false;

    setLegacyLoading(true);
    setLegacyFetchErr(null);

    void (async () => {
      try {
        const list = await fetchCategoriesList(authRef.current, ac.signal);
        if (disposed) return;
        setLegacyRows(list.filter((c) => c.is_active));
      } catch (e) {
        if (disposed || ac.signal.aborted) return;
        setLegacyFetchErr(e instanceof Error ? e.message : 'Chargement des catégories impossible.');
      } finally {
        if (!disposed) setLegacyLoading(false);
      }
    })();

    return () => {
      disposed = true;
      ac.abort();
    };
  }, [props.categorySource]);

  const sortByDisplayOrder = useCallback((list: CategoryListItem[]) => [...list].sort((a, b) => a.display_order - b.display_order), []);

  const roots = useMemo(() => {
    const baseRoots = rows.filter((c) => c.parent_id == null || c.parent_id === '');
    if (props.categorySource !== 'reception_categories') {
      return sortByDisplayOrder(baseRoots);
    }
    const orderedIds = receptionRootCategoriesOrdered([...receptionCategoriesInput]).map((r) => r.id);
    const rank = Object.fromEntries(orderedIds.map((id, index) => [id, index]));
    return [...baseRoots].sort((a, b) => (rank[a.id] ?? 999) - (rank[b.id] ?? 999));
  }, [props.categorySource, receptionCategoriesInput, rows, sortByDisplayOrder]);

  const children = useMemo(
    () => (parentId ? sortByDisplayOrder(rows.filter((c) => c.parent_id === parentId)) : []),
    [rows, parentId, sortByDisplayOrder],
  );

  const rowHasChildren = useCallback((id: string) => rows.some((r) => r.parent_id === id), [rows]);

  const childCountFor = useCallback((id: string) => rows.filter((r) => r.parent_id === id).length, [rows]);

  const showList = useMemo(() => (parentId ? children : roots), [parentId, children, roots]);

  const onPickRef = useRef(onPickCategoryCode);
  onPickRef.current = onPickCategoryCode;
  const onDrillRef = useRef(onDrillIntoChildren);
  onDrillRef.current = onDrillIntoChildren;
  const parentIdRef = useRef(parentId);
  parentIdRef.current = parentId;
  const kioskSectionRef = useRef<HTMLDivElement>(null);

  const activateCategoryShortcut = useCallback(
    (rawKey: string): boolean => {
      if (disabled || loading || fetchErr || rawKey.length !== 1) return false;
      if (showList.length === 0) return false;
      const ch = rawKey.toLowerCase();
      for (let i = 0; i < showList.length; i++) {
        const c = showList[i]!;
        const eff = kioskCategoryEffectiveShortcutKey(c, i);
        if (eff.length !== 1 || eff.toLowerCase() !== ch) continue;
        if (rowHasChildren(c.id)) {
          setParentId(c.id);
          if (!parentIdRef.current) onDrillRef.current?.();
        } else {
          onPickRef.current(c.id, c.name, c);
        }
        return true;
      }
      return false;
    },
    [disabled, loading, fetchErr, showList, rowHasChildren],
  );

  const handleCategoryGridKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      const editable = t.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;
      if (!activateCategoryShortcut(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [activateCategoryShortcut],
  );

  useEffect(() => {
    if (disabled || loading || fetchErr || showList.length === 0) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      const editable = t.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;
      if (!activateCategoryShortcut(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [disabled, loading, fetchErr, showList, activateCategoryShortcut]);

  useEffect(() => {
    if (disabled || loading || fetchErr || showList.length === 0) return;
    const id = window.setTimeout(() => {
      const ae = document.activeElement;
      if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement || ae instanceof HTMLSelectElement) return;
      const wrap = kioskSectionRef.current;
      if (!wrap) return;
      const grid = wrap.querySelector(`.${classes.kioskCategoryGrid}`);
      const first = grid?.querySelector<HTMLButtonElement>('button');
      first?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [parentId, browseResetEpoch, showList.length, disabled, loading, fetchErr]);

  if (loading) {
    return (
      <Group gap="sm" mb="md" data-testid={loadingTestId}>
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Chargement des catégories…
        </Text>
      </Group>
    );
  }

  if (fetchErr) {
    return (
      <Alert color="orange" mb="md" title="Catégories" data-testid={errorTestId}>
        {fetchErr}
        {onContinueWithoutGrid ? (
          <Button mt="sm" size="xs" variant="light" onClick={onContinueWithoutGrid} data-testid={manualFallbackTestId}>
            Continuer sans grille (saisie manuelle du code)
          </Button>
        ) : null}
      </Alert>
    );
  }

  return (
    <div
      ref={kioskSectionRef}
      className={classes.kioskCategorySection}
      data-testid={gridTestId}
      onKeyDown={handleCategoryGridKeyDown}
    >
      {parentId ? (
        <Button
          variant="subtle"
          size="xs"
          mb="sm"
          disabled={disabled}
          onClick={() => {
            const cur = rows.find((r) => r.id === parentId);
            const up = cur?.parent_id;
            if (up == null || String(up).trim() === '') setParentId(null);
            else setParentId(String(up));
          }}
          data-testid={backButtonTestId}
        >
          ← Niveau parent
        </Button>
      ) : null}
      <Text size="sm" fw={600} mb="xs">
        {parentId ? 'Sous-catégories' : 'Catégories'}
      </Text>
      {showList.length === 0 ? (
        <div data-testid={emptyTestId}>
          <Text size="sm" c="dimmed" mb="sm">
            Aucune catégorie renvoyée par le serveur pour cette session.
          </Text>
          {onContinueWithoutGrid ? (
            <Button size="sm" variant="light" onClick={onContinueWithoutGrid} data-testid={manualFallbackTestId}>
              Continuer sans grille (saisie manuelle du code)
            </Button>
          ) : null}
        </div>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md" className={classes.kioskCategoryGrid} mb="md">
          {showList.map((c, index) => {
            const nChild = childCountFor(c.id);
            const shortcutRaw = kioskCategoryEffectiveShortcutKey(c, index);
            const mainLine = shortcutRaw ? `${c.name}, touche ${shortcutRaw}` : c.name;
            return (
              <button
                key={c.id}
                type="button"
                disabled={disabled}
                className={classes.kioskCategoryButton}
                data-testid={`${tileTestIdPrefix}-${c.id}`}
                {...(shortcutRaw.length === 1 ? { 'aria-keyshortcuts': shortcutRaw } : {})}
                onClick={() => {
                  if (disabled) return;
                  if (rowHasChildren(c.id)) {
                    setParentId(c.id);
                    if (!parentId) onDrillIntoChildren?.();
                    return;
                  }
                  onPickCategoryCode(c.id, c.name, c);
                }}
              >
                <span className={classes.kioskCategoryButtonMain}>{mainLine}</span>
                <span className={classes.kioskCategoryMetaRow}>
                  {nChild > 0 ? <span className={classes.kioskCategoryCountBadge}>{nChild} sous-cat.</span> : null}
                </span>
                {shortcutRaw ? (
                  <span className={classes.kioskCategoryShortcutBadge} aria-hidden="true">
                    Clavier&nbsp;: <span className={classes.kioskCategoryShortcutKey}>{shortcutRaw}</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </SimpleGrid>
      )}
    </div>
  );
}

function CategoryHierarchyPickerReceptionRailInner(props: CategoryHierarchyPickerReceptionRailProps): ReactNode {
  const {
    disabled = false,
    categories,
    rootCategories,
    activeChildren,
    activeRoot,
    activeRootId,
    categoryId,
    workflowStage,
    hasHierarchy,
    ticketId,
    dataStale,
    editingLigneId,
    poidsInputWrapperRef,
    rootGridRef,
    childGridRef,
    onSelectRootCategory,
    onSelectRootCategoryFromKeyboard,
    onRootTileKeyDown,
    onSubcategoryTileKeyDown,
    selectCategoryAndFocusPoids,
    onReturnToRootStage,
  } = props;

  const [focusedRootId, setFocusedRootId] = useState<string | null>(null);
  const [focusedChildId, setFocusedChildId] = useState<string | null>(null);
  const [keyboardShortcutScope, setKeyboardShortcutScope] = useState<'root' | 'child'>('root');

  useEffect(() => {
    if (!categoryId) {
      setKeyboardShortcutScope('root');
      return;
    }
    const cat = categories.find((c) => c.id === categoryId);
    setKeyboardShortcutScope(cat?.parent_id ? 'child' : 'root');
  }, [categoryId, categories]);

  useEffect(() => {
    if (!ticketId || dataStale || editingLigneId) return;
    const onShortcutKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      const poidsWrap = poidsInputWrapperRef?.current;
      if (poidsWrap && event.target instanceof Node && poidsWrap.contains(event.target)) {
        return;
      }
      if (shouldPreventReceptionShortcut(event.target)) return;
      const shortcutIndex = getReceptionShortcutIndex(event.key);
      if (shortcutIndex < 0) return;
      const scopedCategories =
        hasHierarchy && keyboardShortcutScope === 'child' && activeChildren.length > 0 ? activeChildren : rootCategories;
      const nextCategory = scopedCategories[shortcutIndex];
      if (!nextCategory) return;
      event.preventDefault();
      event.stopPropagation();
      if (hasHierarchy && keyboardShortcutScope === 'child' && activeChildren.length > 0) {
        selectCategoryAndFocusPoids(nextCategory.id);
        return;
      }
      onSelectRootCategoryFromKeyboard(nextCategory.id);
    };
    document.addEventListener('keydown', onShortcutKeyDown, true);
    return () => document.removeEventListener('keydown', onShortcutKeyDown, true);
  }, [
    ticketId,
    dataStale,
    editingLigneId,
    hasHierarchy,
    keyboardShortcutScope,
    activeChildren,
    rootCategories,
    onSelectRootCategoryFromKeyboard,
    selectCategoryAndFocusPoids,
    poidsInputWrapperRef,
  ]);

  return (
    <div data-testid="reception-category-grid" className={classes.categoryRail}>
      <div className={classes.categorySection}>
        <Text className={classes.visuallyHidden}>Familles</Text>
        <Grid gutter="xs" data-testid="reception-category-root-grid" ref={rootGridRef}>
          {rootCategories.map((category, index) => (
            <Grid.Col key={category.id} span={{ base: 6, lg: 4 }}>
              <Button
                fullWidth
                variant={activeRootId === category.id ? 'filled' : 'light'}
                color={activeRootId === category.id ? 'green' : 'gray'}
                justify="flex-start"
                className={classes.categoryTile}
                onClick={() => {
                  const children = categories.filter((c) => c.parent_id === category.id);
                  setKeyboardShortcutScope(children.length > 0 ? 'child' : 'root');
                  onSelectRootCategory(category.id);
                }}
                onKeyDown={(event) => onRootTileKeyDown(event, category.id, index)}
                onFocus={() => {
                  setFocusedRootId(category.id);
                  setKeyboardShortcutScope('root');
                }}
                onBlur={() => setFocusedRootId((current) => (current === category.id ? null : current))}
                disabled={disabled}
                tabIndex={focusedRootId === category.id || (focusedRootId == null && index === 0) ? 0 : -1}
                style={
                  focusedRootId === category.id
                    ? {
                        outline: '3px solid var(--mantine-color-blue-5)',
                        outlineOffset: 2,
                        boxShadow: activeRootId === category.id ? '0 0 0 1px var(--mantine-color-green-8)' : undefined,
                      }
                    : undefined
                }
                aria-current={activeRootId === category.id ? 'true' : undefined}
                aria-label={
                  getReceptionShortcutKeyForIndex(index)
                    ? `Selectionner ${category.name}. Raccourci clavier: ${getReceptionShortcutKeyForIndex(index)} (position ${index + 1})`
                    : `Selectionner ${category.name}`
                }
                data-selected={activeRootId === category.id ? 'true' : 'false'}
                data-focused={focusedRootId === category.id ? 'true' : 'false'}
                data-testid={`reception-category-tile-${category.id}`}
              >
                <span className={classes.categoryTileContent}>
                  <span className={classes.categoryTileLabel}>{category.name}</span>
                  {getReceptionShortcutKeyForIndex(index) ? (
                    <span className={classes.categoryTileShortcutBadge} aria-hidden="true">
                      Touche <span className={classes.categoryTileShortcutKey}>{getReceptionShortcutKeyForIndex(index)}</span>
                    </span>
                  ) : null}
                </span>
              </Button>
            </Grid.Col>
          ))}
        </Grid>
      </div>
      {hasHierarchy && activeRoot && workflowStage === 'child' ? (
        <Stack gap="xs" data-testid="reception-category-child-panel" className={classes.categoryChildrenRow}>
          <Group justify="space-between" align="center" className={classes.categoryBackAction}>
            <Text className={classes.visuallyHidden}>Sous-categories {activeRoot.name}</Text>
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={() => {
                setKeyboardShortcutScope('root');
                onReturnToRootStage();
              }}
            >
              Retour familles
            </Button>
          </Group>
          <Grid gutter="xs" data-testid="reception-category-child-grid" ref={childGridRef}>
            {activeChildren.map((category, index) => (
              <Grid.Col key={category.id} span={{ base: 6, lg: 4 }}>
                <Button
                  fullWidth
                  variant={categoryId === category.id ? 'filled' : 'default'}
                  color={categoryId === category.id ? 'green' : 'gray'}
                  justify="flex-start"
                  className={classes.categoryTile}
                  onClick={() => selectCategoryAndFocusPoids(category.id)}
                  onKeyDown={(event) => onSubcategoryTileKeyDown(event, category.id, index)}
                  onFocus={() => {
                    setFocusedChildId(category.id);
                    setKeyboardShortcutScope('child');
                  }}
                  onBlur={() => setFocusedChildId((current) => (current === category.id ? null : current))}
                  disabled={disabled}
                  tabIndex={focusedChildId === category.id || (focusedChildId == null && index === 0) ? 0 : -1}
                  style={
                    focusedChildId === category.id
                      ? {
                          outline: '3px solid var(--mantine-color-blue-5)',
                          outlineOffset: 2,
                          boxShadow: categoryId === category.id ? '0 0 0 1px var(--mantine-color-green-8)' : undefined,
                        }
                      : undefined
                  }
                  aria-label={
                    getReceptionShortcutKeyForIndex(index)
                      ? `Selectionner ${category.name}. Raccourci clavier: ${getReceptionShortcutKeyForIndex(index)} (position ${index + 1})`
                      : `Selectionner ${category.name}`
                  }
                  data-selected={categoryId === category.id ? 'true' : 'false'}
                  data-focused={focusedChildId === category.id ? 'true' : 'false'}
                  data-testid={`reception-subcategory-tile-${category.id}`}
                >
                  <span className={classes.categoryTileContent}>
                    <span className={classes.categoryTileLabel}>{category.name}</span>
                    {getReceptionShortcutKeyForIndex(index) ? (
                      <span className={classes.categoryTileShortcutBadge} aria-hidden="true">
                        Touche <span className={classes.categoryTileShortcutKey}>{getReceptionShortcutKeyForIndex(index)}</span>
                      </span>
                    ) : null}
                  </span>
                </Button>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      ) : null}
    </div>
  );
}

export function CategoryHierarchyPicker(props: CategoryHierarchyPickerProps): ReactNode {
  if (props.presentation === 'kiosk_drill') {
    return <CategoryHierarchyPickerKioskDrill {...props} />;
  }
  return <CategoryHierarchyPickerReceptionRailInner {...props} />;
}
