# Domaine — bandeau live

Slice vertical **Epic 4** : exploitation temps réel (KPIs, état caisse / sync) consommé par un widget déclaratif dans Peintre_nano.

## Implémentation runtime (Story 4.2)

| Élément | Chemin |
|---------|--------|
| Composant enregistré | [`BandeauLive.tsx`](./BandeauLive.tsx) (+ [`BandeauLive.module.css`](./BandeauLive.module.css)) |
| Enregistrement registre | [`register-bandeau-live-widgets.ts`](../../registry/register-bandeau-live-widgets.ts) — clé **`bandeau-live`** (CREOS + `PageManifest`) |
| Bootstrap | [`registry/index.ts`](../../registry/index.ts) appelle `registerBandeauLiveWidgets()` après `registerDemoWidgets()` |

**Données** : le rendu lit `widget_props.snapshot` (JSON-sérialisable, forme alignée sur **`ExploitationLiveSnapshot`** OpenAPI). Types importés depuis [`contracts/openapi/generated/recyclique-api.ts`](../../../../contracts/openapi/generated/recyclique-api.ts) — pas de duplication manuelle du schéma (normalisation partagée : [`live-snapshot-normalize.ts`](./live-snapshot-normalize.ts)).

Sans snapshot exploitable (objet absent ou sans aucun signal métier), le widget affiche explicitement : « Données live non disponibles ».

### Source live HTTP (Story 4.3)

- **Statique (4.2)** : `widget_props.snapshot` présent et **`use_live_source` / `useLiveSource` absent ou faux** → aucun appel réseau.
- **Live** : `widget_props.use_live_source: true` ou, après ingest manifeste (`parsePageManifestJson`), **`useLiveSource: true`** → `GET` same-origin vers **`/v2/exploitation/live-snapshot`**, avec préfixe configurable (**`VITE_RECYCLIQUE_API_PREFIX`**, défaut **`/api`**) pour suivre le proxy Vite (`vite.config.ts` réécrit `/api` → backend Docker).
- **Auth** : `fetch` avec **`credentials: 'include'`** ; si l’adaptateur [`AuthContextPort`](../../app/auth/auth-context-port.ts) expose **`getAccessToken`**, envoi **`Authorization: Bearer …`** (OpenAPI `bearerOrCookie`).
- **Polling** : intervalle lu dans `polling_interval_s` / **`pollingIntervalS`** (ingest camelCase) ou `refresh_interval_s` / **`refreshIntervalS`**, sinon **30 s** (aligné catalogue CREOS).
- **Corrélation** : un **`X-Correlation-ID`** (**UUID v4**) est généré **à chaque requête** (chaque tick de poll). Client HTTP : [`src/api/live-snapshot-client.ts`](../../api/live-snapshot-client.ts).
- **Erreurs** : HTTP non-2xx, JSON invalide ou erreur réseau → **« Live indisponible »** (HTTP affiché seulement en `import.meta.env.DEV`). Politique unifiée de fallbacks / copie opérateur : **Story 4.4** (ci-dessous).

### Attributs `data-*`, sévérités et traçabilité (Story 4.4)

Alignement avec le runtime global (story **3.6**) : même vocabulaire que `WidgetResolveFallback` / [`runtime/README.md`](../../runtime/README.md) (`data-runtime-severity`, `data-runtime-code`). Le widget expose aussi `data-bandeau-state` (état UX du slice).

| `data-bandeau-state` | `data-runtime-severity` | `data-runtime-code` | `reportRuntimeFallback` | `data-correlation-id` |
|---------------------|-------------------------|----------------------|-------------------------|----------------------|
| `loading` | `info` | `BANDEAU_LIVE_LOADING` | non | — |
| `live` (nominal) | `info` | `BANDEAU_LIVE_NOMINAL` | non | — |
| `degraded` (200 sans signaux exploitables) | `degraded` | `BANDEAU_LIVE_DEGRADED_EMPTY` | oui (`state`: `bandeau_live_degraded_empty`) | oui (ID du dernier tick `fetchLiveSnapshot` OK) |
| `error` (HTTP) | `degraded` | `BANDEAU_LIVE_HTTP_ERROR` | oui | oui (UUID client = en-tête `X-Correlation-ID` émis pour ce tick) |
| `error` (parse JSON) | `degraded` | `BANDEAU_LIVE_PARSE_ERROR` | oui | oui |
| `error` (réseau côté client HTTP) | `degraded` | `BANDEAU_LIVE_NETWORK_ERROR` | oui | oui |
| `error` (exception inattendue hors `AbortError` dans le tick) | `degraded` | `BANDEAU_LIVE_UNEXPECTED_ERROR` | oui (`state`: `bandeau_live_live_tick_failed`) | — (pas d’ID `fetchLiveSnapshot` fiable) |
| `unavailable` (pas de snapshot statique, `use_live_source` faux) | `degraded` | `BANDEAU_LIVE_UNAVAILABLE_STATIC` | oui (`state`: `bandeau_live_unavailable`) | — |
| `module_disabled` (slice coupé — `bandeau_live_slice_enabled: false` backend ou fixture statique) | `info` | `BANDEAU_LIVE_MODULE_DISABLED` | oui (`state`: `bandeau_live_module_disabled`, sévérité `info`) | — |

### Toggle admin minimal (Story 4.5)

