import { describe, it, expect } from 'vitest';
import {
  LIVE_NETWORK_POLL_INTERVAL_MIN_MS,
  mapLiveNetworkStatsError,
} from '../liveNetworkPolling';

describe('liveNetworkPolling', () => {
  it('expose le plancher minimal 10s', () => {
    expect(LIVE_NETWORK_POLL_INTERVAL_MIN_MS).toBe(10_000);
  });

  it('mapLiveNetworkStatsError retourne le défaut pour une erreur sans response', () => {
    expect(mapLiveNetworkStatsError(new Error('fail'))).toBe(
      'Erreur réseau, stats live suspendues'
    );
  });

  it('mappe les statuts HTTP connus', () => {
    expect(mapLiveNetworkStatsError({ response: { status: 404 } })).toBe(
      'Endpoint live stats non disponible'
    );
    expect(mapLiveNetworkStatsError({ response: { status: 403 } })).toBe(
      'Accès non autorisé aux stats live'
    );
    expect(mapLiveNetworkStatsError({ response: { status: 500 } })).toBe(
      'Erreur serveur, stats live indisponibles'
    );
    expect(mapLiveNetworkStatsError({ response: { status: 418 } })).toBe(
      'Erreur réseau, stats live suspendues'
    );
  });
});
