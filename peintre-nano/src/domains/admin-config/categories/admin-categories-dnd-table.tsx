import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Switch,
  Table,
  Text,
} from '@mantine/core';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
} from 'lucide-react';
import { Fragment, useCallback, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import type {
  CategoriesDataSource,
  CategoryAdminListRowDto,
  CategoryV1UpdateRequestBody,
} from '../../../api/admin-categories-client';
import type { CategoryOrderMainView } from './category-admin-reorder';
import {
  categoryBreadcrumbLabel,
  type CategoriesSortBy,
  sortedDirectChildrenOf,
} from './category-admin-display-model';

const moneyFr = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function formatMoney(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return moneyFr.format(v);
}

type SwapOps = readonly { categoryId: string; body: CategoryV1UpdateRequestBody }[];

export type AdminCategoriesDndShellProps = {
  readonly dndActive: boolean;
  readonly rows: readonly CategoryAdminListRowDto[];
  readonly onApplySiblingDrag: (activeId: string, overId: string) => void | Promise<void>;
  readonly children: ReactNode;
};

export type AdminCategoriesDndTableProps = {
  readonly rows: readonly CategoryAdminListRowDto[];
  readonly listFiltered: readonly CategoryAdminListRowDto[];
  readonly sortBy: CategoriesSortBy;
  readonly listSortSource: CategoriesDataSource;
  readonly mainView: CategoryOrderMainView;
  readonly collapsedIds: ReadonlySet<string>;
  readonly setCollapsedIds: Dispatch<SetStateAction<Set<string>>>;
  readonly branchIds: ReadonlySet<string>;
  readonly busy: boolean;
  readonly mutationsEnabled: boolean;
  readonly onApplySiblingDrag: (activeId: string, overId: string) => void | Promise<void>;
  readonly openEdit: (c: CategoryAdminListRowDto) => void;
  readonly setConfirmArchive: (c: CategoryAdminListRowDto) => void;
  readonly setReparentCategoryId: (id: string) => void;
  readonly setReparentOpen: (v: boolean) => void;
  readonly handleRestore: (categoryId: string) => void;
  readonly handleCaisseActiveToggle: (c: CategoryAdminListRowDto, next: boolean) => void;
  readonly handleReceptionVisibilityToggle: (c: CategoryAdminListRowDto, next: boolean) => void;
  readonly applyReorderPair: (ops: SwapOps) => void | Promise<void>;
  readonly swapCaisseOrderWithNeighbor: (
    rows: readonly CategoryAdminListRowDto[],
    id: string,
    dir: 'up' | 'down',
  ) => SwapOps | null;
  readonly swapReceptionOrderWithNeighbor: (
    rows: readonly CategoryAdminListRowDto[],
    id: string,
    dir: 'up' | 'down',
  ) => SwapOps | null;
  readonly caisseBusyId: string | null;
  readonly visibilityBusyId: string | null;
};

export type AdminCategoriesSortableRowsProps = Omit<AdminCategoriesDndTableProps, 'onApplySiblingDrag'>;

function SortableCategoryTableRow(props: {
  readonly category: CategoryAdminListRowDto;
  readonly depth: number;
  readonly hasChildren: boolean;
  readonly branchIds: ReadonlySet<string>;
  readonly collapsedIds: ReadonlySet<string>;
  readonly setCollapsedIds: Dispatch<SetStateAction<Set<string>>>;
  readonly busy: boolean;
  readonly mutationsEnabled: boolean;
  readonly mainView: CategoryOrderMainView;
  readonly rows: readonly CategoryAdminListRowDto[];
  readonly openEdit: (c: CategoryAdminListRowDto) => void;
  readonly setConfirmArchive: (c: CategoryAdminListRowDto) => void;
  readonly setReparentCategoryId: (id: string) => void;
  readonly setReparentOpen: (v: boolean) => void;
  readonly handleRestore: (categoryId: string) => void;
  readonly handleCaisseActiveToggle: (c: CategoryAdminListRowDto, next: boolean) => void;
  readonly handleReceptionVisibilityToggle: (c: CategoryAdminListRowDto, next: boolean) => void;
  readonly applyReorderPair: (ops: SwapOps) => void | Promise<void>;
  readonly swapCaisseOrderWithNeighbor: (
    rows: readonly CategoryAdminListRowDto[],
    id: string,
    dir: 'up' | 'down',
  ) => SwapOps | null;
  readonly swapReceptionOrderWithNeighbor: (
    rows: readonly CategoryAdminListRowDto[],
    id: string,
    dir: 'up' | 'down',
  ) => SwapOps | null;
  readonly caisseBusyId: string | null;
  readonly visibilityBusyId: string | null;
}): ReactNode {
  const c = props.category;
  const archived = Boolean(c.deleted_at);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: c.id,
    disabled: archived || props.busy || !props.mutationsEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : !archived && !c.is_active ? 0.78 : 1,
    zIndex: isDragging ? 2 : undefined,
    position: 'relative' as const,
    boxShadow: isDragging ? '0 4px 14px rgba(0,0,0,0.12)' : undefined,
  };

  const breadcrumb = categoryBreadcrumbLabel(props.rows, c.id);
  const caisseUp = !archived ? props.swapCaisseOrderWithNeighbor(props.rows, c.id, 'up') : null;
  const caisseDown = !archived ? props.swapCaisseOrderWithNeighbor(props.rows, c.id, 'down') : null;
  const recvUp = !archived ? props.swapReceptionOrderWithNeighbor(props.rows, c.id, 'up') : null;
  const recvDown = !archived ? props.swapReceptionOrderWithNeighbor(props.rows, c.id, 'down') : null;

  const gripLabel =
    props.mainView === 'sale'
      ? 'Ordre à la caisse : glisser la poignée (même niveau uniquement)'
      : 'Ordre à la réception : glisser la poignée (même niveau uniquement)';

  return (
    <Table.Tr ref={setNodeRef} style={style} data-testid={`category-row-dnd-${c.id}`}>
      <Table.Td>
        <span
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          style={{
            cursor: archived || props.busy ? 'default' : 'grab',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            margin: '-2px 0',
            borderRadius: 6,
            opacity: archived ? 0.35 : 1,
            touchAction: 'none',
          }}
          title={archived ? undefined : gripLabel}
          aria-label={archived ? undefined : `Réordonner ${c.name} par glisser-déposer`}
          data-testid={`category-order-drag-${c.id}`}
        >
          <GripVertical size={18} strokeWidth={2} aria-hidden />
        </span>
      </Table.Td>
      <Table.Td>
        <div style={{ paddingLeft: props.depth * 18 }}>
          <Group gap={6} wrap="nowrap" align="flex-start">
            {props.hasChildren ? (
              <ActionIcon
                variant="transparent"
                size="sm"
                color="dark"
                aria-label={
                  props.collapsedIds.has(c.id) ? 'Afficher les sous-catégories' : 'Masquer les sous-catégories'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  props.setCollapsedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.id)) next.delete(c.id);
                    else next.add(c.id);
                    return next;
                  });
                }}
              >
                {props.collapsedIds.has(c.id) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </ActionIcon>
            ) : (
              <span style={{ width: 28, flexShrink: 0 }} aria-hidden />
            )}
            <div style={{ minWidth: 0 }}>
              <Group gap={6} wrap="wrap" align="center">
                <Text size="sm" fw={500} component="span">
                  {c.name}
                </Text>
                {archived ? (
                  <Text size="xs" c="dimmed" component="span" style={{ fontStyle: 'italic' }}>
                    (archivée)
                  </Text>
                ) : !c.is_active ? (
                  <Text size="xs" c="orange" component="span" style={{ fontStyle: 'italic' }}>
                    (masquée caisse)
                  </Text>
                ) : !c.is_visible ? (
                  <Text size="xs" c="dimmed" component="span" style={{ fontStyle: 'italic' }}>
                    (masquée réception)
                  </Text>
                ) : null}
              </Group>
              {c.official_name ? (
                <Text size="xs" c="dimmed">
                  {c.official_name}
                </Text>
              ) : null}
              {breadcrumb !== c.name ? (
                <Text size="xs" c="dimmed" lineClamp={2} title={breadcrumb}>
                  {breadcrumb}
                </Text>
              ) : null}
            </div>
          </Group>
        </div>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatMoney(c.price ?? null)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatMoney(c.max_price ?? null)}</Text>
      </Table.Td>
      <Table.Td>
        <Switch
          size="sm"
          checked={Boolean(c.is_active)}
          onChange={(e) => void props.handleCaisseActiveToggle(c, e.currentTarget.checked)}
          disabled={archived || !props.mutationsEnabled || props.busy || props.caisseBusyId === c.id}
          aria-label={`Visible à la caisse pour ${c.name}`}
          data-testid={`category-caisse-active-${c.id}`}
        />
      </Table.Td>
      <Table.Td>
        <Switch
          size="sm"
          checked={Boolean(c.is_visible)}
          onChange={(e) => void props.handleReceptionVisibilityToggle(c, e.currentTarget.checked)}
          disabled={archived || !props.mutationsEnabled || props.busy || props.visibilityBusyId === c.id}
          aria-label={`Visible à la réception pour ${c.name}`}
          data-testid={`category-reception-visible-${c.id}`}
        />
      </Table.Td>
      <Table.Td>
        {c.deleted_at ? (
          <Button
            size="compact-xs"
            variant="light"
            onClick={() => void props.handleRestore(c.id)}
            disabled={!props.mutationsEnabled || props.busy}
            data-testid={`category-restore-${c.id}`}
          >
            Restaurer
          </Button>
        ) : (
          <Group gap={6} wrap="nowrap" justify="flex-end">
            <Button
              size="compact-xs"
              variant="default"
              onClick={() => props.openEdit(c)}
              disabled={!props.mutationsEnabled || props.busy}
              data-testid={`category-edit-open-${c.id}`}
            >
              Modifier
            </Button>
            <Button
              size="compact-xs"
              variant="outline"
              color="orange"
              onClick={() => props.setConfirmArchive(c)}
              disabled={!props.mutationsEnabled || props.busy}
              data-testid={`category-archive-open-${c.id}`}
            >
              Archiver
            </Button>
            <Menu shadow="md" width={260} withinPortal={false}>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Autres actions pour ${c.name}`}
                  data-testid={`category-row-actions-${c.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Ordre à la caisse</Menu.Label>
                <Menu.Item
                  leftSection={<ArrowUp size={14} />}
                  disabled={!props.mutationsEnabled || props.busy || caisseUp === null}
                  onClick={() => {
                    const ops = caisseUp;
                    if (ops) void props.applyReorderPair(ops);
                  }}
                  data-testid={`category-order-caisse-up-${c.id}`}
                >
                  Monter
                </Menu.Item>
                <Menu.Item
                  leftSection={<ArrowDown size={14} />}
                  disabled={!props.mutationsEnabled || props.busy || caisseDown === null}
                  onClick={() => {
                    const ops = caisseDown;
                    if (ops) void props.applyReorderPair(ops);
                  }}
                  data-testid={`category-order-caisse-down-${c.id}`}
                >
                  Descendre
                </Menu.Item>
                <Menu.Label>Ordre à la réception</Menu.Label>
                <Menu.Item
                  leftSection={<ArrowUp size={14} />}
                  disabled={!props.mutationsEnabled || props.busy || recvUp === null}
                  onClick={() => {
                    const ops = recvUp;
                    if (ops) void props.applyReorderPair(ops);
                  }}
                  data-testid={`category-order-reception-up-${c.id}`}
                >
                  Monter
                </Menu.Item>
                <Menu.Item
                  leftSection={<ArrowDown size={14} />}
                  disabled={!props.mutationsEnabled || props.busy || recvDown === null}
                  onClick={() => {
                    const ops = recvDown;
                    if (ops) void props.applyReorderPair(ops);
                  }}
                  data-testid={`category-order-reception-down-${c.id}`}
                >
                  Descendre
                </Menu.Item>
                <Menu.Item
                  onClick={() => {
                    props.setReparentCategoryId(c.id);
                    props.setReparentOpen(true);
                  }}
                  disabled={!props.mutationsEnabled || props.busy}
                  data-testid={`category-reparent-open-${c.id}`}
                >
                  Reclasser
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

function CategoryLevelRows(props: {
  readonly parentId: string | null;
  readonly depth: number;
  readonly listFiltered: readonly CategoryAdminListRowDto[];
  readonly sortBy: CategoriesSortBy;
  readonly listSortSource: CategoriesDataSource;
  readonly branchIds: ReadonlySet<string>;
  readonly collapsedIds: ReadonlySet<string>;
  readonly setCollapsedIds: Dispatch<SetStateAction<Set<string>>>;
  readonly busy: boolean;
  readonly mutationsEnabled: boolean;
  readonly mainView: CategoryOrderMainView;
  readonly rows: readonly CategoryAdminListRowDto[];
  readonly openEdit: (c: CategoryAdminListRowDto) => void;
  readonly setConfirmArchive: (c: CategoryAdminListRowDto) => void;
  readonly setReparentCategoryId: (id: string) => void;
  readonly setReparentOpen: (v: boolean) => void;
  readonly handleRestore: (categoryId: string) => void;
  readonly handleCaisseActiveToggle: (c: CategoryAdminListRowDto, next: boolean) => void;
  readonly handleReceptionVisibilityToggle: (c: CategoryAdminListRowDto, next: boolean) => void;
  readonly applyReorderPair: (ops: SwapOps) => void | Promise<void>;
  readonly swapCaisseOrderWithNeighbor: (
    rows: readonly CategoryAdminListRowDto[],
    id: string,
    dir: 'up' | 'down',
  ) => SwapOps | null;
  readonly swapReceptionOrderWithNeighbor: (
    rows: readonly CategoryAdminListRowDto[],
    id: string,
    dir: 'up' | 'down',
  ) => SwapOps | null;
  readonly caisseBusyId: string | null;
  readonly visibilityBusyId: string | null;
}): ReactNode {
  const children = sortedDirectChildrenOf(
    props.listFiltered,
    props.parentId,
    props.sortBy,
    props.listSortSource,
  );
  if (children.length === 0) return null;

  const itemIds = children.map((ch) => ch.id);

  const rowProps = {
    branchIds: props.branchIds,
    collapsedIds: props.collapsedIds,
    setCollapsedIds: props.setCollapsedIds,
    busy: props.busy,
    mutationsEnabled: props.mutationsEnabled,
    mainView: props.mainView,
    rows: props.rows,
    openEdit: props.openEdit,
    setConfirmArchive: props.setConfirmArchive,
    setReparentCategoryId: props.setReparentCategoryId,
    setReparentOpen: props.setReparentOpen,
    handleRestore: props.handleRestore,
    handleCaisseActiveToggle: props.handleCaisseActiveToggle,
    handleReceptionVisibilityToggle: props.handleReceptionVisibilityToggle,
    applyReorderPair: props.applyReorderPair,
    swapCaisseOrderWithNeighbor: props.swapCaisseOrderWithNeighbor,
    swapReceptionOrderWithNeighbor: props.swapReceptionOrderWithNeighbor,
    caisseBusyId: props.caisseBusyId,
    visibilityBusyId: props.visibilityBusyId,
  };

  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      {children.map((child) => {
        const hasChildren = props.branchIds.has(child.id);
        const expanded = !props.collapsedIds.has(child.id);
        return (
          <Fragment key={child.id}>
            <SortableCategoryTableRow category={child} depth={props.depth} hasChildren={hasChildren} {...rowProps} />
            {hasChildren && expanded ? (
              <CategoryLevelRows {...props} parentId={child.id} depth={props.depth + 1} />
            ) : null}
          </Fragment>
        );
      })}
    </SortableContext>
  );
}

/** Enveloppe le tableau (hors `tbody`) pour éviter qu’un `div` d’accessibilité @dnd-kit ne casse le nesting HTML. */
export function AdminCategoriesDndShell(p: AdminCategoriesDndShellProps): ReactNode {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { onApplySiblingDrag, rows, dndActive, children } = p;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const onDragEnd = useCallback(
    async (e: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      await onApplySiblingDrag(String(active.id), String(over.id));
    },
    [onApplySiblingDrag],
  );

  const activeRow = activeId ? rows.find((r) => r.id === activeId) : undefined;

  if (!dndActive) {
    return children;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {children}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.25,1,0.5,1)' }}>
        {activeRow ? (
          <Table withTableBorder withRowBorders style={{ minWidth: 360, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
            <Table.Tbody>
              <Table.Tr style={{ background: 'var(--mantine-color-body)' }}>
                <Table.Td colSpan={7}>
                  <Group gap="sm" wrap="nowrap">
                    <GripVertical size={18} aria-hidden />
                    <Text size="sm" fw={600}>
                      {activeRow.name}
                    </Text>
                  </Group>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function AdminCategoriesSortableTableRows(p: AdminCategoriesSortableRowsProps): ReactNode {
  return (
    <CategoryLevelRows
      parentId={null}
      depth={0}
      listFiltered={p.listFiltered}
      sortBy={p.sortBy}
      listSortSource={p.listSortSource}
      branchIds={p.branchIds}
      collapsedIds={p.collapsedIds}
      setCollapsedIds={p.setCollapsedIds}
      busy={p.busy}
      mutationsEnabled={p.mutationsEnabled}
      mainView={p.mainView}
      rows={p.rows}
      openEdit={p.openEdit}
      setConfirmArchive={p.setConfirmArchive}
      setReparentCategoryId={p.setReparentCategoryId}
      setReparentOpen={p.setReparentOpen}
      handleRestore={p.handleRestore}
      handleCaisseActiveToggle={p.handleCaisseActiveToggle}
      handleReceptionVisibilityToggle={p.handleReceptionVisibilityToggle}
      applyReorderPair={p.applyReorderPair}
      swapCaisseOrderWithNeighbor={p.swapCaisseOrderWithNeighbor}
      swapReceptionOrderWithNeighbor={p.swapReceptionOrderWithNeighbor}
      caisseBusyId={p.caisseBusyId}
      visibilityBusyId={p.visibilityBusyId}
    />
  );
}
