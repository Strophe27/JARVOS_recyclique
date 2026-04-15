// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { KioskFinalizeSaleDock } from '../../src/domains/cashflow/KioskFinalizeSaleDock';
import {
  addTicketLine,
  resetCashflowDraft,
  setCashSessionIdInput,
  setPaymentMethod,
  setAfterSuccessfulSale,
  setTotalAmount,
} from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION = '00000000-0000-4000-8000-000000000099';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

describe('KioskFinalizeSaleDock — raccourci Entrée', () => {
  beforeEach(() => {
    resetCashflowDraft();
    addTicketLine({
      category: 'EEE-1',
      quantity: 1,
      weight: 1,
      unitPrice: 5,
      totalPrice: 5,
    });
    setTotalAmount(5);
    setCashSessionIdInput(SESSION);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetCashflowDraft();
  });

  it('expose le hint et aria-keyshortcuts quand la finalisation est possible', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );
    const btn = screen.getByTestId('cashflow-submit-sale');
    expect(btn.getAttribute('aria-keyshortcuts')).toBe('Enter');
    expect(btn.getAttribute('aria-label') ?? '').toMatch(/Entrée/i);
    expect(btn.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByTestId('cashflow-kiosk-finalize-enter-hint')).toBeTruthy();
  });

  it('ouvre la modal de finalisation sur Entrée hors zone wizard unifiée sans POST immédiat', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'POST' && url.includes('/v1/sales/') && !url.includes('hold') && !url.includes('finalize')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'sale-from-enter',
              cash_session_id: SESSION,
              total_amount: 5,
              items: [],
              payments: [],
            }),
        } as Response;
      }
      return { ok: true, status: 200, text: async () => '{}' } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-2' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    (document.body as HTMLBodyElement).focus();
    fireEvent.keyDown(document.body, { key: 'Enter', bubbles: true, cancelable: true });

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-submit-sale-confirm')).toBeTruthy();
    });
    const amountInput = screen.getByTestId('cashflow-finalize-amount-received');
    expect(document.activeElement).toBe(screen.getByTestId('cashflow-select-payment-dock-modal'));
    expect((amountInput as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('cashflow-finalize-amount-due').textContent ?? '').toMatch(/5.00 €/i);
    expect(screen.getByTestId('cashflow-select-payment-dock-modal').textContent ?? '').toMatch(/Chèque/);
    expect(screen.getByTestId('cashflow-select-payment-dock-modal').textContent ?? '').toMatch(/Carte \(indisponible\)/);
    expect(screen.getByTestId('cashflow-select-payment-dock-modal').textContent ?? '').toMatch(/Gratuit \/ don/);
    expect(screen.getByRole('option', { name: /Carte \(indisponible\)/i }).hasAttribute('disabled')).toBe(true);
    expect((screen.getByTestId('cashflow-submit-sale-confirm') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('cashflow-finalize-payment-balance').textContent ?? '').toMatch(/montant à renseigner/i);
    const postCallsBeforeConfirm = fetchMock.mock.calls.filter((c) => (c[1]?.method ?? 'GET').toUpperCase() === 'POST');
    expect(postCallsBeforeConfirm.length).toBe(0);

    fireEvent.change(amountInput, { target: { value: '0' } });
    expect((screen.getByTestId('cashflow-submit-sale-confirm') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('cashflow-finalize-payment-balance').textContent ?? '').toMatch(/Reste à payer/i);

    fireEvent.change(amountInput, { target: { value: '7.00' } });
    expect(screen.getByTestId('cashflow-finalize-payment-balance').textContent ?? '').toMatch(/Monnaie à rendre : 2.00 €/i);

    fireEvent.change(amountInput, { target: { value: '5.00' } });
    expect(screen.getByTestId('cashflow-finalize-payment-balance').textContent ?? '').toMatch(/Montant exact/i);

    fireEvent.change(screen.getByTestId('cashflow-select-payment-dock-modal'), { target: { value: 'free' } });
    expect(screen.queryByTestId('cashflow-finalize-amount-received')).toBeNull();
    expect(screen.getByTestId('cashflow-finalize-payment-balance').textContent ?? '').toMatch(/aucun montant reçu requis/i);
    expect((screen.getByTestId('cashflow-submit-sale-confirm') as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByTestId('cashflow-submit-sale-confirm'));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/v1/sales/'))).toBe(true);
    });
  });

  it('n’ouvre pas la finalisation quand Entrée est déclenchée depuis un autre bouton focusé', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-external-button' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <button type="button" data-testid="external-action">
          Action externe
        </button>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    const externalButton = screen.getByTestId('external-action');
    (externalButton as HTMLButtonElement).focus();
    fireEvent.keyDown(externalButton, { key: 'Enter', bubbles: true, cancelable: true });

    await waitFor(() => {
      expect(screen.queryByTestId('cashflow-finalize-amount-received')).toBeNull();
    });
  });

  it('ferme sur Escape et confirme sur Entrée quand le montant couvre le total', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'POST' && url.includes('/v1/sales/') && !url.includes('hold') && !url.includes('finalize')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'sale-from-modal-enter',
              cash_session_id: SESSION,
              total_amount: 5,
              items: [],
              payments: [],
            }),
        } as Response;
      }
      return { ok: true, status: 200, text: async () => '{}' } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-4' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-kiosk-finalize-modal')).toBeTruthy();
    });

    fireEvent.keyDown(document.body, { key: 'Escape', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect(screen.queryByTestId('cashflow-finalize-amount-received')).toBeNull();
    });

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-finalize-amount-received')).toBeTruthy();
    });
    expect(document.activeElement).toBe(screen.getByTestId('cashflow-select-payment-dock-modal'));
    const amountInput = screen.getByTestId('cashflow-finalize-amount-received');
    fireEvent.change(amountInput, { target: { value: '5' } });
    fireEvent.keyDown(amountInput, { key: 'Enter', bubbles: true, cancelable: true });
    fireEvent.keyDown(screen.getByTestId('cashflow-finalize-donation'), {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/v1/sales/'))).toBe(true);
    });
  });

  it('accepte la rangée haute AZERTY dans le montant reçu puis Tab vers le don', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-azerty' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-finalize-amount-received')).toBeTruthy();
    });

    const amountInput = screen.getByTestId('cashflow-finalize-amount-received');
    const donationInput = screen.getByTestId('cashflow-finalize-donation');

    fireEvent.keyDown(amountInput, { key: '&', code: 'Digit1', shiftKey: true, bubbles: true, cancelable: true });
    fireEvent.keyDown(amountInput, { key: 'é', code: 'Digit2', bubbles: true, cancelable: true });
    fireEvent.keyDown(amountInput, { key: ',', code: 'Comma', bubbles: true, cancelable: true });
    fireEvent.keyDown(amountInput, { key: '"', code: 'Digit3', shiftKey: true, bubbles: true, cancelable: true });

    await waitFor(() => {
      expect((amountInput as HTMLInputElement).value).toBe('12.3');
    });

    fireEvent.keyDown(amountInput, { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect(document.activeElement).toBe(donationInput);
    });
  });

  it('utilise Tab pour entrer dans le workflow mixte puis saisir le montant suivant en AZERTY', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-tab-mixed' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-finalize-amount-received')).toBeTruthy();
    });

    const amountInput = screen.getByTestId('cashflow-finalize-amount-received');
    const donationInput = screen.getByTestId('cashflow-finalize-donation');

    fireEvent.keyDown(amountInput, { key: 'é', code: 'Digit2', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect((amountInput as HTMLInputElement).value).toBe('2');
    });

    fireEvent.keyDown(amountInput, { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect(document.activeElement).toBe(donationInput);
    });

    fireEvent.keyDown(donationInput, { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-finalize-payments-list').textContent ?? '').toMatch(/Espèces : 2.00 €/i);
      expect(document.activeElement).toBe(screen.getByTestId('cashflow-select-payment-dock-loop'));
    });

    const loopAmount = screen.getByTestId('cashflow-finalize-loop-amount');
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect(document.activeElement).toBe(loopAmount);
    });

    fireEvent.keyDown(loopAmount, { key: '"', code: 'Digit3', shiftKey: true, bubbles: true, cancelable: true });
    await waitFor(() => {
      expect((loopAmount as HTMLInputElement).value).toBe('3');
    });
  });

  it('porte le workflow de paiements mixtes et envoie payments[]', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'POST' && url.includes('/v1/sales/') && !url.includes('hold') && !url.includes('finalize')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'sale-mixed-payments',
              cash_session_id: SESSION,
              total_amount: 5,
              items: [],
              payments: [
                { payment_method: 'check', amount: 2 },
                { payment_method: 'cash', amount: 3 },
              ],
            }),
        } as Response;
      }
      return { ok: true, status: 200, text: async () => '{}' } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-5' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-finalize-amount-received')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-select-payment-dock-modal'), { target: { value: 'check' } });
    fireEvent.change(screen.getByTestId('cashflow-finalize-amount-received'), { target: { value: '2' } });
    expect(screen.getByTestId('cashflow-finalize-mixed-payment-block').textContent ?? '').toMatch(/Ajouter un autre paiement/i);
    expect(screen.getByTestId('cashflow-finalize-mixed-payment-block').textContent ?? '').toMatch(/Montant du paiement/i);
    expect(screen.getByTestId('cashflow-finalize-add-payment').textContent ?? '').toMatch(/Ajouter/i);
    fireEvent.click(screen.getByTestId('cashflow-finalize-add-payment'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-finalize-payments-list').textContent ?? '').toMatch(/Chèque : 2.00 €/i);
      expect(screen.getByTestId('cashflow-finalize-payments-total').textContent ?? '').toMatch(/reste : 3.00 €/i);
    });
    expect(
      screen
        .getAllByRole('option', { name: /Carte \(indisponible\)/i })
        .every((option) => option.hasAttribute('disabled')),
    ).toBe(true);

    fireEvent.change(screen.getByTestId('cashflow-select-payment-dock-loop'), { target: { value: 'cash' } });
    fireEvent.change(screen.getByTestId('cashflow-finalize-loop-amount'), { target: { value: '3' } });
    fireEvent.keyDown(screen.getByTestId('cashflow-finalize-loop-amount'), { key: 'Enter', bubbles: true, cancelable: true });

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-finalize-payments-total').textContent ?? '').toMatch(/ticket couvert/i);
      expect((screen.getByTestId('cashflow-submit-sale-confirm') as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByTestId('cashflow-submit-sale-confirm'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const salePost = fetchMock.mock.calls.find(
      (call) => (call[1]?.method ?? 'GET').toUpperCase() === 'POST' && String(call[0]).includes('/v1/sales/'),
    );
    expect(salePost).toBeTruthy();
    const payload = JSON.parse(String(salePost?.[1]?.body ?? '{}'));
    expect(payload).toMatchObject({
      total_amount: 5,
      donation: 0,
      payments: [
        { payment_method: 'check', amount: 2 },
        { payment_method: 'cash', amount: 3 },
      ],
    });
    expect(payload.payment_method).toBeUndefined();
  });

  it('porte le don dans le total à encaisser et le payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'POST' && url.includes('/v1/sales/') && !url.includes('hold') && !url.includes('finalize')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'sale-with-donation',
              cash_session_id: SESSION,
              total_amount: 5,
              donation: 2,
              items: [],
              payments: [{ payment_method: 'cash', amount: 7 }],
            }),
        } as Response;
      }
      return { ok: true, status: 200, text: async () => '{}' } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-6' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-finalize-donation')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-finalize-donation'), { target: { value: '2' } });
    expect(screen.getByTestId('cashflow-finalize-amount-due').textContent ?? '').toMatch(/7.00 €/i);

    fireEvent.change(screen.getByTestId('cashflow-finalize-amount-received'), { target: { value: '7' } });
    expect(screen.getByTestId('cashflow-finalize-payment-balance').textContent ?? '').toMatch(/Montant exact/i);
    fireEvent.click(screen.getByTestId('cashflow-submit-sale-confirm'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const salePost = fetchMock.mock.calls.find(
      (call) => (call[1]?.method ?? 'GET').toUpperCase() === 'POST' && String(call[0]).includes('/v1/sales/'),
    );
    const payload = JSON.parse(String(salePost?.[1]?.body ?? '{}'));
    expect(payload).toMatchObject({
      total_amount: 5,
      donation: 2,
      payment_method: 'cash',
    });
  });

  it('porte la note contextuelle dans le payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'POST' && url.includes('/v1/sales/') && !url.includes('hold') && !url.includes('finalize')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'sale-with-note',
              cash_session_id: SESSION,
              total_amount: 5,
              donation: 0,
              note: 'Client regulier',
              items: [],
              payments: [{ payment_method: 'cash', amount: 5 }],
            }),
        } as Response;
      }
      return { ok: true, status: 200, text: async () => '{}' } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-7' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-finalize-note')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-finalize-note'), { target: { value: ' Client regulier ' } });
    fireEvent.change(screen.getByTestId('cashflow-finalize-amount-received'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('cashflow-submit-sale-confirm'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const salePost = fetchMock.mock.calls.find(
      (call) => (call[1]?.method ?? 'GET').toUpperCase() === 'POST' && String(call[0]).includes('/v1/sales/'),
    );
    const payload = JSON.parse(String(salePost?.[1]?.body ?? '{}'));
    expect(payload).toMatchObject({
      total_amount: 5,
      donation: 0,
      payment_method: 'cash',
      note: 'Client regulier',
    });
  });

  it('revient à Espèces après une vente réussie même si Gratuit / don avait été choisi avant', async () => {
    setPaymentMethod('free');
    setAfterSuccessfulSale('sale-reset-default');
    addTicketLine({
      category: 'EEE-1',
      quantity: 1,
      weight: 1,
      unitPrice: 5,
      totalPrice: 5,
    });
    setTotalAmount(5);

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-3' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-select-payment-dock-modal')).toBeTruthy();
    });
    expect((screen.getByTestId('cashflow-select-payment-dock-modal') as HTMLSelectElement).value).toBe('cash');
    expect((screen.getByTestId('cashflow-finalize-amount-received') as HTMLInputElement).value).toBe('');
    expect((screen.getByTestId('cashflow-submit-sale-confirm') as HTMLButtonElement).disabled).toBe(true);
  });

  it('replie Carte vers Espèces dans la modal kiosque pour rester fidèle au legacy', async () => {
    setPaymentMethod('card');

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-kiosk-enter-card-disabled' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <KioskFinalizeSaleDock />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-select-payment-dock-modal')).toBeTruthy();
    });

    const select = screen.getByTestId('cashflow-select-payment-dock-modal') as HTMLSelectElement;
    expect(select.value).toBe('cash');
    expect(screen.getByRole('option', { name: /Carte \(indisponible\)/i }).hasAttribute('disabled')).toBe(true);
  });
});
