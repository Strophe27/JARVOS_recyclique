# Story 4.6b : Raccorder le slice `bandeau live` dans l'application `Peintre_nano` reellement servie

Status: done

<!-- Note : validation optionnelle — validate-create-story avant dev-story. -->

## Story

En tant qu'**equipe de livraison**,  
je veux que le slice **`bandeau live`** (contrats CREOS Epic 4 + registre runtime + source live backend) soit **monte dans l'application `Peintre_nano` reellement servie** sur la stack locale officielle,  
afin de rendre la **preuve humaine** de **Convergence 2** possible sur le **meme artefact** que celui ouvert dans le navigateur, avant de refermer le gate final Epic 4.

## Acceptance Criteria

1. **Bundle servi = manifests Epic 4** — Etant donne la stack locale officielle (`docker-compose.yml` a la racine, `frontend` = `peintre-nano`), quand l'application servie est ouverte sans harness de test, alors le runtime charge au minimum le lot **navigation + page** du slice `bandeau live` issu des contrats reviewables (`navigation-bandeau-live-slice.json`, `page-bandeau-live-sandbox.json`) ; et le resultat du chargement manifeste est **OK** dans l'application servie, pas seulement sous Vitest/jsdom. [Source : Correct Course Epic 4 ; `contracts/creos/manifests/`]

2. **Visibilite du widget dans l'UI servie** — Etant donne que les stories 4.2 a 4.5 ont livre widget, source live, fallbacks et toggle minimal, quand la page `bandeau live` est selectionnee dans l'application servie, alors le widget **`bandeau-live`** est resolu via le registre standard et **visible** a l'ecran ; et la page ne retombe plus sur le contenu de demo Epic 3 pour cette route. [Source : stories 4.2, 4.3, 4.4, 4.5 ; `App.tsx` ; `runtime-demo-manifest.ts`]

3. **Parcours adressable et reproductible** — Etant donne que la validation humaine doit etre rejouable, quand l'utilisateur ouvre l'URL ou utilise la navigation prevue, alors il existe un **chemin documente** pour atteindre la page `bandeau live` (route, etat de navigation, ou bascule explicite) ; et l'URL ou l'etat de navigation reflète la page affichee. [Source : Correct Course Epic 4 ; `contracts/creos/manifests/navigation-bandeau-live-slice.json`]

4. **Contexte et permissions coherents** — Etant donne que la page bandeau live exige un contexte et une permission explicites, quand l'application est utilisee en validation locale, alors le `ContextEnvelope` ou adaptateur de demo fournit de maniere **minimale, documentee et traçable** la permission necessaire pour voir le slice ; et aucun contournement opaque ou non documente n'est requis. [Source : `default-demo-auth-adapter.ts` ; `AuthRuntimeProvider.tsx` ; manifests Epic 4]

5. **Appels live reels depuis l'application servie** — Etant donne que le mode live existe deja dans le widget, quand la page servie active le chemin live, alors le navigateur declenche au moins un appel **`GET /v2/exploitation/live-snapshot`** via le proxy / meme origine, avec **`X-Correlation-ID`** sur la requete ; et cette activite est verifiable dans les outils reseau du navigateur. [Source : story 4.3 ; `live-snapshot-client.ts` ; Correct Course Epic 4]

6. **Non-regression de la demo Epic 3** — Etant donne que `RuntimeDemoApp` reste une reference utile du socle Peintre, quand le raccordement UI reel est ajoute, alors la demo Epic 3 reste accessible ou cohabite de maniere claire avec le slice bandeau live ; et on n'introduit pas de contournement ad hoc qui casserait le socle ou absorberait le scope Epic 5. [Source : story 3.7 ; Correct Course Epic 4]

7. **Documentation courte de repro** — Etant donne que cette story prepare le re-run de la validation finale, quand elle est terminee, alors le README du domaine ou la story elle-meme documente l'URL / le parcours, les prerequis de contexte, et comment constater visuellement le slice dans l'application servie. [Source : Correct Course Epic 4 ; `peintre-nano/src/domains/bandeau-live/README.md`]

## Tasks / Subtasks

- [x] **Brancher le bundle reel sur les manifests Epic 4** (AC: 1, 2, 6)
  - [x] Faire evoluer le point d'entree de l'application servie (`App.tsx` et/ou `RuntimeDemoApp`) pour charger le slice `bandeau live` depuis les manifests reviewables Epic 4, sans supprimer brutalement le parcours demo Epic 3.
  - [x] Choisir un mecanisme explicite et testable de cohabitation : route dediee, bascule manifeste, ou integration propre dans le shell demo existant.

- [x] **Faire correspondre URL / navigation / page affichee** (AC: 2, 3)
  - [x] Aligner la selection de page avec `window.location.pathname` ou un mecanisme equivalent clairement documente.
  - [x] Garantir que `http://localhost:4444/bandeau-live-sandbox` (ou route retenue) amene effectivement a la page bandeau live.

- [x] **Aligner le contexte de demo avec le slice Epic 4** (AC: 4)
  - [x] Fournir la permission `recyclique.exploitation.view-live-band` de facon minimale et documentee dans l'adaptateur de demo ou le provider auth.
  - [x] Verifier qu'aucun autre prerequis cache n'empeche l'affichage du slice.

