# Story 4.6 : Valider la chaîne complète `backend → contrat → manifest → runtime → rendu → fallback`

Status: done

<!-- Note : validation optionnelle — validate-create-story avant dev-story. -->

## Story

En tant qu’**équipe de livraison**,  
je veux **valider la chaîne complète du slice `bandeau live` dans une preuve bout-en-bout observable**,  
afin que le projet puisse **franchir le gate Convergence 2** (décision directrice : corriger la chaîne modulaire avant d’élargir aux flows lourds des epics 5, 6 et 7) avec **confiance** et **traçabilité**.

## Acceptance Criteria

1. **Chaîne bout-en-bout vérifiable** — Étant donné que le **premier slice module réel** est assemblé (stories 4.1–4.5), quand la **preuve E2E** est exécutée sur la **stack locale officielle** (`docker-compose.yml` à la racine du mono-repo, API `recyclique/api/`, frontend `peintre-nano/`), alors l’équipe peut **vérifier explicitement** la chaîne : **production du signal backend** → **contrat OpenAPI reviewable** (`operationId` stable **`recyclique_exploitation_getLiveSnapshot`**) → **manifests CREOS** (navigation / page / catalogue widgets bandeau) → **résolution registre + `PageRenderer`** → **rendu widget `bandeau-live`** → **comportement fallback** (Story 4.4) y compris **slice désactivé admin** (Story 4.5) si pertinent pour la trace. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 4.6 ; `guide-pilotage-v2.md` — Convergence 2]

2. **Polling : au moins un cycle réussi** — Étant donné que le widget déclare un `data_contract` avec **rafraîchissement par polling**, quand la preuve est menée, alors il existe une **preuve documentée** d’**au moins un cycle de polling réussi** (deux ticks consécutifs acceptables si le produit veut montrer la stabilité ; **minimum** : un **GET** nominal après montage + **respect de l’intervalle** porté par le manifest, typiquement **`polling_interval_s`** du catalogue CREOS bandeau live, ou équivalent documenté si le manifest borne le slice) vers **`GET /v2/exploitation/live-snapshot`**, avec réponse **200** et corps JSON **normalisé** côté UI (`live-snapshot-normalize` / état bandeau cohérent). [Source : epics.md — Story 4.3, 4.6 ; annexe Convergence 2 — `polling_interval_s`]

3. **`X-Correlation-ID` ou équivalent sur les appels live** — Étant donné le gate produit sur l’**observabilité**, quand les appels live du bandeau sont vérifiés (DevTools réseau, logs backend, ou test d’intégration qui **assert** les en-têtes), alors chaque requête de poll **porte** le header **`X-Correlation-ID`** (comportement actuel : UUID v4 par tick dans `fetchLiveSnapshot`) **et** la **réponse** ou les erreurs structurées exposent une **corrélation exploitable** (`correlation_id` dans le JSON d’erreur Recyclique, aligné `X-Request-Id` côté serveur — voir OpenAPI). La **preuve** inclut **au moins une capture** : extrait de requête/réponse ou ligne de log montrant la **même** valeur côté client et la **traçabilité** côté API (ex. log debug `live-snapshot X-Correlation-ID=…` dans `exploitation.py`). [Source : `contracts/openapi/recyclique-api.yaml` ; `peintre-nano/src/api/live-snapshot-client.ts` ; `recyclique/api/src/recyclic_api/api/api_v2/endpoints/exploitation.py` ; `recyclique/api/tests/test_exploitation_live_snapshot.py`]

4. **Scénario nominal + scénario échec endpoint avec fallback visible** — Étant donné la **posture défensive** du slice, quand la validation est documentée, alors **deux scénarios** sont **exécutés et décrits** : (a) **nominal** — API joignable, permissions OK, bandeau dans un état **non trompeur** (`data-bandeau-state` / copy opérateur) ; (b) **échec sur l’endpoint live** — au minimum **502/503/timeout** simulé (proxy, coupure service API, `fetch` mocké en test E2E, ou route bloquée) **et**, aligné annexe Convergence 2, au moins **un** cas **payload JSON invalide / réponse non conforme** au schéma attendu côté UI, de sorte que l’UI affiche le **fallback visible** (pas d’écran blanc silencieux : codes `BANDEAU_LIVE_*`, `data-runtime-code`, `reportRuntimeFallback` selon sévérité déjà définie en 4.4). [Source : story 4.4 ; `BandeauLive.tsx` ; `peintre-nano/src/runtime/report-runtime-fallback.ts`]

