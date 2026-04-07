# Synthèse — automatisation des tests (QA e2e)

**Stories :** 5.1 — navigation transverse ; **5.2** — dashboard transverse ; **5.3** — lot listings / consultation ; **5.4** — admin transverse ; **5.5** — libellés présentation (`presentation_labels`) + `restriction_message` + politique nav filtrée / garde page ; **5.6** — gabarits transverses (`TransverseHubLayout` / `TransverseConsultationLayout`, `data-testid`, runtime `RuntimeDemoApp`) ; **5.7** — états transverses (loading / empty / error), `TransversePageStateSlot`, démo `?transverseState=` ; **5.8** — passe cohérence transverse (documentation + registre d’écarts, pas de nouvelle suite e2e obligatoire)  
**Date :** 2026-04-08  
**Projet :** JARVOS_recyclique / `peintre-nano`

## Tests générés ou complétés

### Tests API

- Non applicable : pas d’API HTTP dédiée aux tests Vitest ; contrats JSON dans `tests/contract/` (dont `navigation-transverse-served-5-1.test.ts`).

### Tests E2E (Vitest + Testing Library + jsdom)

- [x] `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` — **5.1 + 5.2 + 5.3 + 5.4 + 5.5**  
  - **5.1 / 5.2** : entrées transverses, parcours dashboard / admin, URL profonde `/dashboard`, filtrage permissions / marqueur `site`, quatre blocs dashboard, aller-retour accueil.  
  - **5.3** : quatre entrées nav du lot ; parcours listing / consultation ; deep links ; masquage listings vs consultation selon permissions.  
  - **5.4 (renfort QA)** : libellés contrat `nav.transverse.admin.access` / `nav.transverse.admin.site` ; parcours clic → `/admin/site` + titres manifeste ; **deep link `/admin`** (`aria-current` + hub) ; flux hub → site (deux clics) ; couverture existante conservée (access, deep `/admin/site`, hub → access).  
  - **5.5 (QA story — pas de doublon inutile)** :  
    - **AC 1–2 (libellés présentation)** : premier scénario 5.1 + bloc `describe('Story 5.5…')` — résolution enveloppe (`DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD`) ; **fallback** si `presentation_labels` vide pour la clé → affichage de `NAV_LABEL_KEY_TRANSVERSE_DASHBOARD` ; **absence de bandeau** si pas de `restriction_message`. Complément **unitaire** : `tests/unit/resolve-nav-entry-display-label.test.ts`.  
    - **AC 3a (nav masquée, pas de fantômes)** : `masque dashboard / admin sans permissions`, masquages 5.3 / 5.4, `masque les entrées transverses si le marqueur site est absent` — `queryByTestId` sur entrées transverses.  
    - **AC 3b (garde page / feedback)** : scénario dégradé 5.5 (`PageAccessBlocked` + `DEGRADED_CONTEXT`) ; chemins enveloppe génériques dans `tests/e2e/auth-context-envelope.e2e.test.tsx` ; parcours démo garde manifeste dans `tests/e2e/runtime-demo-compose.e2e.test.tsx`.  
    - **AC 3c (`restriction_message`)** : bannière `context-envelope-restriction-banner` + garde inchangée — tests **dégradé** et **forbidden** dans le bloc Story 5.5 ; schéma OpenAPI dans `tests/contract/recyclique-openapi-governance.test.ts`.

- [x] `peintre-nano/tests/e2e/transverse-templates-5-6.e2e.test.tsx` — **5.6 (QA e2e chaîne App + nav)**  
  - Parcours **dashboard** et **listing articles** : `page-slot-unmapped` → `transverse-page-shell` **hub**, `data-transverse-family` respectivement `dashboard` et `listing`, en-tête + grille corps + placeholder état (story 5.7).  
  - Parcours **consultation article** : layout **consultation**, `transverse-two-column-body`, colonnes primaire / secondaire, pied.  
  - Parcours **admin hub** : hub **famille admin**.  
  - **Cas critique** : accueil démo `/` — absence de `transverse-page-shell` dans `runtime-demo-root` (pages non `transverse-*` sans gabarit).  
  - Complément **unitaire** existant : `tests/unit/transverse-templates-5-6.test.tsx`.

- [x] `peintre-nano/tests/e2e/transverse-states-5-7.e2e.test.tsx` — **5.7 (chaîne App + nav + query démo)**  
  - **Chargement** : `/dashboard?transverseState=loading` après navigation → `transverse-state-loading`, `data-transverse-state="loading"` sur `transverse-page-state-slot`.  
  - **Liste vide** : `/listings/articles?transverseState=empty` → `transverse-state-empty`.  
  - **Erreur consultation** : `/consultation/article?transverseState=error` → `transverse-state-error`, texte contenant `TRANSVERSE_DEMO_FETCH_FAILED`.  
  - **Non-effondrement shell** : `/admin?transverseState=error` → erreur dans le shell transverse, navigation et zone main toujours présentes.  
  - Complément **unitaire** : `tests/unit/transverse-states-5-7.test.tsx` (primitives, `data-testid`, attributs runtime).

### Tests contrat (bundle servi + `resolvePageAccess`)

