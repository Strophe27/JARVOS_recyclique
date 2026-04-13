import { Alert, Badge, Button, Divider, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Activity, Bell, HeartPulse, RefreshCw, Server } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminSystemHealthApiError,
  fetchAdminHealthSystem,
  fetchAdminSessionMetrics,
  postAdminHealthTestNotifications,
  type AdminHealthSystemPayload,
  type AdminSessionMetricsEnvelope,
} from '../../api/admin-system-health-client';
import {
  DashboardLegacyApiError,
  fetchUnifiedLiveStats,
  type UnifiedLiveStatsResponse,
} from '../../api/dashboard-legacy-stats-client';
import { fetchLiveSnapshot, type FetchLiveSnapshotResult } from '../../api/live-snapshot-client';
import { postRecycliqueContextEnvelopeRefresh } from '../../api/recyclique-auth-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { ExploitationLiveSnapshot } from '../bandeau-live/live-snapshot-normalize';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import type { ContextEnvelopeStub } from '../../types/context-envelope';

const LIVE_STATS_DISPLAY_ORDER = [
  'tickets_open',
  'tickets_closed_24h',
  'tickets_count',
  'ca',
  'donations',
  'items_received',
  'weight_in',
  'weight_out',
  'weight_out_sales',
  'last_ticket_amount',
  'period_start',
  'period_end',
  'effective_open_state',
] as const;

const LIVE_STAT_LABELS_FR: Record<(typeof LIVE_STATS_DISPLAY_ORDER)[number], string> = {
  tickets_open: 'Tickets en cours',
  tickets_closed_24h: 'Tickets fermés (24 dernières heures)',
  tickets_count: 'Nombre de tickets (période)',
  ca: "Chiffre d'affaires",
  donations: 'Dons',
  items_received: 'Articles reçus',
  weight_in: 'Poids entrant (réception)',
  weight_out: 'Poids sortant',
  weight_out_sales: 'Poids sortant (ventes)',
  last_ticket_amount: 'Montant du dernier ticket',
  period_start: 'Début de période',
  period_end: 'Fin de période',
  effective_open_state: "État d'ouverture (site)",
};

function formatLiveStatLabel(key: string): string {
  return (
    LIVE_STAT_LABELS_FR[key as keyof typeof LIVE_STAT_LABELS_FR] ??
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function humanizeRuntimeStatus(status: string): string {
  if (status === 'ok') return 'Normal';
  if (status === 'degraded') return 'Dégradé (données partielles ou retard)';
  if (status === 'forbidden') return 'Accès restreint';
  return status;
}

function humanizeAdminOverallHealth(status: string): string {
  if (status === 'healthy') return 'Sain';
  if (status === 'degraded') return 'Dégradé (anomalies à examiner)';
  if (status === 'critical') return 'Critique';
  return status;
}

/** Valeurs contrat OpenAPI `AdminHealthRecommendation.priority` — affichage opérateur uniquement. */
function humanizeRecommendationPriority(priority: string): string {
  const k = priority.trim().toLowerCase();
  if (k === 'high') return 'haute';
  if (k === 'medium') return 'moyenne';
  if (k === 'low') return 'faible';
  return priority.trim() || '—';
}

function humanizeOpenState(v: string): string {
  const m: Record<string, string> = {
    open: 'Ouvert',
    closed: 'Fermé',
    unknown: 'Non déterminé',
    not_applicable: 'Sans objet',
    delayed_open: 'Ouverture retardée',
    delayed_close: 'Fermeture retardée',
  };
  return m[v] ?? v;
}

function humanizeCashSessionEffectiveness(v: string): string {
  const m: Record<string, string> = {
    open_effective: 'Caisse ouverte (cohérent)',
    closed_effective: 'Caisse fermée (cohérent)',
    unknown: 'Non déterminé',
    not_applicable: 'Sans objet',
  };
  return m[v] ?? v;
}

function humanizeSyncWorstState(v: string): string {
  const m: Record<string, string> = {
    a_reessayer: 'À réessayer',
    en_quarantaine: 'En quarantaine',
    resolu: 'Résolu',
    rejete: 'Rejeté',
  };
  return m[v] ?? v;
}

const ANOMALY_BUCKET_LABELS_FR: Record<string, string> = {
  cash_anomalies: 'Caisse',
  sync_anomalies: 'Synchronisation',
  auth_anomalies: 'Authentification',
  classification_anomalies: 'Classification',
};

/** Gravité contrat `AdminHealthAnomalyItem.severity` — libellé opérateur. */
function humanizeAnomalySeverity(severity: string): string {
  const k = severity.trim().toLowerCase();
  if (k === 'critical') return 'critique';
  if (k === 'high') return 'élevée';
  if (k === 'medium') return 'modérée';
  if (k === 'low') return 'faible';
  return severity.trim() || '—';
}

function anomalySeverityBadgeColor(
  severity: string,
): 'red' | 'orange' | 'yellow' | 'gray' {
  const k = severity.trim().toLowerCase();
  if (k === 'critical') return 'red';
  if (k === 'high') return 'orange';
  if (k === 'medium') return 'yellow';
  return 'gray';
}

type AnomalyDisplayRow = {
  bucketKey: string;
  bucketLabel: string;
  type: string;
  severity: string;
  description: string;
  details: Record<string, unknown>;
};

function collectAnomalyRows(anomalies: AdminHealthSystemPayload['anomalies'] | undefined): AnomalyDisplayRow[] {
  if (!anomalies || typeof anomalies !== 'object') return [];
  const rows: AnomalyDisplayRow[] = [];
  for (const [bucketKey, rawVal] of Object.entries(anomalies)) {
    if (!Array.isArray(rawVal)) continue;
    const bucketLabel =
      ANOMALY_BUCKET_LABELS_FR[bucketKey] ??
      bucketKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toLocaleUpperCase('fr-FR'));
    for (const item of rawVal) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const severity = typeof o.severity === 'string' ? o.severity : 'low';
      const description =
        typeof o.description === 'string' ? o.description : 'Anomalie signalée par le serveur';
      const type = typeof o.type === 'string' ? o.type : '—';
      const details =
        o.details && typeof o.details === 'object' && !Array.isArray(o.details)
          ? (o.details as Record<string, unknown>)
          : {};
      rows.push({ bucketKey, bucketLabel, type, severity, description, details });
    }
  }
  return rows;
}

