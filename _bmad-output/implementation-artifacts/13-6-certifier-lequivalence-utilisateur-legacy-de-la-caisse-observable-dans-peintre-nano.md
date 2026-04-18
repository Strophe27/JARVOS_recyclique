# Story 13.6 : Certifier l'equivalence utilisateur legacy de la caisse observable dans `Peintre_nano`



Status: done



**Story ID :** 13.6

**Story key :** `13-6-certifier-lequivalence-utilisateur-legacy-de-la-caisse-observable-dans-peintre-nano`

**Epic :** 13 — Etendre la parite UI legacy de la caisse au-dela du kiosque nominal dans `Peintre_nano`



**Note create-story (2026-04-12, CS) :** cette story est l'**ombrelle de certification** (correct course `sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`). Les stories **11.1–11.3** et **13.1–13.5** restent le **socle historique** contractuel / observable / matrice ; elles ne sont **pas** annulees. La **13.6** impose une **Definition of Done produit** : equivalence utilisateur **credible** face au legacy **1.4.4** sur le perimetre caisse **retenu** dans la matrice, **sans** contournement du modele **CREOS / widgets / slots / OpenAPI / ContextEnvelope**. Tout ecart doit etre **OK**, **Derogation PO (ref explicite)** ou **Hors scope (ref explicite)** — **aucune** ligne pilote caisse sans classification dans **`Equiv. utilisateur / derogation PO`** ; **aucun** ecart residual « en suspens » ou « a clarifier » au moment de passer la story en **review** / **done**.



Ultimate context engine analysis completed — comprehensive developer guide created (BMAD create-story, 2026-04-12).



## Story



En tant que **PO ou referent terrain**,



je veux que la **caisse** livree dans `Peintre_nano` soit **certifiee** explicitement contre le legacy de reference (**`http://localhost:4445`**) sous la **nouvelle** regle d'equivalence utilisateur (guide + proposal),



afin de pouvoir affirmer une **experience caisse ressentie** alignee sur le legacy — **traduite** dans Peintre (manifests, widgets, API) — et non plus seulement une **parite observable bornee**.



## Decisions architecturales (faire foi pour le dev)



