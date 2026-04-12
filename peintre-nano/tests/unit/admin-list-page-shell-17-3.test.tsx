// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminListPageShell } from '../../src/domains/admin-config/AdminListPageShell';
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

describe('AdminListPageShell (story 17.3)', () => {
  it('expose les testids de coquille liste admin et bandeau detail demo', () => {
    render(
      <RootProviders>
        <AdminListPageShell
          widgetRootTestId="widget-test-root"
          listTitle="Titre test"
          contractGapAlertTitle="Alerte"
          contractGapAlertBody={<>Corps</>}
          listBullets={['A', 'B']}
        />
      </RootProviders>,
    );
    expect(screen.getByTestId('admin-list-page-shell')).toBeTruthy();
    expect(screen.getByTestId('widget-test-root')).toBeTruthy();
    expect(screen.getByTestId('admin-detail-simple-demo-strip')).toBeTruthy();
  });

  it('masque le bandeau detail demo lorsque showDetailSimpleDemoStrip est false', () => {
    render(
      <RootProviders>
        <AdminListPageShell
          widgetRootTestId="widget-test-root"
          listTitle="Titre"
          contractGapAlertTitle="A"
          contractGapAlertBody="B"
          listBullets={['x']}
          showDetailSimpleDemoStrip={false}
        />
      </RootProviders>,
    );
    expect(screen.queryByTestId('admin-detail-simple-demo-strip')).toBeNull();
  });
});
