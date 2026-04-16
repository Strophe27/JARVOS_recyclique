// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { ReceptionHistoryPanel } from '../../src/domains/reception/ReceptionHistoryPanel';
import { ReceptionNominalWizard } from '../../src/domains/reception/ReceptionNominalWizard';
import { setReceptionCriticalDataState } from '../../src/domains/reception/reception-critical-data-state';
import { setReceptionPosteUiState } from '../../src/domains/reception/reception-poste-ui-state';
import '../../src/registry';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

async function reachPoidsStepThroughVisibleSelection(): Promise<HTMLInputElement> {
  const rootGrid = await screen.findByTestId('reception-category-root-grid');
  const firstRoot = rootGrid.querySelector('button') as HTMLButtonElement | null;
  if (!firstRoot) throw new Error('Aucune famille visible.');
  fireEvent.click(firstRoot);

  const childGrid = screen.queryByTestId('reception-category-child-grid');
  if (childGrid) {
    const firstChild = childGrid.querySelector('button') as HTMLButtonElement | null;
    if (!firstChild) throw new Error('Aucune sous-categorie visible.');
    fireEvent.click(firstChild);
  }

  return (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;
}

describe('Story 7.5 — réception défensive (AR21, DATA_STALE, pas de faux succès)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setReceptionCriticalDataState('NOMINAL');
    setReceptionPosteUiState(false);
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

  it('DATA_STALE : bannière + fermeture ticket désactivée (widget critical)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-stale-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-s', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes(tid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-s',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-poste-id').getAttribute('title')).toBe('poste-s');
    });
    fireEvent.click(screen.getByTestId('reception-create-ticket'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid);
    });

    setReceptionCriticalDataState('DATA_STALE');
    await waitFor(() => {
      expect(screen.getByTestId('reception-nominal-stale-banner')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-nominal-wizard').getAttribute('data-widget-data-state')).toBe('DATA_STALE');
    expect(screen.getByTestId('reception-close-ticket').hasAttribute('disabled')).toBe(true);
  });

  it('affiche un cockpit 3 colonnes à l’étape ligne du poste opérateur', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-cockpit-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-c', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes(tid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-c',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-poste-id').getAttribute('title')).toBe('poste-c');
    });
    fireEvent.click(screen.getByTestId('reception-create-ticket'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid);
    });

    await waitFor(() => {
      expect(screen.getByTestId('reception-cockpit-layout')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-cockpit-left')).toBeTruthy();
    expect(screen.getByTestId('reception-cockpit-center')).toBeTruthy();
    expect(screen.getByTestId('reception-cockpit-right')).toBeTruthy();
    expect(screen.getByTestId('reception-category-grid')).toBeTruthy();
  });

  it('propose un keypad poids opérateur et active l’ajout quand un poids > 0 est saisi', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-keypad-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-k', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-k',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid);
    });

    await reachPoidsStepThroughVisibleSelection();
    expect(screen.getByTestId('reception-add-ligne').hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByTestId('reception-keypad-1'));
    fireEvent.click(screen.getByTestId('reception-keypad-dot'));
    fireEvent.click(screen.getByTestId('reception-keypad-5'));

    expect(screen.getByTestId('reception-poids-display').textContent ?? '').toContain('1.50 kg');
    expect(screen.getByTestId('reception-add-ligne').hasAttribute('disabled')).toBe(false);
  });

  it('revient au choix de famille après ajout réussi pour relancer le cycle article legacy', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-focus-after-add-test';
    let ligneCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-focus', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }]),
        } as Response);
      }
      if (url.includes('/v1/reception/lignes') && method === 'POST') {
        ligneCount += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: `ligne-${ligneCount}`,
              ticket_id: tid,
              category_id: 'cat-1',
              category_label: 'Articles',
              poids_kg: 1.5,
              destination: 'MAGASIN',
              is_exit: false,
              notes: null,
            }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-focus',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes:
                ligneCount === 0
                  ? []
                  : [
                      {
                        id: 'ligne-1',
                        ticket_id: tid,
                        category_id: 'cat-1',
                        category_label: 'Articles',
                        poids_kg: 1.5,
                        destination: 'MAGASIN',
                        is_exit: false,
                        notes: null,
                      },
                    ],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid));

    const poidsInput = await reachPoidsStepThroughVisibleSelection();
    fireEvent.change(poidsInput, { target: { value: '1.5' } });
    fireEvent.click(screen.getByTestId('reception-add-ligne'));

    await waitFor(() => expect(screen.getByTestId('reception-ticket-summary-count').textContent ?? '').toContain('1'));
    await waitFor(() =>
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-testid')).toBe('reception-category-tile-cat-1'),
    );
    expect(screen.getByTestId('reception-await-selection').textContent ?? '').toContain('Choisissez une famille.');
    expect(screen.queryByLabelText('Poids (kg)')).toBeNull();
  });

  it('reste synchronise apres ajout meme si le premier refresh ticket revient encore stale', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-stale-after-add-test';
    let ligneCount = 0;
    let ticketReadsAfterPost = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-stale-after-add', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }]),
        } as Response);
      }
      if (url.includes('/v1/reception/lignes') && method === 'POST') {
        ligneCount += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'ligne-sync-1',
              ticket_id: tid,
              category_id: 'cat-1',
              category_label: 'Articles',
              poids_kg: 1.5,
              destination: 'MAGASIN',
              is_exit: false,
              notes: null,
            }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        if (ligneCount > 0) ticketReadsAfterPost += 1;
        const lignes =
          ligneCount === 0
            ? []
            : ticketReadsAfterPost === 1
              ? []
              : [
                  {
                    id: 'ligne-sync-1',
                    ticket_id: tid,
                    category_id: 'cat-1',
                    category_label: 'Articles',
                    poids_kg: 1.5,
                    destination: 'MAGASIN',
                    is_exit: false,
                    notes: null,
                  },
                ];
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-stale-after-add',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes,
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid));

    const poidsInput = await reachPoidsStepThroughVisibleSelection();
    fireEvent.change(poidsInput, { target: { value: '1.5' } });
    fireEvent.click(screen.getByTestId('reception-add-ligne'));

    await waitFor(() => expect(screen.getByTestId('reception-ticket-summary-count').textContent ?? '').toContain('1'));
    expect(screen.getByTestId('reception-ticket-summary-total').textContent ?? '').toContain('1.50');
    await waitFor(() =>
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-testid')).toBe('reception-category-tile-cat-1'),
    );
    expect(screen.getByTestId('reception-await-selection').textContent ?? '').toContain('Choisissez une famille.');
    expect(screen.queryByLabelText('Poids (kg)')).toBeNull();
  });

  it('déclenche Ajouter la ligne via Entrée quand le poids est valide', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-enter-submit-test';
    let ligneCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-enter', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }]),
        } as Response);
      }
      if (url.includes('/v1/reception/lignes') && method === 'POST') {
        ligneCount += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: `ligne-enter-${ligneCount}`,
              ticket_id: tid,
              category_id: 'cat-1',
              category_label: 'Articles',
              poids_kg: 1.5,
              destination: 'MAGASIN',
              is_exit: false,
              notes: null,
            }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-enter',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes:
                ligneCount === 0
                  ? []
                  : [
                      {
                        id: 'ligne-enter-1',
                        ticket_id: tid,
                        category_id: 'cat-1',
                        category_label: 'Articles',
                        poids_kg: 1.5,
                        destination: 'MAGASIN',
                        is_exit: false,
                        notes: null,
                      },
                    ],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid));
    const poidsInput = await reachPoidsStepThroughVisibleSelection();
    fireEvent.focus(poidsInput);
    fireEvent.change(poidsInput, { target: { value: '1.5' } });
    await waitFor(() => expect(screen.getByTestId('reception-poids-display').textContent ?? '').toContain('1.50 kg'));
    await waitFor(() => expect(screen.getByTestId('reception-add-ligne').hasAttribute('disabled')).toBe(false));
    fireEvent.keyDown(poidsInput, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, charCode: 13 });

    await waitFor(() => expect(ligneCount).toBe(1));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-summary-count').textContent ?? '').toContain('1'));
  });

  it('transpose la saisie poids AZERTY legacy dans le champ poids', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-poids-azerty-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-poids-azerty', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-poids-azerty',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid));

    const poidsInput = await reachPoidsStepThroughVisibleSelection();
    fireEvent.focus(poidsInput);
    fireEvent.keyDown(poidsInput, { key: '&', code: 'Digit1', bubbles: true, cancelable: true });
    fireEvent.keyDown(poidsInput, { key: 'é', code: 'Digit2', bubbles: true, cancelable: true });
    fireEvent.keyDown(poidsInput, { key: ',', code: 'Comma', bubbles: true, cancelable: true });
    fireEvent.keyDown(poidsInput, { key: '"', code: 'Digit3', bubbles: true, cancelable: true });

    await waitFor(() => expect(screen.getByTestId('reception-poids-display').textContent ?? '').toContain('12.30 kg'));
    expect(poidsInput.value).toBe('12.3');

    fireEvent.keyDown(poidsInput, { key: 'Backspace', code: 'Backspace', bubbles: true, cancelable: true });
    await waitFor(() => expect(screen.getByTestId('reception-poids-display').textContent ?? '').toContain('12.00 kg'));
    expect(poidsInput.value).toBe('12.');
  });

  it('redonne le focus au poids après changement de sous-catégorie pour enchaîner poids puis Entrée', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-subcategory-focus-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-subcat-focus', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'child-bike', name: 'Cycles', parent_id: 'root-sport' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-subcat-focus',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    fireEvent.click(await screen.findByTestId('reception-category-tile-root-sport'));
    await waitFor(() => expect(screen.getByTestId('reception-subcategory-tile-child-bike')).toBeTruthy());

    fireEvent.click(screen.getByTestId('reception-subcategory-tile-child-ball'));
    const poidsInput = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;

    await waitFor(() => expect(document.activeElement).toBe(poidsInput));
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : Ballons');
  });

  it('permet de naviguer au clavier entre sous-catégories puis de valider sur Entrée', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-subcategory-keyboard-nav-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-subcat-keyboard', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'child-bike', name: 'Cycles', parent_id: 'root-sport' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
              { id: 'child-racket', name: 'Raquettes', parent_id: 'root-sport' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-subcat-keyboard',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    fireEvent.click(await screen.findByTestId('reception-category-tile-root-sport'));
    await waitFor(() => expect(screen.getByTestId('reception-subcategory-tile-child-bike')).toBeTruthy());

    const childBike = screen.getByTestId('reception-subcategory-tile-child-bike');
    const childBall = screen.getByTestId('reception-subcategory-tile-child-ball');

    childBike.focus();
    fireEvent.keyDown(childBike, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(document.activeElement).toBe(childBall);

    fireEvent.keyDown(childBall, { key: 'Enter', code: 'Enter' });
    const poidsInput = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;
    await waitFor(() => expect(document.activeElement).toBe(poidsInput));
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : Ballons');
  });

  it('permet de naviguer au clavier entre familles racines puis d’enchaîner sous-catégorie et poids', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-root-keyboard-nav-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-root-keyboard', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'child-bike', name: 'Cycles', parent_id: 'root-sport' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
              { id: 'child-bd', name: 'BD', parent_id: 'root-books' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-root-keyboard',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-category-tile-root-sport')).toBeTruthy());

    const rootSport = screen.getByTestId('reception-category-tile-root-sport');
    const rootBooks = screen.getByTestId('reception-category-tile-root-books');

    rootSport.focus();
    fireEvent.keyDown(rootSport, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(document.activeElement).toBe(rootBooks);

    fireEvent.keyDown(rootBooks, { key: 'Enter', code: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Famille active : Livres'),
    );
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : Aucune');
    const childBd = await screen.findByTestId('reception-subcategory-tile-child-bd');
    await waitFor(() => expect(document.activeElement).toBe(childBd));

    fireEvent.keyDown(childBd, { key: 'Enter', code: 'Enter' });
    const poidsInput = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;
    await waitFor(() => expect(document.activeElement).toBe(poidsInput));
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : BD');
  });

  it('verrouille la chaine clavier legacy famille sous-categorie poids Entree sans souris', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-keyboard-legacy-chain-test';
    let ligneCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-keyboard-legacy-chain', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'child-bd', name: 'BD', parent_id: 'root-books' },
              { id: 'child-roman', name: 'Romans', parent_id: 'root-books' },
            ]),
        } as Response);
      }
      if (url.includes('/v1/reception/lignes') && method === 'POST') {
        ligneCount += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: `ligne-keyboard-chain-${ligneCount}`,
              ticket_id: tid,
              category_id: 'child-roman',
              category_label: 'Romans',
              poids_kg: 1,
              destination: 'MAGASIN',
              is_exit: false,
              notes: null,
            }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-keyboard-legacy-chain',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes:
                ligneCount === 0
                  ? []
                  : [
                      {
                        id: 'ligne-keyboard-chain-1',
                        ticket_id: tid,
                        category_id: 'child-roman',
                        category_label: 'Romans',
                        poids_kg: 1,
                        destination: 'MAGASIN',
                        is_exit: false,
                        notes: null,
                      },
                    ],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    const rootBooks = await screen.findByTestId('reception-category-tile-root-books');
    await waitFor(() => expect(document.activeElement).toBe(rootBooks));

    fireEvent.keyDown(rootBooks, { key: 'Enter', code: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Famille active : Livres'),
    );

    const childBd = await screen.findByTestId('reception-subcategory-tile-child-bd');
    await waitFor(() => expect(document.activeElement).toBe(childBd));

    fireEvent.keyDown(document.body, { key: 'z', code: 'KeyZ', bubbles: true, cancelable: true });
    const poidsInput = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;
    await waitFor(() => expect(document.activeElement).toBe(poidsInput));
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : Romans');

    fireEvent.keyDown(poidsInput, { key: '&', code: 'Digit1', bubbles: true, cancelable: true });
    await waitFor(() => expect(screen.getByTestId('reception-poids-display').textContent ?? '').toContain('1.00 kg'));

    fireEvent.keyDown(poidsInput, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, charCode: 13 });

    await waitFor(() => expect(ligneCount).toBe(1));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-summary-count').textContent ?? '').toContain('1'));
    expect(screen.getByTestId('reception-ticket-summary-total').textContent ?? '').toContain('1.00');
    await waitFor(() =>
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-testid')).toBe(
        rootBooks.getAttribute('data-testid'),
      ),
    );
    expect(screen.getByTestId('reception-await-selection').textContent ?? '').toContain('Choisissez une famille.');
  });

  it(
    "permet de revenir au choix de l'article suivant au clavier apres Entrée sans re-souris",
    { timeout: 15_000 },
    async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-keyboard-next-article-test';
    let ligneCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-keyboard-next-article', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'child-bd', name: 'BD', parent_id: 'root-books' },
              { id: 'child-roman', name: 'Romans', parent_id: 'root-books' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
            ]),
        } as Response);
      }
      if (url.includes('/v1/reception/lignes') && method === 'POST') {
        ligneCount += 1;
        const categoryId = ligneCount === 1 ? 'child-bd' : 'child-ball';
        const categoryLabel = ligneCount === 1 ? 'BD' : 'Ballons';
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: `ligne-keyboard-next-${ligneCount}`,
              ticket_id: tid,
              category_id: categoryId,
              category_label: categoryLabel,
              poids_kg: 1,
              destination: 'MAGASIN',
              is_exit: false,
              notes: null,
            }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        const lignes =
          ligneCount === 0
            ? []
            : [
                {
                  id: 'ligne-keyboard-next-1',
                  ticket_id: tid,
                  category_id: 'child-bd',
                  category_label: 'BD',
                  poids_kg: 1,
                  destination: 'MAGASIN',
                  is_exit: false,
                  notes: null,
                },
                ...(ligneCount > 1
                  ? [
                      {
                        id: 'ligne-keyboard-next-2',
                        ticket_id: tid,
                        category_id: 'child-ball',
                        category_label: 'Ballons',
                        poids_kg: 1,
                        destination: 'MAGASIN',
                        is_exit: false,
                        notes: null,
                      },
                    ]
                  : []),
              ];
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-keyboard-next-article',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes,
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    const rootBooks = await screen.findByTestId('reception-category-tile-root-books');
    await waitFor(() => expect(document.activeElement).toBe(rootBooks));

    fireEvent.keyDown(rootBooks, { key: 'Enter', code: 'Enter' });
    const childBd = await screen.findByTestId('reception-subcategory-tile-child-bd');
    await waitFor(() => expect(document.activeElement).toBe(childBd));

    fireEvent.keyDown(childBd, { key: 'Enter', code: 'Enter' });
    const poidsInput = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;
    await waitFor(() => expect(document.activeElement).toBe(poidsInput));

    fireEvent.keyDown(poidsInput, { key: '&', code: 'Digit1', bubbles: true, cancelable: true });
    fireEvent.keyDown(poidsInput, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, charCode: 13 });

    await waitFor(() => expect(ligneCount).toBe(1));
    await waitFor(() =>
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-testid')).toBe(
        rootBooks.getAttribute('data-testid'),
      ),
    );
    expect(screen.getByTestId('reception-await-selection').textContent ?? '').toContain('Choisissez une famille.');

    fireEvent.keyDown(document.body, { key: 'z', code: 'KeyZ', bubbles: true, cancelable: true });
    await waitFor(() =>
      expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Famille active : Sport'),
    );
    const childBall = await screen.findByTestId('reception-subcategory-tile-child-ball');
    await waitFor(() => expect(document.activeElement).toBe(childBall));

    fireEvent.keyDown(document.body, { key: 'a', code: 'KeyA', bubbles: true, cancelable: true });
    await waitFor(() =>
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-testid')).toBe('reception-input-poids-kg'),
    );
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : Ballons');

    const poidsInputNext = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;
    fireEvent.keyDown(poidsInputNext, { key: '&', code: 'Digit1', bubbles: true, cancelable: true });
    fireEvent.keyDown(poidsInputNext, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, charCode: 13 });

    await waitFor(() => expect(ligneCount).toBe(2));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-summary-count').textContent ?? '').toContain('2'));
    await waitFor(() =>
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-testid')).toBe(
        rootBooks.getAttribute('data-testid'),
      ),
    );
    expect(screen.getByTestId('reception-await-selection').textContent ?? '').toContain('Choisissez une famille.');
  });

  it('transpose les raccourcis AZERTY legacy du rail actif famille puis sous-catégorie', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-root-shortcuts-legacy-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-root-shortcuts', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'child-bd', name: 'BD', parent_id: 'root-books' },
              { id: 'child-roman', name: 'Romans', parent_id: 'root-books' },
              { id: 'child-bike', name: 'Cycles', parent_id: 'root-sport' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-root-shortcuts',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    const rootSport = await screen.findByTestId('reception-category-tile-root-sport');

    await waitFor(() => expect(document.activeElement).toBe(rootSport));
    expect(rootSport.textContent ?? '').toContain('A');
    expect(screen.getByTestId('reception-category-tile-root-books').textContent ?? '').toContain('Z');

    fireEvent.keyDown(document.body, { key: 'z', code: 'KeyZ', bubbles: true, cancelable: true });
    await waitFor(() =>
      expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Famille active : Livres'),
    );

    const childBd = await screen.findByTestId('reception-subcategory-tile-child-bd');
    const childRoman = await screen.findByTestId('reception-subcategory-tile-child-roman');
    await waitFor(() => expect(document.activeElement).toBe(childBd));
    expect(childBd.textContent ?? '').toContain('A');
    expect(childRoman.textContent ?? '').toContain('Z');

    fireEvent.keyDown(document.body, { key: 'z', code: 'KeyZ', bubbles: true, cancelable: true });
    const poidsInput = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;
    await waitFor(() => expect(document.activeElement).toBe(poidsInput));
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : Romans');
  });

  it('neutralise les raccourcis catégories quand le poids a le focus, comme dans le legacy', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-shortcut-from-weight-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-shortcut-weight', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'child-bd', name: 'BD', parent_id: 'root-books' },
              { id: 'child-roman', name: 'Romans', parent_id: 'root-books' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-shortcut-weight',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    fireEvent.click(await screen.findByTestId('reception-category-tile-root-books'));
    fireEvent.click(await screen.findByTestId('reception-subcategory-tile-child-bd'));
    const poidsInput = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;

    fireEvent.focus(poidsInput);
    fireEvent.keyDown(poidsInput, { key: 'z', code: 'KeyZ', bubbles: true, cancelable: true });

    await waitFor(() => expect(document.activeElement).toBe(poidsInput));
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : BD');
    expect(poidsInput.value).toBe('0');
  });

  it('transpose le micro-rail poids legacy : = bascule sortie et ArrowDown fait tourner la destination', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-weight-microrail-legacy-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-weight-microrail', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-weight-microrail',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid));

    const poidsInput = await reachPoidsStepThroughVisibleSelection();
    const destinationInput = screen.getByRole('textbox', { name: 'Destination' }) as HTMLInputElement;

    expect(destinationInput.value).toBe('Magasin');

    fireEvent.keyDown(poidsInput, { key: '=', code: 'Equal', bubbles: true, cancelable: true });
    await waitFor(() => expect(destinationInput.value).toBe('Recyclage'));

    fireEvent.keyDown(poidsInput, { key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true });
    await waitFor(() => expect(destinationInput.value).toBe('Déchetterie'));

    fireEvent.keyDown(poidsInput, { key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true });
    await waitFor(() => expect(destinationInput.value).toBe('Recyclage'));

    fireEvent.keyDown(poidsInput, { key: '=', code: 'Equal', bubbles: true, cancelable: true });
    await waitFor(() => expect(destinationInput.value).toBe('Magasin'));
  });

  it('fait boucler Tab entre rail catégories et poids comme dans le legacy', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-tab-loop-legacy-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-tab-loop', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'child-bd', name: 'BD', parent_id: 'root-books' },
              { id: 'child-roman', name: 'Romans', parent_id: 'root-books' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-tab-loop',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    const rootBooks = await screen.findByTestId('reception-category-tile-root-books');
    await waitFor(() => expect(document.activeElement).toBe(rootBooks));

    fireEvent.keyDown(rootBooks, { key: 'Enter', code: 'Enter' });
    const childBd = await screen.findByTestId('reception-subcategory-tile-child-bd');
    await waitFor(() => expect(document.activeElement).toBe(childBd));

    fireEvent.keyDown(childBd, { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true });
    const poidsInput = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;
    await waitFor(() => expect(document.activeElement).toBe(poidsInput));

    fireEvent.keyDown(poidsInput, { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true });
    const childBdAgain = await screen.findByTestId('reception-subcategory-tile-child-bd');
    await waitFor(() =>
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-testid')).toBe(
        childBdAgain.getAttribute('data-testid'),
      ),
    );
  });

  it('donne un accès clavier initial crédible au rail familles quand le cockpit hiérarchique devient prêt', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-root-initial-focus-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-root-initial-focus', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'child-bike', name: 'Cycles', parent_id: 'root-sport' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-root-initial-focus',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    const rootSport = await screen.findByTestId('reception-category-tile-root-sport');
    await waitFor(() => expect(document.activeElement).toBe(rootSport));
  });

  it('différencie visuellement le focus clavier d’une famille racine sans perdre l’état sélectionné', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-root-focus-visual-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-root-focus-visual', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'child-bike', name: 'Cycles', parent_id: 'root-sport' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
              { id: 'child-bd', name: 'BD', parent_id: 'root-books' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-root-focus-visual',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    const rootSport = await screen.findByTestId('reception-category-tile-root-sport');
    const rootBooks = await screen.findByTestId('reception-category-tile-root-books');

    await waitFor(() => expect(rootSport.getAttribute('data-focused')).toBe('true'));
    expect(rootSport.getAttribute('data-selected')).toBe('false');

    rootBooks.focus();
    await waitFor(() => expect(rootBooks.getAttribute('data-focused')).toBe('true'));
    expect(rootBooks.getAttribute('data-selected')).toBe('false');
    expect(rootSport.getAttribute('data-selected')).toBe('false');
  });

  it('différencie visuellement le focus clavier d’une sous-catégorie sans perdre l’état sélectionné', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-child-focus-visual-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-child-focus-visual', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'child-bike', name: 'Cycles', parent_id: 'root-sport' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-child-focus-visual',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    fireEvent.click(await screen.findByTestId('reception-category-tile-root-sport'));
    const childBike = await screen.findByTestId('reception-subcategory-tile-child-bike');
    const childBall = await screen.findByTestId('reception-subcategory-tile-child-ball');

    await waitFor(() => expect(childBike.getAttribute('data-focused')).toBe('false'));
    childBike.focus();
    await waitFor(() => expect(childBike.getAttribute('data-focused')).toBe('true'));
    expect(childBike.getAttribute('data-selected')).toBe('false');

    childBall.focus();
    await waitFor(() => expect(childBall.getAttribute('data-focused')).toBe('true'));
    expect(childBall.getAttribute('data-selected')).toBe('false');
    expect(childBike.getAttribute('data-selected')).toBe('false');
  });

  it('rend le point d’atterrissage visuel du poids explicite après validation d’une sous-catégorie', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-poids-visual-focus-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-poids-visual-focus', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'child-bike', name: 'Cycles', parent_id: 'root-sport' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-poids-visual-focus',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    fireEvent.click(await screen.findByTestId('reception-category-tile-root-sport'));
    const childBike = await screen.findByTestId('reception-subcategory-tile-child-bike');

    childBike.focus();
    fireEvent.keyDown(childBike, { key: 'ArrowRight', code: 'ArrowRight' });
    fireEvent.keyDown(screen.getByTestId('reception-subcategory-tile-child-ball'), { key: 'Enter', code: 'Enter' });

    const poidsInput = (await screen.findByLabelText('Poids (kg)')) as HTMLInputElement;
    const poidsWrapper = screen.getByTestId('reception-poids-focus-ring');
    const poidsEntryZone = screen.getByTestId('reception-poids-entry-zone');
    await waitFor(() => expect(document.activeElement).toBe(poidsInput));
    await waitFor(() => expect(poidsWrapper.getAttribute('data-focused')).toBe('true'));
    await waitFor(() => expect(poidsEntryZone.getAttribute('data-focused')).toBe('true'));
  });

  it('garde la zone poids visuellement active quand le focus passe du champ au keypad', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-poids-keypad-zone-focus-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-poids-keypad-zone-focus', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-poids-keypad-zone-focus',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid));
    const poidsInput = await reachPoidsStepThroughVisibleSelection();
    const keypadOne = await screen.findByTestId('reception-keypad-1');
    const poidsEntryZone = screen.getByTestId('reception-poids-entry-zone');

    poidsInput.focus();
    await waitFor(() => expect(poidsEntryZone.getAttribute('data-focused')).toBe('true'));

    keypadOne.focus();
    await waitFor(() => expect(document.activeElement).toBe(keypadOne));
    expect(poidsEntryZone.getAttribute('data-focused')).toBe('true');
  });

  it('ignore Entrée quand le poids est invalide', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-enter-invalid-test';
    let lignePostCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-enter-invalid', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }]),
        } as Response);
      }
      if (url.includes('/v1/reception/lignes') && method === 'POST') {
        lignePostCount += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'should-not-happen' }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-enter-invalid',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(tid));

    const poidsInput = await reachPoidsStepThroughVisibleSelection();
    fireEvent.keyDown(poidsInput, { key: 'Enter', code: 'Enter' });

    expect(lignePostCount).toBe(0);
    expect(screen.getByTestId('reception-ticket-summary-count').textContent ?? '').toContain('0');
  });

  it('propose des tuiles catégories cliquables dans la colonne gauche', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-category-grid-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-g', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 'cat-1', name: 'Articles' }, { id: 'cat-2', name: 'Livres' }]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-g',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-category-grid')).toBeTruthy());

    fireEvent.click(screen.getByTestId('reception-category-tile-cat-2'));
    await waitFor(() =>
      expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Famille active : Livres'),
    );
    await waitFor(() => expect(screen.getByLabelText('Poids (kg)')).toBeTruthy());
  });

  it('rend visible la hiérarchie racine vers sous-catégorie quand parent_id est présent', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-category-tree-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-tree', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'child-bd', name: 'BD', parent_id: 'root-books' },
              { id: 'child-roman', name: 'Romans', parent_id: 'root-books' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-tree',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-category-root-grid')).toBeTruthy());

    expect(screen.queryByTestId('reception-category-child-panel')).toBeNull();

    fireEvent.click(screen.getByTestId('reception-category-tile-root-sport'));
    expect(screen.getByTestId('reception-category-child-panel').textContent ?? '').toContain('Sous-categories Sport');
    expect(screen.getByTestId('reception-subcategory-tile-child-ball').getAttribute('data-selected')).toBe('false');
  });

  it('affiche explicitement la famille et la sous-catégorie actives', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-category-active-summary-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-active', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-books', name: 'Livres', parent_id: null },
              { id: 'root-sport', name: 'Sport', parent_id: null },
              { id: 'child-bd', name: 'BD', parent_id: 'root-books' },
              { id: 'child-ball', name: 'Ballons', parent_id: 'root-sport' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-active',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    fireEvent.click(await screen.findByTestId('reception-category-tile-root-books'));
    await waitFor(() => expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Famille active : Livres'));
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : Aucune');

    fireEvent.click(screen.getByTestId('reception-subcategory-tile-child-bd'));
    await waitFor(() =>
      expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : BD'),
    );
    fireEvent.click(screen.getByTestId('reception-category-tile-root-sport'));
    fireEvent.click(screen.getByTestId('reception-subcategory-tile-child-ball'));
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Famille active : Sport');
    expect(screen.getByTestId('reception-category-active-summary').textContent ?? '').toContain('Sous-catégorie active : Ballons');
  });

  it('priorise les familles racines avec sous-catégories avant les racines isolées', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-category-priority-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-prio', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: 'root-leaf', name: 'Auto', parent_id: null },
              { id: 'root-family', name: 'Livres', parent_id: null },
              { id: 'child-bd', name: 'BD', parent_id: 'root-family' },
            ]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-prio',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => expect(screen.getByTestId('reception-category-root-grid')).toBeTruthy());

    const rootButtons = Array.from(screen.getByTestId('reception-category-root-grid').querySelectorAll('button')).map(
      (button) => button.textContent ?? '',
    );
    expect(rootButtons[0]?.startsWith('Livres')).toBe(true);
    expect(rootButtons[1]?.startsWith('Auto')).toBe(true);
  });

  it('erreur open poste : pas de libellé de succès ; correlation_id discret', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: async () =>
            JSON.stringify({
              detail: 'Refus test',
              code: 'TEST_CODE',
              retryable: false,
              correlation_id: 'corr-rx-7-5',
            }),
        } as Response),
      ),
    );

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-api-error')).toBeTruthy();
    });
    const root = screen.getByTestId('reception-nominal-wizard');
    expect(root.textContent ?? '').not.toMatch(/enregistré avec succès|terminé avec succès/i);
    expect(screen.getByTestId('reception-api-error-correlation-id').textContent ?? '').toMatch(/corr-rx-7-5/);
  });

  it('export CSV : 200 sans download_url → erreur explicite, pas d’ouverture de fenêtre', async () => {
    const tid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/tickets') && method === 'GET' && !url.includes(tid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              tickets: [
                {
                  id: tid,
                  poste_id: 'p1',
                  benevole_username: 'vol',
                  created_at: '2026-01-01T10:00:00Z',
                  closed_at: null,
                  status: 'closed',
                  total_lignes: 1,
                  total_poids: 2,
                  poids_entree: 2,
                  poids_direct: 0,
                  poids_sortie: 0,
                },
              ],
              total: 1,
              page: 1,
              per_page: 20,
              total_pages: 1,
            }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'p1',
              benevole_username: 'vol',
              created_at: '2026-01-01T10:00:00Z',
              closed_at: null,
              status: 'closed',
              lignes: [],
            }),
        } as Response);
      }
      if (url.includes('/download-token') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ download_url: '', filename: 'x.csv', expires_in_seconds: 60 }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    setReceptionPosteUiState(true);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionHistoryPanel widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId(`reception-history-row-${tid}`)).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId(`reception-history-row-${tid}`));
    await waitFor(() => {
      expect(screen.getByTestId('reception-history-detail')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('reception-history-export'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-history-api-error')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-history-api-error-primary').textContent ?? '').toMatch(/URL/i);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('retryable true : invite à réessayer (lecture liste)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          text: async () => JSON.stringify({ detail: 'Indispo', retryable: true }),
        } as Response),
      ),
    );
    setReceptionPosteUiState(true);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionHistoryPanel widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('reception-history-api-error')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-history-api-error').textContent ?? '').toMatch(/Nouvel essai possible/i);
  });
});
