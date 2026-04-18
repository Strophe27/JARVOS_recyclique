// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ManifestErrorBanner } from '../../src/app/ManifestErrorBanner';
import { RootProviders } from '../../src/app/providers/RootProviders';
import navigationDemoHomeOnlyFixture from '../../src/fixtures/manifests/valid/navigation-demo-home-only.json';
import validPageHomeFixture from '../../src/fixtures/manifests/valid/page-home.json';
import { fetchManifestBundle, loadManifestBundle } from '../../src/runtime/load-manifest-bundle';
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

const validNav = JSON.stringify(navigationDemoHomeOnlyFixture);
const validPage = JSON.stringify(validPageHomeFixture);

describe('loadManifestBundle', () => {
  it('accepte un jeu valide (nav + page, snake_case)', () => {
    const r = loadManifestBundle({
      navigationJson: validNav,
      pageManifestsJson: [validPage],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bundle.navigation.entries[0]?.pageKey).toBe('demo-home');
      expect(r.bundle.pages[0]?.pageKey).toBe('demo-home');
    }
  });

  it('parse widget_props (snake_case) vers widgetProps sur les slots', () => {
    const pageJson = JSON.stringify({
      version: '1',
      page_key: 'demo-home',
      slots: [
        {
          slot_id: 'main',
          widget_type: 'demo.kpi',
          widget_props: { label: 'X', value: 7 },
        },
      ],
    });
    const r = loadManifestBundle({
      navigationJson: validNav,
      pageManifestsJson: [pageJson],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const slot = r.bundle.pages[0]?.slots[0];
      expect(slot?.widgetProps?.label).toBe('X');
      expect(slot?.widgetProps?.value).toBe(7);
    }
  });

  it('rejette une collision route_key', () => {
    const nav = {
      version: '1',
      entries: [
        { id: 'a', route_key: 'same', page_key: 'demo-home' },
        { id: 'b', route_key: 'same', page_key: 'demo-home' },
      ],
    };
    const r = loadManifestBundle({
      navigationJson: JSON.stringify(nav),
      pageManifestsJson: [validPage],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === 'ROUTE_KEY_COLLISION')).toBe(true);
    }
  });

  it('rejette une collision page_key entre deux PageManifest', () => {
    const r = loadManifestBundle({
      navigationJson: validNav,
      pageManifestsJson: [validPage, validPage],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === 'PAGE_KEY_COLLISION')).toBe(true);
    }
  });

  it('rejette un lien nav vers page_key manquant', () => {
    const nav = {
      version: '1',
      entries: [{ id: 'x', route_key: 'x', page_key: 'missing-page' }],
    };
    const r = loadManifestBundle({
      navigationJson: JSON.stringify(nav),
      pageManifestsJson: [validPage],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === 'NAV_PAGE_LINK_UNRESOLVED')).toBe(true);
    }
  });

  it('rejette un widgetType inconnu', () => {
    const badPage = {
      version: '1',
      page_key: 'demo-home',
      slots: [{ slot_id: 'main', widget_type: 'totally.unknown.widget' }],
    };
    const r = loadManifestBundle({
      navigationJson: validNav,
      pageManifestsJson: [JSON.stringify(badPage)],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === 'UNKNOWN_WIDGET_TYPE')).toBe(true);
    }
  });

  it('rejette un JSON mal formé', () => {
    const r = loadManifestBundle({
      navigationJson: '{not json',
      pageManifestsJson: [validPage],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === 'MANIFEST_PARSE_ERROR')).toBe(true);
    }
  });

  it('rejette une collision path si path présent deux fois', () => {
    const nav = {
      version: '1',
      entries: [
        { id: 'a', route_key: 'a', path: '/dup', page_key: 'demo-home' },
        { id: 'b', route_key: 'b', path: '/dup', page_key: 'demo-home' },
      ],
    };
    const r = loadManifestBundle({
      navigationJson: JSON.stringify(nav),
      pageManifestsJson: [validPage],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === 'PATH_COLLISION')).toBe(true);
    }
  });

  it('rejette une collision shortcut_id', () => {
    const nav = {
      version: '1',
      entries: [
        { id: 'a', route_key: 'a', page_key: 'demo-home', shortcut_id: 's1' },
        { id: 'b', route_key: 'b', page_key: 'demo-home', shortcut_id: 's1' },
      ],
    };
    const r = loadManifestBundle({
      navigationJson: JSON.stringify(nav),
      pageManifestsJson: [validPage],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === 'SHORTCUT_COLLISION')).toBe(true);
    }
  });
});

describe('fetchManifestBundle', () => {
  it('charge via fetch mocké et valide', async () => {
    const navUrl = 'https://fixture.test/nav.json';
    const pageUrl = 'https://fixture.test/page.json';
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u === navUrl) {
        return { ok: true, text: async () => validNav };
      }
      if (u === pageUrl) {
        return { ok: true, text: async () => validPage };
      }
      return { ok: false, status: 404, text: async () => '' };
    });
    vi.stubGlobal('fetch', fetchMock);

    const r = await fetchManifestBundle({
      navigationUrl: navUrl,
      pageManifestUrls: [pageUrl],
    });
    expect(r.ok).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('ManifestErrorBanner', () => {
  it('expose les erreurs de façon testable (data-testid)', () => {
    render(
      <RootProviders>
        <ManifestErrorBanner
          issues={[{ code: 'UNKNOWN_WIDGET_TYPE', message: 'widget inconnu', detail: { widgetType: 'x' } }]}
        />
      </RootProviders>,
    );
    expect(screen.getByTestId('manifest-load-error')).toBeTruthy();
    expect(screen.getByText(/UNKNOWN_WIDGET_TYPE/)).toBeTruthy();
  });
});