- [x] `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` — **5.4** : refus d’accès **hub** `transverse-admin-placeholder` et **site** `transverse-admin-site-overview` sans `transverse.admin.view` (en plus de `/admin/access`).

## Couverture (indicatif)

- **UI lot 5.4 :** chemins `/admin`, `/admin/access`, `/admin/site`, cohérence nav / URL / titres CREOS, gap data documenté visible sur les sous-pages.  
- **Story 5.6 :** structure `data-testid` des gabarits transverses après navigation réelle (`App` + manifest servi) ; partage explicite du patron **hub** dashboard vs listing ; consultation en deux colonnes.  
- **Story 5.7 :** trois états distinguables (loading / empty / error) via paramètre démo ; shell intact en erreur admin.  
- **Preuve navigateur réelle :** hors scope de ce dossier `e2e` jsdom — voir `tests/e2e/README.md` ; une preuve servie sur `http://127.0.0.1:4444` relèverait d’une couche Playwright / CI ultérieure.

## Story 5.8 — cohérence transverse du shell (QA : pas de nouveaux e2e)

**Décision :** aucun fichier de test ajouté dans ce run — conforme à l’**AC 9** de la story (« réexécution des tests existants », « pas de nouvelle suite massive ») et aux **Dev Notes** (« ne pas transformer 5.8 en epic de tests » ; ajouter le minimum seulement si régression bloquante identifiée — aucune).

**Pourquoi ce n’est pas un trou de couverture :**

- Le livrable 5.8 est **documentaire** : registre reviewable `references/artefacts/2026-04-08_01_transverse-shell-coherence-gaps-epic5.md` (grilles §1–§8, parcours §1.2, scénarios §2, matrice widgets §4, gaps Epic 6+).
- La **stratégie de preuve automatisée** y est déjà **explicitement** reliée aux suites existantes (§1.2, §8) : pas besoin de dupliquer la batterie 5.7.

**Alignement AC de preuve ↔ registre ↔ tests déjà en place**

| AC (focus preuve) | Où c’est cadré dans le registre | Tests / artefacts |
|-------------------|----------------------------------|-------------------|
| 1, 9 — chaîne contrats + preuves reproductibles | §1.1–§1.2, §8 | `navigation-transverse-5-1.e2e.test.tsx`, `transverse-templates-5-6.e2e.test.tsx`, `transverse-states-5-7.e2e.test.tsx`, `navigation-transverse-served-5-1.test.ts` |
| 2 — permissions / contexte (UI) | §2 | `filter-navigation-for-context.test.ts`, `context-envelope-freshness.test.ts`, `auth-context-envelope.e2e.test.tsx`, scénarios e2e nav (5.1 / 5.5) |
| 3 — layouts / états sans effondrement | §3 | `transverse-templates-5-6.e2e.test.tsx` + `transverse-states-5-7.e2e.test.tsx` (+ unitaires 5.6 / 5.7) |
| 4 — `data_contract` / OpenAPI | §4 (écarts nommés) | `creos-bandeau-live-manifests-4-1.test.ts` (aligné) ; lot transverse sans widget data = pas d’e2e réseau additif requis ici |
| 5 — libellés / visibilité | §5 | Couvert par e2e 5.1 + bloc Story 5.5 (voir tableau plus haut) |
| 6, 7, 8 — registre, non-objectif, roadmap | §6–§8 | **Documentation** (registre + index artefacts), pas de gate test supplémentaire |

**Gate exécuté (sous-agent QA e2e) :** `npm test` dans `peintre-nano/` — **35** fichiers, **208** tests, tous verts (2026-04-08).

## Exécution

- Commandes : `npm run lint` puis `npm run test` dans `peintre-nano/`  
- **Résultat :** 35 fichiers, **208 tests** — tous passent (dernier run QA : 2026-04-08, e2e Story 5.7 + suite complète).

## Checklist (workflow Quinn)

- [x] E2E générés / étendus (UI)  
- [x] Story **5.5** : libellés, fallback clé, bandeau conditionnel, `restriction_message` × (`degraded` / `forbidden`) + `PageAccessBlocked`  
- [x] Happy path admin hub + access + site + deep links  
- [x] Cas critique : `resolvePageAccess` sur les trois `PageManifest` admin sans permission  
- [x] Tous les tests exécutés avec succès (`npm test` dans `peintre-nano/`, 208 tests)  
- [x] Story **5.6** : e2e gabarits transverses (hub / consultation / absence sur accueil)
- [x] Story **5.7** : e2e états transverses (`transverseState=`) + unitaires primitives
- [x] Story **5.8** : pas de nouveaux e2e — justification + mapping AC ↔ registre ↔ suites existantes (section dédiée ci-dessus) ; gate `npm test` vert
- [x] Locateurs : `role`, `data-testid`, texte visible manifeste  
- [x] Pas de `sleep` arbitraire  
- [x] Tests indépendants (`afterEach` remet `history` sur `/`)  
- [x] Synthèse enregistrée ici  

## Prochaines étapes

- Garder `npm run test` en CI.  
- E2E navigateur (Playwright, etc.) si besoin de preuve réseau / CORS / servi réel.