function formatLatencyMs(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return `${Math.round(n)} ms`;
}

function formatObservedAt(raw: string): string {
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return raw;
  return new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Horodatage diagnostic (ISO, epoch s ou ms) → libellé opérateur. */
function formatAdminDiagnosticInstant(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '—';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : String(raw);
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return '—';
    return formatObservedAt(s);
  }
  return String(raw);
}

const SCHEDULER_TASK_LABELS_FR: Record<string, string> = {
  anomaly_detection: "Détection d'anomalies",
  health_check: 'Contrôle de santé applicative',
  cleanup: 'Nettoyage et archivage',
  weekly_reports: 'Rapports hebdomadaires',
};

function humanizeSchedulerTaskName(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key && SCHEDULER_TASK_LABELS_FR[key]) return SCHEDULER_TASK_LABELS_FR[key];
  if (!raw.trim()) return raw;
  return raw
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase('fr-FR') + w.slice(1).toLowerCase())
    .join(' ');
}

/** UUID v4 classique (affichage allégé ; valeur complète conservée pour le support via `title`). */
const STANDARD_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OperatorDisplayField = { text: string; full?: string };

function operatorDisplayField(raw: string | null | undefined): OperatorDisplayField {
  if (raw === null || raw === undefined) return { text: '—' };
  const s = raw.trim();
  if (!s) return { text: '—' };
  if (STANDARD_UUID_RE.test(s)) {
    return { text: `${s.slice(0, 8)}…${s.slice(-4)}`, full: s };
  }
  if (s.length > 36) {
    return { text: `${s.slice(0, 12)}…${s.slice(-6)}`, full: s };
  }
  return { text: s };
}

function formatContextMarkersForOperator(markers: readonly string[] | undefined): OperatorDisplayField {
  if (!markers?.length) return { text: '—' };
  const pieces = markers.map((m) => operatorDisplayField(m));
  const text = pieces.map((p) => p.text).join(', ');
  const fullJoined = markers.join(', ');
  const anyAbbrev = pieces.some((p) => p.full !== undefined);
  if (anyAbbrev || text !== fullJoined) {
    return { text, full: fullJoined };
  }
  return { text };
}

type EnvelopeSummaryRow = { label: string; value: string; valueTitle?: string };

function stringifyLiveValue(key: string, v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Number.isInteger(v) ? String(v) : v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (typeof v === 'string') {
    if (key === 'effective_open_state') return humanizeOpenState(v);
    if ((key === 'period_start' || key === 'period_end') && /\d{4}-\d{2}-\d{2}/.test(v)) {
      const t = Date.parse(v);
      if (Number.isFinite(t)) return new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    }
    return v.length > 120 ? `${v.slice(0, 117)}…` : v;
  }
  if (typeof v === 'object') return '(objet)';
  return String(v);
}

