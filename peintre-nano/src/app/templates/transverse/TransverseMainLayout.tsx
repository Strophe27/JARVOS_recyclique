import type { ReactNode } from 'react';
import type { TransversePageStateConfig } from '../../states/transverse';
import type { TransverseMainLayoutMode } from './resolve-transverse-main-layout';
import { resolveTransverseHubFamily } from './resolve-transverse-main-layout';
import { TransverseConsultationLayout } from './TransverseConsultationLayout';
import { TransverseHubLayout } from './TransverseHubLayout';

export type TransverseMainLayoutProps = {
  readonly mode: TransverseMainLayoutMode;
  readonly pageKey: string;
  readonly children: ReactNode;
  readonly pageState?: TransversePageStateConfig;
};

/** Point d’entrée runtime : hub vs consultation, sans logique métier. */
export function TransverseMainLayout({ mode, pageKey, children, pageState }: TransverseMainLayoutProps) {
  if (mode === 'consultation') {
    return <TransverseConsultationLayout pageState={pageState}>{children}</TransverseConsultationLayout>;
  }
  return (
    <TransverseHubLayout family={resolveTransverseHubFamily(pageKey)} pageState={pageState}>
      {children}
    </TransverseHubLayout>
  );
}
