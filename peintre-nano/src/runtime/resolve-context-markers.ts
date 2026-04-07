import type { ContextEnvelopeStub } from '../types/context-envelope';

/**
 * Marqueurs utilisés pour `visibility.contexts_all` / `contexts_any` dans le NavigationManifest.
 * Dérivation conservative si `envelope.contextMarkers` est absent : uniquement à partir de champs autoritatifs du stub.
 */
export function resolveContextMarkersFromEnvelope(envelope: ContextEnvelopeStub): ReadonlySet<string> {
  if (envelope.contextMarkers?.length) {
    return new Set(envelope.contextMarkers);
  }
  const s = new Set<string>();
  if (envelope.siteId != null && envelope.siteId !== '') s.add('site');
  if (envelope.workstationId != null && envelope.workstationId !== '') s.add('poste');
  if (envelope.activeRegisterId != null && envelope.activeRegisterId !== '') s.add('register');
  return s;
}
