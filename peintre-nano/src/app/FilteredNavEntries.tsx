import { useEffect } from 'react';
import type { NavigationEntry } from '../types/navigation-manifest';
import { reportRuntimeFallback } from '../runtime/report-runtime-fallback';
import classes from './FilteredNavEntries.module.css';

export type FilteredNavEntriesProps = {
  readonly entries: readonly NavigationEntry[];
  readonly selectedEntryId?: string;
  readonly onSelectEntry?: (entry: NavigationEntry) => void;
};

type NavSubtreeProps = FilteredNavEntriesProps;

function NavSubtree({ entries, selectedEntryId, onSelectEntry }: NavSubtreeProps) {
  return (
    <ul className={classes.list}>
      {entries.map((e) => (
        <li
          key={e.id}
          className={classes.item}
          data-testid={`nav-entry-${e.id}`}
          data-entry-id={e.id}
        >
          {onSelectEntry ? (
            <button
              type="button"
              className={`${classes.label} ${classes.navButton}`}
              aria-current={selectedEntryId === e.id ? 'true' : undefined}
              onClick={() => onSelectEntry(e)}
            >
              {e.labelKey ?? e.routeKey}
            </button>
          ) : (
            <span className={classes.label}>{e.labelKey ?? e.routeKey}</span>
          )}
          {e.children?.length ? (
            <NavSubtree entries={e.children} selectedEntryId={selectedEntryId} onSelectEntry={onSelectEntry} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function FilteredNavEmpty() {
  useEffect(() => {
    reportRuntimeFallback({
      code: 'NAV_FILTERED_EMPTY',
      message: 'Aucune entrée de navigation visible pour le contexte actif.',
      severity: 'info',
      state: 'navigation_filtered_empty',
    });
  }, []);

  return (
    <p
      className={classes.empty}
      data-testid="filtered-nav-empty"
      data-runtime-severity="info"
      data-runtime-code="NAV_FILTERED_EMPTY"
    >
      Aucune entrée visible pour le contexte actif.
    </p>
  );
}

/** Navigation issue du manifest, déjà filtrée par `filterNavigation` (runtime). */
export function FilteredNavEntries({ entries, selectedEntryId, onSelectEntry }: FilteredNavEntriesProps) {
  if (!entries.length) {
    return <FilteredNavEmpty />;
  }
  return (
    <div className={classes.root} data-testid="filtered-nav-entries">
      <NavSubtree entries={entries} selectedEntryId={selectedEntryId} onSelectEntry={onSelectEntry} />
    </div>
  );
}
