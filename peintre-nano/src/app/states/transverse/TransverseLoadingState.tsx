import { TRANSVERSE_RUNTIME_CODES } from './transverse-runtime-codes';
import classes from './TransverseLoadingState.module.css';

export type TransverseLoadingStateProps = {
  readonly message?: string;
};

const DEFAULT_MESSAGE = 'Chargement…';

export function TransverseLoadingState({ message = DEFAULT_MESSAGE }: TransverseLoadingStateProps) {
  return (
    <div
      className={classes.root}
      data-testid="transverse-state-loading"
      data-runtime-severity="info"
      data-runtime-code={TRANSVERSE_RUNTIME_CODES.LOADING}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <p className={classes.message}>
        <span className={classes.spinner} aria-hidden />
        {message}
      </p>
    </div>
  );
}
