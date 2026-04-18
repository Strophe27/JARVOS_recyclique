import { useEffect, useRef } from 'react';
import {
  reportRuntimeFallback,
  type RuntimeRejectionSeverity,
} from '../../../runtime/report-runtime-fallback';
import { TRANSVERSE_RUNTIME_CODES } from './transverse-runtime-codes';
import classes from './TransverseErrorState.module.css';

export type TransverseErrorStateProps = {
  readonly message: string;
  readonly code: string;
  readonly severity?: RuntimeRejectionSeverity;
};

export function TransverseErrorState({
  message,
  code,
  severity = 'degraded',
}: TransverseErrorStateProps) {
  const reportedRef = useRef(false);
  useEffect(() => {
    if (reportedRef.current) {
      return;
    }
    reportedRef.current = true;
    reportRuntimeFallback({
      code,
      message,
      severity,
      state: 'transverse_page_surface_error',
      detail: { surface: 'transverse', domCode: TRANSVERSE_RUNTIME_CODES.ERROR },
    });
  }, [code, message, severity]);

  return (
    <div
      className={classes.root}
      data-testid="transverse-state-error"
      data-runtime-severity={severity}
      data-runtime-code={code}
      role="alert"
      aria-live="assertive"
    >
      <p className={classes.message}>{message}</p>
      <span className={classes.code}>{code}</span>
    </div>
  );
}
