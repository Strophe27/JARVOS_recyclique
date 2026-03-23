/**
 * Barre de stats caisse — Story 15.3 AC#2, 18-5 AC#2+AC#3.
 * Fond sombre/indigo, 6 indicateurs, toggles Live/Session + horloge.
 * Mode Live : valeurs locales accumulees. Mode Session : totaux API CashSessionItem.
 */
import { useEffect, useState } from 'react';
import { Group, Text, SegmentedControl } from '@mantine/core';
import styles from './CashRegisterSalePage.module.css';

export interface CaisseStatsBarProps {
  ticketCount: number;
  lastTicketAmount?: number | null;
  caJour: number;
  donsJour: number;
  poidsSortis: number;
  /** Stub hors perimetre caisse — affiche toujours "-- kg" */
  poidsRentres: number;
  /** Mode actuel du toggle. Si absent, gere en local. */
  mode?: 'live' | 'session';
  /** Callback quand l'operateur change le toggle. Si absent, mode gere en local. */
  onModeChange?: (mode: 'live' | 'session') => void;
  /** Nb tickets depuis l'API CashSessionItem (mode Session) */
  sessionTicketCount?: number;
  /** CA total session depuis l'API CashSessionItem (mode Session, en centimes) */
  sessionCaJour?: number;
}

function formatEur(cents: number): string {
  return (Number(cents) / 100).toFixed(2).replace('.', ',') + ' \u20ac';
}

function formatKg(kg: number): string {
  return Number(kg || 0).toFixed(1) + ' kg';
}

export function CaisseStatsBar({
  ticketCount,
  lastTicketAmount,
  caJour,
  donsJour,
  poidsSortis,
  mode: modeProp,
  onModeChange,
  sessionTicketCount,
  sessionCaJour,
}: CaisseStatsBarProps) {
  const [localMode, setLocalMode] = useState<'live' | 'session'>('live');
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const mode = modeProp ?? localMode;
  const handleModeChange = (val: string) => {
    const next = val as 'live' | 'session';
    if (onModeChange) {
      onModeChange(next);
    } else {
      setLocalMode(next);
    }
  };

  const displayTickets = mode === 'session' ? (sessionTicketCount ?? ticketCount) : ticketCount;
  const displayCaJour = mode === 'session' ? (sessionCaJour ?? caJour) : caJour;

  const stats = [
    { label: 'TICKETS', value: String(displayTickets) },
    { label: 'DERNIER TICKET', value: lastTicketAmount != null ? formatEur(lastTicketAmount) : '--' },
    { label: 'CA JOUR', value: formatEur(displayCaJour) },
    { label: 'DONS JOUR', value: formatEur(donsJour) },
    { label: 'POIDS SORTIS', value: formatKg(poidsSortis) },
    { label: 'POIDS RENTRES', value: '-- kg' },
  ];

  return (
    <div className={styles.statsBar} data-testid="caisse-stats-bar">
      <div className={styles.statsBarGrid}>
        {stats.map((s) => (
          <div key={s.label} className={styles.statItem}>
            <Text size="xs" tt="uppercase" c="dimmed" fw={600} className={styles.statLabel}>
              {s.label}
            </Text>
            <Text size="sm" c="white" fw={700}>
              {s.value}
            </Text>
          </div>
        ))}
      </div>
      <Group gap="sm" wrap="nowrap" align="center">
        <SegmentedControl
          size="xs"
          value={mode}
          onChange={handleModeChange}
          data={[
            { label: 'Live', value: 'live' },
            { label: 'Session', value: 'session' },
          ]}
        />
        <Text size="sm" c="white" fw={500}>
          {clock}
        </Text>
      </Group>
    </div>
  );
}