- [x] **Verifier le flux live dans l'application servie** (AC: 5)
  - [x] S'assurer que le bandeau visible en mode servi declenche bien le client live existant.
  - [x] Documenter la presence attendue de `X-Correlation-ID` et du polling pour le re-run de 4.6.

- [x] **Preserver le socle Epic 3** (AC: 6)
  - [x] Garder la demo Epic 3 accessible ou clairement separable.
  - [x] Eviter toute derive vers la navigation transverse / dashboard Epic 5.

- [x] **Documentation de repro** (AC: 7)
  - [x] Mettre a jour `peintre-nano/src/domains/bandeau-live/README.md` ou le `Dev Agent Record` de cette story avec l'URL / le parcours de verification.

## Dev Notes

### Garde-fous architecture

- Le probleme revele par le correct course n'est **pas** l'absence du widget ou de la source live, mais un **trou de raccordement** entre les livrables Epic 4 et l'application reellement servie.
- Le raccordement doit rester **minimal** : brancher le slice dans l'app servie, pas commencer la recomposition transverse Epic 5.
- La preuve finale **4.6** reste distincte : cette story **prepare** la validation humaine reelle, elle ne la remplace pas.

### Périmètre explicite (ne pas faire)

- **Pas** de shell transverse complet, de dashboard, ni de navigation metier large.
- **Pas** de rework architectural global du runtime Peintre.
- **Pas** de nouvelle couche admin generique : le toggle 4.5 existe deja.

### Structure projet et fichiers typiques a toucher

| Zone | Fichiers / dossiers |
|------|---------------------|
| Entree app | `peintre-nano/src/app/App.tsx` |
| Demo runtime | `peintre-nano/src/app/demo/runtime-demo-manifest.ts`, `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` |
| Auth / contexte demo | `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`, `AuthRuntimeProvider.tsx`, `auth-context-port.ts` |
| Registre / widget | `peintre-nano/src/registry/index.ts`, `register-bandeau-live-widgets.ts`, `peintre-nano/src/domains/bandeau-live/` |
| Contrats | `contracts/creos/manifests/navigation-bandeau-live-slice.json`, `page-bandeau-live-sandbox.json`, `widgets-catalog-bandeau-live.json` |
| Proxy / stack locale | `peintre-nano/vite.config.ts`, `docker-compose.yml`, `README.md` |

### Intelligence stories precedentes

- **4.2** a prouve le registre et le rendu declaratif du widget.
- **4.3** a prouve le fetch live, le polling et `X-Correlation-ID`.
- **4.4** a stabilise les fallbacks visibles.
- **4.5** a ajoute le toggle minimal.
- **4.6** reste maintenant le gate final a rejouer une fois ce raccordement termine.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.6b]
- [Source : `_bmad-output/implementation-artifacts/4-2-implementer-le-widget-bandeau-live-dans-le-registre-peintre-nano.md`]
- [Source : `_bmad-output/implementation-artifacts/4-3-brancher-la-source-backend-reelle-et-les-cas-douverture-decalee.md`]
- [Source : `_bmad-output/implementation-artifacts/4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md`]
- [Source : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-07-epic-4-convergence-2-gap.md`]

## Change Log

| Date | Resume |
|------|--------|
| 2026-04-07 | Correct Course Epic 4 valide : creation de la story 4.6b pour porter le raccordement UI reel du slice `bandeau live` avant revalidation finale de Convergence 2. |

## Dev Agent Record

### Agent Model Used

Cursor agent, 2026-04-07.

### Debug Log References

- Preuve navigateur (2026-04-07) : `http://localhost:4444/bandeau-live-sandbox` — en-tete Epic 4, widget bandeau live (erreur HTTP 401 sans session API attendue en demo) ; requete `GET /api/v2/exploitation/live-snapshot` avec `x-correlation-id` (UUID) dans les en-tetes requete (DevTools Network).

### Completion Notes List

- Lot servi : `runtimeServedManifestLoadResult` dans `runtime-demo-manifest.ts` (fixtures Epic 3 + copies `src/fixtures/contracts-creos/` alignees sur `contracts/creos/manifests/`).
- URL : `useLayoutEffect` + `popstate` + `history.pushState` sur selection nav.
- Bloc marketing Epic 3 (titre Socle + liste quatre artefacts) affiche seulement si `pageKey === 'demo-home'`.
- Gates : `npm run lint` / `npm run test` (peintre-nano) ; `pytest` live-snapshot + reception (recyclique/api).

### File List

- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx` (type `intervalId` DOM vs Node)
- `peintre-nano/src/fixtures/contracts-creos/*.json` (miroir manifests CREOS)
- `peintre-nano/tests/e2e/runtime-demo-compose.e2e.test.tsx`
- `peintre-nano/vitest.config.ts` (merge avec `vite.config.ts`)
- `peintre-nano/src/domains/bandeau-live/README.md`

---

**Story completion status** : **done** — implementation terminee, slice visible dans l'application reellement servie, et revalidation **4.6** rejouee avec succes apres authentification backend.

### Change Log

- 2026-04-07 : story cloturee apres verification navigateur sur `http://localhost:4444/bandeau-live-sandbox`, avec parcours reproductible, permission de demo alignee et appels live reels observables.
