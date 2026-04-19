// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_DISBURSEMENT,
  PERMISSION_CASHFLOW_INTERNAL_TRANSFER,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import '../../src/styles/tokens.css';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe('E2E — hub opérations spéciales caisse (Story 24.2)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  it('URL profonde /caisse/operations-speciales : hub + cinq cartes PRD + CTA échange + mentions « à venir » P1 restants', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-2' },
      envelope: createDefaultDemoEnvelope(),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-hub')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-special-ops-card-annuler')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-card-rembourser')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-card-decaisser')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-card-mouvement-interne')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-card-echanger')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-echanger-cta')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-decaisser-cta')).toBeTruthy();
  });

  it('navigation : entrée latérale manifestée → /caisse/operations-speciales + hub', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-2' },
      envelope: createDefaultDemoEnvelope(),
    });
    window.history.pushState({}, '', '/dashboard');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    const nav = await screen.findByRole('navigation', { name: 'Zone navigation' });
    const entry = within(nav).getByTestId('nav-entry-cashflow-special-ops-hub');
    fireEvent.click(within(entry).getByRole('button'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse/operations-speciales');
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-hub')).toBeTruthy();
    });
  });

  it('découvrabilité : depuis /caisse, bouton Opérations spéciales → hub', async () => {
    window.history.pushState({}, '', '/caisse');
    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-open-special-ops-hub')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('caisse-open-special-ops-hub'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse/operations-speciales');
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-hub')).toBeTruthy();
    });
  });

  it('sans caisse.refund : pas de CTA remboursement, message explicite', async () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_REFUND,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-2-nor' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-rembourser-blocked')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-special-ops-rembourser-cta')).toBeNull();
  });

  it('avec caisse.refund mais sans caisse.access : pas de CTA remboursement (garde-fou manifeste)', async () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_NOMINAL,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-2-nom' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-rembourser-blocked')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-special-ops-rembourser-cta')).toBeNull();
  });

  it('hub → CTA remboursement : /caisse/remboursement + wizard étape 1', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-2' },
      envelope: createDefaultDemoEnvelope(),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-rembourser-cta')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-special-ops-rembourser-cta'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse/remboursement');
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-step-select')).toBeTruthy();
    });
  });

  it('hub → CTA échange : /caisse/echange + wizard (session stub)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-2' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-00000000c0de',
      }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-echanger-cta')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-special-ops-echanger-cta'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse/echange');
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard')).toBeTruthy();
    });
  });

  it('sans cash.disbursement : pas de CTA décaissement, message explicite (Story 24.7)', async () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_DISBURSEMENT,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-7-d' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-decaisser-blocked')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-special-ops-decaisser-cta')).toBeNull();
  });

  it('avec cash.disbursement mais sans caisse.access : pas de CTA décaissement (Story 24.7)', async () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_NOMINAL,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-7-nom' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-decaisser-blocked')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-special-ops-decaisser-cta')).toBeNull();
  });

  it('hub → CTA décaissement : /caisse/decaissement + wizard (Story 24.7)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-7' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-00000000c0de',
      }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-decaisser-cta')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-special-ops-decaisser-cta'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse/decaissement');
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-disbursement-wizard')).toBeTruthy();
    });
  });

  it('URL profonde /caisse/decaissement : wizard décaissement visible (Story 24.7)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-7-deep' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-00000000c0de',
      }),
    });
    window.history.pushState({}, '', '/caisse/decaissement');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-disbursement-wizard')).toBeTruthy();
    });
    expect(screen.getByText(/Sous-types obligatoires/i)).toBeTruthy();
  });

  it('sans cash.transfer : pas de CTA mouvement interne, message explicite (Story 24.8)', async () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_INTERNAL_TRANSFER,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-8-notrf' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-mouvement-interne-blocked')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-special-ops-mouvement-interne-cta')).toBeNull();
  });

  it('avec cash.transfer mais sans caisse.access : pas de CTA mouvement interne (Story 24.8)', async () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_NOMINAL,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-8-nom' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-mouvement-interne-blocked')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-special-ops-mouvement-interne-cta')).toBeNull();
  });

  it('hub → CTA mouvement interne : /caisse/mouvement-interne + wizard (Story 24.8)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-8' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-00000000c0de',
      }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-mouvement-interne-cta')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-special-ops-mouvement-interne-cta'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse/mouvement-interne');
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-internal-transfer-wizard')).toBeTruthy();
    });
  });

  it('URL profonde /caisse/mouvement-interne : wizard mouvement interne visible (Story 24.8)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-8-deep' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-00000000c0de',
      }),
    });
    window.history.pushState({}, '', '/caisse/mouvement-interne');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-internal-transfer-wizard')).toBeTruthy();
    });
  });

  it('distinct du remboursement : URLs séparées — wizard remboursement vs mouvement interne (Story 24.8)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-8-dist' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-00000000c0de',
      }),
    });

    window.history.pushState({}, '', '/caisse/remboursement');
    const { unmount: unmountRefund } = render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-step-select')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-internal-transfer-wizard')).toBeNull();
    unmountRefund();
    cleanup();

    window.history.pushState({}, '', '/caisse/mouvement-interne');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-internal-transfer-wizard')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-refund-step-select')).toBeNull();
  });
});
