import { screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';
import { expect } from 'vitest';

/**
 * Surface vente nominal en kiosque : soit FlowRenderer (`flow-renderer-cashflow-nominal`),
 * soit layout unifié sans FlowRenderer (`cashflow-kiosk-unified-layout`).
 */
export function expectCashflowNominalSaleSurface(): void {
  const flow = screen.queryByTestId('flow-renderer-cashflow-nominal');
  const unified = screen.queryByTestId('cashflow-kiosk-unified-layout');
  expect(flow ?? unified).toBeTruthy();
}

export async function waitForCashflowNominalSaleSurface(): Promise<void> {
  await waitFor(() => {
    expectCashflowNominalSaleSurface();
  });
}
