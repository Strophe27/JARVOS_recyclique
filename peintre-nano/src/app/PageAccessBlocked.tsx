import { Text } from '@mantine/core';
import { useEffect } from 'react';
import { reportRuntimeFallback } from '../runtime/report-runtime-fallback';
import type { PageAccessResult } from '../runtime/resolve-page-access';
import classes from './PageAccessBlocked.module.css';

export type PageAccessBlockedProps = {
  readonly result: Extract<PageAccessResult, { allowed: false }>;
};

/** État explicite lorsque le manifest page n’est pas rendu (intersection enveloppe). */
export function PageAccessBlocked({ result }: PageAccessBlockedProps) {
  useEffect(() => {
    reportRuntimeFallback({
      code: result.code,
      message: result.message,
      severity: 'blocked',
      state: 'page_access_denied',
      detail: { blockCode: result.code },
    });
  }, [result.code, result.message]);

  return (
    <div
      className={classes.root}
      data-testid="page-access-blocked"
      data-block-code={result.code}
      data-runtime-severity="blocked"
      data-runtime-code={result.code}
      role="status"
    >
      <Text fw={600} size="sm" mb="xs">
        Accès page restreint
      </Text>
      <Text size="sm" c="dimmed">
        {result.message}
      </Text>
    </div>
  );
}
