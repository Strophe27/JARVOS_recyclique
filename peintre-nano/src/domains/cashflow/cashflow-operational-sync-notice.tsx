import { Alert, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { fetchLiveSnapshot } from '../../api/live-snapshot-client';
import type { AuthContextPort } from '../../app/auth/auth-context-port';
import { labelSyncOperationalState } from '../../api/recyclique-api-error';
import type { ExploitationLiveSnapshot } from '../bandeau-live/live-snapshot-normalize';

type CacheEntry = {
  readonly at: number;
  readonly snapshot: ExploitationLiveSnapshot | null;
  readonly correlationId: string;
  readonly fetchError?: string;
};

const TTL_MS = 25_000;
let cache: CacheEntry | null = null;
let inFlight: Promise<CacheEntry> | null = null;

/** Vitest (même worker) : vide le cache entre scénarios de test du bandeau sync. */
export function resetCashflowOperationalSyncNoticeCacheForTests(): void {
  if (typeof process === 'undefined' || process.env.VITEST !== 'true') return;
  cache = null;
  inFlight = null;
}

async function loadOperationalSync(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<CacheEntry> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return cache;
  }
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    const ac = new AbortController();
    try {
      const r = await fetchLiveSnapshot(ac.signal, auth);
      if (!r.ok) {
        const msg =
          r.kind === 'http'
            ? `HTTP ${r.status}`
            : r.kind === 'network'
              ? r.message
              : r.message;
        const next: CacheEntry = {
          at: Date.now(),
          snapshot: null,
          correlationId: r.correlationId,
          fetchError: msg,
        };
        cache = next;
        return next;
      }
      const next: CacheEntry = {
        at: Date.now(),
        snapshot: r.snapshot,
        correlationId: r.correlationId,
      };
      cache = next;
      return next;
    } catch {
      const next: CacheEntry = {
        at: Date.now(),
        snapshot: null,
        correlationId: '—',
        fetchError: 'Lecture live-snapshot interrompue',
      };
      cache = next;
      return next;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Bandeau non alarmiste : consomme `sync_operational_summary` du live-snapshot (OpenAPI / FR24).
 * Pas d’outbox ni worker — affichage seulement.
 */
export function CashflowOperationalSyncNotice(props: {
  readonly auth: Pick<AuthContextPort, 'getAccessToken'>;
}): ReactNode {
  const { auth } = props;
  const [entry, setEntry] = useState<CacheEntry | null>(cache);

  useEffect(() => {
    let cancelled = false;
    void loadOperationalSync(auth).then((e) => {
      if (!cancelled) setEntry(e);
    });
    return () => {
      cancelled = true;
    };
  }, [auth]);

  if (!entry) {
    return null;
  }

  if (entry.fetchError) {
    return (
      <Alert color="gray" title="Visibilité synchronisation indisponible" mb="sm" data-testid="cashflow-sync-notice-degraded">
        <Text size="sm">
          Impossible de lire l’état agrégé de synchronisation ({entry.fetchError}). La caisse ne simule pas d’état
          comptable — poursuivez selon les messages des opérations (vente, clôture).
        </Text>
        <Text size="xs" mt="xs" ff="monospace">
          Réf. : {entry.correlationId}
        </Text>
      </Alert>
    );
  }

  if (entry.snapshot?.sync_aggregate_unavailable === true) {
    return (
      <Alert color="orange" variant="light" mb="sm" data-testid="cashflow-sync-notice-aggregate-unavailable">
        <Text size="sm">
          Synthèse de synchronisation Paheko non calculée sur ce cliché (agrégat serveur indisponible). Ne présumez
          pas que tout est « résolu » — la caisse locale reste autoritaire pour les encaissements immédiats ; consultez
          le support pour l’historique distant.
        </Text>
      </Alert>
    );
  }

  const sync = entry.snapshot?.sync_operational_summary;
  if (sync == null || sync.worst_state == null) {
    return (
      <Alert color="gray" variant="light" mb="sm" data-testid="cashflow-sync-notice-unknown">
        <Text size="sm">
          État de synchronisation comptable : non détaillé par le serveur sur ce cliché. Les enregistrements Recyclique
          restent la référence locale ; ne présumez pas d’une écriture Paheko finalisée sans confirmation aval.
        </Text>
      </Alert>
    );
  }

  const ws = sync.worst_state;
  const label = labelSyncOperationalState(ws) ?? ws;

  if (ws === 'resolu') {
    return (
      <Alert color="teal" variant="light" mb="sm" data-testid="cashflow-sync-notice-resolu">
        <Text size="sm">
          Synchronisation opérationnelle (aperçu serveur) : {label}
          {typeof sync.source_reachable === 'boolean'
            ? sync.source_reachable
              ? ' — source joignable.'
              : ' — source comptable signalée comme injoignable (pas forcément bloquant caisse).'
            : '.'}
        </Text>
      </Alert>
    );
  }

  if (ws === 'a_reessayer') {
    const partial =
      sync.partial_success === true ? (
        <Text size="xs" mt="xs" c="orange">
          Livraison partielle Paheko signalée sur ce site : au moins une sous-écriture est déjà partie ; le retry ne
          couvre pas forcément tout le lot — vérifiez le support ou la ligne outbox avant de conclure.
        </Text>
      ) : null;
    return (
      <Alert color="blue" variant="light" mb="sm" data-testid="cashflow-sync-notice-deferred">
        <Text size="sm">
          {label} : des écritures peuvent être en file côté serveur. Ce n’est pas un blocage de caisse tant que le
          backend n’indique pas une quarantaine. Ne présumez pas que tout est répercuté comptablement à l’instant T.
        </Text>
        {partial}
      </Alert>
    );
  }

  if (ws === 'en_quarantaine' || ws === 'rejete') {
    return (
      <Alert color="orange" mb="sm" data-testid="cashflow-sync-notice-blocking">
        <Text size="sm">
          {label} — le serveur signale un point sensible sur la synchronisation. Vérifiez les messages d’erreur des
          opérations et contactez le support si une action caisse est refusée.
        </Text>
        <Text size="xs" mt="xs" c="dimmed">
          Réf. pour le support (un appel = un numéro dans les journaux serveur, pas un code à saisir quelque part) :{' '}
          <span style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>{entry.correlationId}</span>
        </Text>
      </Alert>
    );
  }

  return (
    <Alert color="gray" variant="light" mb="sm" data-testid="cashflow-sync-notice-generic">
      <Text size="sm">État sync (serveur) : {label}</Text>
    </Alert>
  );
}