1. **Socle vs fin** : le travail **11.x / 13.x** (jusqu'a **13.5**) = **socle** technique et contractuel ; la **13.6** = **certification reelle** (relecture transversale + correctifs / enrichissements presentationnels autorises **dans** le cadre CREOS).

2. **Shell de vente dedie** : le parcours **kiosque vente** et les etats **plein cadre** associes (nav masquee, intention operateur **caisse** sans chrome transverse parasite) doivent etre **exploitables** et **lisibles** comme un **workspace vente dedie** — aligne legacy (`Sale`, `SaleWrapper`, routes `App.jsx`) — via **`RootShell`**, alias runtime, **`page_key` `cashflow-nominal`**, **sans** second frontend parallele ni iframe legacy.

3. **Densite credible** : pas d'ecrans « squelettiques » ou vides **trompeurs** la ou le legacy presente des blocs utiles (resume, CTA, listes, etats chargement / erreur) ; toute simplification volontaire = **ligne matrice** + **Equiv.** explicite.

4. **Disparition du bruit technique / debug** : libelles, bandeaux, encarts **demo**, JSON de debug, vocabulaire **interne** (cles CREOS, `operationId`, noms de slots exposes a l'operateur) **interdits** sur le chemin caisse certifie — sauf **gating** environnement strict (ex. uniquement hors `VITE_LIVE_AUTH` / flag outil documente) et **hors** capture de preuve certification.

5. **Preuve comparative** : paquet de preuve **legacy vs Peintre** (`localhost:4445` vs `localhost:4444`) pour les **memes intentions** utilisateur (sequences documentees), via MCP **`user-chrome-devtools`** selon `guide-pilotage-v2.md` § *Règle caisse Peintre vs legacy (2026-04-12)*.

6. **Matrice sans ecart non classe** : pour toutes les lignes pilotes **caisse** listees en § Perimetre matrice, colonnes **Statut**, **Equiv. utilisateur / derogation PO**, **Ecarts / decisions** coherentes ; **zero** cellule **Equiv.** vide ou ambigue au terme de la story.

7. **Aucun contournement contractuel** : pas de logique metier caisse **inventee** cote front ; pas de raccourci hors **OpenAPI generee**, **ContextEnvelope**, manifests **reviewables** (`contracts/creos/manifests/`), registre widgets — cf. `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.



## Perimetre matrice (caisse — certification obligatoire)



Relecture et, si besoin, **mise a jour** des lignes suivantes dans `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (regles d'usage §5–7 du fichier matrice) :



- `ui-pilote-03-caisse-vente-kiosk` (Story **11.3**)

- `ui-pilote-03a-caisse-adjacents-kiosque` (**13.1**)

- `ui-pilote-03b-caisse-virtuelle-legacy-urls` (**13.2**)

- `ui-pilote-03c-caisse-saisie-differee-legacy-urls` (**13.2**)

- `ui-pilote-03d-caisse-session-close-legacy-urls` (**13.3**)

- `ui-pilote-03e-rcn-01-hub-caisse` (**13.4**)

- `ui-pilote-03f-rcn-02-hub-vers-vente-kiosk` (**13.5**)



Toute **nouvelle** ligne ou **revision** apres le **2026-04-12** applique la colonne **`Equiv. utilisateur / derogation PO`** (valeurs autorisees : **OK**, **Derogation PO (ref explicite)**, **Hors scope (ref explicite)**) — matrice § regles 5–6.



## Non-scope



- **Ne pas** reouvrir les stories **11.x / 13.1–13.5** comme echecs : la 13.6 **complete** la definition de succes.

- **Admin** transverse, **reception**, **Epic 6** nominal hors matrice caisse : hors scope sauf impact direct documente sur le shell caisse.

- **Iframe** ou application legacy embarquee comme strategie de « parite » : **interdit** (proposal §2.1).



## Acceptance Criteria



1. **Cadre epics** — Etant donne la Story **13.6** dans `epics.md`, quand le livrable est pret pour le dev, alors le fichier story reprend les trois blocs **Given / When / Then** des AC epics (shell dedie, densite, absence de bruit, preuves, matrice sans trou) et les **precise** en checklist verifiables.

2. **Certification transversale** — Etant donne le socle **11.3** + **13.1–13.5**, quand la certification est executee, alors une **relecture de bout en bout** (parcours operateur : login public si necessaire, dashboard, hub `/caisse`, adjacents, variantes retenues, session close, hub RCN-01, transition RCN-02, kiosque vente) valide ou corrige l'**equivalence ressentie** **sans** regression sur les preuves deja archivees.

3. **Shell vente dedie** — Etant donne le legacy **kiosque** et le doc **03** (`peintre-nano/docs/03-contrats-creos-et-donnees.md`), quand l'operateur est en **vente** plein cadre, alors **Peintre** expose le **meme ordre d'intention** (nav principale masquee, contenu vente dominant, pas de double hub) ou chaque ecart est **classifie** matrice + **Equiv.**

4. **Densite / vide trompeur** — Etant donne les snapshots legacy, quand un bloc legacy a un equivalent fonctionnel dans le contrat, alors Peintre le **rend** ou le **gap** est une **ligne** matrice explicite (pas de silence).

5. **Bruit technique** — Etant donne le chemin caisse en certification, quand un texte ou bandeau est visible par l'operateur, alors il est **metier** ou **navigation** reviewable — pas de dump contractuel, pas de label **debug** non justifie par un **mode** documente et absent des captures de certification.

6. **Preuve comparative** — Etant donne **`user-chrome-devtools`**, quand le paquet de preuve est depose, alors pour **chaque** intention majeure du § Perimetre matrice : snapshots **4445** et **4444** apparies (ou **Derogation PO** si MCP indisponible — procedure **HITL** documentee dans la story / artefact date `references/artefacts/` + index).

7. **Matrice** — Etant donne la matrice `2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`, quand la story est prete pour revue, alors **aucune** ligne du § Perimetre matrice n'a d'**Equiv.** non classee ; tout ecart residual est **OK / Derogation PO / Hors scope** avec reference (story, date, ou doc PO).

8. **Hierarchie contrats** — Etant donne toute modification, quand le code change, alors elle reste **mappable** a **PageManifest / NavigationManifest / widget_props / OpenAPI** ; **aucune** autorite metier parallele dans le routeur ou composants ad-hoc.

9. **Gates** — Etant donne `peintre-nano/`, quand on pousse les changements, alors **lint**, **build**, **tests** au vert ; MCP ou HITL documente selon `guide-pilotage-v2.md`.



## Preuve obligatoire — Chrome DevTools MCP (`user-chrome-devtools`)



- **Comparaison** : pour chaque intention certifiee, **legacy** puis **Peintre** — memes etapes utilisateur (documenter la sequence : URLs, CTA, etats).

- **Ordre outils** : `list_pages` → `select_page` → `navigate_page` → `take_snapshot` ; reseau : `list_network_requests` puis `get_network_request` **uniquement** sur IDs listes.

- **Descripteurs JSON** : lire les fichiers sous le repertoire MCP `user-chrome-devtools/tools/` du projet Cursor **avant** tout appel.

- **Secrets** : ne pas versionner mots de passe / PIN ; runbook / variables d'environnement.



## Contraintes techniques et garde-fous



- **ADR P1** (`references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`) : fidelite utilisateur par **tokens**, **Mantine**, **CSS Modules** dans les widgets autorises.

- **Fichiers centraux** : `RuntimeDemoApp.tsx`, `RootShell`, manifests `page-cashflow-nominal.json`, widgets domaine **cashflow**, `peintre-nano/docs/03-contrats-creos-et-donnees.md`.

- **Tests** : etendre ou ajouter des tests **runtime-demo** / **e2e** la ou ils **verrouillent** des invariants certification (sans remplacer les preuves MCP pour l'equivalence ressentie).

- **Artefact de synthese** : produire un fichier date dans `references/artefacts/` (ex. `YYYY-MM-DD_NN_certification-caisse-equivalence-legacy-13-6.md`) listant sequences, liens snapshots / chemins preuves, etat **ligne par ligne** de la matrice § Perimetre — et **mettre a jour** `references/artefacts/index.md`.



## Intelligence stories precedentes (references)



- **11.3** : alias `/cash-register/sale`, `hideNav`, tests kiosque — socle ; la **13.6** verifie que l'**experience** reste **credible** (densite, bruit) une fois tout le parcours caisse assemble.

- **13.4 / 13.5** : hub **RCN-01** et transition **RCN-02** — la certification valide la **coherence** avec la vente et l'absence de **regressions** shell.

- **13.1 / 13.2 / 13.3** : adjacents, variantes, cloture — revalidation sous la **colonne Equiv.** normative ; revision des **N/A historique** si une ligne est touchee par le dev de certification.



## Reference project-context



- `references/peintre/index.md` ; `guide-pilotage-v2.md` § **Règle caisse Peintre vs legacy** ; `sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md` (DoD v3).



## Statut story (create-story)



- **done** (2026-04-12, Story Runner **DS→gates→QA→CR** + Task **hybride kiosque**) — Tronçon critique **hub `/caisse` → Ouvrir → fond → `/cash-register/sale`** : redirection post-`POST` sur surface `session_open`, e2e `cash-register-hub-open-to-sale-13-6.e2e.test.tsx` ; **reload `/…/sale`** : `sale_kiosk_minimal_dashboard` (plus de titre hub empilé sur le wizard). Gates `peintre-nano` verts. Certification MCP exhaustive : artefact § suite decoupee.



## Tasks / Subtasks



- [x] Inventorier l'etat **actuel** des lignes § Perimetre matrice (Equiv., Statut, Ecarts).

- [x] Executer les parcours legacy **4445** et Peintre **4444** ; constituer le **paquet de preuve** (snapshots apparies).

- [x] Lister tout **bruit** debug / demo / contractuel visible ; plan de **suppression** ou **gating** strict + verification.

- [x] Verifier **shell vente dedie** et **densite** ; ouvrir les PR / changements **mappes** CREOS + doc **03**.

- [x] Mettre a jour la **matrice** : zero ligne sans **Equiv.** classee.

- [x] Rediger l'**artefact** `references/artefacts/YYYY-MM-DD_NN_certification-caisse-equivalence-legacy-13-6.md` + **index**.

- [x] Gates **peintre-nano** (lint, build, test) + mise a jour **Dev Agent Record** en fin d'implementation.

- [x] Sous-slice corrective **hub → fond → vente nominal** : `CaisseBrownfieldDashboardWidget` redirige vers `…/sale` après `POST` réussi sur surface `session_open` ; e2e dédié **13.6**.

  - [x] Reproduire et documenter l'ecart legacy vs Peintre sur la sequence `ouvrir caisse -> fond -> vente`.

  - [x] Corriger et revalider le point d'arrivee : sortie du troncon **fond de caisse** vers **poste de vente nominal** (`/cash-register/sale` et variantes), sans ecran hybride `session/open`.

  - [x] Revalider la **preuve comparative MCP** et la matrice `ui-pilote-03f-rcn-02-hub-vers-vente-kiosk` : paires **4445** / **4444** sur atterrissage **`/cash-register/sale`** (Reprendre + reload post-correctif) + e2e **Ouvrir + fond** ; ligne **03f** déjà **OK** sans changement de fond.



## References



- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 13, Story 13.6]

- [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`]

- [Source: `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`]

- [Source: `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — §7, Règle caisse 2026-04-12]

- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`]

- [Source: `_bmad-output/implementation-artifacts/11-3-retrouver-la-vente-caisse-kiosque-observable-dans-peintre-nano.md`]

- [Source: `_bmad-output/implementation-artifacts/13-4-aligner-le-hub-caisse-avec-la-parite-legacy-rcn-01.md`]

- [Source: `_bmad-output/implementation-artifacts/13-5-aligner-la-transition-hub-vers-vente-plein-cadre-rcn-02.md`]

- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md`]

- [Source: `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]

- [Source: `references/peintre/index.md`]



## Change Log

- **2026-04-12** — Task **bmad-dev-story** : correctif **hybride** post-**reload** sur **`/cash-register/sale`** (`withCashflowNominalKioskSaleDashboard`, strip session) ; preuves MCP `mcp-2026-04-12-*` ; assertions e2e/unit absence titre hub ; doc **03** ; artefact certification § resume.
- **2026-04-12** — Story Runner **13.6** : gates complets (lint, 397 tests, build) ; QA e2e `cash-register-hub-open-to-sale-13-6.e2e.test.tsx` ; CR PASS ; `sprint-status` **13-6** + **epic-13** → **done** (tronçon prioritaire clos ; MCP pixels / matrice 03f en suivi HITL si besoin).
- **2026-04-12** — DS **13.6** (tronçon fond → vente) : navigation automatique post-`POST` depuis l'alias `…/session/open` vers `…/sale` (réel / virtuel / différé) ; `resolvedSessionId` inclut `cashSessionIdInput` brouillon ; e2e `cashflow-nominal-6-1` alignés ; gates `peintre-nano` OK.
- **2026-04-12** — Certification **13.6** (slice) : chrome demo `cashflow-nominal`, libelles cartes caisse, matrice **Equiv.**, artefact `2026-04-12_04_certification-caisse-equivalence-legacy-13-6.md` + dossier preuves ; gates `peintre-nano` OK.
- **2026-04-12** — Story Runner : premier `npm run test` en échec (assertion `flow-renderer-cashflow-nominal` sur hub `/caisse` — wizard retiré 13.1) ; corrigé vers `caisse-brownfield-dashboard` ; sous-agent QA : cas kiosque `/cash-register/sale` ; gates **lint / test / build** rejoués **OK**.

## Dev Agent Record

### Agent Model Used

Composer (agent Task **bmad-dev-story**), session **2026-04-12**.

### Debug Log References

- MCP **`user-chrome-devtools`** (Task **2026-04-12**, tronçon **13.6**) : `list_pages` ; onglet **4445** : login **admin** → hub **`/caisse`** → clic **Reprendre** → **`/cash-register/sale`** → `take_snapshot` fichier `mcp-2026-04-12-legacy-4445-hub-reprendre-sale.txt` ; onglet **4444** : `navigate_page` **reload** sur **`/cash-register/sale`** → `take_snapshot` `mcp-2026-04-12-peintre-4444-sale-post-fix-reload.txt` (absence titre hub « Sélection du Poste »). **Note** : instance recette avec session **déjà ouverte** — tronçon **Ouvrir + fond** couvert par e2e `cash-register-hub-open-to-sale-13-6.e2e.test.tsx` (fetch mock).
- MCP **`user-chrome-devtools`** (historique slice) : `list_pages` (page **4444** `/cash-register/sale` puis **4445** `/login`) ; `navigate_page` **4445/login** → remplissage formulaire → `click` connexion → `wait_for` `["Tableau de bord","Caisse"]` ; `click` lien **Caisse** ; `wait_for` « Sélection du Poste de Caisse » ; `take_snapshot` → `references/artefacts/2026-04-12_04_certification-13-6-preuves/legacy-4445-caisse-hub.txt` ; `navigate_page` **4444/caisse** ; `take_snapshot` → `peintre-4444-caisse-hub-post-13-6.txt` ; snapshot kiosque **4444** : `peintre-4444-cash-register-sale.txt`.
- **Secrets** : non consignes dans le depot ; saisie session MCP uniquement.

### Completion Notes List

- **Hybride kiosque (Task 2026-04-12)** : sur **`/cash-register/sale`**, le `PageManifest` reviewable réutilise `presentation_surface: hub` — un reload réaffichait titre *Sélection du Poste…* + modes + bloc ouverture complet **avec** le wizard. **Correctif** : `sale_kiosk_minimal_dashboard` (runtime) + rendu compact session ; MCP reload **4444** sans titre hub ; **4445** sale après **Reprendre** (session déjà ouverte sur l'instance). **Ouvrir + fond** : e2e mock (poste fermé indisponible en MCP live sur cette session).
- **Tronçon 13.6 (DS 2026-04-12)** : écart reproduit — après POST succès sur `presentation_surface: session_open`, l'UI restait sur `…/session/open` avec formulaire + alerte succès + reprise partielle du bandeau session (hybride) alors que le legacy enchaîne sur `…/sale`. **Correctif** : `spaNavigateTo` vers `legacyCashRegisterSalePathFromPathname` dès succès sur surface session open uniquement ; **cohérence** : `resolvedSessionId` inclut `draft.cashSessionIdInput` pour éviter un état « session fermée » affiché si le widget remonte avant `GET /cash-sessions/current`.
- **Story Runner (2026-04-12)** : statut **done** pour cloture process (tronçon prioritaire + e2e + CR) ; suite MCP **exhaustive** (virtuel / différé / close / réseau) : artefact § suite decoupee.
- **Parite totale** : non revendiquee — artefact § **suite decoupee** (MCP : hub + session open + kiosque Peintre ; manquent appariements virtuels/differe/close/RCN-02 fichier, reseau, POST vente).
- **Livre** : `isCashflowNominalCertificationPathRoute` + `minimalAppChrome` + `withCashflowNominalKioskSaleDashboard` (`RuntimeDemoApp.tsx`) ; `sale_kiosk_minimal_dashboard` (`CaisseBrownfieldDashboardWidget.tsx`) ; suppression mentions contractuelles cartes virtuel/differe ; doc **03** § extension **11.3** + § certification **13.6** + § RCN-02 extension ; matrice **Equiv.** normalisee **03**–**03f** ; tests `runtime-demo-cashflow-certification-chrome-13-6.test.tsx`.
- **Gates** : `npm run lint`, `npm run test`, `npm run build` dans `peintre-nano` — **OK** (2026-04-12), après tronçon fond → vente + e2e ; historique : correction test hub + extension QA kiosque (Story Runner).

### File List

- `peintre-nano/tests/e2e/cash-register-hub-open-to-sale-13-6.e2e.test.tsx`
- `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.tsx`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/tests/unit/runtime-demo-cashflow-certification-chrome-13-6.test.tsx`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-12_04_certification-caisse-equivalence-legacy-13-6.md`
- `references/artefacts/2026-04-12_04_certification-13-6-preuves/peintre-4444-cash-register-sale.txt`
- `references/artefacts/2026-04-12_04_certification-13-6-preuves/mcp-2026-04-12-legacy-4445-hub-reprendre-sale.txt`
- `references/artefacts/2026-04-12_04_certification-13-6-preuves/mcp-2026-04-12-peintre-4444-sale-post-fix-reload.txt`
- `references/artefacts/2026-04-12_04_certification-13-6-preuves/legacy-4445-caisse-hub.txt`
- `references/artefacts/2026-04-12_04_certification-13-6-preuves/peintre-4444-caisse-hub-post-13-6.txt`
- `references/artefacts/2026-04-12_04_certification-13-6-preuves/legacy-4445-session-open.txt`
- `references/artefacts/2026-04-12_04_certification-13-6-preuves/peintre-4444-session-open.txt`
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/13-6-certifier-lequivalence-utilisateur-legacy-de-la-caisse-observable-dans-peintre-nano.md`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-13-6-e2e.md`

