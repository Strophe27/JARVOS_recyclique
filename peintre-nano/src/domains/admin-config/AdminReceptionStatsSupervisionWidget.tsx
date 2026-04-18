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
import { formatReceptionDateTimeFr, formatReceptionWeightKg } from './reception-admin-display';

function isoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDayIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
}

function endOfLocalDayIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
}

function isAbortLikeError(error: unknown): boolean {
  return (
    error instanceof DOMException
      ? error.name === 'AbortError'
      : error instanceof Error
        ? error.name === 'AbortError'
        : false
  );
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

/** Libellés lisibles pour les indicateurs renvoyés par le flux unifié (clés stables côté serveur). */
const LIVE_STAT_LABELS: Record<string, string> = {
  tickets_count: 'Nombre de tickets caisse',
  last_ticket_amount: 'Montant du dernier ticket',
  ca: 'Chiffre d’affaires',
  donations: 'Dons',
  weight_out_sales: 'Poids sorti (ventes)',
  tickets_open: 'Tickets caisse ouverts',
  tickets_closed_24h: 'Tickets caisse fermés (24 h)',
  items_received: 'Articles reçus',
  weight_in: 'Poids entrant',
  weight_out: 'Poids sortant',
  period_start: 'Début de période',
  period_end: 'Fin de période',
  reception_open_sessions: 'Sessions de réception ouvertes',
  total_weight: 'Poids total',
  total_items: 'Nombre d’articles',
  unique_categories: 'Catégories distinctes',
  timestamp: 'Horodatage',
};

function liveStatLabel(key: string): string {
  return LIVE_STAT_LABELS[key] ?? key.replace(/_/g, ' ');
}

function formatLiveValue(key: string, v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (key.includes('weight') || key === 'weight_in' || key === 'weight_out' || key === 'weight_out_sales') {
      return formatReceptionWeightKg(v);
    }
    return v.toLocaleString('fr-FR');
  }
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v.trim())) {
      return formatReceptionDateTimeFr(v);
    }
    return v;
  }
  if (typeof v === 'object') {
    return JSON.stringify(v);
  }
  return String(v);
}

