# Story 13.8 : Implémenter la traduction kiosque legacy retenue dans Peintre_nano

Status: review

**Story ID :** 13.8

**Story key :** `13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano`

**Epic :** 13 — Étendre la parité UI legacy de la caisse au-delà du kiosque nominal dans `Peintre_nano`

**Note create-story (2026-04-12, CS worker) :** cette story est **exclusivement** de l’**implémentation** Peintre (manifests CREOS, widgets, slots, runtime, tests). Elle s’exécute **en série après** la **validation du blueprint** livré par **13.7** (artefact synthèse + checklist approuvée). Ne pas traiter 13.7 comme optionnelle : toute ligne du blueprint marquée « Reporter / gap contrat » ou « Hors scope » ne doit **pas** être contournée par du code front métier.

Ultimate context engine analysis completed — comprehensive developer guide created (BMAD create-story, 2026-04-12).

---

## Prérequis bloquants (séquence stricte)

1. **Story 13.7** : le livrable documentaire est **validé** selon sa Definition of Done (artefact synthèse + table legacy → Peintre + mises à jour matrice convenues). Le **chemin canonique** du blueprint est **`references/artefacts/2026-04-12_06_blueprint-portage-kiosque-13-7.md`** (référence unique également dans le **Dev Agent Record** de cette story ; cohérent avec la story `13-7-auditer-et-traduire-le-kiosque-legacy-vers-un-plan-de-portage-peintre-nano.md`).
2. Tant que ce prérequis n’est pas rempli, l’agent d’implémentation **ne démarre pas** les changements fonctionnels de 13.8 (hors préparation de branche ou spike documenté séparément).

---

## Story

En tant que **caissier·ère** sur le parcours kiosque vente,

je veux que les **indices visuels et d’interaction** du kiosque legacy **retenus** dans le blueprint 13.7 soient **implémentés dans Peintre_nano** sur l’alias **`/cash-register/sale`** (même `page_key` que `/caisse`, mode kiosque),

afin que l’**expérience dans le cadre vente** soit **crédible et équivalente utilisateur** au legacy de référence, **sans** sortir du modèle **CREOS / widgets / API** ni réinventer le métier caisse (Epic 6).

---

## Garde-fous non négociables

- **Pas de copier-coller aveugle** du code `recyclique-1.4.4/frontend` : le legacy sert de **référence observable** et de liste de blocs ; la **réimplémentation** se fait en **stack Peintre** (ADR P1 : CSS Modules, `tokens.css`, Mantine dans la couche autorisée, pas de nouvelle autorité métier dans le routeur).
- **Hiérarchie de vérité** : données et autorisations via **OpenAPI** / **`ContextEnvelope`** ; composition via **`PageManifest`** / **NavigationManifest** ; pas de second contrat parallèle dans le front.
- **Un seul manifeste reviewable** pour la page : l’alias `/cash-register/sale` reste un **alias runtime** vers `cashflow-nominal` — ne pas introduire un second `PageManifest` « parallèle » sans décision d’architecture explicite et mise à jour de `peintre-nano/docs/03-contrats-creos-et-donnees.md`.
- **Mutualisation** : réutiliser ou étendre les **widgets** déjà identifiés au blueprint (ex. pavé numérique, grilles catégories, étapes wizard, ticket, finalisation) plutôt que dupliquer ; tout **nouveau** widget doit être **enregistré** au registre avec props **sérialisables** et contrat clair.
- **Interdits** : iframe legacy, second frontend parallèle, logique métier caisse nouvelle côté Peintre, contournement des gaps API — les gaps restent **ouverts en backlog contrat** ou **dérogation PO** tracée matrice.

---

## Portée et hors-scope

**Dans la portée**

- Implémentation des éléments **classés « Reproduire » ou « Adapter langage Peintre »** dans la checklist 13.7, pour la surface **vente kiosque** sur **`http://localhost:4444/cash-register/sale`** (session valide, alignement avec preuves **legacy** `localhost:4445` sur les mêmes intentions utilisateur).
- Ajustements **manifests** (`contracts/creos/manifests/`, ex. `page-cashflow-nominal.json`, surcharges `widget_props` documentées), **registre widgets**, **layouts / slots**, et **runtime** (`RuntimeDemoApp`, `RootShell`, marqueurs test) **uniquement** dans le cadre du blueprint validé.
- **Workflows clavier / focus** : implémenter ce que le blueprint 13.7 a classé **« à reproduire en 13.8 »** ; les points **« Dérogation PO »** ne s’implémentent pas sans référence matrice ; les **« non applicable »** sont ignorés.
- **Preuves** : conformité `guide-pilotage-v2.md` § *Règle caisse Peintre vs legacy* et `sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md` (gate MCP `user-chrome-devtools` sur les PR touchant `ui-pilote-03*` / caisse parité).

