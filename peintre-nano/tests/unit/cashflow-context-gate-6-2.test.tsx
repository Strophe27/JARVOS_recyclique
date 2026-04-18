// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowNominalWizard } from '../../src/domains/cashflow/CashflowNominalWizard';
import '../../src/registry';

describe('Story 6.2 — garde entrée caisse (enveloppe uniquement)', () => {
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

  it('affiche un blocage explicite si runtimeStatus = forbidden', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        runtimeStatus: 'forbidden',
        restrictionMessage: 'Compte refusé',
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-context-blocked')).toBeTruthy();
    expect(screen.getByText(/Compte refusé/)).toBeTruthy();
    expect(screen.queryByTestId('cashflow-step-next')).toBeNull();
  });

  it('affiche un blocage si aucune permission réel / virtuel / différé n’est présente dans l’enveloppe', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== 'caisse.access' && k !== 'caisse.virtual.access' && k !== 'caisse.deferred.access',
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-context-blocked')).toBeTruthy();
    expect(screen.getByText(/aucune clé d’entrée caisse/i)).toBeTruthy();
  });

  it('autorise le workspace si seule la permission caisse.virtual.access reste présente', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== 'caisse.access' && k !== 'caisse.deferred.access',
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.queryByTestId('cashflow-context-blocked')).toBeNull();
    expect(screen.getByTestId('cashflow-step-next')).toBeTruthy();
  });
});
