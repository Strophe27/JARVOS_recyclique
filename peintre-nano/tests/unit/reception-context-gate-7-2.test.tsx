// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import {
  createDefaultDemoEnvelope,
  PERMISSION_RECEPTION_ACCESS,
} from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { ReceptionNominalWizard } from '../../src/domains/reception/ReceptionNominalWizard';
import '../../src/registry';

describe('Story 7.2 — garde entrée réception (enveloppe uniquement)', () => {
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
        restrictionMessage: 'Compte refusé réception',
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('reception-context-blocked')).toBeTruthy();
    expect(screen.getByText(/Compte refusé réception/)).toBeTruthy();
    expect(screen.queryByTestId('reception-open-poste')).toBeNull();
  });

  it('affiche un blocage si la permission reception.access est absente de l’enveloppe', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_RECEPTION_ACCESS,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('reception-context-blocked')).toBeTruthy();
    expect(screen.getByText(new RegExp(PERMISSION_RECEPTION_ACCESS, 'i'))).toBeTruthy();
  });
});