function envelopeSummaryLines(env: ContextEnvelopeStub): EnvelopeSummaryRow[] {
  const site = operatorDisplayField(env.siteId);
  const register = operatorDisplayField(env.activeRegisterId);
  const session = operatorDisplayField(env.cashSessionId ?? null);
  const markers = formatContextMarkersForOperator(env.contextMarkers);
  return [
    { label: 'Site actif', value: site.text, valueTitle: site.full },
    { label: 'Poste de caisse', value: register.text, valueTitle: register.full },
    { label: 'Session de caisse', value: session.text, valueTitle: session.full },
    { label: 'Repères de contexte (parcours)', value: markers.text, valueTitle: markers.full },
    { label: 'État du contexte', value: humanizeRuntimeStatus(env.runtimeStatus) },
    { label: 'Dernière mise à jour', value: new Date(env.issuedAt).toLocaleString('fr-FR') },
  ];
}

export function AdminSystemHealthWidget(_props: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const envelope = auth.getContextEnvelope();
  const token = auth.getAccessToken?.();

  const [busy, setBusy] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [lastRefreshedEnvelope, setLastRefreshedEnvelope] = useState<ContextEnvelopeStub | null>(null);

  const [snapshot, setSnapshot] = useState<ExploitationLiveSnapshot | null>(null);
  const [snapshotMeta, setSnapshotMeta] = useState<{ correlationId: string; degradedEmpty: boolean } | null>(
    null,
  );
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [liveStats, setLiveStats] = useState<UnifiedLiveStatsResponse | null>(null);
  const [liveStatsError, setLiveStatsError] = useState<string | null>(null);

  const [adminHealth, setAdminHealth] = useState<AdminHealthSystemPayload | null>(null);
  const [adminHealthError, setAdminHealthError] = useState<string | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState<AdminSessionMetricsEnvelope | null>(null);
  const [sessionMetricsError, setSessionMetricsError] = useState<string | null>(null);

  const [testNotifBusy, setTestNotifBusy] = useState(false);
  const [testNotifMessage, setTestNotifMessage] = useState<string | null>(null);
  const [testNotifError, setTestNotifError] = useState<string | null>(null);

  const loadSignals = useCallback(
    async (signal: AbortSignal) => {
      setSnapshotError(null);
      setLiveStatsError(null);
      setAdminHealthError(null);
      setSessionMetricsError(null);

      const snapResult: FetchLiveSnapshotResult = await fetchLiveSnapshot(signal, auth);
      if (signal.aborted) return;
      if (snapResult.ok) {
        setSnapshot(Object.keys(snapResult.snapshot).length ? snapResult.snapshot : null);
        setSnapshotMeta({ correlationId: snapResult.correlationId, degradedEmpty: snapResult.degradedEmpty });
      } else if (snapResult.kind === 'http') {
        setSnapshot(null);
        setSnapshotMeta({ correlationId: snapResult.correlationId, degradedEmpty: false });
        setSnapshotError(`Impossible de charger l’instantané d’exploitation (réponse ${snapResult.status}).`);
      } else if (snapResult.kind === 'network') {
        setSnapshot(null);
        setSnapshotMeta({ correlationId: snapResult.correlationId, degradedEmpty: false });
        setSnapshotError(snapResult.message);
      } else {
        setSnapshot(null);
        setSnapshotMeta({ correlationId: snapResult.correlationId, degradedEmpty: false });
        setSnapshotError(snapResult.message);
      }

      try {
        const siteId = envelope.siteId ?? undefined;
        const stats = await fetchUnifiedLiveStats(
          auth,
          { period_type: 'daily', site_id: siteId ?? null },
          signal,
        );
        if (signal.aborted) return;
        setLiveStats(stats);
      } catch (e) {
        setLiveStats(null);
        const msg =
          e instanceof DashboardLegacyApiError
            ? `${e.message} (${e.status})`
            : e instanceof Error
              ? e.message
              : 'Erreur inconnue';
        setLiveStatsError(msg);
      }

      const [healthR, metricsR] = await Promise.allSettled([
        fetchAdminHealthSystem(auth, signal),
        fetchAdminSessionMetrics(auth, { hours: 24, signal }),
      ]);
      if (signal.aborted) return;
      if (healthR.status === 'fulfilled') {
        setAdminHealth(healthR.value);
        setAdminHealthError(null);
      } else {
        setAdminHealth(null);
        const e = healthR.reason;
        setAdminHealthError(
          e instanceof AdminSystemHealthApiError
            ? `${e.message} (${e.status})`
            : e instanceof Error
              ? e.message
              : 'Erreur inconnue',
        );
      }
      if (metricsR.status === 'fulfilled') {
        setSessionMetrics(metricsR.value);
        setSessionMetricsError(null);
      } else {
        setSessionMetrics(null);
        const e = metricsR.reason;
        setSessionMetricsError(
          e instanceof AdminSystemHealthApiError
            ? `${e.message} (${e.status})`
            : e instanceof Error
              ? e.message
              : 'Erreur inconnue',
        );
      }
    },
    [auth, envelope.siteId],
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadSignals(ac.signal);
    return () => ac.abort();
  }, [loadSignals]);

  const onRefreshContext = useCallback(async () => {
    setRefreshMessage(null);
    if (!token) {
      setRefreshMessage('Jeton d’accès indisponible : utilisez la session live ou reconnectez-vous.');
      return;
    }
    setBusy(true);
    try {
      const r = await postRecycliqueContextEnvelopeRefresh(token);
      if (r.ok) {
        setLastRefreshedEnvelope(r.envelope);
        setRefreshMessage('Contexte recalculé par le serveur.');
      } else {
        setRefreshMessage(r.message);
      }
    } finally {
      setBusy(false);
    }
  }, [token]);

  const onReloadSignals = useCallback(async () => {
    setBusy(true);
    try {
      const ac = new AbortController();
      await loadSignals(ac.signal);
    } finally {
      setBusy(false);
    }
  }, [loadSignals]);

  const onTestNotificationsInfo = useCallback(async () => {
    setTestNotifMessage(null);
    setTestNotifError(null);
    setTestNotifBusy(true);
    try {
      const ac = new AbortController();
      const r = await postAdminHealthTestNotifications(auth, ac.signal);
      setTestNotifMessage(r.message);
    } catch (e) {
      const msg =
        e instanceof AdminSystemHealthApiError
          ? e.status === 403
            ? `${e.message} (403) — cette vérification peut exiger une session administrateur renforcée côté serveur.`
            : `${e.message} (${e.status})`
          : e instanceof Error
            ? e.message
            : 'Erreur inconnue';
      setTestNotifError(msg);
    } finally {
      setTestNotifBusy(false);
    }
  }, [auth]);

  const syncSummary = snapshot?.sync_operational_summary;
  const liveStatRows = useMemo(() => {
    if (!liveStats || typeof liveStats !== 'object') return [];
    const o = liveStats as Record<string, unknown>;
    const rows: { label: string; value: string }[] = [];
    for (const key of LIVE_STATS_DISPLAY_ORDER) {
      if (!(key in o)) continue;
      const v = o[key];
      if (v === undefined) continue;
      rows.push({ label: formatLiveStatLabel(key), value: stringifyLiveValue(key, v) });
    }
    return rows;
  }, [liveStats]);

  const envLines = useMemo(
    () => envelopeSummaryLines(lastRefreshedEnvelope ?? envelope),
    [envelope, lastRefreshedEnvelope],
  );

  const anomalyRows = useMemo(
    () => collectAnomalyRows(adminHealth?.anomalies),
    [adminHealth?.anomalies],
  );

  const schedulerTasks = adminHealth?.scheduler_status?.tasks ?? [];

  const sessionMetricExtras = useMemo(() => {
    const m = sessionMetrics?.metrics;
    if (!m) return null;
    const lat = m.latency_metrics;
    const hasLatency =
      lat &&
      typeof lat === 'object' &&
      ('min_ms' in lat || 'max_ms' in lat || 'avg_ms' in lat);
    const errEntries = Object.entries(m.error_breakdown ?? {}).filter(([, c]) => (c ?? 0) > 0);
    const ipEntries = Object.entries(m.ip_breakdown ?? {})
      .filter(([, c]) => (c ?? 0) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    const siteEntries = Object.entries(m.site_breakdown ?? {});
    return {
      hasLatency,
      lat,
      errEntries,
      ipEntries,
      siteEntries,
    };
  }, [sessionMetrics?.metrics]);

  return (
    <Stack gap="md" data-testid="admin-system-health-widget">
      <div>
        <Title
          order={1}
          size="h2"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          data-testid="admin-system-health-page-title"
        >
          <HeartPulse size={22} aria-hidden />
          Santé et signaux
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Vue d’ensemble pour le super-admin : où vous travaillez, ce que l’application voit en direct aujourd’hui, et
          les chiffres du jour lorsque le site est identifié. Aucune sonde matérielle, réseau ou infrastructure n’est
          lancée depuis cet écran : seules des données déjà calculées par l’application sont affichées.
        </Text>
      </div>

      <Alert color="gray" title="À propos de cet écran">
        Les blocs ci-dessous synthétisent l’état métier et applicatif déjà connu par Recyclique. Ils ne remplacent pas
        un monitoring d’infrastructure (pas de contrôle matériel ni de latence réseau « bas niveau »).
      </Alert>

      <Paper p="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <Server size={18} aria-hidden />
            <Text fw={600}>Contexte opérateur</Text>
          </Group>
          <Button
            size="xs"
            variant="light"
            leftSection={<RefreshCw size={14} />}
            loading={busy}
            onClick={() => void onRefreshContext()}
            data-testid="admin-system-health-refresh-context"
          >
            Recalcul serveur
          </Button>
        </Group>
        <Text size="xs" c="dimmed" mb="sm">
          Demande au serveur de recalculer le contexte opérateur (site, caisse, permissions).
        </Text>
        {refreshMessage ? (
          <Text size="sm" mb="xs" c={refreshMessage.includes('recalculé') ? 'teal' : 'red'}>
            {refreshMessage}
          </Text>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          {envLines.map((row) => (
            <div key={row.label}>
              <Text size="xs" c="dimmed">
                {row.label}
              </Text>
              <Text
                size="sm"
                style={{ wordBreak: 'break-word' }}
                title={row.valueTitle ? `Valeur complète : ${row.valueTitle}` : undefined}
              >
                {row.value}
              </Text>
            </div>
          ))}
        </SimpleGrid>
      </Paper>

      <Paper p="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <Activity size={18} aria-hidden />
            <Text fw={600}>Exploitation temps réel</Text>
          </Group>
          <Button
            size="xs"
            variant="light"
            leftSection={<RefreshCw size={14} />}
            loading={busy}
            onClick={() => void onReloadSignals()}
            data-testid="admin-system-health-reload-signals"
          >
            Actualiser les signaux
          </Button>
        </Group>
        {snapshotMeta ? (
          <Group gap="xs" mb="sm" align="flex-start">
            <Stack
              gap={2}
              title={
                snapshotMeta.correlationId
                  ? `Identifiant complet (à transmettre au support si besoin) : ${snapshotMeta.correlationId}`
                  : undefined
              }
            >
              <Text size="xs" c="dimmed">
                Repère de cette actualisation :{' '}
                {operatorDisplayField(snapshotMeta.correlationId || null).text}
              </Text>
              {snapshotMeta.correlationId && STANDARD_UUID_RE.test(snapshotMeta.correlationId.trim()) ? (
                <Text size="xs" c="dimmed">
                  Survolez ce bloc pour voir l’identifiant complet.
                </Text>
              ) : null}
            </Stack>
            {snapshotMeta.degradedEmpty ? (
              <Badge size="xs" color="yellow">
                Données partielles
              </Badge>
            ) : null}
          </Group>
        ) : null}
        {snapshotError ? (
          <Text size="sm" c="red" mb="xs">
            {snapshotError}
          </Text>
        ) : null}
        {!snapshot && !snapshotError ? (
          <Text size="sm" c="dimmed">
            Aucun signal structuré dans la dernière lecture (normal si le site ne publie pas encore ces champs).
          </Text>
        ) : null}
        {snapshot ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {snapshot.observed_at ? (
              <div>
                <Text size="xs" c="dimmed">
                  Relevé à
                </Text>
                <Text size="sm">{formatObservedAt(snapshot.observed_at)}</Text>
              </div>
            ) : null}
            {snapshot.effective_open_state !== undefined ? (
              <div>
                <Text size="xs" c="dimmed">
                  Ouverture du site
                </Text>
                <Text size="sm">{humanizeOpenState(String(snapshot.effective_open_state))}</Text>
              </div>
            ) : null}
            {snapshot.cash_session_effectiveness !== undefined ? (
              <div>
                <Text size="xs" c="dimmed">
                  Cohérence session caisse
                </Text>
                <Text size="sm">
                  {humanizeCashSessionEffectiveness(String(snapshot.cash_session_effectiveness))}
                </Text>
              </div>
            ) : null}
            {snapshot.bandeau_live_slice_enabled !== undefined ? (
              <div>
                <Text size="xs" c="dimmed">
                  Bandeau temps réel
                </Text>
                <Text size="sm">{snapshot.bandeau_live_slice_enabled ? 'activé' : 'désactivé'}</Text>
              </div>
            ) : null}
            {syncSummary ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <Text size="xs" c="dimmed" mb={4}>
                  Synchronisation (aperçu)
                </Text>
                <Group gap="md">
                  {syncSummary.worst_state !== undefined ? (
                    <Text size="sm">
                      Situation la plus défavorable :{' '}
                      <strong>{humanizeSyncWorstState(String(syncSummary.worst_state))}</strong>
                    </Text>
                  ) : null}
                  {syncSummary.source_reachable !== undefined ? (
                    <Text size="sm">
                      Connexion à la source distante :{' '}
                      <strong>{syncSummary.source_reachable ? 'joignable' : 'injoignable'}</strong>
                    </Text>
                  ) : null}
                  {syncSummary.deferred_remote_retry === true ? (
                    <Badge size="sm" color="orange">
                      Nouvel essai prévu
                    </Badge>
                  ) : null}
                </Group>
              </div>
            ) : null}
          </SimpleGrid>
        ) : null}
      </Paper>

      <Paper p="md" withBorder data-testid="admin-system-health-legacy-panel">
        <Group justify="space-between" align="flex-start" mb="xs" wrap="wrap">
          <div>
            <Text fw={600}>Synthèse santé (super-admin)</Text>
            <Text size="xs" c="dimmed" mt={4} maw={720}>
              Agrégats renvoyés par le serveur Recyclique : anomalies détaillées, recommandations, planificateur interne
              et indicateurs de sessions récentes. Vue applicative uniquement (pas d’infrastructure « bas niveau »).
            </Text>
          </div>
          <Button
            size="xs"
            variant="light"
            leftSection={<Bell size={14} />}
            loading={testNotifBusy}
            onClick={() => void onTestNotificationsInfo()}
            data-testid="admin-system-health-test-notifications"
          >
            Vérifier l’endpoint « test notifications »
          </Button>
        </Group>
        {testNotifMessage ? (
          <Alert color="gray" mb="sm" title="Réponse serveur">
            {testNotifMessage}
          </Alert>
        ) : null}
        {testNotifError ? (
          <Alert color="red" mb="sm" title="Contrôle notification">
            {testNotifError}
          </Alert>
        ) : null}
        {adminHealthError ? (
          <Text size="sm" c="red" mb="xs">
            Synthèse santé : {adminHealthError}
          </Text>
        ) : null}
        {sessionMetricsError ? (
          <Text size="sm" c="red" mb="xs">
            Métriques de sessions : {sessionMetricsError}
          </Text>
        ) : null}
        {adminHealth ? (
          <Stack gap="md" mb={sessionMetrics ? 'md' : 0}>
            <Alert
              color={
                adminHealth.system_health.overall_status === 'healthy'
                  ? 'teal'
                  : adminHealth.system_health.overall_status === 'critical'
                    ? 'red'
                    : 'yellow'
              }
              title={`État global : ${humanizeAdminOverallHealth(adminHealth.system_health.overall_status)}`}
            >
              <Text size="sm">
                {adminHealth.system_health.overall_status === 'healthy'
                  ? 'Les agrégats courants ne signalent pas de situation critique côté application.'
                  : adminHealth.system_health.overall_status === 'critical'
                    ? 'Des anomalies critiques figurent dans la liste ci-dessous : priorisez leur examen ou contactez le support avec ce contexte.'
                    : 'Certaines anomalies ou tâches méritent attention sans blocage immédiat apparent.'}
              </Text>
            </Alert>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              <Paper p="sm" withBorder>
                <Text size="xl" fw={700}>
                  {adminHealth.system_health.anomalies_detected}
                </Text>
                <Text size="xs" c="dimmed">
                  Anomalies listées
                </Text>
              </Paper>
              <Paper p="sm" withBorder>
                <Text size="xl" fw={700}>
                  {adminHealth.system_health.critical_anomalies}
                </Text>
                <Text size="xs" c="dimmed">
                  Anomalies critiques (décompte serveur)
                </Text>
              </Paper>
              <Paper p="sm" withBorder>
                <Text size="xl" fw={700}>
                  {adminHealth.system_health.active_tasks}
                </Text>
                <Text size="xs" c="dimmed">
                  Tâches planifiées suivies
                </Text>
              </Paper>
              <Paper p="sm" withBorder>
                <Text size="xl" fw={700}>
                  {adminHealth.system_health.scheduler_running ? 'Oui' : 'Non'}
                </Text>
                <Text size="xs" c="dimmed">
                  Planificateur actif
                </Text>
              </Paper>
            </SimpleGrid>
            <div>
              <Text size="xs" c="dimmed" mb={6}>
                Dernière passe de détection (serveur)
              </Text>
              <Text size="sm">{formatAdminDiagnosticInstant(adminHealth.system_health.timestamp)}</Text>
            </div>
            <Divider label="Anomalies signalées" labelPosition="left" />
            <div data-testid="admin-system-health-anomalies">
              {anomalyRows.length === 0 ? (
                <Text size="sm" c="teal" fs="italic">
                  Aucune anomalie structurée dans la dernière passe (ou listes vides renvoyées par le serveur).
                </Text>
              ) : (
                <Stack gap="sm">
                  {anomalyRows.map((row, idx) => (
                    <Paper key={`${row.bucketKey}-${row.type}-${idx}`} p="sm" withBorder>
                      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                          <Text size="xs" c="dimmed">
                            {row.bucketLabel}
                          </Text>
                          <Text size="sm" fw={500}>
                            {row.description}
                          </Text>
                          <Badge size="xs" variant="light" color={anomalySeverityBadgeColor(row.severity)}>
                            Gravité {humanizeAnomalySeverity(row.severity)}
                          </Badge>
                        </Stack>
                      </Group>
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: 'pointer', fontSize: 12 }}>
                          <Text span size="xs" c="dimmed" component="span">
                            Détails (support / diagnostic)
                          </Text>
                        </summary>
                        <Text
                          component="pre"
                          size="xs"
                          mt={8}
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {JSON.stringify(row.details, null, 2)}
                        </Text>
                      </details>
                    </Paper>
                  ))}
                </Stack>
              )}
            </div>
            <Divider label="Recommandations" labelPosition="left" />
            {adminHealth.recommendations?.length ? (
              <Stack gap="sm">
                {adminHealth.recommendations.map((r) => (
                  <Paper key={`${r.type}-${r.title}`} p="sm" withBorder>
                    <Badge size="xs" variant="light" color="gray" mb={6}>
                      Priorité {humanizeRecommendationPriority(r.priority)}
                    </Badge>
                    <Text fw={600} size="sm">
                      {r.title}
                    </Text>
                    <Text size="sm" mt={6}>
                      {r.description}
                    </Text>
                    {Array.isArray(r.actions) && r.actions.filter(Boolean).length > 0 ? (
                      <Stack gap={4} mt="sm">
                        <Text size="xs" c="dimmed" fw={600}>
                          Pistes d’action
                        </Text>
                        {r.actions.filter((a): a is string => typeof a === 'string' && a.trim().length > 0).map((a, i) => (
                          <Text key={i} size="sm" pl="sm" style={{ borderLeft: '2px solid var(--mantine-color-gray-4)' }}>
                            {a}
                          </Text>
                        ))}
                      </Stack>
                    ) : null}
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="teal" fs="italic">
                Aucune recommandation active renvoyée par le serveur.
              </Text>
            )}
            <Divider label="Planificateur de tâches" labelPosition="left" />
            <div>
              <Text size="sm" mb="xs">
                État d’ensemble :{' '}
                <strong>{adminHealth.scheduler_status.running ? 'en service' : 'à l’arrêt'}</strong> —{' '}
                {adminHealth.scheduler_status.total_tasks} tâche(s) référencée(s)
              </Text>
              {schedulerTasks.length > 0 ? (
                <Stack gap={8}>
                  {schedulerTasks.map((t) => (
                    <Text key={t.name} size="sm">
                      {humanizeSchedulerTaskName(t.name)} — {t.enabled ? 'activée' : 'mise en pause'}
                      {' · '}
                      {t.running === true ? 'exécution en cours' : 'pas d’exécution en cours'}
                      {typeof t.interval_minutes === 'number' && t.interval_minutes > 0
                        ? ` · fréquence indicative ~${t.interval_minutes} min`
                        : ''}
                      {t.last_run != null && String(t.last_run).trim() !== ''
                        ? ` · dernière passe ${formatAdminDiagnosticInstant(t.last_run)}`
                        : ''}
                      {t.next_run != null && String(t.next_run).trim() !== ''
                        ? ` · prochaine fenêtre ${formatAdminDiagnosticInstant(t.next_run)}`
                        : ''}
                    </Text>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  Aucune ligne de tâche dans la réponse (normal si le planificateur n’expose pas encore le détail).
                </Text>
              )}
            </div>
          </Stack>
        ) : !adminHealthError ? (
          <Text size="sm" c="dimmed" mb="sm">
            Aucune synthèse serveur chargée pour l’instant.
          </Text>
        ) : null}
        {sessionMetrics?.metrics ? (
          <>
            <Divider label="Sessions et rafraîchissements" labelPosition="left" my="md" />
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xs">
              <div>
                <Text size="xs" c="dimmed">
                  Opérations suivies (période)
                </Text>
                <Text size="sm">{sessionMetrics.metrics.total_operations}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Rafraîchissements réussis / échoués
                </Text>
                <Text size="sm">
                  {sessionMetrics.metrics.refresh_success_count} /{' '}
                  {sessionMetrics.metrics.refresh_failure_count}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Taux de succès des rafraîchissements
                </Text>
                <Text size="sm">{sessionMetrics.metrics.refresh_success_rate_percent} %</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Sessions actives (estimation)
                </Text>
                <Text size="sm">{sessionMetrics.metrics.active_sessions_estimate}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Déconnexions forcées / manuelles
                </Text>
                <Text size="sm">
                  {sessionMetrics.metrics.logout_forced_count} /{' '}
                  {sessionMetrics.metrics.logout_manual_count}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Fenêtre (heures)
                </Text>
                <Text size="sm">{sessionMetrics.metrics.time_period_hours}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Relevé métriques sessions
                </Text>
                <Text size="sm">{formatAdminDiagnosticInstant(sessionMetrics.metrics.timestamp)}</Text>
              </div>
            </SimpleGrid>
            {sessionMetricExtras?.hasLatency ? (
              <Paper p="sm" withBorder mt="sm">
                <Text size="xs" c="dimmed" mb={4}>
                  Latences de rafraîchissement (min / max / moyenne)
                </Text>
                <Text size="sm">
                  {formatLatencyMs(
                    sessionMetricExtras.lat && typeof sessionMetricExtras.lat === 'object'
                      ? (sessionMetricExtras.lat as { min_ms?: unknown }).min_ms
                      : undefined,
                  )}{' '}
                  /{' '}
                  {formatLatencyMs(
                    sessionMetricExtras.lat && typeof sessionMetricExtras.lat === 'object'
                      ? (sessionMetricExtras.lat as { max_ms?: unknown }).max_ms
                      : undefined,
                  )}{' '}
                  /{' '}
                  {formatLatencyMs(
                    sessionMetricExtras.lat && typeof sessionMetricExtras.lat === 'object'
                      ? (sessionMetricExtras.lat as { avg_ms?: unknown }).avg_ms
                      : undefined,
                  )}
                </Text>
              </Paper>
            ) : null}
            {sessionMetricExtras && sessionMetricExtras.errEntries.length > 0 ? (
              <div data-testid="admin-system-health-session-errors" style={{ marginTop: 12 }}>
                <Text size="xs" c="dimmed" mb={6}>
                  Rappels d’erreurs par type (fenêtre courante)
                </Text>
                <Stack gap={6}>
                  {sessionMetricExtras.errEntries.map(([code, count]) => (
                    <Group key={code} justify="space-between" wrap="nowrap">
                      <Text size="sm" style={{ wordBreak: 'break-word' }}>
                        {code}
                      </Text>
                      <Badge size="sm" color="orange" variant="light">
                        {String(count)}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </div>
            ) : null}
            {sessionMetricExtras && sessionMetricExtras.ipEntries.length > 0 ? (
              <div data-testid="admin-system-health-session-ip" style={{ marginTop: 12 }}>
                <Text size="xs" c="dimmed" mb={6}>
                  Principales adresses IP associées à des échecs (aperçu)
                </Text>
                <Stack gap={6}>
                  {sessionMetricExtras.ipEntries.slice(0, 8).map(([ip, count]) => (
                    <Group key={ip} justify="space-between" wrap="nowrap">
                      <Text size="sm" ff="monospace">
                        {ip}
                      </Text>
                      <Badge size="sm" color="gray" variant="light">
                        {String(count)}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </div>
            ) : null}
            {sessionMetricExtras && sessionMetricExtras.siteEntries.length > 0 ? (
              <div data-testid="admin-system-health-session-sites" style={{ marginTop: 12 }}>
                <Text size="xs" c="dimmed" mb={6}>
                  Répartition par site (succès / échecs)
                </Text>
                <Stack gap={6}>
                  {sessionMetricExtras.siteEntries.map(([siteId, pair]) => {
                    const disp = operatorDisplayField(siteId);
                    const success =
                      pair && typeof pair === 'object' && 'success' in pair
                        ? Number((pair as { success: unknown }).success)
                        : 0;
                    const failure =
                      pair && typeof pair === 'object' && 'failure' in pair
                        ? Number((pair as { failure: unknown }).failure)
                        : 0;
                    return (
                      <Group key={siteId} justify="space-between" wrap="nowrap" align="flex-start">
                        <Text size="sm" title={disp.full}>
                          {disp.text}
                        </Text>
                        <Text size="sm">
                          {success} ok / {failure} en échec
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
              </div>
            ) : null}
          </>
        ) : !sessionMetricsError ? (
          <Text size="sm" c="dimmed">
            Aucune métrique de session renvoyée pour cette période.
          </Text>
        ) : null}
      </Paper>

      <Paper p="md" withBorder>
        <Text fw={600} mb="xs">
          Indicateurs du jour
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          Agrégats journaliers pour le site sélectionné dans votre contexte (lorsque le serveur les fournit).
        </Text>
        {liveStatsError ? (
          <Text size="sm" c="red">
            {liveStatsError}
          </Text>
        ) : null}
        {liveStatRows.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xs">
            {liveStatRows.map((row) => (
              <div key={row.label}>
                <Text size="xs" c="dimmed">
                  {row.label}
                </Text>
                <Text size="sm" style={{ wordBreak: 'break-word' }}>
                  {row.value}
                </Text>
              </div>
            ))}
          </SimpleGrid>
        ) : !liveStatsError ? (
          <Text size="sm" c="dimmed">
            Aucun indicateur chiffré disponible pour l’instant.
          </Text>
        ) : null}
      </Paper>
    </Stack>
  );
}