5. **Courte trace enregistrée (ticket / story / doc)** — Étant donné que la preuve doit être **actionnable**, quand la story est close, alors un **artefact court** (recommandé : `references/artefacts/YYYY-MM-DD_NN_preuve-convergence-2-bandeau-live.md` + entrée dans `references/artefacts/index.md`) ou une **section « Preuve Convergence 2 »** ajoutée au **fichier story** (champ *Dev Agent Record*) résume : **chemin nominal OK**, **chemins d’échec exercés**, **contraintes résiduelles** connues pour les migrations de modules suivantes, et **référence** aux fichiers / commandes utilisés pour reproduire. [Source : epics.md — Story 4.6 ; `references/INSTRUCTIONS-PROJET.md` — index artefacts]

6. **Isolation de contexte et autorité backend** — Étant donné les règles v2, quand la validation est revue, alors la preuve **confirme** qu’aucune **règle métier F1–F6** n’est **recalculée** côté frontend pour « simuler » le live ; le rendu reste **aligné** sur le **backend** et le **contexte effectif** (permissions, site). [Source : `project-structure-boundaries.md` ; stories 4.3, 4.5]

7. **Périmètre : pas de dashboard / admin général** — Étant donné que **4.6** est le **gate chaîne modulaire** et non l’Epic 5 ou 9, quand le travail est fait, alors il **n’introduit pas** de **navigation transverse**, **dashboard**, ni **framework de configuration admin** réutilisable ; seuls des **ajustements minimalistes** (tests, doc, script de vérif) liés à la **preuve bandeau** sont dans le scope. [Source : epics.md — Stories 4.5, 4.6 ; story 4.5 *ne pas faire*]

8. **Jalon Convergence 2** — Étant donné `guide-pilotage-v2.md`, quand les AC 1–7 sont satisfaits, alors la story fournit une **preuve technique reproductible** ; la **fermeture effective** de **Convergence 2** dans le guide n’intervient qu’après le **raccordement UI réel** et la **validation humaine explicite** portés par la story **4.6b**, **sans** cocher d’autres jalons non démontrés. [Source : `guide-pilotage-v2.md` §3 ; Correct Course Epic 4, 2026-04-07]

## Tasks / Subtasks

- [x] **Plan de preuve et reproduction** (AC: 1, 2, 5, 8)
  - [x] Documenter les **prérequis** : variables `.env`, compte / session avec permission `recyclique.exploitation.view-live-band` (bac à sable), service API up, `frontend` peintre-nano sur port attendu (voir README / artefact stack locale).
  - [x] Lister les **URLs** : page bac à sable bandeau live (route issue du manifest `page-bandeau-live-sandbox.json`), endpoint OpenAPI documenté.

- [x] **Exécution scénario nominal** (AC: 1, 2, 3, 6)
  - [x] Vérifier **chaîne artefacts** : `contracts/openapi/recyclique-api.yaml` ↔ `contracts/creos/manifests/*.json` ↔ `registerBandeauLiveWidgets` ↔ rendu slot.
  - [x] Capturer **≥1 cycle polling** : horodatage ou deux requêtes réseau vers `…/v2/exploitation/live-snapshot`, **cohérent** avec **`polling_interval_s`** du manifest bandeau (CREOS).
  - [x] Vérifier **`X-Correlation-ID`** sur la requête et cohérence avec réponse / logs.

- [x] **Exécution scénario échec + fallback visible** (AC: 4, 6)
  - [x] Couvrir **HTTP/timeout** et **payload invalide / non conforme** (mock, stub API, ou test) avec **une** méthode reproductible (Docker stop API, faux host, test E2E jsdom existant étendu, etc.) et **décrire** l’état UI attendu (`data-bandeau-state`, message opérateur, `reportRuntimeFallback`).

