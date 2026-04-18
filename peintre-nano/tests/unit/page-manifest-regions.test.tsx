// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildPageManifestRegions } from '../../src/app/PageRenderer';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { RootShell } from '../../src/app/layouts/RootShell';
import '../../src/registry';
import type { PageManifest } from '../../src/types/page-manifest';
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

describe('buildPageManifestRegions', () => {
  it('place un slot non mappé dans main avec data-testid page-slot-unmapped', () => {
    const page: PageManifest = {
      version: '1',
      pageKey: 't',
      slots: [{ slotId: 'custom-unknown-slot', widgetType: 'demo.kpi', widgetProps: { label: 'L', value: 1 } }],
    };
    const regions = buildPageManifestRegions(page);
    render(
      <RootProviders>
        <RootShell regions={{ main: regions.mainWidgets }} />
      </RootProviders>,
    );
    expect(screen.getByTestId('page-slot-unmapped')).toBeTruthy();
    expect(within(screen.getByTestId('page-slot-unmapped')).getByTestId('widget-demo-kpi')).toBeTruthy();
  });

  it('affiche widget-resolve-error si le type n’est pas enregistré (rendu déclaratif défensif)', () => {
    const page: PageManifest = {
      version: '1',
      pageKey: 't',
      slots: [{ slotId: 'main', widgetType: 'not.registered.type' }],
    };
    const regions = buildPageManifestRegions(page);
    render(
      <RootProviders>
        <RootShell regions={{ main: regions.mainWidgets }} />
      </RootProviders>,
    );
    const err = screen.getByTestId('widget-resolve-error');
    expect(err).toBeTruthy();
    expect(err.getAttribute('data-widget-type')).toBe('not.registered.type');
  });
});
