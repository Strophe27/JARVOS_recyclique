# Runtime — chargement manifests (Piste A)

## Sévérités runtime (story 3.6)

| Catégorie | Sévérité | Où |
|-----------|----------|-----|
| Validation / parse manifests, erreurs réseau HTTP (`loadManifestBundle`, `fetchManifestBundle`) | `blocked` | `rejectManifestBundle` → `reportRuntimeFallback` |
| Accès page refusé (`resolvePageAccess` → UI) | `blocked` | `PageAccessBlocked` (effet montage) |
| Widget inconnu au rendu (`resolveWidget`) | `degraded` | `PageRenderer` → `WidgetResolveFallback` |
| Slots non mappés vers le shell | `info` | `PageRenderer` → `UnmappedSlotsRegion` |
| Navigation filtrée vide (contexte) | `info` | `FilteredNavEntries` → `FilteredNavEmpty` |

Types : `RuntimeRejectionSeverity` = `info` | `degraded` | `blocked` dans `report-runtime-fallback.ts`.

- **`load-manifest-bundle.ts`** : assemble parse + validation pour un lot **NavigationManifest + N PageManifest** (JSON texte ou `fetch` via `fetchManifestBundle`).
- **`filter-navigation-for-context.ts`** : fonction pure `filterNavigation(manifest, envelope, options?)` — intersection des `requiredPermissionKeys` avec l’enveloppe autoritative ; si l’enveloppe est `forbidden` / `degraded` ou périmée (`isEnvelopeStale`), **aucune** entrée n’est retournée (`options.nowMs` pour les tests).
- **`resolve-page-access.ts`** : `resolvePageAccess(page, envelope)` — garde rendu page (permissions, site, statut, fraîcheur).
- **`report-runtime-fallback.ts`** : `reportRuntimeFallback` — charge utile structurée (`code`, `message`, `severity`, `detail`, `retryable`, `correlationId`, `state`) ; console en dev uniquement (pas en `MODE=test`).
- **`context-envelope-freshness.ts`** : `MAX_CONTEXT_AGE_MS` (filet long ; rafraîchissement silencieux en session live dans `LiveAuthShell`), `CONTEXT_ENVELOPE_SILENT_REFRESH_INTERVAL_MS`, `isEnvelopeStale` — convention Piste A (story 3.4).
- **Aucun import** depuis `references/` au bundle Vite — fixtures sous `src/fixtures/` ou fichiers dans `public/manifests/`.

Convergence 1 : la résolution nav/page reste pure côté `runtime/` ; l’enveloppe est fournie par `AuthContextPort` dans `src/app/auth/`.
