import type { ReactNode } from 'react';
import type { TransversePageStateConfig } from './transverse-page-state';
import { DEFAULT_TRANSVERSE_PAGE_STATE } from './transverse-page-state';
import { TransverseEmptyState } from './TransverseEmptyState';
import { TransverseErrorState } from './TransverseErrorState';
import { TransverseLoadingState } from './TransverseLoadingState';
import classes from './TransversePageStateSlot.module.css';

export type TransversePageStateSlotProps = {
  readonly pageState?: TransversePageStateConfig;
};

export function TransversePageStateSlot({ pageState = DEFAULT_TRANSVERSE_PAGE_STATE }: TransversePageStateSlotProps) {
  const active = pageState.kind !== 'nominal';
  const wrapClass = active ? classes.slotActive : classes.slotNominal;

  let inner: ReactNode = null;
  if (pageState.kind === 'loading') {
    inner = <TransverseLoadingState message={pageState.message} />;
  } else if (pageState.kind === 'empty') {
    inner = <TransverseEmptyState title={pageState.title} message={pageState.message} />;
  } else if (pageState.kind === 'error') {
    inner = (
      <TransverseErrorState
        message={pageState.message}
        code={pageState.code}
        severity={pageState.severity}
      />
    );
  }

  return (
    <div
      className={wrapClass}
      data-testid="transverse-page-state-slot"
      data-transverse-state={pageState.kind}
      {...(active ? {} : { 'aria-hidden': true })}
    >
      {inner}
    </div>
  );
}
