/**
 * Tests Story 15.3 — layout saisie vente parite 1.4.4 + flux offline (5.4, 11.2).
 * Tests Story 18-7 — raccourcis clavier AZERTY positionnels.
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { CashRegisterSalePage } from './CashRegisterSalePage';
import * as caisseApi from '../api/caisse';
import * as offlineQueue from './offlineQueue';

// Mock auth — expose user pour CaisseHeader
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'mock-token',
    user: { id: 'u1', username: 'alex', email: 'a@b.c', role: 'admin', status: 'active', first_name: 'Alex', last_name: 'Dupont' },
  }),
}));

let mockOnline = true;
vi.mock('./useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnline,
}));

const mockGetCurrentCashSession = vi.spyOn(caisseApi, 'getCurrentCashSession');
const mockGetPresetsActive = vi.spyOn(caisseApi, 'getPresetsActive');
const mockGetCategoriesSaleTickets = vi.spyOn(caisseApi, 'getCategoriesSaleTickets');
const mockPostSale = vi.spyOn(caisseApi, 'postSale');
const mockUpdateCashSessionStep = vi.spyOn(caisseApi, 'updateCashSessionStep');

const mockAddTicket = vi.spyOn(offlineQueue, 'addTicket');
const mockGetPendingCount = vi.spyOn(offlineQueue, 'getPendingCount');
const mockSyncOfflineQueue = vi.spyOn(offlineQueue, 'syncOfflineQueue');

const fakeSession = {
  id: 'session-1',
  operator_id: 'op-1',
  register_id: 'reg-1',
  site_id: 'site-1',
  initial_amount: 1000,
  current_amount: 1000,
  status: 'open',
  opened_at: '2026-01-01T10:00:00Z',
  closed_at: null,
  current_step: 'sale',
  closing_amount: null,
  actual_amount: null,
  variance: null,
  variance_comment: null,
  session_type: 'real',
  total_sales: null,
  total_items: null,
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
};

const fakePresets = [
  {
    id: 'preset-1',
    name: 'Preset 1',
    category_id: null,
    preset_price: 500,
    button_type: 'sale',
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

const fakeCategories = [
  {
    id: 'cat-1',
    name: 'Cat 1',
    parent_id: null,
    official_name: null,
    is_visible_sale: true,
    is_visible_reception: false,
    display_order: 0,
    display_order_entry: 0,
    deleted_at: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'cat-2',
    name: 'Bijoux',
    parent_id: null,
    official_name: null,
    is_visible_sale: true,
    is_visible_reception: false,
    display_order: 1,
    display_order_entry: 1,
    deleted_at: null,
    created_at: '',
    updated_at: '',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockOnline = true;
  mockGetCurrentCashSession.mockResolvedValue(fakeSession as caisseApi.CashSessionItem);
  mockGetPresetsActive.mockResolvedValue(fakePresets as caisseApi.PresetItem[]);
  mockGetCategoriesSaleTickets.mockResolvedValue(fakeCategories as caisseApi.CategoryItem[]);
  mockUpdateCashSessionStep.mockResolvedValue(fakeSession as caisseApi.CashSessionItem);
  mockGetPendingCount.mockResolvedValue(0);
  mockSyncOfflineQueue.mockResolvedValue({ sent: 0, failed: 0, errors: [] });
});

function renderPage() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <CashRegisterSalePage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('CashRegisterSalePage — Story 15.3 layout', () => {
  it('affiche la page avec le data-testid page-cash-register-sale', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });
  });

  it('affiche le header caisse dedie avec username et session', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-header')).toBeInTheDocument();
    });
    expect(screen.getByTestId('caisse-header')).toHaveTextContent('Alex Dupont');
    expect(screen.getByTestId('caisse-header')).toHaveTextContent('session-1'.slice(0, 8));
    expect(screen.getByTestId('caisse-header-close')).toBeInTheDocument();
  });

  it('affiche la barre de stats', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-stats-bar')).toBeInTheDocument();
    });
  });

  it('affiche les onglets de saisie', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-sale-tabs')).toBeInTheDocument();
    });
    expect(screen.getByText('Categorie')).toBeInTheDocument();
    expect(screen.getByText('Sous-categorie')).toBeInTheDocument();
    expect(screen.getByText('Poids')).toBeInTheDocument();
    expect(screen.getByText('Prix')).toBeInTheDocument();
  });

  it('affiche la zone article en cours de saisie', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-current-item')).toBeInTheDocument();
    });
    expect(screen.getByTestId('caisse-current-item')).toHaveTextContent('ARTICLE EN COURS DE SAISIE');
  });

  it('affiche la grille de categories avec cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-category-grid')).toBeInTheDocument();
    });
    expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    expect(screen.getByTestId('category-card-cat-2')).toBeInTheDocument();
  });

  it('affiche le panneau ticket', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-ticket-panel')).toBeInTheDocument();
    });
    expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument();
    expect(screen.getByTestId('cart-empty')).toHaveTextContent('Aucun article');
    expect(screen.getByTestId('btn-finaliser')).toBeInTheDocument();
  });
});

describe('CashRegisterSalePage — offline & sync (Story 5.4)', () => {
  it('affiche le bandeau hors ligne quand useOnlineStatus est false', async () => {
    mockOnline = false;
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    expect(screen.getByText(/Hors ligne/)).toBeInTheDocument();
  });

  it('en ligne sans tickets en attente : pas de bandeau sync', async () => {
    mockOnline = true;
    mockGetPendingCount.mockResolvedValue(0);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('sync-pending-banner')).not.toBeInTheDocument();
  });

  it('en ligne avec tickets en attente : affiche bandeau synchronisation', async () => {
    mockOnline = true;
    mockGetPendingCount.mockResolvedValue(2);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('sync-pending-banner')).toBeInTheDocument();
    });
    expect(screen.getByText(/2 ticket\(s\) a envoyer/)).toBeInTheDocument();
  });

  it('soumission en ligne appelle POST /v1/sales et pas addTicket', async () => {
    mockPostSale.mockResolvedValue({} as caisseApi.SaleResponseItem);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    // Ajouter un article, ouvrir FinalizationScreen, ajouter le paiement, valider
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-finaliser')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('btn-finaliser'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('add-payment'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-confirm')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('finalization-confirm'));

    await waitFor(() => {
      expect(mockPostSale).toHaveBeenCalledWith(
        'mock-token',
        expect.objectContaining({
          cash_session_id: 'session-1',
          items: expect.any(Array),
          payments: expect.any(Array),
        })
      );
    });
    expect(mockAddTicket).not.toHaveBeenCalled();
  });

  it('soumission hors ligne appelle addTicket avec offline_id et pas postSale', async () => {
    mockOnline = false;
    mockAddTicket.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    // Ajouter un article, ouvrir FinalizationScreen, ajouter le paiement, valider
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-finaliser')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('btn-finaliser'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('add-payment'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-confirm')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('finalization-confirm'));

    await waitFor(() => {
      expect(mockAddTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          cash_session_id: 'session-1',
          items: expect.any(Array),
          payments: expect.any(Array),
          offline_id: expect.any(String),
          created_at: expect.any(String),
        })
      );
    });
    expect(mockPostSale).not.toHaveBeenCalled();
  });
});

describe('CashRegisterSalePage — raccourcis clavier AZERTY (Story 18-7)', () => {
  it('touche A selectionne la categorie en position 1 (cat-1)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });

    // La categorie en position 1 doit etre selectionnee (classe CSS selected)
    await waitFor(() => {
      const card = screen.getByTestId('category-card-cat-1');
      expect(card.className).toMatch(/selected/i);
    });
  });

  it('touche Z selectionne la categorie en position 2 (cat-2)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-2')).toBeInTheDocument();
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    });

    await waitFor(() => {
      const card = screen.getByTestId('category-card-cat-2');
      expect(card.className).toMatch(/selected/i);
    });
  });

  it('le badge de raccourci affiche la touche AZERTY positionnelle (A pour cat-1)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });

    // La premiere categorie doit avoir le badge 'A' (position 1 AZERTY)
    const card1 = screen.getByTestId('category-card-cat-1');
    expect(card1).toHaveTextContent('A');

    // La deuxieme categorie doit avoir le badge 'Z' (position 2 AZERTY)
    const card2 = screen.getByTestId('category-card-cat-2');
    expect(card2).toHaveTextContent('Z');
  });

  it('chiffre puis lettre pre-remplit la quantite (3 + A = quantite 3)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });

    // L'article en cours de saisie doit afficher Qte : 3
    await waitFor(() => {
      expect(screen.getByTestId('caisse-current-item')).toHaveTextContent('Qté : 3');
    });
  });

  it('Echap remet le modificateur de quantite a zero', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });

    // Apres Echap, la quantite doit etre 1 (par defaut) et non 5
    await waitFor(() => {
      expect(screen.getByTestId('caisse-current-item')).toHaveTextContent('Qté : 1');
    });
  });

  it('Entree avec panier non vide ouvre FinalizationScreen (Story 18-8)', async () => {
    mockPostSale.mockResolvedValue({} as caisseApi.SaleResponseItem);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });

    // Ajouter un article via le preset
    fireEvent.click(screen.getByTestId('preset-preset-1'));

    // Presser Entree via clavier — ouvre FinalizationScreen (pas de soumission directe)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });
    // Ajouter le paiement dans FinalizationScreen puis valider
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('add-payment'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-confirm')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('finalization-confirm'));

    await waitFor(() => {
      expect(mockPostSale).toHaveBeenCalledWith(
        'mock-token',
        expect.objectContaining({
          cash_session_id: 'session-1',
          items: expect.any(Array),
          payments: expect.any(Array),
        }),
      );
    });
  });

  it('Entree avec panier vide ne declenche pas la finalisation', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    // postSale ne doit pas etre appele
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockPostSale).not.toHaveBeenCalled();
  });

  it('Backspace hors champ supprime la derniere ligne du panier', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });

    // Ajouter un article
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    await waitFor(() => {
      expect(screen.queryByTestId('cart-empty')).not.toBeInTheDocument();
    });

    // Backspace doit supprimer l'article
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('cart-empty')).toBeInTheDocument();
    });
  });

  it('raccourcis desactives quand focus sur input', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });

    // Focus sur un champ de saisie
    const noteInput = screen.getByTestId('sale-note');
    fireEvent.focus(noteInput);

    // Simuler la touche A depuis le champ input (bubbles = true)
    noteInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    // La categorie ne doit pas etre selectionnee
    await new Promise((resolve) => setTimeout(resolve, 50));
    const card = screen.getByTestId('category-card-cat-1');
    expect(card.className).not.toMatch(/selected/i);
  });
});

describe('CashRegisterSalePage \u2014 Story 18-8 flux finalisation', () => {
  // S'assurer que vi.useFakeTimers() ne fuite pas entre les tests
  afterEach(() => { vi.useRealTimers(); });
  it('bouton Finaliser desactive quand panier vide', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-finaliser')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-finaliser')).toBeDisabled();
  });

  it('bouton Finaliser active quand panier non vide', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-finaliser')).not.toBeDisabled();
    });
  });

  it('click Finaliser avec panier non vide ouvre FinalizationScreen', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-finaliser')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('btn-finaliser'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });
  });

  it('click Finaliser avec panier vide affiche erreur "Panier vide" sans ouvrir FinalizationScreen', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-finaliser')).toBeInTheDocument();
    });
    // Le bouton est disabled quand panier vide, on teste via click direct
    // On simule Entree a la place pour tester le message d'erreur
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('sale-error')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('finalization-screen')).not.toBeInTheDocument();
  });

  it('Entree avec panier non vide ouvre FinalizationScreen', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });
  });

  it('Entree avec panier vide affiche erreur "Panier vide" sans ouvrir FinalizationScreen', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('sale-error')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('finalization-screen')).not.toBeInTheDocument();
    expect(mockPostSale).not.toHaveBeenCalled();
  });

  it('validation depuis FinalizationScreen appelle POST /v1/sales et affiche sale-success', async () => {
    mockPostSale.mockResolvedValue({} as caisseApi.SaleResponseItem);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    fireEvent.click(screen.getByTestId('btn-finaliser'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('add-payment'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-confirm')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('finalization-confirm'));
    await waitFor(() => {
      expect(mockPostSale).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('sale-success')).toBeInTheDocument();
    });
    expect(screen.getByTestId('sale-success')).toHaveTextContent('Ticket enregistre');
  });

  it('apres validation reussie le panier est vide et FinalizationScreen est ferme', async () => {
    mockPostSale.mockResolvedValue({} as caisseApi.SaleResponseItem);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    fireEvent.click(screen.getByTestId('btn-finaliser'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('add-payment'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-confirm')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('finalization-confirm'));
    // Attendre le message de succes (immediat apres postSale)
    await waitFor(() => expect(screen.getByTestId('sale-success')).toBeInTheDocument());
    // Attendre le timer de fermeture automatique (2000ms + marge)
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await waitFor(() => {
      expect(screen.queryByTestId('finalization-screen')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('cart-empty')).toBeInTheDocument();
  }, 10000);

  it('apres validation reussie les KPI locaux sont incrementes', async () => {
    mockPostSale.mockResolvedValue({} as caisseApi.SaleResponseItem);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    // Verifier ticket count avant (0)
    expect(screen.getByTestId('caisse-stats-bar')).toHaveTextContent('0');
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    fireEvent.click(screen.getByTestId('btn-finaliser'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('add-payment'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-confirm')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('finalization-confirm'));
    await waitFor(() => {
      expect(mockPostSale).toHaveBeenCalled();
    });
    // Le KPI ticket count doit etre incremente (1 ticket)
    await waitFor(() => {
      expect(screen.getByTestId('caisse-stats-bar')).toHaveTextContent('1');
    });
  });

  it('rendu monnaie correct : especes 20 EUR pour total 5 EUR = rendu 15.00 EUR', async () => {
    // Preset price = 500 cents = 5.00 EUR, paiement especes 20 EUR -> rendu = 15.00 EUR
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    // Ajouter preset (500 cents)
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    fireEvent.click(screen.getByTestId('btn-finaliser'));
    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });
    // Saisir 20 EUR especes (> 5 EUR total) -> rendu = 15 EUR
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '20' } });
    // Rendu monnaie doit etre affiche en temps reel (avec le montant en cours de saisie)
    // cartTotal = 500 cents, especes pending = 2000 cents -> rendu = 1500 cents = 15 EUR
    await waitFor(() => {
      expect(screen.getByTestId('rendu-monnaie')).toBeInTheDocument();
    });
    expect(screen.getByTestId('rendu-monnaie')).toHaveTextContent('15.00');
  });
});
