# Story 13.7 : Auditer et traduire le kiosque legacy vers un plan de portage Peintre_nano

Status: done

**Story ID :** 13.7

**Story key :** `13-7-auditer-et-traduire-le-kiosque-legacy-vers-un-plan-de-portage-peintre-nano`

**Epic :** 13 — Etendre la parite UI legacy de la caisse au-dela du kiosque nominal dans `Peintre_nano`

**Note create-story (2026-04-12, CS worker) :** cette story est **exclusivement** un livrable **d'analyse + blueprint** (documentation, matrices, checklist de traduction). **Aucun** objectif de merge de code applicatif Peintre pour satisfaire les AC de 13.7. L'implementation concrete du kiosque est **reservee a la story 13.8** ; ne pas anticiper 13.8 dans le code ni creer de fichier story 13.8 ici.

Ultimate context engine analysis completed — comprehensive developer guide created (BMAD create-story, 2026-04-12).

---

## Story

En tant qu'**equipe produit et implementation**,

je veux que la **surface kiosque vente legacy** (`/cash-register/sale` et branches virtuel / differe associees sur le **meme** composant de vente) soit **auditee en profondeur** puis **traduite** en plan de portage **CREOS / manifests / widgets / slots / OpenAPI / ContextEnvelope**,

afin que la **story 13.8** puisse implementer sans improvisation ni duplication de metier front ce qui est **retenu** comme equivalent utilisateur **dans** Peintre.

---

## Portee et hors-scope

**Dans la portee (13.7)**