**Hors scope**

- Réexécuter l’audit 13.7 (appartenance à 13.7 si des trous subsistent — **NEEDS_HITL** ou retour 13.7).
- Nouvelles règles métier caisse non couvertes par l’Epic 6 ou les contrats existants.
- Variantes **virtuel / différé** si le blueprint ou la matrice les exclut pour ce slice (respecter la même borne que 13.7 / matrice).

---

## Acceptance Criteria (BDD aligné epics.md + garde-fous)

1. **Given** la checklist de traduction **13.7 approuvée** et la matrice à jour pour les lignes concernées,
   **When** la story 13.8 est livrée,
   **Then** sur **`/cash-register/sale`**, la disposition, les libellés **retenus**, l’ordre des CTA majeurs, et les états **vide / chargement / erreur** visibles dans le périmètre blueprint sont **reproduits** à un niveau **équivalent utilisateur** ou portent une entrée **explicite** `Equiv. utilisateur / derogation PO` / `Hors scope` dans `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` ;
   **And** aucun écart n’est laissé **implicite**.

2. **Given** le kiosque reste une surface **Peintre contractuelle**,
   **When** le code est revu,
   **Then** les changements passent par **manifests CREOS**, **widgets** enregistrés, **slots**, et données **API / types générés** — pas d’embedding legacy ni de raccourci parallèle ;
   **And** les `operationId` / schémas utilisés correspondent à des contrats **reviewables** (`contracts/openapi/recyclique-api.yaml`) ou sont signalés comme **gap** sans contournement métier front.

3. **Given** le blueprint section **« Réutiliser / étendre / créer »**,
   **When** l’implémentation est complète,
   **Then** chaque bloc livré est traçable vers **réutilisation**, **extension** ou **création** justifiée (nom de widget, chemins fichiers) ;
   **And** les composants mutualisables (ex. pavé numérique, grilles, étapes) ne sont **pas** dupliqués sans justification documentée dans la PR ou le Dev Agent Record.

4. **Given** les exigences **RCN-02** et certification **13.6** (chrome minimal, pas de double hub, `cash-register-sale-kiosk`),
   **When** on navigue hub → vente kiosque,
   **Then** il n’y a **pas** de régression sur le **cadre** déjà certifié (shell, bandeaux, transitions) sauf si le blueprint 13.7 **explicite** un ajustement compatible ;
   **And** les tests existants (`runtime-demo-cash-register-sale-kiosk-11-3`, `runtime-demo-cashflow-certification-chrome-13-6`, etc.) restent **verts** ou sont **mis à jour** de manière cohérente avec la doc `03-contrats-creos-et-donnees.md`.

5. **Given** la chaîne de qualité Peintre,
   **When** la story est proposée en review,
   **Then** `npm run lint` et `npm run test` (et build si requis par les gates du Story Runner) passent sur `peintre-nano` ;
   **And** les preuves MCP ou captures requises par le pilotage sont **référencées** (chemins sous `references/artefacts/` ou dossier de preuves epic 13).

---

## Tasks / Subtasks

