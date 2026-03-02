/**
 * Header caisse dedie — Story 15.3 AC#1.
 * Remplace le header global AppShell sur /cash-register/sale.
 * Fond vert brand, user + session a gauche, bouton fermer a droite.
 */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Group, Text } from '@mantine/core';
import type { UserInToken } from '../api/auth';
import styles from './CashRegisterSalePage.module.css';

export interface CaisseHeaderProps {
  user: UserInToken | null;
  sessionId: string;
  modeIndicator?: ReactNode;
}

export function CaisseHeader({ user, sessionId, modeIndicator }: CaisseHeaderProps) {
  const navigate = useNavigate();
  const username = user
    ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username
    : 'inconnu';
  const shortSessionId = sessionId.slice(0, 8);

  return (
    <header className={styles.caisseHeader} data-testid="caisse-header">
      <Group gap="sm" align="center">
        <UserIcon />
        <Text size="sm" c="white" fw={500}>
          agent {username} Session #{shortSessionId}
        </Text>
        {modeIndicator}
      </Group>
      <Button
        color="red"
        variant="filled"
        size="sm"
        leftSection={<ExitIcon />}
        onClick={() => navigate('/cash-register/session/close')}
        data-testid="caisse-header-close"
      >
        Fermer la Caisse
      </Button>
    </header>
  );
}

function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width={20}
      height={20}
      aria-hidden
    >
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width={16}
      height={16}
      aria-hidden
    >
      <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5a2 2 0 00-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 002 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}
