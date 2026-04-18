# Preuve Convergence 2 — slice bandeau live (story 4.6)

**Date** : 2026-04-07  
**Objectif** : gate **Convergence 2** (`guide-pilotage-v2.md` §3) — chaîne **backend → OpenAPI → manifests CREOS → registre Peintre → rendu → fallbacks** pour le bandeau live, avec **preuve automatisée** et reproduction documentée.

**Cadrage AC1 « stack locale »** : les scénarios **Convergence 2** dans `npm test` sont des **E2E Vitest + jsdom** avec **`fetch` mocké** — ils prouvent la chaîne **contrats → runtime → client HTTP → rendu → fallbacks** sans dépendre d’un conteneur en cours d’exécution. Pour une **preuve réseau réelle** (signal backend vivant), utiliser la **stack** `docker-compose.yml` à la racine + vérif manuelle DevTools **ou** les tests pytest côté API ci-dessous.

## Chemin nominal (OK)

- **Contrat** : `contracts/openapi/recyclique-api.yaml` — `operationId` **`recyclique_exploitation_getLiveSnapshot`**, `GET /v2/exploitation/live-snapshot`.
- **CREOS** : `contracts/creos/manifests/widgets-catalog-bandeau-live.json` (`polling_interval_s`, `data_contract.operation_id` aligné), `navigation-bandeau-live-slice.json`, `page-bandeau-live-sandbox.json`.
- **Runtime** : `peintre-nano/src/registry/register-bandeau-live-widgets.ts`, bac à sable page `bandeau-live-sandbox`.
- **Client live** : `peintre-nano/src/api/live-snapshot-client.ts` — `X-Correlation-ID` (UUID v4) **par tick**.
- **Backend / traçabilité** : `recyclique/api/.../exploitation.py` — log debug `live-snapshot X-Correlation-ID=…` (optionnel en prod).

## Chemins d’échec exercés (automatisés)

| Scénario | Preuve |
|----------|--------|
| HTTP 502 sur live | E2E harness : `data-bandeau-state=error`, `BANDEAU_LIVE_HTTP_ERROR`, `reportRuntimeFallback` |
| Corps 200 non JSON | E2E : `BANDEAU_LIVE_PARSE_ERROR`, `data-correlation-id` = ID client |
| Slice désactivé (4.5) | Déjà couvert dans le même fichier E2E + tests unitaires live-source |

**Polling** : test E2E avec **deux appels** `fetch` séparés par **`polling_interval_s`** lu depuis le **catalogue CREOS** (30 s) ; vérification URL `getLiveSnapshotUrl()` et **deux** en-têtes `X-Correlation-ID` distincts.

## Contraintes résiduelles (modules suivants)

- Pas de recalcul métier F1–F6 côté UI : le bandeau consomme le **signal backend** (snapshot normalisé).
- **Convergence 2** ne couvre pas les flows caisse / réception lourds (epics 5–7) ni admin transverse.

## Validation humaine explicite

- **Raccordement UI réel acquis** : la story **4.6b** a branché le slice dans l'application `Peintre_nano` reellement servie.
- **Parcours rejoué** : ouverture de `http://localhost:4444/bandeau-live-sandbox` sur la stack locale officielle.
- **Prerequis session** : authentification backend obtenue via `POST /v1/auth/login` avec cookies de session web, puis rechargement de la page.
- **Constat nominal** : bloc **`Exploitation live`** visible dans le navigateur apres login ; appels reels `GET /v2/exploitation/live-snapshot` observes cote navigateur avec `X-Correlation-ID`.
- **Constat degrade deja observe** : avant authentification, la meme page exposait le fallback visible lie au **401**, ce qui confirme aussi la trajectoire defensive du slice.
- **Decision** : la combinaison **preuve technique 4.6 + raccordement UI 4.6b + validation humaine explicite** ferme **Convergence 2**.

## Commandes de reproduction

```powershell
# Depuis la racine du mono-repo — stack locale : docker-compose.yml (cf. README)
cd peintre-nano
npm run lint
npm test

# Backend — endpoint live-snapshot (aligné AC / OpenAPI `recyclique_exploitation_getLiveSnapshot`)
cd ..\recyclique\api
python -m pytest tests/test_exploitation_live_snapshot.py -q

# Gate CI / Story Runner (couche réception live — distinct du live-snapshot mais exigé par le pipeline)
python -m pytest tests/test_reception_live_stats.py -q
```

Tests ciblés story 4.6 : `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` (describe *Convergence 2 / story 4.6*).

## Fichiers de référence

- Story : `_bmad-output/implementation-artifacts/4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md`
- Tests complémentaires existants : `peintre-nano/tests/unit/bandeau-live-live-source.test.tsx`, `recyclique/api/tests/test_exploitation_live_snapshot.py`
