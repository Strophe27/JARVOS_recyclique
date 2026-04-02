/**
 * Câblage conceptuel des quatre artefacts : types + documentation de la hiérarchie.
 * Aucune route, permission ou page métier ne doit être codée ici comme substitut aux contrats commanditaires.
 *
 * Le stub typé pour tests / compilation est dans `conceptual-artifacts.stub.ts` (ne pas l'utiliser comme vérité runtime).
 */
import type { ContextEnvelopeStub } from '../types/context-envelope';
import type { NavigationManifest } from '../types/navigation-manifest';
import type { PageManifest } from '../types/page-manifest';
import type { UserRuntimePrefs } from '../types/user-runtime-prefs';

export type PeintreTruthStack = {
  context: ContextEnvelopeStub;
  navigation: NavigationManifest;
  page: PageManifest;
  prefs: UserRuntimePrefs;
};
