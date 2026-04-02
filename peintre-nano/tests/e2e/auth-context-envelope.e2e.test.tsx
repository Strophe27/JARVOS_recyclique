// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { MAX_CONTEXT_AGE_MS } from '../../src/runtime/context-envelope-freshness';
import * as runtimeReporting from '../../src/runtime/report-runtime-fallback';
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  cleanup();
});

describe('E2E — auth / ContextEnvelope (story 3.4)', () => {
  it('chemin nominal : enveloppe ok + permissions → nav filtrée non vide, page autorisée, pas de blocage', () => {
    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).getByTestId('filtered-nav-entries')).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-root-home')).toBeTruthy();
    expect(within(nav).queryByTestId('nav-entry-admin-area')).toBeNull();

    const main = screen.getByTestId('shell-zone-main');
    expect(within(main).queryByTestId('page-access-blocked')).toBeNull();
    expect(within(main).getByTestId('manifest-bundle-ok')).toBeTruthy();
    expect(within(main).getByTestId('widget-demo-kpi')).toBeTruthy();
  });

  it('affiche la nav filtrée : entrée démo visible, entrée admin masquée sans permission', () => {
    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).getByTestId('nav-entry-root-home')).toBeTruthy();
    expect(within(nav).queryByTestId('nav-entry-admin-area')).toBeNull();
  });

  it('bloque le rendu métier si le contexte est périmé', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const issuedAt = 1000;
    const adapter = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u' },
      envelope: createDefaultDemoEnvelope({
        issuedAt,
        maxAgeMs: MAX_CONTEXT_AGE_MS,
      }),
    });

    vi.useFakeTimers();
    vi.setSystemTime(issuedAt + MAX_CONTEXT_AGE_MS + 5_000);

    render(
      <RootProviders authAdapter={adapter}>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).getByTestId('filtered-nav-empty')).toBeTruthy();

    const main = screen.getByTestId('shell-zone-main');
    const blocked = within(main).getByTestId('page-access-blocked');
    expect(blocked.getAttribute('data-block-code')).toBe('STALE_CONTEXT');
    expect(blocked.getAttribute('data-runtime-severity')).toBe('blocked');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'blocked',
        code: 'STALE_CONTEXT',
        state: 'page_access_denied',
      }),
    );

    spy.mockRestore();
  });

  it('bloque le rendu métier si le contexte est dégradé', () => {
    const adapter = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u' },
      envelope: createDefaultDemoEnvelope({ runtimeStatus: 'degraded' }),
    });

    render(
      <RootProviders authAdapter={adapter}>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).getByTestId('filtered-nav-empty')).toBeTruthy();

    const main = screen.getByTestId('shell-zone-main');
    expect(within(main).getByTestId('page-access-blocked').getAttribute('data-block-code')).toBe(
      'DEGRADED_CONTEXT',
    );
  });

  it('bloque le rendu métier si le contexte est interdit (forbidden)', () => {
    const adapter = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u' },
      envelope: createDefaultDemoEnvelope({ runtimeStatus: 'forbidden' }),
    });

    render(
      <RootProviders authAdapter={adapter}>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).getByTestId('filtered-nav-empty')).toBeTruthy();

    const main = screen.getByTestId('shell-zone-main');
    expect(within(main).getByTestId('page-access-blocked').getAttribute('data-block-code')).toBe(
      'FORBIDDEN',
    );
  });

  it('bloque la page démo si les permissions effectives ne couvrent pas le manifest page', () => {
    const adapter = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: [] },
      }),
    });

    render(
      <RootProviders authAdapter={adapter}>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    // Entrée sans `required_permission_keys` (manifest démo) reste visible ; les entrées qui exigent view-home sont masquées.
    expect(within(nav).getByTestId('nav-entry-demo-guarded-nav')).toBeTruthy();
    expect(within(nav).queryByTestId('nav-entry-root-home')).toBeNull();

    const main = screen.getByTestId('shell-zone-main');
    expect(within(main).getByTestId('page-access-blocked').getAttribute('data-block-code')).toBe(
      'MISSING_PERMISSIONS',
    );
  });

  it('affiche la nav mais bloque la page si le site actif est requis et absent', () => {
    const adapter = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u' },
      envelope: createDefaultDemoEnvelope({ siteId: null }),
    });

    render(
      <RootProviders authAdapter={adapter}>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).getByTestId('nav-entry-root-home')).toBeTruthy();

    const main = screen.getByTestId('shell-zone-main');
    expect(within(main).getByTestId('page-access-blocked').getAttribute('data-block-code')).toBe(
      'MISSING_SITE',
    );
  });
});
