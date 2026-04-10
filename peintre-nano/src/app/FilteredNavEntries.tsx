import { useEffect, type ReactNode } from 'react';
import type { ContextEnvelopeStub } from '../types/context-envelope';
import type { NavigationEntry } from '../types/navigation-manifest';
import { resolveNavEntryDisplayLabel } from '../runtime/resolve-nav-entry-display-label';
import { reportRuntimeFallback } from '../runtime/report-runtime-fallback';
import classes from './FilteredNavEntries.module.css';

export type FilteredNavEntriesProps = {
  readonly entries: readonly NavigationEntry[];
  /** Enveloppe active : libellés présentation (`presentationLabels`) + cohérence avec les stories 5.1–5.4. */
  readonly envelope: ContextEnvelopeStub;
  readonly selectedEntryId?: string;
  readonly onSelectEntry?: (entry: NavigationEntry) => void;
  /** `toolbar` : barre horizontale type legacy (auth live). */
  readonly layout?: 'list' | 'toolbar';
  readonly toolbarEnd?: ReactNode;
};

type NavSubtreeProps = Omit<FilteredNavEntriesProps, 'layout' | 'toolbarEnd'>;

function NavSubtree({ entries, envelope, selectedEntryId, onSelectEntry }: NavSubtreeProps) {
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
              {resolveNavEntryDisplayLabel(e, envelope)}
            </button>
          ) : (
            <span className={classes.label}>{resolveNavEntryDisplayLabel(e, envelope)}</span>
          )}
          {e.children?.length ? (
            <NavSubtree
              entries={e.children}
              envelope={envelope}
              selectedEntryId={selectedEntryId}
              onSelectEntry={onSelectEntry}
            />
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
export function FilteredNavEntries({
  entries,
  envelope,
  selectedEntryId,
  onSelectEntry,
  layout = 'list',
  toolbarEnd,
}: FilteredNavEntriesProps) {
  if (!entries.length) {
    return <FilteredNavEmpty />;
  }
  const rootClass = layout === 'toolbar' ? `${classes.root} ${classes.rootToolbar}` : classes.root;
  return (
    <div className={rootClass} data-testid="filtered-nav-entries" data-nav-layout={layout}>
      <NavSubtree entries={entries} envelope={envelope} selectedEntryId={selectedEntryId} onSelectEntry={onSelectEntry} />
      {layout === 'toolbar' && toolbarEnd ? (
        <div className={classes.toolbarEnd} data-testid="filtered-nav-toolbar-end">
          {toolbarEnd}
        </div>
      ) : null}
    </div>
  );
}
