// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildPageManifestRegions } from '../../src/app/PageRenderer';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { RootShell } from '../../src/app/layouts/RootShell';
import {
  resolveTransverseMainLayoutMode,
  TransverseConsultationLayout,
  TransverseHubLayout,
  TransverseMainLayout,
} from '../../src/app/templates/transverse';
import '../../src/registry';
import type { PageManifest } from '../../src/types/page-manifest';
import '../../src/styles/tokens.css';

afterEach(() => {
  cleanup();
});

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

describe('Story 5.6 — templates transverses', () => {
  it('resolveTransverseMainLayoutMode : hub dashboard + listings + admin, consultation pour fiches', () => {
    expect(resolveTransverseMainLayoutMode('transverse-dashboard')).toBe('hub');
    expect(resolveTransverseMainLayoutMode('transverse-dashboard-benevole')).toBe('hub');
    expect(resolveTransverseMainLayoutMode('transverse-listing-articles')).toBe('hub');
    expect(resolveTransverseMainLayoutMode('transverse-admin-reports-hub')).toBe('hub');
    expect(resolveTransverseMainLayoutMode('transverse-admin-users')).toBe('hub');
    expect(resolveTransverseMainLayoutMode('transverse-admin-cash-registers')).toBe('hub');
    expect(resolveTransverseMainLayoutMode('transverse-admin-sites')).toBe('hub');
    expect(resolveTransverseMainLayoutMode('transverse-admin-sites-and-registers')).toBe('hub');
    expect(resolveTransverseMainLayoutMode('transverse-admin-health')).toBe('hub');
    expect(resolveTransverseMainLayoutMode('transverse-consultation-article')).toBe('consultation');
    expect(resolveTransverseMainLayoutMode('transverse-consultation-don')).toBe('consultation');
    expect(resolveTransverseMainLayoutMode('demo-home')).toBeNull();
  });

  it('TransverseHubLayout expose les data-testid de structure (en-tête + grille corps)', () => {
    render(
      <TransverseHubLayout family="dashboard">
        <div data-testid="w1">a</div>
        <div data-testid="w2">b</div>
        <div data-testid="w3">c</div>
        <div data-testid="w4">d</div>
      </TransverseHubLayout>,
    );
    const shell = screen.getByTestId('transverse-page-shell');
    expect(shell.getAttribute('data-transverse-layout')).toBe('hub');
    expect(shell.getAttribute('data-transverse-family')).toBe('dashboard');
    const stateSlot = screen.getByTestId('transverse-page-state-slot');
    expect(stateSlot.getAttribute('data-transverse-state')).toBe('nominal');
    expect(screen.getByTestId('transverse-page-header')).toBeTruthy();
    expect(within(screen.getByTestId('transverse-page-header')).getByTestId('w1')).toBeTruthy();
    const grid = screen.getByTestId('transverse-body-grid');
    expect(within(grid).getByTestId('w2')).toBeTruthy();
    expect(within(grid).getByTestId('w3')).toBeTruthy();
    expect(within(grid).getByTestId('w4')).toBeTruthy();
  });

  it('TransverseConsultationLayout : corps deux colonnes + data-testid transverse-two-column-body', () => {
    render(
      <TransverseConsultationLayout>
        <div data-testid="h">h</div>
        <div data-testid="c1">c1</div>
        <div data-testid="c2">c2</div>
        <div data-testid="f">f</div>
      </TransverseConsultationLayout>,
    );
    const consultationShell = screen.getByRole('region', { name: 'Mise en page transverse consultation' });
    expect(consultationShell.getAttribute('data-transverse-layout')).toBe('consultation');
    const two = screen.getByTestId('transverse-two-column-body');
    expect(within(two).getByTestId('transverse-consultation-col-primary')).toBeTruthy();
    expect(within(two).getByTestId('transverse-consultation-col-secondary')).toBeTruthy();
  });

  it('buildPageManifestRegions + enveloppe transverse : shell à l’intérieur de page-slot-unmapped', () => {
    const page: PageManifest = {
      version: '1',
      pageKey: 'transverse-dashboard',
      slots: [
        { slotId: 's1', widgetType: 'demo.text.block', widgetProps: { title: 'T1' } },
        { slotId: 's2', widgetType: 'demo.text.block', widgetProps: { title: 'T2' } },
      ],
    };
    const mode = resolveTransverseMainLayoutMode(page.pageKey);
    const regions = buildPageManifestRegions(page, {
      wrapUnmappedSlotContent: (children) => (
        <TransverseMainLayout mode={mode!} pageKey={page.pageKey}>
          {children}
        </TransverseMainLayout>
      ),
    });
    render(
      <RootProviders>
        <RootShell regions={{ main: regions.mainWidgets }} />
      </RootProviders>,
    );
    const unmapped = screen.getByTestId('page-slot-unmapped');
    expect(within(unmapped).getByTestId('transverse-page-shell')).toBeTruthy();
    expect(within(unmapped).getByTestId('transverse-page-header')).toBeTruthy();
  });

  it('listing et dashboard partagent TransverseHubLayout via TransverseMainLayout (hub)', () => {
    const { rerender } = render(
      <TransverseMainLayout mode="hub" pageKey="transverse-dashboard">
        <div>a</div>
        <div>b</div>
      </TransverseMainLayout>,
    );
    expect(screen.getByTestId('transverse-page-shell').getAttribute('data-transverse-family')).toBe('dashboard');
    rerender(
      <TransverseMainLayout mode="hub" pageKey="transverse-listing-dons">
        <div>a</div>
        <div>b</div>
      </TransverseMainLayout>,
    );
    expect(screen.getByTestId('transverse-page-shell').getAttribute('data-transverse-family')).toBe('listing');
  });
});
