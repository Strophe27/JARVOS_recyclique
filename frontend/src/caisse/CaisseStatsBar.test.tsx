/**
 * Tests CaisseStatsBar — Story 18-5 AC#2 + AC#3 (Vitest + RTL + MantineProvider).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { CaisseStatsBar } from './CaisseStatsBar';

function renderBar(props: Partial<React.ComponentProps<typeof CaisseStatsBar>> = {}) {
  return render(
    <MantineProvider>
      <CaisseStatsBar
        ticketCount={0}
        lastTicketAmount={null}
        caJour={0}
        donsJour={0}
        poidsSortis={0}
        poidsRentres={0}
        {...props}
      />
    </MantineProvider>
  );
}

describe('CaisseStatsBar — AC2 : 6 indicateurs', () => {
  it('affiche les 6 labels KPI', () => {
    renderBar();
    expect(screen.getByText('TICKETS')).toBeInTheDocument();
    expect(screen.getByText('DERNIER TICKET')).toBeInTheDocument();
    expect(screen.getByText('CA JOUR')).toBeInTheDocument();
    expect(screen.getByText('DONS JOUR')).toBeInTheDocument();
    expect(screen.getByText('POIDS SORTIS')).toBeInTheDocument();
    expect(screen.getByText('POIDS RENTRES')).toBeInTheDocument();
  });

  it('a le data-testid caisse-stats-bar', () => {
    renderBar();
    expect(screen.getByTestId('caisse-stats-bar')).toBeInTheDocument();
  });

  it('affiche "--" pour DERNIER TICKET quand lastTicketAmount est null', () => {
    renderBar({ lastTicketAmount: null });
    const values = screen.getAllByText('--');
    expect(values.length).toBeGreaterThanOrEqual(1);
  });

  it('affiche le montant du dernier ticket quand lastTicketAmount est defini', () => {
    renderBar({ lastTicketAmount: 1250 });
    expect(screen.getByText('12,50 \u20ac')).toBeInTheDocument();
  });

  it('affiche toujours "-- kg" pour POIDS RENTRES (stub)', () => {
    renderBar({ poidsRentres: 999 });
    expect(screen.getByText('-- kg')).toBeInTheDocument();
  });

  it('affiche les valeurs KPI correctement', () => {
    renderBar({ ticketCount: 5, caJour: 3000, donsJour: 500, poidsSortis: 2.5 });
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('30,00 \u20ac')).toBeInTheDocument();
    expect(screen.getByText('5,00 \u20ac')).toBeInTheDocument();
    expect(screen.getByText('2.5 kg')).toBeInTheDocument();
  });
});

describe('CaisseStatsBar — AC3 : toggle Live/Session', () => {
  it('appelle onModeChange avec "session" quand on clique sur Session', async () => {
    const onModeChange = vi.fn();
    renderBar({ mode: 'live', onModeChange });
    const sessionBtn = screen.getByRole('radio', { name: /session/i });
    await userEvent.click(sessionBtn);
    expect(onModeChange).toHaveBeenCalledWith('session');
  });

  it('appelle onModeChange avec "live" quand on clique sur Live', async () => {
    const onModeChange = vi.fn();
    renderBar({ mode: 'session', onModeChange });
    const liveBtn = screen.getByRole('radio', { name: /live/i });
    await userEvent.click(liveBtn);
    expect(onModeChange).toHaveBeenCalledWith('live');
  });

  it('en mode session, affiche sessionTicketCount et sessionCaJour', () => {
    renderBar({
      mode: 'session',
      ticketCount: 2,
      caJour: 1000,
      sessionTicketCount: 10,
      sessionCaJour: 5000,
    });
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('50,00 \u20ac')).toBeInTheDocument();
  });

  it('en mode live, affiche ticketCount et caJour locaux', () => {
    renderBar({
      mode: 'live',
      ticketCount: 3,
      caJour: 2000,
      sessionTicketCount: 10,
      sessionCaJour: 5000,
    });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('20,00 \u20ac')).toBeInTheDocument();
  });
});
