import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReceptionTicketList } from '../ReceptionTicketList';

const mockTickets = [
  {
    id: 'ticket-1',
    created_at: '2025-11-26T10:30:00Z',
    closed_at: null,
    status: 'draft' as const,
    benevole_username: 'john.doe',
    total_lignes: 3,
    total_poids: 15.5
  },
  {
    id: 'ticket-2',
    created_at: '2025-11-26T09:15:00Z',
    closed_at: '2025-11-26T11:45:00Z',
    status: 'closed' as const,
    benevole_username: 'jane.smith',
    total_lignes: 2,
    total_poids: 8.2
  }
];

describe('ReceptionTicketList', () => {
  it('should render loading skeleton when loading', () => {
    render(
      <ReceptionTicketList
        tickets={[]}
        loading={true}
        showClosedColumn={true}
      />
    );

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render empty message when no tickets', () => {
    render(
      <ReceptionTicketList
        tickets={[]}
        loading={false}
        showClosedColumn={true}
      />
    );

    expect(screen.getByText('Aucun ticket trouvé')).toBeInTheDocument();
  });

  it('should render tickets with formatted timestamps', () => {
    render(
      <ReceptionTicketList
        tickets={mockTickets}
        loading={false}
        showClosedColumn={true}
      />
    );

    // Check ticket IDs are displayed
    expect(screen.getByText('#ticket-1')).toBeInTheDocument();
    expect(screen.getByText('#ticket-2')).toBeInTheDocument();

    // Check formatted timestamps (DD/MM/YYYY HH:mm format)
    // Note: These will be formatted according to local timezone
    expect(screen.getByText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)).toBeInTheDocument();

    // Check closed column shows "—" for open ticket
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);

    // Check usernames
    expect(screen.getByText('john.doe')).toBeInTheDocument();
    expect(screen.getByText('jane.smith')).toBeInTheDocument();

    // Check item counts
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Check weights
    expect(screen.getByText('15.50 kg')).toBeInTheDocument();
    expect(screen.getByText('8.20 kg')).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
    expect(screen.getByText('Fermé')).toBeInTheDocument();
  });

  it('should not show closed column when showClosedColumn is false', () => {
    render(
      <ReceptionTicketList
        tickets={mockTickets}
        loading={false}
        showClosedColumn={false}
      />
    );

    // Should have table headers without "Fermé le" column
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map(h => h.textContent);
    expect(headerTexts).not.toContain('Fermé le');
    expect(headerTexts).toContain('Ouvert le');
  });

  it('should call onRowClick when row is clicked', () => {
    const mockOnRowClick = vi.fn();

    render(
      <ReceptionTicketList
        tickets={mockTickets}
        loading={false}
        onRowClick={mockOnRowClick}
        showClosedColumn={true}
      />
    );

    const firstRow = screen.getByText('#ticket-1').closest('tr');
    firstRow?.click();

    expect(mockOnRowClick).toHaveBeenCalledWith(mockTickets[0]);
  });

  it('should handle keyboard navigation', () => {
    const mockOnRowClick = vi.fn();

    render(
      <ReceptionTicketList
        tickets={mockTickets}
        loading={false}
        onRowClick={mockOnRowClick}
        showClosedColumn={true}
      />
    );

    const firstRow = screen.getByText('#ticket-1').closest('tr');

    // Test Enter key
    firstRow?.focus();
    firstRow?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(mockOnRowClick).toHaveBeenCalledWith(mockTickets[0]);

    // Test Space key
    mockOnRowClick.mockClear();
    firstRow?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(mockOnRowClick).toHaveBeenCalledWith(mockTickets[0]);
  });
});















