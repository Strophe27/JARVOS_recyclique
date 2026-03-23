/**
 * Tests Story 18-8 AC1 — Composant Ticket.
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { Ticket } from './Ticket';
import type { CartLine } from './CashRegisterSalePage';

function makeCart(overrides: Partial<CartLine>[] = []): CartLine[] {
  return overrides.map((o, i) => ({
    id: `line-${i}`,
    category_id: 'cat-1',
    preset_id: null,
    preset_name: undefined,
    category_name: `Article ${i}`,
    quantity: 1,
    unit_price: 500,
    total_price: 500,
    weight: null,
    ...o,
  }));
}

function renderTicket(cart: CartLine[], extra?: Partial<Parameters<typeof Ticket>[0]>) {
  const onRemoveLine = vi.fn();
  const onUpdateLine = vi.fn();
  const onFinalize = vi.fn();
  return render(
    <MantineProvider>
      <MemoryRouter>
        <Ticket
          cart={cart}
          onRemoveLine={onRemoveLine}
          onUpdateLine={onUpdateLine}
          onFinalize={onFinalize}
          total={cart.reduce((s, l) => s + l.total_price, 0)}
          note=""
          onNoteChange={vi.fn()}
          saleDate=""
          onSaleDateChange={vi.fn()}
          error={null}
          {...extra}
        />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('Ticket \u2014 Story 18-8 AC1', () => {
  it('affiche les lignes du panier avec nom, quantite, prix unitaire, sous-total', () => {
    const cart = makeCart([
      { category_name: 'Livres', quantity: 2, unit_price: 150, total_price: 300 },
      { category_name: 'Stylo', quantity: 1, unit_price: 200, total_price: 200 },
    ]);
    renderTicket(cart);

    expect(screen.getByText('Livres')).toBeInTheDocument();
    expect(screen.getByText(/x2/)).toBeInTheDocument();
    // prix unitaire 1.50 EUR
    expect(screen.getByText(/1\.50/)).toBeInTheDocument();
    // sous-total 3.00 EUR apparait dans la ligne (pas le total panier qui est 5.00)
    expect(screen.getByText(/3\.00/)).toBeInTheDocument();
  });

  it('affiche le message cart-empty si le panier est vide', () => {
    renderTicket([]);

    expect(screen.getByTestId('cart-empty')).toBeInTheDocument();
    expect(screen.getByTestId('cart-empty')).toHaveTextContent('Aucun article');
  });

  it('affiche la distinction visuelle pour une ligne don (unit_price = 0)', () => {
    const cart = makeCart([
      { category_name: 'Vetement', unit_price: 0, total_price: 0 },
    ]);
    renderTicket(cart);

    const ticketLines = document.querySelectorAll('[class*="ticketLine"]');
    const donLine = Array.from(ticketLines).find((el) =>
      el.className.includes('ticketLineDon')
    );
    expect(donLine).toBeTruthy();
  });

  it('affiche la distinction visuelle pour une ligne dont le nom contient "don"', () => {
    const cart = makeCart([
      { category_name: 'Don livre', unit_price: 200, total_price: 200 },
    ]);
    renderTicket(cart);

    const ticketLines = document.querySelectorAll('[class*="ticketLine"]');
    const donLine = Array.from(ticketLines).find((el) =>
      el.className.includes('ticketLineDon')
    );
    expect(donLine).toBeTruthy();
  });

  it('affiche le poids total si au moins une ligne a un poids', () => {
    const cart = makeCart([
      { category_name: 'Fer', weight: 1.5 },
      { category_name: 'Acier', weight: 2.3 },
    ]);
    renderTicket(cart);

    expect(screen.getByTestId('ticket-weight-total')).toBeInTheDocument();
    expect(screen.getByTestId('ticket-weight-total')).toHaveTextContent('3.80');
  });

  it("n'affiche pas le poids total si aucune ligne n'a de poids", () => {
    const cart = makeCart([
      { category_name: 'Livre', weight: null },
    ]);
    renderTicket(cart);

    expect(screen.queryByTestId('ticket-weight-total')).not.toBeInTheDocument();
  });

  it("le bouton supprimer appelle onRemoveLine avec l'id de la ligne", () => {
    const cart = makeCart([{ id: 'line-abc', category_name: 'Jouet' }]);
    const onRemoveLine = vi.fn();
    render(
      <MantineProvider>
        <MemoryRouter>
          <Ticket
            cart={cart}
            onRemoveLine={onRemoveLine}
            onUpdateLine={vi.fn()}
            onFinalize={vi.fn()}
            total={500}
            note=""
            onNoteChange={vi.fn()}
            saleDate=""
            onSaleDateChange={vi.fn()}
            error={null}
          />
        </MemoryRouter>
      </MantineProvider>
    );

    fireEvent.click(screen.getByTestId('remove-line-line-abc'));
    expect(onRemoveLine).toHaveBeenCalledWith('line-abc');
  });

  it('bouton Modif. ouvre le modal et Enregistrer appelle onUpdateLine', async () => {
    const cart = makeCart([
      { id: 'line-edit', category_name: 'Livre', quantity: 1, unit_price: 200, total_price: 200 },
    ]);
    const onUpdateLine = vi.fn();
    render(
      <MantineProvider>
        <MemoryRouter>
          <Ticket
            cart={cart}
            onRemoveLine={vi.fn()}
            onUpdateLine={onUpdateLine}
            onFinalize={vi.fn()}
            total={200}
            note=""
            onNoteChange={vi.fn()}
            saleDate=""
            onSaleDateChange={vi.fn()}
            error={null}
          />
        </MemoryRouter>
      </MantineProvider>
    );

    fireEvent.click(screen.getByTestId('edit-line-line-edit'));
    expect(await screen.findByTestId('ticket-edit-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ticket-edit-save'));
    expect(onUpdateLine).toHaveBeenCalledWith('line-edit', 1, 200);
  });

  it('Story 19.9 : prix fixe categorie — prix unitaire non modifiable et conserve les centimes imposes', async () => {
    const cart = makeCart([
      {
        id: 'line-fix',
        category_id: 'cat-lampe',
        category_name: 'Lampe',
        unit_price: 300,
        total_price: 300,
      },
    ]);
    const onUpdateLine = vi.fn();
    render(
      <MantineProvider>
        <MemoryRouter>
          <Ticket
            cart={cart}
            onRemoveLine={vi.fn()}
            onUpdateLine={onUpdateLine}
            onFinalize={vi.fn()}
            total={300}
            note=""
            onNoteChange={vi.fn()}
            saleDate=""
            onSaleDateChange={vi.fn()}
            error={null}
            resolveCategoryFixedUnitPriceCents={() => 300}
          />
        </MemoryRouter>
      </MantineProvider>
    );

    fireEvent.click(screen.getByTestId('edit-line-line-fix'));
    expect(await screen.findByTestId('ticket-edit-fixed-hint')).toBeInTheDocument();
    expect(screen.getByTestId('ticket-edit-price')).toBeDisabled();
    fireEvent.click(screen.getByTestId('ticket-edit-save'));
    expect(onUpdateLine).toHaveBeenCalledWith('line-fix', 1, 300);
  });
});
