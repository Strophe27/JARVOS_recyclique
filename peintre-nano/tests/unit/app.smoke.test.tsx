// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
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

describe('App (smoke UI)', () => {
  it('affiche le titre principal du socle (locateur sémantique)', () => {
    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: /Socle Peintre_nano/i }),
    ).toBeTruthy();
  });

  it('affiche une liste ordonnée et les intitulés des quatre artefacts minimaux', () => {
    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );
    // StrictMode double-render : plusieurs instances dans le document — cibler la première cohérente avec le shell.
    const main = screen.getAllByTestId('peintre-nano-shell')[0];
    const list = within(main).getByRole('list');
    expect(list.querySelectorAll('li').length).toBe(4);
    expect(within(main).getByText('ContextEnvelope')).toBeTruthy();
    expect(within(main).getByText('NavigationManifest')).toBeTruthy();
    expect(within(main).getByText('PageManifest')).toBeTruthy();
    expect(within(main).getByText('UserRuntimePrefs')).toBeTruthy();
  });
});
