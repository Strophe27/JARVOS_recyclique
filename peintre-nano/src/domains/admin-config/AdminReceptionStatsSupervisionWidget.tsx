import { Alert, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { BarChart3, ClipboardList } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  DashboardLegacyApiError,
  fetchReceptionByCategory,
  fetchReceptionStatsSummary,
  fetchUnifiedLiveStats,
  type CategoryStatRow,
  type ReceptionStatsSummaryResponse,
  type UnifiedLiveStatsResponse,
} from '../../api/dashboard-legacy-stats-client';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { AdminDetailSimpleDemoStrip } from './AdminListPageShell';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function numFromSummary(o: ReceptionStatsSummaryResponse, key: string): number | null {
  const v = o[key];
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function formatLivePayload(live: UnifiedLiveStatsResponse | null): { key: string; value: string }[] {
  if (!live || typeof live !== 'object') return [];
  const out: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(live)) {
    if (v === null || v === undefined) {
      out.push({ key: k, value: '—' });
    } else if (typeof v === 'object') {
      out.push({ key: k, value: JSON.stringify(v) });
    } else {
      out.push({ key: k, value: String(v) });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Story 19.1 — stats / supervision réception (rail U) : lectures via `dashboard-legacy-stats-client`
 * alignées sur `recyclique_stats_*` ; pas de `GET /v1/reception/stats/live` (déprécié) ; gaps **K** explicites.
 */
export function AdminReceptionStatsSupervisionWidget(_: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const [periodType, setPeriodType] = useState<'24h' | 'daily'>('24h');
  const [summary, setSummary] = useState<ReceptionStatsSummaryResponse | null>(null);
  const [byCategory, setByCategory] = useState<CategoryStatRow[]>([]);
  const [live, setLive] = useState<UnifiedLiveStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errSummary, setErrSummary] = useState<string | null>(null);
  const [errCategory, setErrCategory] = useState<string | null>(null);
  const [errLive, setErrLive] = useState<string | null>(null);

  const range = useMemo(() => {
    const end = new Date();
    const start = addDays(end, -(rangeDays - 1));
    return { start: isoDate(start), end: isoDate(end) };
  }, [rangeDays]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErrSummary(null);
    setErrCategory(null);
    setErrLive(null);
    void (async () => {
      try {
        const [s, c] = await Promise.all([
          fetchReceptionStatsSummary(auth, range, ac.signal).catch((e: unknown) => {
            if (e instanceof DashboardLegacyApiError) {
              setErrSummary(`${e.status}: ${e.message}`);
            } else {
              setErrSummary(e instanceof Error ? e.message : 'Erreur résumé');
            }
            return null;
          }),
          fetchReceptionByCategory(auth, range, ac.signal).catch((e: unknown) => {
            if (e instanceof DashboardLegacyApiError) {
              setErrCategory(`${e.status}: ${e.message}`);
            } else {
              setErrCategory(e instanceof Error ? e.message : 'Erreur par catégorie');
            }
            return [] as CategoryStatRow[];
          }),
        ]);
        if (!ac.signal.aborted) {
          setSummary(s);
          setByCategory(c);
        }
        const siteId = envelope.siteId?.trim() ? envelope.siteId : null;
        const l = await fetchUnifiedLiveStats(
          auth,
          { period_type: periodType, site_id: siteId },
          ac.signal,
        ).catch((e: unknown) => {
          if (e instanceof DashboardLegacyApiError) {
            setErrLive(`${e.status}: ${e.message}`);
          } else {
            setErrLive(e instanceof Error ? e.message : 'Erreur live');
          }
          return null;
        });
        if (!ac.signal.aborted) setLive(l);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [auth, envelope.siteId, periodType, range]);

  const totalWeight = summary ? numFromSummary(summary, 'total_weight') : null;
  const totalItems = summary ? numFromSummary(summary, 'total_items') : null;

  return (
    <Stack gap="md" data-testid="widget-admin-reception-stats-supervision">
      <Text size="sm" data-testid="admin-reception-stats-operation-anchors" c="dimmed">
        Fetches branchés :{' '}
        <code>recyclique_stats_receptionSummary</code>, <code>recyclique_stats_receptionByCategory</code>,{' '}
        <code>recyclique_stats_unifiedLive</code> — pas d&apos;appel à <code>recyclique_reception_statsLiveDeprecated</code>{' '}
        (<code>GET /v1/reception/stats/live</code>).
      </Text>

      <Group gap="sm" wrap="wrap">
        <Text size="sm" fw={600}>
          Période agrégats (résumé + par catégorie) :
        </Text>
        <Button size="xs" variant={rangeDays === 7 ? 'filled' : 'light'} onClick={() => setRangeDays(7)}>
          7 jours
        </Button>
        <Button size="xs" variant={rangeDays === 30 ? 'filled' : 'light'} onClick={() => setRangeDays(30)}>
          30 jours
        </Button>
        <Text size="xs" c="dimmed">
          {range.start} → {range.end} (paramètres <code>start_date</code> / <code>end_date</code>)
        </Text>
      </Group>

      <Group gap="sm" wrap="wrap">
        <Text size="sm" fw={600}>
          Live unifié — <code>period_type</code> :
        </Text>
        <Button size="xs" variant={periodType === '24h' ? 'filled' : 'light'} onClick={() => setPeriodType('24h')}>
          24h
        </Button>
        <Button size="xs" variant={periodType === 'daily' ? 'filled' : 'light'} onClick={() => setPeriodType('daily')}>
          daily
        </Button>
        <Text size="xs" c="dimmed">
          <code>site_id</code> optionnel : {envelope.siteId ? envelope.siteId : 'non transmis (contexte sans site)'}
        </Text>
      </Group>

      {loading ? <Text size="sm">Chargement…</Text> : null}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Paper withBorder p="md" data-operation-id="recyclique_stats_receptionSummary">
          <Group gap="xs" mb="xs">
            <BarChart3 size={20} aria-hidden />
            <Title order={3} size="h4">
              Résumé réception (période)
            </Title>
          </Group>
          {errSummary ? (
            <Alert color="red" title="Erreur GET /v1/stats/reception/summary">
              {errSummary}
              {(errSummary.startsWith('401') || errSummary.startsWith('403')) && (
                <Text size="sm" mt="xs">
                  Contrat admin (16.4) : agrégats sensibles — rôle insuffisant ou session absente ; pas de contournement
                  côté UI.
                </Text>
              )}
            </Alert>
          ) : (
            <Stack gap={4}>
              <Text size="sm">
                Poids total (champ <code>total_weight</code> si présent) :{' '}
                <strong>{totalWeight != null ? `${totalWeight.toFixed(2)}` : '—'}</strong>
              </Text>
              <Text size="sm">
                Articles (champ <code>total_items</code> si présent) :{' '}
                <strong>{totalItems != null ? totalItems : '—'}</strong>
              </Text>
              <Text size="xs" c="dimmed">
                Autres clés renvoyées par le serveur : affichage brut sans réinterprétation métier.
              </Text>
              {summary && (
                <pre style={{ fontSize: 11, overflow: 'auto', maxHeight: 120 }}>
                  {JSON.stringify(summary, null, 2)}
                </pre>
              )}
            </Stack>
          )}
        </Paper>

        <Paper withBorder p="md" data-operation-id="recyclique_stats_unifiedLive">
          <Group gap="xs" mb="xs">
            <ClipboardList size={20} aria-hidden />
            <Title order={3} size="h4">
              KPIs live unifiés
            </Title>
          </Group>
          {errLive ? (
            <Alert color="orange" title="Erreur GET /v1/stats/live">
              {errLive}
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Clé (réponse OpenAPI)</Table.Th>
                  <Table.Th>Valeur</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {formatLivePayload(live).map((row) => (
                  <Table.Tr key={row.key}>
                    <Table.Td>
                      <code>{row.key}</code>
                    </Table.Td>
                    <Table.Td>{row.value}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" data-operation-id="recyclique_stats_receptionByCategory">
        <Title order={3} size="h4" mb="sm">
          Réception par catégorie
        </Title>
        {errCategory ? (
          <Alert color="red" title="Erreur GET /v1/stats/reception/by-category">
            {errCategory}
          </Alert>
        ) : byCategory.length === 0 ? (
          <Text size="sm" c="dimmed">
            Aucune ligne (liste vide ou champs non reconnus).
          </Text>
        ) : (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Catégorie</Table.Th>
                <Table.Th>Poids</Table.Th>
                <Table.Th>Articles</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {byCategory.map((r, i) => (
                <Table.Tr key={`${r.category_name}-${i}`}>
                  <Table.Td>{r.category_name}</Table.Td>
                  <Table.Td>{r.total_weight}</Table.Td>
                  <Table.Td>{r.total_items}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Alert color="gray" title="Supervision nominative (opérateurs, sessions, classements)" data-testid="admin-reception-nominative-gap-k">
        <Text size="sm">
          Aucun <code>operation_id</code> stabilisé dans <code>contracts/openapi/recyclique-api.yaml</code> pour une liste
          nominative pilotage (ex. par opérateur ou par session réception) dans le périmètre **19.1** — gap{' '}
          <strong>K</strong> ; parcours liste + détail réservé <strong>19.2</strong> ; fermeture contractuelle éventuelle{' '}
          <strong>Epic 16</strong> / rail <strong>K</strong>. Aucune donnée simulée.
        </Text>
      </Alert>

      <Alert color="yellow" title="Dette visuelle vs legacy `ReceptionDashboard.tsx`">
        <Text size="sm">
          Graphiques Recharts et métriques additionnelles du legacy : hors slice tant que le schéma OpenAPI ne porte pas des
          champs exploitables pour les mêmes séries — pas d&apos;approximation silencieuse.
        </Text>
      </Alert>

      <AdminDetailSimpleDemoStrip />
    </Stack>
  );
}