- [x] **Durcissement tests (optionnel mais recommandé)** (AC: 2, 3, 4)
  - [x] Si un gap existe entre « preuve manuelle » et CI : ajouter ou étendre un test **E2E** (`peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx`) ou un test **intégration** documenté pour **assert** correlation + second poll — **sans** duplication massive avec `bandeau-live-live-source.test.tsx` (réutiliser patterns existants).

- [x] **Documentation trace + sprint / guide** (AC: 5, 8)
  - [x] Rédiger l’**artefact court** dans `references/artefacts/` + **index** ; ou compléter ce fichier story en *Dev Agent Record*.
  - [x] Mettre à jour **`sprint-status.yaml`** : clé `4-6-…` → **`done`** après implémentation + revue (workflow dev-story / CR — hors périmètre create-story).
- [x] Ne pas considérer **Convergence 2** comme fermée tant que le **raccordement UI réel** et la **validation humaine** ne sont pas réalisés via la story **4.6b**.

## Dev Notes

### Garde-fous architecture

- **Convergence 2** = preuve **réelle** de la chaîne modulaire ; ce n’est **pas** une nouvelle feature métier. Priorité : **observabilité**, **reproductibilité**, **documentation**.
- **Ne pas** élargir au périmètre Epic 5 (shell / dashboard) ni Epic 9 (config admin globale).
- Réutiliser l’**infrastructure existante** : client `fetchLiveSnapshot`, middleware corrélation backend, tests `test_exploitation_live_snapshot.py` pour référence comportement API.

### Structure projet et fichiers de référence (touchés typiquement en validation / doc / tests légers)

| Zone | Fichiers / dossiers |
|------|---------------------|
| Preuve / doc | `references/artefacts/`, `references/artefacts/index.md`, `_bmad-output/planning-artifacts/guide-pilotage-v2.md` |
| Contrats | `contracts/openapi/recyclique-api.yaml`, `contracts/creos/manifests/navigation-bandeau-live-slice.json`, `page-bandeau-live-sandbox.json`, `widgets-catalog-bandeau-live.json` |
| Frontend | `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx`, `live-snapshot-normalize.ts`, `peintre-nano/src/api/live-snapshot-client.ts`, `peintre-nano/src/registry/register-bandeau-live-widgets.ts` |
| Backend | `recyclique/api/src/recyclic_api/api/api_v2/endpoints/exploitation.py`, `services/exploitation_live_snapshot_service.py`, `schemas/exploitation_live_snapshot.py` |
| Tests existants | `recyclique/api/tests/test_exploitation_live_snapshot.py`, `peintre-nano/tests/unit/bandeau-live-live-source.test.tsx`, `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` |
| Stack locale | `docker-compose.yml` (racine), `README.md` mono-repo |

### Intelligence story précédente (4.5)

- Toggle **`bandeau_live_slice_enabled`** : en preuve nominale, prévoir **slice activé** ; optionnellement une **ligne** dans la trace sur le comportement **désactivé** (déjà couvert fonctionnellement en 4.5).
- **Pas de PATCH toggle** obligatoire dans 4.6 sauf besoin de repro ; l’accent est sur **live-snapshot** + **manifest** + **rendu**.

### Intelligence stories 4.1–4.4

- **`data_contract.operation_id`** du widget doit rester aligné sur OpenAPI (**B4** — pas de renommage ad hoc).
- Codes stables **`BANDEAU_LIVE_*`** et **`reportRuntimeFallback`** : s’appuyer sur la grille déjà documentée dans le README du domaine `bandeau-live`.

### Anti-patterns à éviter

- Déclarer Convergence 2 **sans** preuve stockée (capture, test, ou artefact daté).
- Remplacer la preuve par une **checklist conceptuelle** sans exécution sur stack réelle ou équivalent CI strictement équivalent.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.6]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — §3 Convergence 2]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Convergence 2, liaison manifest OpenAPI]
- [Source : `_bmad-output/implementation-artifacts/4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md`]
- [Source : `_bmad-output/implementation-artifacts/4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live.md`]
- [Source : `contracts/README.md`]

### Contexte projet (`project-context.md`)

