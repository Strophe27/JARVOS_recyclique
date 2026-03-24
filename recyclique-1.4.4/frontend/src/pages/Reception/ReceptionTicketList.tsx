import React from 'react';
import { Table, Badge, Text, Skeleton, Group } from '@mantine/core';
import { formatReceptionTimestamp } from '../../utils/dates';

export interface ReceptionTicket {
  id: string;
  created_at: string;
  closed_at?: string | null;
  status: 'draft' | 'closed' | 'in_progress';
  benevole_username: string;
  total_lignes: number;
  total_poids: number;
}

interface ReceptionTicketListProps {
  tickets: ReceptionTicket[];
  loading?: boolean;
  onRowClick?: (ticket: ReceptionTicket) => void;
  showClosedColumn?: boolean;
}

const getStatusLabel = (status: ReceptionTicket['status']) => {
  switch (status) {
    case 'draft':
      return 'Brouillon';
    case 'in_progress':
      return 'En cours';
    case 'closed':
      return 'Fermé';
    default:
      return 'Inconnu';
  }
};

const getStatusColor = (status: ReceptionTicket['status']) => {
  switch (status) {
    case 'draft':
      return 'yellow';
    case 'in_progress':
      return 'blue';
    case 'closed':
      return 'green';
    default:
      return 'gray';
  }
};

export const ReceptionTicketList: React.FC<ReceptionTicketListProps> = ({
  tickets,
  loading = false,
  onRowClick,
  showClosedColumn = true
}) => {
  if (loading) {
    return (
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ID Ticket</Table.Th>
            <Table.Th>Ouvert le</Table.Th>
            {showClosedColumn && <Table.Th>Fermé le</Table.Th>}
            <Table.Th>Bénévole</Table.Th>
            <Table.Th>Articles</Table.Th>
            <Table.Th>Poids total</Table.Th>
            <Table.Th>Statut</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <Table.Tr key={index}>
              <Table.Td><Skeleton height={20} data-testid="skeleton" /></Table.Td>
              <Table.Td><Skeleton height={20} width={120} data-testid="skeleton" /></Table.Td>
              {showClosedColumn && <Table.Td><Skeleton height={20} width={120} data-testid="skeleton" /></Table.Td>}
              <Table.Td><Skeleton height={20} width={100} data-testid="skeleton" /></Table.Td>
              <Table.Td><Skeleton height={20} width={60} data-testid="skeleton" /></Table.Td>
              <Table.Td><Skeleton height={20} width={80} data-testid="skeleton" /></Table.Td>
              <Table.Td><Skeleton height={20} width={80} data-testid="skeleton" /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  }

  if (tickets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Text c="dimmed">Aucun ticket trouvé</Text>
      </div>
    );
  }

  return (
    <Table striped highlightOnHover data-testid="reception-ticket-list">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>ID Ticket</Table.Th>
          <Table.Th>Ouvert le</Table.Th>
          {showClosedColumn && <Table.Th>Fermé le</Table.Th>}
          <Table.Th>Bénévole</Table.Th>
          <Table.Th>Articles</Table.Th>
          <Table.Th>Poids total</Table.Th>
          <Table.Th>Statut</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {tickets.map((ticket) => (
          <Table.Tr
            key={ticket.id}
            data-testid="ticket-row"
            onClick={() => onRowClick?.(ticket)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick?.(ticket);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Sélectionner le ticket ${ticket.id.slice(-8)}`}
            style={{ cursor: 'pointer' }}
          >
            <Table.Td>
              <Text fw={500}>
                #{ticket.id.slice(-8)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">
                {formatReceptionTimestamp(ticket.created_at)}
              </Text>
            </Table.Td>
            {showClosedColumn && (
              <Table.Td>
                <Text size="sm">
                  {formatReceptionTimestamp(ticket.closed_at)}
                </Text>
              </Table.Td>
            )}
            <Table.Td>
              <Text size="sm">
                {ticket.benevole_username || '—'}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">
                {ticket.total_lignes}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">
                {ticket.total_poids.toFixed(2)} kg
              </Text>
            </Table.Td>
            <Table.Td>
              <Badge
                color={getStatusColor(ticket.status)}
                variant="light"
                size="sm"
              >
                {getStatusLabel(ticket.status)}
              </Badge>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};

export default ReceptionTicketList;















