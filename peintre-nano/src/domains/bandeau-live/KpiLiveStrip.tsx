import { Group, Stack, Text } from '@mantine/core';
import type { CashKpiLiveView } from './unified-live-kpi-map';
import classes from './KpiLiveStrip.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatWeightKg(value: number): string {
  return `${value.toFixed(1)} kg`;
}

function formatTime(date: Date | null): string {
  if (!date) {
    return '--:--';
  }
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export type KpiLiveStripProps = {
  readonly stats: CashKpiLiveView | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly isOnline: boolean;
  readonly lastUpdate: Date | null;
  /** Montant ticket local à privilégier pour « Dernier ticket » (ex. caisse courante), comme legacy `lastTicketAmount`. */
  readonly lastTicketAmountOverride?: number;
  /** `default` = bandeau dashboard ; `compact` = chrome kiosque caisse. */
  readonly variant?: 'default' | 'compact';
  readonly showTitle?: boolean;
  readonly title?: string;
  /** Mode virtuel : pas d’erreur réseau, libellé distinct (aligné legacy). */
  readonly virtualMode?: boolean;
  /** Pulsation visuelle sur la pastille d’état (rafraîchissement en cours, sans texte supplémentaire). */
  readonly isRefreshing?: boolean;
  readonly 'data-testid'?: string;
};

/**
 * Bandeau KPI live partagé (métriques + indicateur LIVE) — même structure que `CashKPIBanner` legacy, en Mantine + CSS modules.
 */
export function KpiLiveStrip({
  stats,
  isLoading,
  error,
  isOnline,
  lastUpdate,
  lastTicketAmountOverride = 0,
  variant = 'default',
  showTitle = true,
  title = 'Indicateurs jour (live)',
  virtualMode = false,
  isRefreshing = false,
  'data-testid': dataTestId = 'kpi-live-strip',
}: KpiLiveStripProps) {
  const rootClass = variant === 'compact' ? `${classes.root} ${classes.rootCompact}` : classes.root;

  const displayLastTicket =
    lastTicketAmountOverride > 0
      ? lastTicketAmountOverride
      : stats
        ? stats.lastTicketAmount
        : 0;

  const tickets = stats?.ticketsCount ?? 0;
  const ca = stats?.ca ?? 0;
  const donations = stats?.donations ?? 0;
  const weightOut = stats?.weightOut ?? 0;
  const weightIn = stats?.weightIn ?? 0;

  const liveOk = virtualMode ? true : isOnline && !error;
  const ledConnected = virtualMode ? true : liveOk;
  const showOfflineBanner = !virtualMode && !isOnline && error;

  const cells = (
    <>
      <div>
        <Text className={classes.label}>Tickets</Text>
        <Text className={classes.value} data-field="kpi-tickets">
          {isLoading && !stats ? '…' : tickets}
        </Text>
      </div>
      <div>
        <Text className={classes.label}>Dernier ticket</Text>
        <Text className={classes.value} data-field="kpi-last-ticket">
          {isLoading && !stats && lastTicketAmountOverride <= 0
            ? '…'
            : displayLastTicket > 0
              ? formatCurrency(displayLastTicket)
              : '—'}
        </Text>
      </div>
      <div>
        <Text className={classes.label}>CA jour</Text>
        <Text className={classes.value} data-field="kpi-ca">
          {isLoading && !stats ? '…' : formatCurrency(ca)}
        </Text>
      </div>
      <div>
        <Text className={classes.label}>Dons jour</Text>
        <Text className={classes.value} data-field="kpi-donations">
          {isLoading && !stats ? '…' : formatCurrency(donations)}
        </Text>
      </div>
      <div>
        <Text className={classes.label}>Poids sortis</Text>
        <Text className={classes.value} data-field="kpi-weight-out">
          {isLoading && !stats ? '…' : formatWeightKg(weightOut)}
        </Text>
      </div>
      <div>
        <Text className={classes.label}>Poids rentrés</Text>
        <Text className={classes.value} data-field="kpi-weight-in">
          {isLoading && !stats ? '…' : formatWeightKg(weightIn)}
        </Text>
      </div>
    </>
  );

  return (
    <aside
      className={rootClass}
      data-testid={dataTestId}
      data-kpi-live-state={liveOk ? 'live' : virtualMode ? 'virtual' : 'offline'}
      role="region"
      aria-label={title}
    >
      {showTitle ? <h2 className={classes.title}>{title}</h2> : null}
      {showOfflineBanner ? (
        <p className={classes.errorText}>{error}</p>
      ) : error && !stats ? (
        <p className={classes.errorText}>{error}</p>
      ) : null}
      <Group align="flex-start" justify="space-between" gap="md" wrap="wrap">
        <div className={classes.grid}>{cells}</div>
        <Stack className={classes.statusRow} gap={4} align="flex-end">
          <div
            className={classes.liveBadge}
            data-kpi-live-refreshing={isRefreshing ? 'true' : 'false'}
            title={
              virtualMode
                ? 'Mode virtuel'
                : liveOk
                  ? isRefreshing
                    ? 'Actualisation des indicateurs'
                    : 'Connecté — indicateurs à jour'
                  : 'Hors ligne ou erreur réseau'
            }
          >
            <span
              className={`${classes.statusLed} ${ledConnected ? classes.statusLedGreen : classes.statusLedRed} ${isRefreshing ? classes.statusLedBlink : ''}`}
              aria-hidden
            />
            <span className={classes.liveBadgeLabel}>
              {virtualMode ? 'Mode virtuel' : liveOk ? 'Live' : 'Hors ligne'}
            </span>
          </div>
          {!virtualMode && lastUpdate ? (
            <span className={classes.timestamp}>{formatTime(lastUpdate)}</span>
          ) : null}
        </Stack>
      </Group>
    </aside>
  );
}