function formatLiveRows(live: UnifiedLiveStatsResponse | null): { key: string; label: string; value: string }[] {
  if (!live || typeof live !== 'object') return [];
  const out: { key: string; label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(live)) {
    out.push({ key: k, label: liveStatLabel(k), value: formatLiveValue(k, v) });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

const SUMMARY_EXTRA_LABELS: Record<string, string> = {
  unique_categories: 'Catégories distinctes',
  period_start: 'Début de période',
  period_end: 'Fin de période',
  start_date: 'Date de début (réponse)',
  end_date: 'Date de fin (réponse)',
};

function summaryExtraRows(summary: ReceptionStatsSummaryResponse): { label: string; value: string }[] {
  const skip = new Set(['total_weight', 'total_items', 'unique_categories']);
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(summary)) {
    if (skip.has(k)) continue;
    if (v === null || v === undefined) continue;
    const label = SUMMARY_EXTRA_LABELS[k] ?? k.replace(/_/g, ' ');
    if (typeof v === 'number' && Number.isFinite(v)) {
      out.push({ label, value: v.toLocaleString('fr-FR') });
    } else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) {
      out.push({ label, value: formatReceptionDateTimeFr(v) });
    } else if (typeof v === 'object') {
      out.push({ label, value: JSON.stringify(v) });
    } else {
      out.push({ label, value: String(v) });
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

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
    return {
      start: startOfLocalDayIso(start),
      end: endOfLocalDayIso(end),
      startLabel: isoDate(start),
      endLabel: isoDate(end),
    };
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
            if (ac.signal.aborted || isAbortLikeError(e)) {
              return null;
            }
            if (e instanceof DashboardLegacyApiError) {
              setErrSummary(`${e.status}: ${e.message}`);
            } else {
              setErrSummary(e instanceof Error ? e.message : 'Erreur résumé');
            }
            return null;
          }),
          fetchReceptionByCategory(auth, range, ac.signal).catch((e: unknown) => {
            if (ac.signal.aborted || isAbortLikeError(e)) {
              return [] as CategoryStatRow[];
            }
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
          if (ac.signal.aborted || isAbortLikeError(e)) {
            return null;
          }
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
  const uniqueCategories = summary ? numFromSummary(summary, 'unique_categories') : null;
  const extraSummary = summary ? summaryExtraRows(summary) : [];

  return (
    <Stack gap="md" data-testid="widget-admin-reception-stats-supervision">
      <div>
        <Title order={2}>Tableau de bord réception</Title>
        <Text size="sm" c="dimmed" mt={6} data-testid="admin-reception-stats-operation-anchors">
          Données officielles : synthèse et répartition sur la période choisie, plus les indicateurs d’activité en direct
          pour le site courant lorsqu’il est connu.
        </Text>
      </div>

      <Group gap="sm" wrap="wrap">
        <Text size="sm" fw={600}>
          Période pour le résumé et le tableau par catégorie :
        </Text>
        <Button size="xs" variant={rangeDays === 7 ? 'filled' : 'light'} onClick={() => setRangeDays(7)}>
          7 jours
        </Button>
        <Button size="xs" variant={rangeDays === 30 ? 'filled' : 'light'} onClick={() => setRangeDays(30)}>
          30 jours
        </Button>
        <Text size="xs" c="dimmed">
          Du {range.startLabel} au {range.endLabel}
        </Text>
      </Group>

      <Group gap="sm" wrap="wrap">
        <Text size="sm" fw={600}>
          Rythme des indicateurs en direct :
        </Text>
        <Button size="xs" variant={periodType === '24h' ? 'filled' : 'light'} onClick={() => setPeriodType('24h')}>
          Dernières 24 h
        </Button>
        <Button size="xs" variant={periodType === 'daily' ? 'filled' : 'light'} onClick={() => setPeriodType('daily')}>
          Vue jour
        </Button>
        <Text size="xs" c="dimmed">
          {envelope.siteId
            ? `Site filtré : ${envelope.siteId}`
            : 'Aucun site précis dans le contexte : agrégats multi-sites côté serveur.'}
        </Text>
      </Group>

      {loading ? <Text size="sm">Chargement…</Text> : null}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Paper withBorder p="md" data-operation-id="recyclique_stats_receptionSummary">
          <Group gap="xs" mb="xs">
            <BarChart3 size={20} aria-hidden />
            <Title order={3} size="h4">
              Synthèse sur la période
            </Title>
          </Group>
          {errSummary ? (
            <Alert color="red" title="Impossible de charger le résumé">
              {errSummary}
              {(errSummary.startsWith('401') || errSummary.startsWith('403')) && (
                <Text size="sm" mt="xs">
                  Votre rôle ne permet pas d’afficher ces agrégats, ou la session n’est pas valide. Aucune donnée de
                  remplacement n’est affichée.
                </Text>
              )}
            </Alert>
          ) : (
            <Stack gap={4}>
              <Text size="sm">
                Poids total :{' '}
                <strong>{totalWeight != null ? `${totalWeight.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : '—'}</strong>
              </Text>
              <Text size="sm">
                Articles : <strong>{totalItems != null ? totalItems.toLocaleString('fr-FR') : '—'}</strong>
              </Text>
              {uniqueCategories != null ? (
                <Text size="sm">
                  Catégories distinctes :{' '}
                  <strong>{uniqueCategories.toLocaleString('fr-FR')}</strong>
                </Text>
              ) : null}
              {extraSummary.length > 0 ? (
                <>
                  <Text size="xs" c="dimmed" mt={4}>
                    Autres champs renvoyés tels quels :
                  </Text>
                  <Table striped withTableBorder withColumnBorders>
                    <Table.Tbody>
                      {extraSummary.map((row) => (
                        <Table.Tr key={row.label}>
                          <Table.Td w="45%">
                            <Text size="sm">{row.label}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" style={{ wordBreak: 'break-word' }}>
                              {row.value}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </>
              ) : null}
            </Stack>
          )}
        </Paper>

        <Paper withBorder p="md" data-operation-id="recyclique_stats_unifiedLive">
          <Group gap="xs" mb="xs">
            <ClipboardList size={20} aria-hidden />
            <Title order={3} size="h4">
              Indicateurs en direct
            </Title>
          </Group>
          {errLive ? (
            <Alert color="orange" title="Impossible de charger les indicateurs en direct">
              {errLive}
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Indicateur</Table.Th>
                  <Table.Th>Valeur</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {formatLiveRows(live).map((row) => (
                  <Table.Tr key={row.key}>
                    <Table.Td>
                      <Text size="sm">{row.label}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ wordBreak: 'break-word' }}>
                        {row.value}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" data-operation-id="recyclique_stats_receptionByCategory">
        <Title order={3} size="h4" mb="sm">
          Répartition par catégorie
        </Title>
        {errCategory ? (
          <Alert color="red" title="Impossible de charger le détail par catégorie">
            {errCategory}
          </Alert>
        ) : byCategory.length === 0 ? (
          <Text size="sm" c="dimmed">
            Aucune donnée pour cette période.
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
                  <Table.Td>{formatReceptionWeightKg(r.total_weight)}</Table.Td>
                  <Table.Td>{r.total_items.toLocaleString('fr-FR')}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Alert color="gray" title="Suivi par personne ou par session" data-testid="admin-reception-nominative-gap-k">
        <Text size="sm">
          Une liste nominative des opérateurs ou un classement détaillé des sessions de réception n’est pas encore
          exposée de façon stable par le service. Les tickets et leur détail restent accessibles depuis l’entrée
          « Sessions de réception ». Aucune donnée inventée n’est affichée ici.
        </Text>
      </Alert>

      <Text size="xs" c="dimmed">
        Les graphiques du tableau de bord historique (barres, secteurs) ne sont pas recopiés tant que les mêmes séries
        ne sont pas fournies de manière exploitable pour ce masque.
      </Text>
    </Stack>
  );
}
