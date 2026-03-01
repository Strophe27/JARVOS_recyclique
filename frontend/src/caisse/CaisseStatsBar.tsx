/**
 * Barre de stats caisse — Story 15.3 AC#2.
 * Fond sombre/indigo, 6 indicateurs, toggles Live/Session + horloge.
 */
import { useEffect, useState } from 'react';
import { Group, Text, SegmentedControl } from '@mantine/core';
import styles from './CashRegisterSalePage.module.css';

export interface CaisseStatsBarProps {
  ticketCount: number;
  lastTicketAmount: number | null;
  caJour: number;
  donsJour: number;
  poidsSortis: number;
  poidsRentres: number;
}

function formatEur(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' \u20ac';
}

function formatKg(kg: number): string {
  return kg.toFixed(1) + ' kg';
}

export function CaisseStatsBar({
  ticketCount,
  lastTicketAmount,
  caJour,
  donsJour,
  poidsSortis,
  poidsRentres,
}: CaisseStatsBarProps) {
  const [mode, setMode] = useState('live');
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'TICKETS', value: String(ticketCount) },
    { label: 'DERNIER TICKET', value: lastTicketAmount != null ? formatEur(lastTicketAmount) : '--' },
    { label: 'CA JOUR', value: formatEur(caJour) },
    { label: 'DONS JOUR', value: formatEur(donsJour) },
    { label: 'POIDS SORTIS', value: formatKg(poidsSortis) },
    { label: 'POIDS RENTRES', value: formatKg(poidsRentres) },
  ];

  return (
    <div className={styles.statsBar} data-testid="caisse-stats-bar">
      <Group gap="lg" wrap="nowrap" style={{ flex: 1 }}>
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
      </Group>
      <Group gap="sm" wrap="nowrap" align="center">
        <SegmentedControl
          size="xs"
          value={mode}
          onChange={setMode}
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
