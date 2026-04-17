// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowSocialDonWizard } from '../../src/domains/cashflow/CashflowSocialDonWizard';
import '../../src/registry';
import { paymentMethodOptionsJsonBody } from './fixtures/payment-method-options-api';

describe('Story 6.6 — garde encaissements sociaux (caisse.social_encaissement)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/sales/payment-method-options')) {
          const body = paymentMethodOptionsJsonBody();
          return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (url.includes('/v2/exploitation/live-snapshot')) {
          const body = { observed_at: '2026-04-01T12:00:00.000Z' };
          return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
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

  it('bloque si caisse.social_encaissement manque alors que caisse.access est présent', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u66' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSocialDonWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-social-don-wizard-blocked')).toBeTruthy();
    expect(screen.getByText(new RegExp(PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT))).toBeTruthy();
    expect(screen.queryByTestId('cashflow-social-don-wizard-submit')).toBeNull();
  });

  it('affiche le formulaire si access + social_encaissement sont dans l’enveloppe', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u66b' },
      envelope: createDefaultDemoEnvelope(),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSocialDonWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-social-don-wizard')).toBeTruthy();
    expect(screen.getByTestId('cashflow-social-don-wizard-submit')).toBeTruthy();
  });
});
