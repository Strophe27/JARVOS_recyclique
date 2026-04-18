import React, { useCallback } from 'react';
import { Card, Title, Text, Button, Group, Badge } from '@mantine/core';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { getReceptionTickets } from '../../services/api';
import ReceptionTicketList, { ReceptionTicket } from './ReceptionTicketList';
import { useReceptionTicketsPolling } from '../../hooks/useReceptionTicketsPolling';

interface ReceptionInProgressListProps {
  onTicketClick?: (ticket: ReceptionTicket) => void;
}

export const ReceptionInProgressList: React.FC<ReceptionInProgressListProps> = ({
  onTicketClick
}) => {
  const fetchInProgressTickets = useCallback(async () => {
    const response = await getReceptionTickets(1, 50);
    const allTickets = response.tickets || [];

    // Filter for in-progress tickets only
    return allTickets.filter((ticket: ReceptionTicket) =>
      ticket.status === 'in_progress'
    );
  }, []);

  const {
    data: tickets,
    loading,
    error,
    refetch,
    lastUpdated
  } = useReceptionTicketsPolling(fetchInProgressTickets, {
    pollInterval: 30000, // 30 seconds
    enabled: navigator.onLine
  });

  const handleRefresh = () => {
    refetch();
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group>
          <Title order={3}>Tickets En Cours</Title>
          <Badge
            color={navigator.onLine ? "green" : "red"}
            variant="light"
            leftSection={navigator.onLine ? <Wifi size={12} /> : <WifiOff size={12} />}
          >
            {navigator.onLine ? "Live" : "Hors ligne"}
          </Badge>
          {lastUpdated && (
            <Text size="xs" c="dimmed">
              Mis à jour à {formatLastUpdated(lastUpdated)}
            </Text>
          )}
        </Group>
        <Button
          variant="light"
          leftSection={<RefreshCw size={16} />}
          onClick={handleRefresh}
          loading={loading}
          size="sm"
        >
          Actualiser
        </Button>
      </Group>

      {error && (
        <Text c="red" size="sm" mb="md">
          {error}
        </Text>
      )}

      <ReceptionTicketList
        tickets={tickets}
        loading={loading}
        onRowClick={onTicketClick}
        showClosedColumn={false}
      />
    </Card>
  );
};

export default ReceptionInProgressList;