- Aucun `project-context.md` obligatoire identifié ; s’appuyer sur les chemins ci-dessus et `references/index.md` si besoin de contexte terrain.

### Informations techniques (stack actuelle)

- **Peintre_nano** : Vite, React, Vitest — ne pas upgrader hors nécessité.
- **Backend** : FastAPI, pytest sous `recyclique/api/tests/`.

## Change Log

- **2026-04-07** — Story 4.6 : E2E Convergence 2 (polling + corrélation + fallbacks), artefact `2026-04-07_03_preuve-convergence-2-bandeau-live.md`, sprint `4-6` → `done`.
- **2026-04-07 (correct course)** — Requalification : la story 4.6 documente une **preuve technique** mais ne ferme plus seule le gate produit ; `4-6` repasse en **review**, `Convergence 2` est rouverte, et la story **4.6b** porte désormais le raccordement UI réel + validation humaine.

## Dev Agent Record

### Agent Model Used

Sous-agent Task (implémentation dev-story 4.6).

### Debug Log References

Aucun incident bloquant ; gates exécutés localement (voir ci-dessous).

### Completion Notes List

- **Preuve reproductible** : artefact `references/artefacts/2026-04-07_03_preuve-convergence-2-bandeau-live.md` (chemins contrats, commandes, scénarios nominal / échec).
- **Tests E2E** (`peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx`, describe *Convergence 2 / story 4.6*) :
  - **Polling** : `vi.useFakeTimers` + `advanceTimersByTimeAsync(MANIFEST_POLLING_INTERVAL_S * 1000)` où `MANIFEST_POLLING_INTERVAL_S` est lu depuis `widgets-catalog-bandeau-live.json` ; **2** appels `fetch` vers `getLiveSnapshotUrl()` (équivalent `GET …/v2/exploitation/live-snapshot`).
  - **X-Correlation-ID** : assert UUID v4 sur chaque requête ; **valeurs distinctes** entre le 1er et le 2e tick.
  - **Nominal** : après 2 ticks, `data-bandeau-state=live`, `data-runtime-code=BANDEAU_LIVE_NOMINAL`.
  - **Échec HTTP** : mock **502** → `error` / `BANDEAU_LIVE_HTTP_ERROR` / `reportRuntimeFallback` degraded.
  - **Payload invalide** : **200** + corps non JSON → `BANDEAU_LIVE_PARSE_ERROR`, `data-correlation-id` aligné sur le client (mock `crypto.randomUUID`).
- **Backend** : `python -m pytest tests/test_exploitation_live_snapshot.py -q` depuis `recyclique/api` — **PASS** (endpoint `GET /v2/exploitation/live-snapshot`). Gate pipeline additionnel : `pytest tests/test_reception_live_stats.py` — **PASS** (fichier non modifié). Log serveur optionnel : `exploitation.py` ligne debug `live-snapshot X-Correlation-ID=…`.
- **Hors scope** : pas d’élargissement admin / dashboard ; pas de `git push`.

### File List

- `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx`
- `references/artefacts/2026-04-07_03_preuve-convergence-2-bandeau-live.md`
- `references/artefacts/index.md`
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md`

## Git intelligence (session create-story)

Stories **4.1–4.5** livrées : contrats CREOS, widget, polling + `X-Correlation-ID` côté client, fallbacks, toggle admin minimal. La **4.6** consolide le **gate** sans refaire ces livrables ; elle exige **preuve documentée** et alignement **guide-pilotage** Convergence 2.

---

**Story completion status** : **done** — preuve technique documentée + revalidation humaine explicite rejouée sur l'application reellement servie apres raccordement **4.6b**.

### Change Log

- 2026-04-07 : requalification `review` via correct course Epic 4 pour separer preuve technique et fermeture produit du gate.
- 2026-04-07 : retour a `done` apres validation humaine nominale sur `http://localhost:4444/bandeau-live-sandbox` avec session backend authentifiee, widget `Exploitation live` visible, appels `GET /v2/exploitation/live-snapshot` observes dans le navigateur, et trajectoire de fallback 401 deja documentee avant login.

_Ultimate context engine analysis completed — comprehensive developer guide created._
