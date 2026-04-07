import { TRANSVERSE_RUNTIME_CODES } from './transverse-runtime-codes';
import classes from './TransverseEmptyState.module.css';

export type TransverseEmptyStateProps = {
  readonly title?: string;
  readonly message?: string;
};

const DEFAULT_TITLE = 'Aucun contenu';
const DEFAULT_MESSAGE = 'Aucune donnée à afficher pour le moment.';

export function TransverseEmptyState({
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
}: TransverseEmptyStateProps) {
  return (
    <div
      className={classes.root}
      data-testid="transverse-state-empty"
      data-runtime-severity="info"
      data-runtime-code={TRANSVERSE_RUNTIME_CODES.EMPTY}
      role="status"
    >
      <h2 className={classes.title}>{title}</h2>
      <p className={classes.body}>{message}</p>
    </div>
  );
}