- **Vérité backend** : champ booléen **`bandeau_live_slice_enabled`** dans la réponse **`GET /v2/exploitation/live-snapshot`** (défaut `true` si absent du JSON). `false` = désactivation sur le site (`sites.configuration.bandeau_live_slice_enabled` côté API Recyclique). **Remplacement prévu** : Epic 9.6 (config admin simple) — pas de matrice modules ici.
- **Écriture** : **`PATCH /v2/exploitation/bandeau-live-slice`**, corps `{ "enabled": boolean }`, **`operationId`** **`recyclique_exploitation_patchBandeauLiveSlice`**, réservé **`admin`** / **`super-admin`** avec site affecté. Traçabilité : **log applicatif structuré** (qui / site / ancien état / nouvel état / IP) ; branchement `audit_logs` possible plus tard si le schéma de test et la prod sont alignés (Epic 9.6).
- **Live** : premier tick `fetchLiveSnapshot` ; si `bandeau_live_slice_enabled === false`, **pas de polling** ultérieur (pas d’appels réseau inutiles).
- **Statique** : `widget_props.snapshot.bandeau_live_slice_enabled: false` (bac à sable / démo) → même surface UI `module_disabled` (manifeste serveur ou fixture, pas préférence locale métier).

- **Opérateur / support** : l’ID de corrélation des échecs live est toujours présent en **`data-correlation-id`** sur le conteneur d’erreur quand il est fourni par `fetchLiveSnapshot`. En **mode dev** (`import.meta.env.DEV`), un libellé **« Réf. technique : … »** reprend le même UUID (pas de secret).
- **Codes exportés** : constante `BANDEAU_LIVE_RUNTIME_CODES` dans [`BandeauLive.tsx`](./BandeauLive.tsx).

**Test manuel API + Peintre** : depuis la racine du dépôt, `docker compose up` (voir [`docker-compose.yml`](../../../../docker-compose.yml) à la racine) puis front en dev (`peintre-nano`) avec proxy ; sur une page manifeste, activer `use_live_source: true` sur le slot `bandeau-live` (bac à sable). Référence : [`references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md`](../../../../references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md) si présent.

### Application servie — story 4.6b

- **URL** : `http://localhost:4444/bandeau-live-sandbox` (stack Docker : port **4444** → Vite **5173** dans le conteneur `frontend`).
- **Comportement** : `RuntimeDemoApp` charge un lot fusionné (fixtures démo Epic 3 + copies alignées sur les manifests Epic 4 dans [`src/fixtures/contracts-creos/`](../../fixtures/contracts-creos/) — même contenu que `contracts/creos/manifests/` pour le bundler) via [`runtime-demo-manifest.ts`](../../app/demo/runtime-demo-manifest.ts) ; la sélection suit `window.location.pathname` et `history.pushState` lors des clics nav.
- **Permission démo** : [`default-demo-auth-adapter.ts`](../../app/auth/default-demo-auth-adapter.ts) inclut `recyclique.exploitation.view-live-band` pour que l’entrée nav et la page passent les gardes.
- **Preuve réseau** : DevTools → Network → requêtes `GET` vers **`/api/v2/exploitation/live-snapshot`** (proxy Vite) avec en-tête **`X-Correlation-ID`** (UUID) émis par le client à chaque tick (voir [`live-snapshot-client.ts`](../../api/live-snapshot-client.ts)).

## Contrats et manifests reviewables

| Artefact | Chemin |
|----------|--------|
| Navigation (route bac à sable slice) | [`contracts/creos/manifests/navigation-bandeau-live-slice.json`](../../../../contracts/creos/manifests/navigation-bandeau-live-slice.json) |
| Page (slots, dont `bandeau-live`) | [`contracts/creos/manifests/page-bandeau-live-sandbox.json`](../../../../contracts/creos/manifests/page-bandeau-live-sandbox.json) |
| Catalogue widget CREOS (`data_contract`) | [`contracts/creos/manifests/widgets-catalog-bandeau-live.json`](../../../../contracts/creos/manifests/widgets-catalog-bandeau-live.json) |

Le catalogue déclare `data_contract.operation_id` = **`recyclique_exploitation_getLiveSnapshot`** (identique à l’`operationId` OpenAPI), `refresh: polling`, `polling_interval_s`, `endpoint_hint: GET /v2/exploitation/live-snapshot`, `source` aligné sur le tag **`exploitation`**.

## OpenAPI

- Fichier : [`contracts/openapi/recyclique-api.yaml`](../../../../contracts/openapi/recyclique-api.yaml)
- Opérations : **`GET /v2/exploitation/live-snapshot`** (`operationId` **`recyclique_exploitation_getLiveSnapshot`**) ; **`PATCH /v2/exploitation/bandeau-live-slice`** (`recyclique_exploitation_patchBandeauLiveSlice`, Story 4.5)
- Schéma réponse : **`ExploitationLiveSnapshot`**
- Corrélation : en-tête **`X-Correlation-ID`** documenté sur l’opération ; à propager côté client pour les appels live et la traçabilité (stories **4.3** / **4.6**).

## Périmètre explicite (ce dossier)

- **Hors scope** : recomposition **dashboard**, **admin** généralisé, réglages transverses hors slice bandeau (cf. Epic 5 / Epic 9).
- **Story 4.3** : branchement **`data_contract`** / appel HTTP réel / polling / **`X-Correlation-ID`** côté client.
- **Story 4.4** : fallbacks / rejets **visibles** (`data-runtime-*`, `reportRuntimeFallback`, corrélation live) — voir tableau ci-dessus et [`runtime/README.md`](../../runtime/README.md).
- **Story 4.5** : toggle admin minimal module bandeau.
- **Story 4.6** : E2E chaîne complète.

## Schéma de référence CREOS

Extension `data_contract` : [`contracts/creos/schemas/widget-declaration.schema.json`](../../../../contracts/creos/schemas/widget-declaration.schema.json).
