// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { makeCashflowSpecialEncaissementWizard } from '../../src/domains/cashflow/CashflowSpecialEncaissementWizard';
import '../../src/registry';

const DonWizard = makeCashflowSpecialEncaissementWizard('DON_SANS_ARTICLE');

describe('Story 6.5 — garde encaissements spéciaux (caisse.special_encaissement)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  it('bloque si caisse.special_encaissement manque alors que caisse.access est présent', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u65' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <DonWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-special-don-wizard-blocked')).toBeTruthy();
    expect(screen.getByText(new RegExp(PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT))).toBeTruthy();
    expect(screen.queryByTestId('cashflow-special-don-wizard-submit')).toBeNull();
  });

  it('affiche le formulaire si access + special_encaissement sont dans l’enveloppe', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u65b' },
      envelope: createDefaultDemoEnvelope(),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <DonWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-special-don-wizard')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-don-wizard-submit')).toBeTruthy();
  });
});