- Parcours **kiosque vente** observable sur legacy `http://localhost:4445` : routes `…/sale` (reel, virtuel, differe) telles que decrites dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` et la matrice `ui-pilote-03*`.
- **Inventaire structurel** du legacy : sous-ecrans, etapes wizard, grilles categories / sous-categories, ticket lateral, finalisation, en-tetes / KPI, **pave numerique** (`Numpad`), etats **chargement / vide / erreur**, responsive (breakpoints qui modifient la grille).
- **Workflows clavier** : tab order, touches fonctionnelles ou raccourcis documentes dans le code ou l'UI (extraire depuis `Sale.tsx`, `SaleWizard`, hooks, handlers) ; ecarts explicites si rien n'est documente cote legacy.
- **Mutualisations** proposees : quels blocs peuvent devenir **widgets** reutilisables (ex. pave, grille categorie, ligne ticket), quels **slots** du `page-cashflow-nominal.json` existant les accueillent ou quels **nouveaux** slots / widgets seraient necessaires (sans les implementer).
- **Contraintes** : respect strict **pas de metier invente dans le routeur** ; alignement `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` ; ADR P1 (`references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`).
- **Preuves** : references croisees aux packs **13.6** (`references/artefacts/2026-04-12_04_certification-caisse-equivalence-legacy-13-6.md`, dossier `2026-04-12_04_certification-13-6-preuves/`) et comparaison **ce que Peintre affiche aujourd'hui** sur les alias kiosque (memes URLs) pour chaque bloc inventorie.

**Hors scope (13.7)**

- Implementation UI Peintre (story **13.8**).
- Nouvelles regles metier caisse (Epic **6** reste l'autorite fonctionnelle).
- Formalisation OpenAPI nouvelle **sauf** identification de gaps deja nommes a tracer vers backlog contrat.

---

## Acceptance Criteria (BDD aligne epics.md)

1. **Given** le kiosque legacy sur `localhost:4445` et Peintre sur `localhost:4444` pour les intentions **retenues** dans la matrice,
   **When** le livrable 13.7 est revu,
   **Then** chaque **bloc visible majeur** (titres, CTA, panneaux, listes, modales, bandeaux) du kiosque en scope est present dans une **checklist legacy -> Peintre** avec statut par ligne : `Reproduire tel quel`, `Adapter langage Peintre (justification)`, `Reporter / gap contrat`, `Hors scope (ref)` ;
   **And** chaque ligne **retenue** pour 13.8 pointe vers une cible : `page_key`, slot existant ou propose, **nom de widget** existant ou **nouveau** enregistrement registre, et **operationId** ou famille API reviewable quand des donnees sont affichees.

2. **Given** les etapes du wizard et les modes (ex. selection categorie, sous-categorie, saisie quantite / prix) dans le legacy,
   **When** l'audit est complete,
   **Then** un **diagramme ou tableau d'etats** (legacy : etats `useCashWizardStepState` / attributs `data-wizard-step` etc.) est produit et **superpose** a la composition actuelle Peintre (`cashflow-nominal`, wizard brownfield, aside ticket) ;
   **And** les **transitions** qui impliquent uniquement presentation vs donnees serveur sont separees explicitement.

3. **Given** l'exigence d'equivalence utilisateur du **correct course** (`sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`) et la **gate MCP** (`guide-pilotage-v2.md` § *Regle caisse Peintre vs legacy*),
   **When** la story est acceptee,
   **Then** la checklist indique pour les workflows clavier / focus **ce qui doit etre reproduit en 13.8**, ce qui est **Derogation PO**, et ce qui est **non applicable** ;
   **And** les preuves 13.6 (snapshots / traces MCP existantes) sont **citees** ou completees par de **nouvelles** captures **uniquement** si necessaire pour combler un trou de l'inventaire kiosque (pas de refaire toute la certification hub).

4. **Given** la mutualisation (pave, grilles, widgets),
   **When** le blueprint est valide,
   **Then** une section **« Reutiliser / etendre / creer »** classe chaque composant legacy cite (chemins fichiers `recyclique-1.4.4/frontend/...`) ;
   **And** aucune strategie **iframe legacy** ni **second frontend parallele** n'est proposee comme defaut (alignement proposal §2.2).

5. **Given** les contraintes CREOS (un seul `PageManifest` reviewable pour alias `/cash-register/sale` — cf. `03-contrats-creos-et-donnees.md` §11.3, §RCN-02, surcouche `sale_kiosk_minimal_dashboard`),
   **When** le plan de portage est lu par un dev 13.8,
   **Then** il est explicite quels ajustements restent **widget_props** / manifeste **vs** code `RuntimeDemoApp` **vs** nouveau widget — sans melanger les responsabilites ;
   **And** les impacts **OpenAPI / ContextEnvelope / permissions** sont listes avec references aux sections deja documentees dans `03-contrats-creos-et-donnees.md` ou marques **gap a ouvrir**.

6. **Given** la story 13.6 **done** (certification troncon hub -> fond -> vente),
   **When** 13.7 est livree,
   **Then** le document **rappelle** les constats 13.6 utiles au kiosque (chrome minimal, pas de double hub, marqueur `cash-register-sale-kiosk`, etc.) et **etend** l'analyse a l'**interieur** du frame vente (wizard + ticket + finalisation) absent d'une simple preuve RCN-02.

---

## Critères de sortie concrets (Definition of Done — livrable documentaire)

Le PO / referent peut dire **« blueprint valide »** uniquement si **toutes** les conditions suivantes sont remplies :

- [x] **Artefact unique** de synthese (nom conseille : `references/artefacts/2026-04-12_06_blueprint-portage-kiosque-13-7.md` ou date du jour de livraison si posterieur) reference en tete du **Dev Agent Record** ci-dessous, avec sommaire cliquable (ancres markdown).
- [x] **Table** « Bloc legacy | Fichier(s) source | Etape / etat UI | Cible Peintre (widget / slot / props) | API / contrat | Statut ligne matrice » avec **exactement** les valeurs AC #1 : `Reproduire tel quel`, `Adapter langage Peintre (justification)`, `Reporter / gap contrat`, `Hors scope (ref)` — **une etiquette par ligne** ; le blueprint inclut une **legende de mapping** (ancien vocabulaire → valeur AC) pour eviter toute confusion avec OK / Derogation. La sous-section **workflows clavier** (DoD suivant) reste regie par l'AC #3 (**Reproduire** / **Derogation PO** / **non applicable**).
- [x] **Sous-section** workflows clavier : tableau **Action utilisateur | Legacy | Cible Peintre 13.8 | Testable par** (e2e / manuel / MCP).
- [x] **Section** mutualisation : liste des **candidats widgets** avec justification de partage (ex. pave entre caisse nominal et admin) ou **non-partage** (specificite kiosque).
- [x] **Mise a jour** de `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` : soit nouvelle ligne pilote **bornee** au detail kiosque (si le pilotage l'exige), soit extension **documentee** des lignes `ui-pilote-03` / `03f` avec renvoi vers l'artefact 13.7 — **sans** changer le statut des lignes existantes sans decision PO.
- [x] **Lien explicite** vers la **story 13.8** dans l'epilogue : « prerequis : checklist approuvee » — **sans** rediger les AC de 13.8.

---

## Tasks / Subtasks

- [x] **T1 — Cartographier le legacy kiosque** (AC: #1, #2, #6)
  - [x] Lire `recyclique-1.4.4/frontend/src/pages/CashRegister/Sale.tsx`, `SaleWrapper.tsx` si route wrapper, `components/business/SaleWizard.tsx`, `Ticket.tsx`, `FinalizationScreen.tsx`, `CashSessionHeader.tsx`, `CashKPIBanner.tsx`, `components/ui/Numpad.tsx`.
  - [x] Lister les **data-wizard-step** / etats de hook et la grille CSS (colonnes, breakpoints) avec captures ou citations de lignes.
  - [x] Noter les appels reseau ou stores (noms) pour correlation **OpenAPI** ulterieure — sans dupliquer la cartographie exhaustive Epic 6.

- [x] **T2 — Cartographier Peintre actuel sur le meme perimetre** (AC: #1, #5, #6)
  - [x] `contracts/creos/manifests/page-cashflow-nominal.json`, registre widgets caisse brownfield, chemins `RuntimeDemoApp` / `RootShell` lies a `cash-register-sale-kiosk` et `sale_kiosk_minimal_dashboard` (cf. `03-contrats-creos-et-donnees.md`).
  - [x] Comparer bloc a bloc avec l'inventaire T1 ; marquer **deja couvert**, **partiel**, **absent**.

- [x] **T3 — Workflows clavier et densite operateur** (AC: #3)
  - [x] Extraire du code et/ou verifier sur instance les raccourcis / focus ; documenter les ecarts avec la regle produit du proposal.

- [x] **T4 — Blueprint et matrice** (AC: #4, #5, DoD)
  - [x] Rediger l'artefact synthese et mettre a jour la matrice comme indique en DoD.
  - [x] Revue croisee avec `peintre-nano/docs/03-contrats-creos-et-donnees.md` : ajouter une sous-section ou PR doc **si** une decision d'architecture doit etre officialisee (sinon rester dans l'artefact 13.7).

- [x] **T5 — Passage de relais 13.8** (AC: tous)
  - [x] Liste **ordonnee** des travaux 13.8 (P0 / P1 / P2) deduite du blueprint — **liste de planification seulement**, pas d'implementation.

---

## Dev Notes (agent d'execution : analyste / tech writer + archi legere)

- **Nature du travail** : recherche dans le depot legacy + Peintre, redaction structuree, eventuellement scripts de grep / tableaux — **pas** de modification fonctionnelle `peintre-nano/src` hors corrections typo si indispensable.
- **Hiérarchie de vérité** : donnees = API ; UI = manifests + widgets ; alignement `sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`.
- **Gate preuve** : reutiliser au maximum `references/artefacts/2026-04-12_04_certification-13-6-preuves/` ; completer par MCP `user-chrome-devtools` si un etat kiosque n'y figure pas (meme regle que `guide-pilotage-v2.md`).
- **Epic 6** : ne pas redefinir les parcours 6.3–6.6 ; le blueprint **mappe** les visuels legacy vers les **capabilities** deja decrites en Epic 6 quand elles existent.

### Project Structure Notes

- Legacy : `recyclique-1.4.4/frontend/src/pages/CashRegister/`, `components/business/`.
- Peintre : `peintre-nano/`, `contracts/creos/manifests/`, `contracts/openapi/recyclique-api.yaml`.
- Livrables BMAD / refs : `_bmad-output/implementation-artifacts/`, `references/artefacts/`.

### References

| Sujet | Chemin |
|--------|--------|
| Epic 13 et stories 13.7–13.8 | `_bmad-output/planning-artifacts/epics.md` (section Epic 13) |
| Sprint | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Contrats CREOS caisse / alias | `peintre-nano/docs/03-contrats-creos-et-donnees.md` (§ Routage 11.3, 13.1–13.3, RCN-01, RCN-02, certification 13.6) |
| Matrice parite | `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` |
| Guide gate MCP | `_bmad-output/planning-artifacts/guide-pilotage-v2.md` § *Regle caisse Peintre vs legacy* |
| Correct course DoD | `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md` |
| Index Peintre (ADR P1) | `references/peintre/index.md` |
| Certification 13.6 | `references/artefacts/2026-04-12_04_certification-caisse-equivalence-legacy-13-6.md` |
| Story ombrelle precedente | `_bmad-output/implementation-artifacts/13-6-certifier-lequivalence-utilisateur-legacy-de-la-caisse-observable-dans-peintre-nano.md` |

---

## Intelligence story precedente (13.6)

- La **certification** a verrouille le **troncon** hub -> session -> **cadre** kiosque (RCN-01, RCN-02, chrome demo, absence de double hub). Le **contenu riche** du wizard / ticket / finalisation **n'a pas besoin** d'etre deja equivalent : 13.7 est l'endroit pour le **decomposer** sans presumer du verdict final.
- Les preuves MCP et fichiers texte sous `2026-04-12_04_certification-13-6-preuves/` sont la **base** pour les comparaisons « avant / apres cadre » ; 13.7 ajoute la **granularite interne**.

---

## Testing / validation (story 13.7)

- **Pas de suite pytest / vitest obligatoire** pour la story elle-meme.
- **Validation humaine** : relecture PO du blueprint + coherence avec la matrice.
- Si un correctif **mineur** de doc `03-contrats` est fait pour **refleter** le blueprint, il doit rester **synchrone** avec l'artefact 13.7 et la matrice.

---

## Dev Agent Record

### Agent Model Used

(bmad-create-story worker — 2026-04-12) ; execution **bmad-dev-story** (Task DS — 2026-04-12).

### Artefact synthese (a remplir par l'executant)

- **Fichier blueprint :** [`references/artefacts/2026-04-12_06_blueprint-portage-kiosque-13-7.md`](../../references/artefacts/2026-04-12_06_blueprint-portage-kiosque-13-7.md) — sommaire ancres, tableau blocs, etats wizard, clavier, mutualisation, responsabilites CREOS, OpenAPI/ContextEnvelope, epilogue **13.8**.

### Completion Notes List

- Story creee en mode **audit / traduction** ; 13.8 non creee.
- Blueprint **13.7** livre : inventaire legacy (`Sale`, `SaleWizard`, hook etapes, `data-wizard-step` = `numpadMode`, grilles CSS) croise `page-cashflow-nominal.json`, `RuntimeDemoApp` (`sale_kiosk_minimal_dashboard`, `suppressCashflowNominalWorkspaceSaleAndAside`), `CashflowNominalWizard`, doc **03** ; extension matrice § *Extension story 13.7* sans modification des colonnes Statut/Equiv. des lignes pilotes ; index `references/artefacts/index.md` mis a jour ; sprint-status **13-7** → **review**.
- **Retry code-review (Task DS)** : colonne « Statut ligne matrice » et DoD alignes sur les **quatre** valeurs AC #1 ; KPI tranche en `Reporter / gap contrat` avec justification PO/contrat ; lignes a double statut scindees (grilles intention vs rendu) ; legende de mapping explicite dans le blueprint.
- **Story Runner (2026-04-12)** : graphe VS→DS→GATE→QA→CR ; premier CR en NEEDS_HITL (vocabulaire statuts) ; correctifs doc puis **CR2 PASS** ; gates `peintre-nano` `npm run lint` + `npm run test` verts sur les deux passes ; sprint-status **13-7** → **done**.
- Pas de modification `peintre-nano/src` (hors perimetre 13.7) ; pas de suite pytest obligatoire (story documentaire).

### File List

- `_bmad-output/implementation-artifacts/13-7-auditer-et-traduire-le-kiosque-legacy-vers-un-plan-de-portage-peintre-nano.md` (ce fichier)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `references/artefacts/2026-04-12_06_blueprint-portage-kiosque-13-7.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/tests/13-7-blueprint-kiosque-doc-qa-summary.md`
- `_bmad-output/implementation-artifacts/tests/test-summary.md`

## Change Log

- **2026-04-12** — DS **bmad-dev-story** : livraison blueprint kiosque **13.7**, extension matrice + index artefacts, statut story et sprint **review**.
- **2026-04-12** — DS **bmad-dev-story** (retry CR) : alignement statuts matrice / DoD sur AC #1, KPI, scission lignes grilles, mapping legende dans `2026-04-12_06_blueprint-portage-kiosque-13-7.md`.
- **2026-04-12** — Story Runner : **CR2** PASS, second passage gates + QA doc ; story et sprint **13-7** → **done**.
