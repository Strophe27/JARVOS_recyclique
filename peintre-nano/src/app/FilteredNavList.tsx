import { Text } from '@mantine/core';
import type { NavigationEntry } from '../types/navigation-manifest';
import classes from './FilteredNavList.module.css';

export type FilteredNavListProps = {
  readonly entries: readonly NavigationEntry[];
};

function NavEntryItem({ entry, depth }: { readonly entry: NavigationEntry; readonly depth: number }) {
  const label = entry.labelKey ?? entry.routeKey;
  return (
    <li
      className={classes.item}
      style={{ paddingLeft: `calc(${depth} * var(--pn-space-3, 0.75rem))` }}
      data-testid={`nav-entry-${entry.id}`}
    >
      <span className={classes.label}>{label}</span>
      {entry.children?.length ? (
        <ul className={classes.subList}>
          {entry.children.map((c) => (
            <NavEntryItem key={c.id} entry={c} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Navigation filtrée par enveloppe (liste testable, CSS Module — pas de layout shell Mantine). */
export function FilteredNavList({ entries }: FilteredNavListProps) {
  if (!entries.length) {
    return (
      <div className={classes.empty} data-testid="filtered-nav-empty">
        <Text size="sm" c="dimmed">
          Aucune entrée visible pour le contexte actif.
        </Text>
      </div>
    );
  }

  return (
    <ul className={classes.list} data-testid="filtered-nav-list" aria-label="Navigation filtrée">
      {entries.map((e) => (
        <NavEntryItem key={e.id} entry={e} depth={0} />
      ))}
    </ul>
  );
}
