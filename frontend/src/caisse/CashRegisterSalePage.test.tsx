/**
 * Tests Story 15.3 — layout saisie vente parite 1.4.4 + flux offline (5.4, 11.2).
 * Tests Story 18-7 — raccourcis clavier AZERTY positionnels.
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByText('Quantite')).toBeInTheDocument();
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

    // Feuille : onglet Poids + article en cours (grille démontée avec keepMounted=false — 19.9)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Poids/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('caisse-current-item')).toHaveTextContent('Cat 1');
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
      expect(screen.getByRole('tab', { name: /Poids/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('caisse-current-item')).toHaveTextContent('Bijoux');
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

  it('1.4.4 : sur onglet Categorie, chiffre puis lettre ne pre-remplit pas la quantite (A seul → Qté 1)', async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId('caisse-current-item')).toHaveTextContent('Qté : 1');
      expect(screen.getByRole('tab', { name: /Poids/i })).toHaveAttribute('aria-selected', 'true');
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

  it('1.4.4 : Backspace sur ecran categorie ne supprime pas une ligne du panier', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('preset-preset-1'));
    await waitFor(() => {
      expect(screen.queryByTestId('cart-empty')).not.toBeInTheDocument();
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    });

    await new Promise((r) => setTimeout(r, 80));
    expect(screen.queryByTestId('cart-empty')).not.toBeInTheDocument();
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

  it('Story 19-8 : racines visibles gardent A/Z meme si une sous-categorie precede dans la reponse API', async () => {
    mockGetCategoriesSaleTickets.mockResolvedValue([
      {
        id: 'sub-under-1',
        name: 'Sous',
        parent_id: 'cat-1',
        official_name: null,
        is_visible_sale: true,
        is_visible_reception: false,
        display_order: 0,
        display_order_entry: 0,
        deleted_at: null,
        created_at: '',
        updated_at: '',
      },
      ...fakeCategories,
    ] as caisseApi.CategoryItem[]);

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });

    const card1 = screen.getByTestId('category-card-cat-1');
    const card2 = screen.getByTestId('category-card-cat-2');
    expect(card1).toHaveTextContent('A');
    expect(card2).toHaveTextContent('Z');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });
    // cat-1 a un enfant : navigation sous-categories, pas selection feuille (19.9)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Sous-categorie/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('subcategory-grid')).toBeInTheDocument();
    });
  });

  it('1.4.4 : onglet Quantite — touches & (AZERTY) saisissent 11 sur le pavé logique', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('category-card-cat-1'));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Poids/i })).toHaveAttribute('aria-selected', 'true');
    });
    await user.type(screen.getByTestId('cat-weight'), '1');
    await user.click(screen.getByTestId('goto-quantite-from-poids'));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Quantite/i })).toHaveAttribute('aria-selected', 'true');
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '&', bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '&', bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('numpad-display')).toHaveTextContent('11');
    });
  });

  it('Story 19-8 : onglet Poids — saisie & insere le chiffre 1 (AZERTY)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('category-card-cat-1'));
    await waitFor(() => {
      expect(screen.getByTestId('cat-weight')).toBeInTheDocument();
    });
    const weightInput = screen.getByTestId('cat-weight');
    await user.click(weightInput);
    fireEvent.keyDown(weightInput, { key: '&', bubbles: true });
    await waitFor(() => {
      expect(weightInput).toHaveValue('1');
    });
  });

  it('Story 19-8 : onglet Prix — saisie & insere le chiffre 1 (AZERTY)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('category-card-cat-1'));
    await user.type(screen.getByTestId('cat-weight'), '1');
    await user.click(screen.getByTestId('goto-quantite-from-poids'));
    await user.click(screen.getByTestId('goto-prix-from-quantite'));
    await waitFor(() => {
      expect(screen.getByTestId('cat-price')).toBeInTheDocument();
    });
    const priceInput = screen.getByTestId('cat-price');
    await user.click(priceInput);
    fireEvent.keyDown(priceInput, { key: '&', bubbles: true });
    await waitFor(() => {
      expect(priceInput).toHaveValue('1');
    });
  });

  it('Story 19-8 : sur onglet Poids, un chiffre alimente le poids, pas la quantite affichee', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });
    const user = userEvent.setup();
    await user.click(screen.getByTestId('category-card-cat-1'));
    await waitFor(() => {
      expect(screen.getByTestId('cat-weight')).toBeInTheDocument();
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId('caisse-current-item')).toHaveTextContent('Qté : 1');
    expect(screen.getByTestId('cat-weight')).toHaveValue('3');
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

  it('1.4.4 : panier vide + Entree sur categorie ne finalise pas (pas d overlay)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-finaliser')).toBeInTheDocument();
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 80));
    expect(screen.queryByTestId('finalization-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-finaliser')).toBeDisabled();
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

  it('1.4.4 : Entree avec panier vide sur categorie ne declenche pas finalisation', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 80));
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

describe('CashRegisterSalePage — Story 19.7 presets / prix fixe', () => {
  it('affiche message aucun preset quand API presets vide', async () => {
    mockGetPresetsActive.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-empty-message')).toBeInTheDocument();
    });
    expect(screen.getByTestId('preset-empty-message')).toHaveTextContent(/Aucun preset configuré/i);
  });

  it('erreur chargement presets : bandeau sans bloquer grille categories', async () => {
    mockGetPresetsActive.mockRejectedValue(new Error('Network fail'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });
    expect(screen.getByTestId('presets-load-error')).toHaveTextContent(/Network fail/);
    expect(screen.getByTestId('caisse-category-grid')).toBeInTheDocument();
  });

  it('clic preset applique prix fixe categorie (3 EUR) malgré preset_price aberrant', async () => {
    mockGetPresetsActive.mockResolvedValue([
      {
        id: 'preset-lampe',
        name: 'Lampe preset',
        category_id: 'cat-lampe',
        preset_price: 99999,
        button_type: 'sale',
        sort_order: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    ] as caisseApi.PresetItem[]);
    mockGetCategoriesSaleTickets.mockResolvedValue([
      ...fakeCategories,
      {
        id: 'cat-lampe',
        name: 'Lampe',
        parent_id: null,
        official_name: null,
        is_visible_sale: true,
        is_visible_reception: false,
        display_order: 2,
        display_order_entry: 2,
        price: 3,
        max_price: 3,
        deleted_at: null,
        created_at: '',
        updated_at: '',
      },
    ] as caisseApi.CategoryItem[]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-lampe')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('preset-preset-lampe'));
    await waitFor(() => {
      expect(screen.getByTestId('cart-total')).toHaveTextContent('3.00');
    });
  });

  it('ajout categorie prix fixe : flux Poids→Quantite→Prix, Prix lecture seule, ligne 3 EUR', async () => {
    const lampe = {
      id: 'cat-lampe',
      name: 'Lampe',
      parent_id: null,
      official_name: null,
      is_visible_sale: true,
      is_visible_reception: false,
      display_order: 2,
      display_order_entry: 2,
      price: 3,
      max_price: 3,
      deleted_at: null,
      created_at: '',
      updated_at: '',
    };
    mockGetCategoriesSaleTickets.mockResolvedValue([...fakeCategories, lampe] as caisseApi.CategoryItem[]);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-lampe')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('category-card-cat-lampe'));
    await user.type(screen.getByTestId('cat-weight'), '1');
    await user.click(screen.getByTestId('goto-quantite-from-poids'));
    await user.click(screen.getByTestId('goto-prix-from-quantite'));
    const priceRoot = screen.getByTestId('cat-price');
    const priceInput =
      priceRoot instanceof HTMLInputElement
        ? priceRoot
        : within(priceRoot).queryByRole('spinbutton') ?? priceRoot.querySelector('input');
    expect(priceInput).toBeTruthy();
    expect(priceInput).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    await waitFor(() => {
      expect(screen.getByTestId('cart-total')).toHaveTextContent('3.00');
    });
  });

  it('edition ligne ticket met a jour le total', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    await waitFor(() => {
      expect(screen.getByTestId('cart-total')).toHaveTextContent('5.00');
    });
    const editBtn = document.querySelector('[data-testid^="edit-line-"]');
    expect(editBtn).toBeTruthy();
    fireEvent.click(editBtn!);
    const qtyInput = await screen.findByTestId('ticket-edit-qty', {}, { timeout: 5000 });
    expect(screen.getByTestId('ticket-edit-modal')).toBeInTheDocument();
    await user.clear(qtyInput);
    await user.type(qtyInput, '2');
    fireEvent.click(screen.getByTestId('ticket-edit-save'));
    await waitFor(() => {
      expect(screen.getByTestId('cart-total')).toHaveTextContent('10.00');
    });
  });
});

describe('CashRegisterSalePage — Story 19.9 disposition & flux 1.4.4', () => {
  it('Ctrl+5 active l’onglet Prix (apres ouverture des etapes)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('category-card-cat-1'));
    await user.type(screen.getByTestId('cat-weight'), '1');
    await user.click(screen.getByTestId('goto-quantite-from-poids'));
    await user.click(screen.getByTestId('goto-prix-from-quantite'));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Prix/i })).toHaveAttribute('aria-selected', 'true');
    });
    await user.click(screen.getByRole('tab', { name: 'Categorie', exact: true }));
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: '5', code: 'Digit5', ctrlKey: true, bubbles: true })
      );
    });
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Prix/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('Ctrl+Numpad5 active l’onglet Prix (meme flux)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('category-card-cat-1'));
    await user.type(screen.getByTestId('cat-weight'), '1');
    await user.click(screen.getByTestId('goto-quantite-from-poids'));
    await user.click(screen.getByTestId('goto-prix-from-quantite'));
    await user.click(screen.getByRole('tab', { name: 'Categorie', exact: true }));
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: '5', code: 'Numpad5', ctrlKey: true, bubbles: true })
      );
    });
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Prix/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('apres feuille sous-categorie : onglet Poids puis Continuer vers Prix et prix fixe au ticket', async () => {
    const parent = {
      id: 'cat-parent',
      name: 'Parent',
      parent_id: null,
      official_name: null,
      is_visible_sale: true,
      is_visible_reception: false,
      display_order: 0,
      display_order_entry: 0,
      deleted_at: null,
      created_at: '',
      updated_at: '',
    };
    const leaf = {
      id: 'cat-lampe',
      name: 'Lampe',
      parent_id: 'cat-parent',
      official_name: null,
      is_visible_sale: true,
      is_visible_reception: false,
      display_order: 1,
      display_order_entry: 1,
      price: 3,
      max_price: 3,
      deleted_at: null,
      created_at: '',
      updated_at: '',
    };
    mockGetCategoriesSaleTickets.mockResolvedValue([parent, leaf] as caisseApi.CategoryItem[]);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-parent')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('category-card-cat-parent'));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Sous-categorie/i })).toHaveAttribute('aria-selected', 'true');
    });
    await user.click(screen.getByTestId('category-card-cat-lampe'));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Poids/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('caisse-current-item')).toHaveTextContent('Lampe');
    });
    await user.type(screen.getByTestId('cat-weight'), '1');
    await user.click(screen.getByTestId('goto-quantite-from-poids'));
    await user.click(screen.getByTestId('goto-prix-from-quantite'));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Prix/i })).toHaveAttribute('aria-selected', 'true');
    });
    const priceInput = screen.getByTestId('cat-price');
    expect(priceInput).toHaveValue('3.00');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    await waitFor(() => {
      expect(screen.getByTestId('cart-total')).toHaveTextContent('3.00');
    });
  });

  it('onglet Poids : bouton Continuer vers Quantite, pas d’Ajouter au panier', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    });
    const user = userEvent.setup();
    await user.click(screen.getByTestId('category-card-cat-1'));
    await waitFor(() => {
      expect(screen.getByTestId('goto-quantite-from-poids')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Ajouter' })).not.toBeInTheDocument();
  });
});
