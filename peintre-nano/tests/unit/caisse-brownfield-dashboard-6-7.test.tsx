// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CaisseBrownfieldDashboardWidget } from '../../src/domains/cashflow/CaisseBrownfieldDashboardWidget';
import '../../src/registry';

describe('Story 6.7 — dashboard brownfield → clôture (continuum)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
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

  it('expose un CTA « Clôturer la session » qui navigue vers l’alias legacy `/cash-register/session/close` (Story 13.3)', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CaisseBrownfieldDashboardWidget widgetProps={{}} />
      </RootProviders>,
    );
    fireEvent.click(screen.getByTestId('caisse-goto-close'));
    expect(pushState).toHaveBeenCalled();
    const args = pushState.mock.calls.find((c) => String(c[2]) === '/cash-register/session/close');
    expect(args).toBeTruthy();
  });

  it('rend des garde-fous explicites pour réel, virtuel et différé', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CaisseBrownfieldDashboardWidget widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('caisse-entry-real').textContent).toMatch(/Poste physique standard/i);
    expect(screen.getByTestId('caisse-entry-virtual').textContent).toMatch(/simulation/i);
    expect(screen.getByTestId('caisse-entry-deferred').textContent).toMatch(/date réelle d’ouverture \/ vente/i);
  });
});