- [x] **T0 — Gate prérequis** (AC: #1)
  - [x] Vérifier le fichier blueprint 13.7 validé sur disque + statut PO (le chemin canonique est déjà consigné dans le **Dev Agent Record** ci-dessous).
  - [x] Importer la liste **P0 / P1 / P2** issue de 13.7 (T5) comme backlog ordonné de cette implémentation.

- [x] **T1 — Manifests et composition** (AC: #2, #4)
  - [x] Appliquer les `widget_props` / ordre de slots prévus pour le kiosque sur `page-cashflow-nominal.json` (ou extension documentée) sans casser l’alias `/caisse` vs `/cash-register/sale` décrite dans `03-contrats-creos-et-donnees.md` § Routage 11.3 / RCN-02 / surcouche `sale_kiosk_minimal_dashboard`.
  - [x] Mettre à jour `03-contrats-creos-et-donnees.md` **seulement** si une décision structurelle doit être officialisée (sync avec matrice).

- [ ] **T2 — Widgets et mutualisation** (AC: #3)
  - [ ] Implémenter ou étendre les widgets listés (pavé, grilles, wizard, ticket, finalisation…) selon colonne **Réutiliser / étendre / créer** du blueprint — **fait dans ce run** : grille catégories kiosque dans `CashflowNominalWizard` ; **reste** : pavé / raccourcis (P1), en-tête session strip (gap manifeste / blueprint).
  - [x] Respecter le registre : déclaration, props, fallbacks runtime visibles si contrat incomplet.

- [x] **T3 — Données et contexte** (AC: #2)
  - [x] Brancher chaque widget sur les **hooks / operations** déjà mappées dans le blueprint ; si gap API, **ne pas** simuler la réponse métier — documenter gap + issue backlog.

- [ ] **T4 — Clavier, focus, densité opérateur** (AC: #1)
  - [ ] Implémenter les lignes du tableau « Action utilisateur | Legacy | Cible Peintre 13.8 » marquées pour implémentation ; tests e2e ou unitaires ciblés selon la colonne « Testable par » du blueprint.

- [x] **T5 — Preuves et matrice** (AC: #1, #5)
  - [x] Mettre à jour la matrice (`ui-pilote-03*`) : extension § 13.8 + pointeurs preuves headless Peintre (`2026-04-12_09_…`, dossier `2026-04-12_08_preuves-…`).
  - [x] Preuves P0 Peintre (grille catégories) : `2026-04-12_08_preuves-kiosque-13-8-headless/` ; comparatif legacy même run documenté dans `2026-04-12_09_…` (référence **03b** MCP 2026-04-11 si surface legacy synchronisée requise).

---

## Dev Notes

- **Ordre de travail** : blueprint 13.7 → manifests → widgets → runtime mineur → tests → preuves MCP.
- **Fichiers probables** : `contracts/creos/manifests/page-cashflow-nominal.json`, `contracts/creos/manifests/navigation-transverse-served.json` (si impact nav, peu probable pour alias seul), registre widgets sous `peintre-nano/src/domains/` (caisse / cashflow), `peintre-nano/src/app/RuntimeDemoApp.tsx`, `peintre-nano/src/shell/RootShell.tsx`, tests sous `peintre-nano/src/**/__tests__/` ou e2e existants caisse.
- **Legacy (lecture seule)** : `recyclique-1.4.4/frontend/src/pages/CashRegister/`, `components/business/SaleWizard.tsx`, `Ticket.tsx`, `FinalizationScreen.tsx`, `components/ui/Numpad.tsx` — pour comportement attendu, **pas** pour copier la stack.
- **Checklist anti-métier front** : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.

### Project Structure Notes

- Contrats canon : `contracts/openapi/`, `contracts/creos/` ; générés : `peintre-nano/src/generated/` (ne pas éditer à la main les types générés).
- Alignement extraction future : pas de logique métier dans le moteur de manifests.

### References

| Sujet | Chemin |
|--------|--------|
| Epic 13, story 13.8 | `_bmad-output/planning-artifacts/epics.md` (section Epic 13) |
| Story audit / blueprint | `_bmad-output/implementation-artifacts/13-7-auditer-et-traduire-le-kiosque-legacy-vers-un-plan-de-portage-peintre-nano.md` |
| Blueprint 13.7 (artefact) | `references/artefacts/2026-04-12_06_blueprint-portage-kiosque-13-7.md` |
| Sprint | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Contrats CREOS caisse / alias | `peintre-nano/docs/03-contrats-creos-et-donnees.md` |
| Matrice parité | `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` |
| Guide gate MCP | `_bmad-output/planning-artifacts/guide-pilotage-v2.md` § *Règle caisse Peintre vs legacy* |
| Correct course | `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md` |
| ADR P1 / instructions | `references/peintre/index.md` → ADR P1 + instruction Cursor |
| Certification cadre 13.6 | `references/artefacts/2026-04-12_04_certification-caisse-equivalence-legacy-13-6.md` |

---

## Intelligence story précédente (13.7)

- 13.7 fournit la **checklist ligne par ligne**, le **diagramme d’états** wizard, le tableau **clavier**, et la section **Réutiliser / étendre / créer** : la **source de vérité d’implémentation** pour 13.8 est ce document + matrice, **pas** l’intuition legacy seule.
- Le **contenu riche** interne (wizard, ticket, finalisation) était explicitement hors preuve RCN-02 seule ; 13.8 matérialise ce contenu **dans** Peintre selon le blueprint.

---

## Testing / validation

- Tests unitaires / intégration sur les nouveaux widgets ou props (snapshots légers si utile).
- Tests runtime existants caisse / kiosque : **non régression** obligatoire (cf. AC #4).
- e2e : suivre les indications du blueprint (colonnes « Testable par »).
- Gate produit : snapshots MCP legacy vs Peintre pour les scénarios P0 documentés dans la story ou la matrice.

---

## Dev Agent Record

### Agent Model Used

(bmad-create-story worker — 2026-04-12)

### Blueprint 13.7 (source de vérité pour l’implémentation 13.8)

- **Chemin canonique (racine dépôt) :** `references/artefacts/2026-04-12_06_blueprint-portage-kiosque-13-7.md`
- **Lien relatif depuis ce fichier story :** [Blueprint portage kiosque 13.7](../../references/artefacts/2026-04-12_06_blueprint-portage-kiosque-13-7.md)

### Completion Notes List

- Story 13.8 créée en mode **implémentation sérielle post-blueprint** ; aucun code produit par create-story.
- VS (bmad-create-story, mode validate, 2026-04-12) : *Dev Agent Record* complété — chemin canonique du blueprint 13.7 + lien markdown relatif vers `references/artefacts/2026-04-12_06_blueprint-portage-kiosque-13-7.md` ; entrée ajoutée au tableau *References*.
- **DS (Task bmad-dev-story, 2026-04-12)** : surcouche runtime `sale_kiosk_category_workspace: true` sur `cashflow-nominal-wizard` pour les chemins `…/sale` kiosque (`RuntimeDemoApp.withCashflowNominalKioskSaleWizard`). `CashflowNominalWizard` affiche `KioskCategoryWorkspace` (GET `/v1/categories/` via `fetchCategoriesList`, navigation parent/enfant). Tests : `cashflow-nominal-wizard-kiosk-13-8.test.tsx`, extension `runtime-demo-cash-register-sale-kiosk-11-3.test.tsx`. `npm run lint` OK sur `peintre-nano`.
- **Tranche suivante honnête** : **T4** (raccourcis AZERTY, Tab piège, pavé — blueprint § clavier / P1) ; **T2** sous-partie pavé + en-tête session (`Reporter/gap` blueprint) ; preuves MCP 4444 vs 4445 (**T5** sous-tâche captures) une fois serveurs accessibles.
- **Comparatif visuel (run 2026-04-12, Story Runner)** : Chrome headless + `puppeteer-core` — preuve **Peintre** OK (grille catégories + `cash-register-sale-kiosk`) : `references/artefacts/2026-04-12_09_comparatif-headless-kiosque-13-8-run.md` + PNG/JSON sous `references/artefacts/2026-04-12_08_preuves-kiosque-13-8-headless/`. **Legacy** même automatisme : hub `/cash-register` (session virtuelle / API non alignée recette) — baseline legacy **03b** (MCP 2026-04-11) pour l’intention kiosque virtuel.
- **UI** : retrait affichage « Raccourci : … » sur tuiles catégorie tant que **T4** clavier non branché (évite équivalence utilisateur trompeuse).

### File List

- `_bmad-output/implementation-artifacts/13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano.md` (ce fichier)
- `peintre-nano/src/api/dashboard-legacy-stats-client.ts`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.module.css`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/tests/unit/cashflow-nominal-wizard-kiosk-13-8.test.tsx`
- `peintre-nano/tests/unit/runtime-demo-cash-register-sale-kiosk-11-3.test.tsx`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-12_09_comparatif-headless-kiosque-13-8-run.md`
- `references/artefacts/2026-04-12_08_preuves-kiosque-13-8-headless/*` (captures + JSON)
- `peintre-nano/scripts/capture-kiosque-comparatif-13-8.mjs`
