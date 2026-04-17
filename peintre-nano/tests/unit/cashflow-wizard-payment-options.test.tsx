// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowSocialDonWizard } from '../../src/domains/cashflow/CashflowSocialDonWizard';
import { makeCashflowSpecialEncaissementWizard } from '../../src/domains/cashflow/CashflowSpecialEncaissementWizard';
import '../../src/registry';
import { paymentMethodOptionsJsonBody, PAYMENT_METHOD_OPTIONS_FIXTURE_ORDERED } from './fixtures/payment-method-options-api';

const CashflowSpecialAdhesionWizard = makeCashflowSpecialEncaissementWizard('ADHESION_ASSOCIATION');

function stubFetchPaymentOptionsAndLiveSnapshot(paymentOptionsHandler: () => Promise<Response>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/v1/sales/payment-method-options')) {
        return paymentOptionsHandler();
      }
      if (url.includes('/v2/exploitation/live-snapshot')) {
        const body = { observed_at: '2026-04-01T12:00:00.000Z' };
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
}

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Wizards caisse — GET payment-method-options', () => {
  it('social don : échec HTTP → message erreur + submit désactivé', async () => {
    stubFetchPaymentOptionsAndLiveSnapshot(() =>
      Promise.resolve(
        new Response(JSON.stringify({ detail: 'Service indisponible' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-pm-fail' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSocialDonWizard widgetProps={{}} />
      </RootProviders>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-social-don-wizard-pm-error')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-social-don-wizard-pm-error').textContent?.trim().length).toBeGreaterThan(0);
    expect((screen.getByTestId('cashflow-social-don-wizard-submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('encaissement spécial : échec HTTP → message erreur + submit désactivé', async () => {
    stubFetchPaymentOptionsAndLiveSnapshot(() =>
      Promise.resolve(
        new Response(JSON.stringify({ detail: 'Bad gateway' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-pm-fail-2' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSpecialAdhesionWizard widgetProps={{}} />
      </RootProviders>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-adhesion-wizard-pm-error')).toBeTruthy();
    });
    expect((screen.getByTestId('cashflow-special-adhesion-wizard-submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('social don : succès → premier code actif = premier élément fixture (ordre display_order)', async () => {
    stubFetchPaymentOptionsAndLiveSnapshot(() => {
      const body = paymentMethodOptionsJsonBody();
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
    });
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-pm-ok' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSocialDonWizard widgetProps={{}} />
      </RootProviders>,
    );
    const expectedFirst = PAYMENT_METHOD_OPTIONS_FIXTURE_ORDERED[0]!.code;
    await waitFor(() => {
      const el = screen.getByTestId('cashflow-social-don-wizard-payment') as HTMLSelectElement;
      expect(el.value).toBe(expectedFirst);
    });
  });
});
