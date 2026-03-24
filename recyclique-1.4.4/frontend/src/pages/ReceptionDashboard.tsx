import React from 'react';
import { Container, Title, Stack, Button, Group } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import ReceptionOpenList from './Reception/ReceptionOpenList';
import ReceptionInProgressList from './Reception/ReceptionInProgressList';
import ReceptionClosedList from './Reception/ReceptionClosedList';
import { ReceptionTicket } from './Reception/ReceptionTicketList';

const ReceptionDashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleTicketClick = (ticket: ReceptionTicket) => {
    if (ticket.status === 'closed') {
      navigate(`/reception/ticket/${ticket.id}/view`);
    } else {
      navigate(`/reception/ticket/${ticket.id}`);
    }
  };

  const handleNewTicket = () => {
    navigate('/reception');
  };

  const handleBackToReception = () => {
    navigate('/reception');
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group>
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={16} />}
              onClick={handleBackToReception}
            >
              Retour à la réception
            </Button>
            <Title order={2}>Tableau de Bord Réception</Title>
          </Group>
          <Button
            leftSection={<Plus size={16} />}
            onClick={handleNewTicket}
          >
            Nouveau ticket
          </Button>
        </Group>

        {/* Open Tickets */}
        <ReceptionOpenList
          onTicketClick={handleTicketClick}
          onNewTicket={handleNewTicket}
        />

        {/* In Progress Tickets */}
        <ReceptionInProgressList
          onTicketClick={handleTicketClick}
        />

        {/* Closed Tickets */}
        <ReceptionClosedList
          onTicketClick={handleTicketClick}
        />
      </Stack>
    </Container>
  );
};

export default ReceptionDashboard;















