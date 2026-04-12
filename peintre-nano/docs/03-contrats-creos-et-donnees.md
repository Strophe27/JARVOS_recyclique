# Contrats CREOS et donnees

## Principe general

`Peintre_nano` consomme des contrats. Il ne doit pas devenir une seconde verite concurrente sur la structure metier, les permissions ou les schemas backend.

Le projet s'appuie principalement sur deux familles d'artefacts :

- `OpenAPI` pour les operations, schemas et types metier exposes par le backend ;
- `CREOS` pour la composition declarative de la navigation, des pages et des widgets.

## Hierarchie de verite

La lecture cible est la suivante :

1. `OpenAPI`
2. `ContextEnvelope`
3. `NavigationManifest`
4. `PageManifest`
5. `UserRuntimePrefs`

Cette hierarchie documente la cible normative du projet. Selon les slices deja implementees, tous ces niveaux ne sont pas forcement materialises de la meme facon partout dans le code, mais ils donnent le bon ordre d'interpretation et de responsabilite.

Cette hierarchie signifie notamment :

- les operations backend et leurs schemas ne sont pas inventes par le frontend ;
- le contexte actif borne ce qui peut etre affiche ou active ;
- les manifests structurent l'interface sans redefinir la verite metier ;
- les preferences utilisateur restent locales et non metier.

## Ce que CREOS apporte

Les artefacts `CREOS` donnent au runtime une grammaire de composition partagee.

Ils servent a decrire :

- la navigation ;
- la structure d'une page ;
- les widgets declares ;
- certaines liaisons vers des donnees ou actions.

Le point important est que `CREOS` fournit une langue commune de composition, pas un pretexte pour coder du metier en dur dans le moteur.

## Ce que OpenAPI apporte

`OpenAPI` reste la source canonique sur :

- les operations disponibles ;
- les schemas de donnees ;
- les types generes ;
- la surface backend reviewable.

Quand `Peintre_nano` affiche un widget branche a des donnees, l'alignement attendu est explicite :

- le widget sait quelle operation il consomme ;
- cette operation correspond a un contrat backend stable ;
- les types derives viennent de la chaine de generation plutot que d'une recreation locale.

## Regle de discipline

Le frontend peut :

- filtrer ou masquer certaines choses selon le contexte ;
- afficher des fallbacks ;
- mettre en forme et orchestrer l'experience utilisateur.

Le frontend ne doit pas :

- recalculer seul une autorisation metier ;
- redefinir des schemas backend a sa convenance ;
- creer une seconde famille de contrats concurrents a `OpenAPI`.

Formulation courte :

> affichage et orchestration UI, oui ; autorite metier, non.

## Etat actuel dans le monorepo

Aujourd'hui, `Peintre_nano` consomme des artefacts situes hors de son dossier :

- `contracts/openapi/` ;
- `contracts/openapi/generated/` ;
- `contracts/creos/manifests/` ;
- des schemas associes dans `contracts/creos/`.

Cette situation est acceptable tant qu'elle reste explicite et documentee. C'est meme un bon signal pour reperer ce qui devra etre traite proprement lors d'une future extraction.

## Consequence pour l'extractibilite

Si `Peintre_nano` devient un repo autonome plus tard, il faudra conserver cet invariant :

- l'application contributrice reste le writer canonique de ses contrats reviewables ;
- le moteur `Peintre` consomme des artefacts publies ou references ;
- il ne doit pas apparaitre une double verite contractuelle entre moteur et application.

## Routage : legacy `/` et CREOS `/dashboard` (story 11.2)

En observation sur le legacy (`http://localhost:4445/`), sans session, une redirection vers `/login` est effective ; apres login, le shell standard affiche un lien **Tableau de bord** qui pointe vers `http://localhost:4445/` (accueil authentifie sur la racine). Sur le slice reviewable Peintre_nano, l’entree **transverse-dashboard** du manifeste `navigation-transverse-served.json` est ancree sur **`/dashboard`** avec la page `page-transverse-dashboard.json`.

**Decision produit** : la route canonique post-login pour le pilote CREOS / auth live est **`/dashboard`** (`LiveAuthShell` avec `VITE_LIVE_AUTH`). L’ecart avec le legacy qui ancre l’equivalent sur **`/`** est **accepte et documente** (matrice `ui-pilote-02-dashboard-unifie-standard`) — pas de fusion silencieuse des deux chemins. Un clic **Tableau de bord** sans session renvoie vers la connexion sur le legacy ; le meme principe s’applique cote Peintre (garde d’acces / session).

## Routage : hub CREOS `/caisse` et alias legacy `/cash-register/sale` (story 11.3)

**Ce que CREOS reviewable couvre aujourd’hui** : l’entree transverse `cashflow-nominal` dans `navigation-transverse-served.json` est ancree sur **`/caisse`** avec `page_key` **`cashflow-nominal`** (`page-cashflow-nominal.json`). Il n’existe pas d’artefact `NavigationManifest` ni de `page_manifest` distinct pour la seule route SPA legacy **`/cash-register/sale`**.

**Observation legacy** (Chrome DevTools MCP, 2026-04-10, `http://localhost:4445`) : sans session, **`GET /caisse`** et **`GET /cash-register/sale`** repondent [200] sur le document ; l’UI affiche la page **Connexion** (heading `Connexion`, champs identifiants) via `ProtectedRoute` — pas d’ecran kiosque sans authentification. La premiere navigation reseau est le document cible, puis la cascade Vite (`@vite/client`, `index.tsx`, `App.jsx`, `ProtectedRoute`, `Login.tsx`, etc.) ; aucun appel XHR/fetch n’apparait dans les premieres requetes de chargement sur cette observation.

**Decision Peintre_nano** : la route **`/cash-register/sale`** est un **alias runtime application** vers le **meme** `page_key` **`cashflow-nominal`** et les memes slots/widgets CREOS que **`/caisse`**, avec presentation **kiosque** (zone nav du `RootShell` masquee, bandeau bac a sable masque sur cet alias pour rapprocher le legacy ; le mode auth live `VITE_LIVE_AUTH` masque aussi le bandeau sur les autres routes), marqueur test `cash-register-sale-kiosk` sur le shell. Ce n’est **pas** un second manifeste CREOS : la verite contractuelle de composition reste **`/caisse`** + `cashflow-nominal` ; l’alias est borne et teste (`runtime-demo-cash-register-sale-kiosk-11-3`, `root-shell`). Ne pas assimiler implicitement « slice CREOS `/caisse` » et « route legacy `/cash-register/sale` » comme deux contrats reviewables distincts sans cette section.

**Extension certification (Story 13.6)** : en **demo** hors `VITE_LIVE_AUTH`, **tous** les chemins `page_key` **`cashflow-nominal`** (hub `/caisse`, alias session open/close, hub virtuel, racine differee, ventes kiosque § 13.2) activent le meme **masquage** du bandeau bac a sable, du bandeau « manifests valides » et de la toolbar prefs, et un `RootShell` **`minimalChrome`** (aside/footer decoratifs masques) — fonction `isCashflowNominalCertificationPathRoute` dans `RuntimeDemoApp.tsx` ; tests `runtime-demo-cashflow-certification-chrome-13-6`. Les libelles des cartes virtuel / differe du widget `caisse-brownfield-dashboard` restent **metier** (sans mention contractuelle interne).

## Routage : ouverture de session legacy `/cash-register/session/open` (story 13.1)

**Ce que CREOS reviewable couvre** : identique au hub caisse — `page_key` **`cashflow-nominal`** (`page-cashflow-nominal.json`) sur **`/caisse`** ; pas d’entree `NavigationManifest` pour la route SPA legacy **`/cash-register/session/open`**.

**Observation legacy** (Chrome DevTools MCP, 2026-04-11, `http://localhost:4445`, session **admin**) :

- **`/caisse`** : apres chargement, heading **`Sélection du Poste de Caisse`**, postes listes (ex. **La Clique Caisse 1** / statut **FERMÉE**, bouton **`Ouvrir`**), blocs **Caisse Virtuelle** / **Saisie différée** ; shell transverse (liens Tableau de bord, Caisse, Réception, Administration).
- **`/cash-register/session/open?register_id=…`** : heading **`Ouverture de Session de Caisse`**, etiquette **Fond de caisse initial**, textbox montant, boutons **`Annuler`** et **`Ouvrir la Session`** ; meme shell transverse.

**Reseau (extrait representatif sur `session/open`)** : `GET /api/v1/users/me`, `GET /api/v1/users/me/permissions`, `GET /api/v1/cash-registers/status`, `GET /api/v1/cash-registers/{id}`, `GET /api/v1/cash-sessions/status/{register_id}` ; `POST /api/v1/activity/ping` — a correler aux `operationId` OpenAPI en revue (pas inventes ici).

**Decision Peintre_nano** : **`/cash-register/session/open`** (query `register_id` conservee dans l’URL ; slash final normalise comme pour `/sale`) est un **alias runtime application** vers le **meme** `cashflow-nominal` que **`/caisse`**, **sans** mode kiosque (nav **visible** ; pas de `data-testid` `cash-register-sale-kiosk`). Le workspace brownfield compose (widgets `caisse-brownfield-dashboard`, etc.) porte l’intention « poste + ouverture + vente » cote contrats ; aucune regle metier caisse recodee dans le routeur. Tests : `runtime-demo-cash-register-session-open-13-1`.

**Ecart accepte** : le legacy isole un formulaire court **Ouverture de Session** sur une URL dediee ; Peintre expose la **meme page manifeste** que le hub (workspace continu) — parite **intentionnelle** (meme chaine OpenAPI / enveloppe / manifests), pas copie pixel-perfect de l’ecran legacy seul.

**Presentation observable (Story 13.1, DS 2026-04-11)** : les libelles de surface (titres `Title`, intro, libelles de champs / CTA) pour le widget `caisse-brownfield-dashboard` sont portes par `widget_props` dans `page-cashflow-nominal.json` (hub `/caisse`, alignes legacy *Sélection du Poste de Caisse*). Sur l’alias runtime `/cash-register/session/open`, `RuntimeDemoApp` fusionne une surcouche **strictement presentationnelle** de `widget_props` (titres *Ouverture de Session de Caisse*, *Fond de caisse initial*, boutons *Annuler* / *Ouvrir la Session*, masquage des cartes d’entree variantes et de la rangée « poste + Ouvrir » deja parcourue) — meme `page_key` CREOS, sans second `PageManifest` reviewable.

## Routage : variantes legacy `/cash-register/virtual/*` et `/cash-register/deferred/*` (story 13.2)

**Reference legacy** : `recyclique-1.4.4/frontend/src/App.jsx` (`kioskModeRoutes` inclut `/cash-register/virtual/sale` et `/cash-register/deferred/sale`) ; `OpenCashSession.tsx` (`basePath` selon mode virtuel / différé) ; `CashRegisterDashboard.tsx` (navigation `Simuler` / `Accéder`).

**Ce que CREOS reviewable couvre** : toujours **`page_key` `cashflow-nominal`** sur **`/caisse`** ; pas d’entrees `NavigationManifest` distinctes pour les prefixes `/cash-register/virtual` ni `/cash-register/deferred`.

**Decision Peintre_nano** : les chemins **`/cash-register/virtual/session/open`**, **`/cash-register/deferred/session/open`** (query `register_id` conservee), **`/cash-register/virtual/sale`**, **`/cash-register/deferred/sale`** et le hub **`/cash-register/virtual`** sont des **alias runtime application** vers le meme manifeste `cashflow-nominal` que le pilote 03, avec les memes regles que 13.1 pour la session open (nav **visible**, pas de marqueur `cash-register-sale-kiosk`) et que 11.3 pour les ventes **kiosque** (nav masquee, marqueur present). La racine **`/cash-register/deferred`** est normalisee par `replaceState` vers **`/cash-register/deferred/session/open`** pour coller a la redirection immediate observee cote legacy (`CashRegisterDashboard` en mode différé). Sur la branche **différée** seule, une intro `widget_props` supplementaire rappelle la **date réelle de vente (cahier)** — alignement libelle avec l’ecran legacy, sans dupliquer le composant date Mantine du legacy (gap borne documente matrice `ui-pilote-03c-…`). Les CTA hub **Simuler** / **Accéder** conservent les **prefixes d’URL** legacy (`/cash-register/virtual/…`, `/cash-register/deferred/…`). Sur le hub **`/cash-register/virtual`**, `RuntimeDemoApp` transmet **`cash_register_hub_base_path: '/cash-register/virtual'`** (sinon défaut **`/cash-register`** sur `/caisse`) pour que les cartes **postes réels** naviguent vers **`…/session/open`** et **`…/sale`** avec le meme `basePath` que le legacy (`CashRegisterDashboard` `handleOpen` / `handleResume`). Tests : `runtime-demo-cash-register-variants-13-2`, `cash-register-variants-13-2.e2e`.

## Routage : clôture / fin de session legacy `…/session/close` (story 13.3)

**Référence legacy** : `recyclique-1.4.4/frontend/src/App.jsx` (`ProtectedRoute` + `CloseSession` sur `/cash-register/session/close`, `/cash-register/virtual/session/close`, `/cash-register/deferred/session/close`) ; `Sale.tsx` (`handleCloseSession` → navigation vers `` `${basePath}/session/close` `` selon URL virtuelle / différée / réelle) ; `CloseSession.tsx` (titres **Fermeture de Caisse**, **Résumé de la Session**, **Contrôle des Montants**, bloc **Session sans transaction**, redirection vers **`/caisse`** si aucune session ouverte).

**Ce que CREOS reviewable couvre** : toujours **`page_key` `cashflow-nominal`** (`page-cashflow-nominal.json`) sur **`/caisse`** ; **pas** d’entrée `NavigationManifest` pour les routes **`…/session/close`**.

**Décision Peintre_nano** : **`/cash-register/session/close`**, **`/cash-register/virtual/session/close`** et **`/cash-register/deferred/session/close`** sont des **alias runtime application** vers le **même** manifeste que le hub, **sans** mode kiosque (nav **visible**). `RuntimeDemoApp` fusionne une surcouche **présentationnelle** sur le slot `caisse-brownfield-dashboard` : `presentation_surface: 'session_close'` et **`session_close_sale_path`** (`/cash-register/sale`, `/cash-register/virtual/sale` ou `/cash-register/deferred/sale`) pour le bouton **Retour à la vente**, aligné `Sale.tsx`. La surface **`CaisseSessionCloseSurface`** consomme uniquement les clients reviewables **`getCurrentOpenCashSession`** et **`postCloseCashSession`** (`peintre-nano/src/api/cash-session-client.ts`, en-têtes step-up / idempotence / request-id — Story 2.4 / 6.7). Comportement si **pas** de session ouverte après chargement : **redirection** vers **`/caisse`**, comme le legacy. **Titres** : la surface aligne la hiérarchie **h1** / **h2** / **h3** de `CloseSession.tsx` (titre principal, sections résumé / contrôle, bloc *Session sans transaction*). La saisie **PIN** affichée avant clôture matérialise l’exigence **OpenAPI** step-up sur `postCloseCashSession` (Stories 2.4 / 6.7), sans dupliquer de règle métier dans le routeur. Tests : `runtime-demo-cash-register-session-close-13-3`, `cash-register-session-close-13-3.e2e`.

## Hub `/caisse` — parité observable RCN-01 (Story 13.4)

**Tronçon** : écran hub **`/caisse`** uniquement (tronçon **RCN-01** dans `_bmad-output/implementation-artifacts/rattrapage-caisse-nominale-decoupe-stories-ui-observables-2026-04-12.md`), distinct du passage vente plein cadre (**RCN-02**).

**Ce que CREOS reviewable couvre** : toujours **`page_key` `cashflow-nominal`** (`page-cashflow-nominal.json`) ; les libellés hub (titre zone postes, intro, cartes postes, CTA **Ouvrir** / **Reprendre**, cartes virtuel / différé) sont portés par **`widget_props`** + surcouche runtime `withCashflowNominalCaisseHubPresentation` (`presentation_surface: caisse_hub`, `cash_register_hub_base_path` défaut **`/cash-register`**) dans `RuntimeDemoApp.tsx` — pas de second `PageManifest`.

**Observation comparée (Chrome DevTools MCP, 2026-04-12)** — même intention « arriver sur le hub après authentification » :

- **Legacy** `http://localhost:4445/caisse` : après stabilisation, heading **`Sélection du Poste de Caisse`**, poste **La Clique Caisse 1** / **Entrée Principale**, statut **FERMÉE**, bouton **Ouvrir** ; cartes **Caisse Virtuelle** (badge **SIMULATION**, **Simuler**) et **Saisie différée** (**ADMIN**, **Accéder**) ; nav transverse ; **LoadingOverlay** pendant le chargement des postes. **Menu super-admin** (**Menu de gestion**) si rôle super-admin.
- **Peintre** `http://localhost:4444/caisse` : même heading ; **intro** sous le titre issue du manifeste (**`workspace_intro`** CREOS) — **écart accepté** : le legacy n’affiche pas ce paragraphe sous le titre ; texte **reviewable** dans `page-cashflow-nominal.json`. Cartes postes + variantes sur les mêmes libellés observables ; **`GET /api/v1/cash-registers/status`** pour la liste des postes ; **`GET /api/v1/cash-sessions/current`** pour corréler session / poste. **`LoadingOverlay`** Mantine sur la zone cartes pendant le chargement des postes (rapprochement du plein écran **LoadingOverlay** legacy).

**Réseau (extraits réellement listés par `list_network_requests` sur la navigation concernée)** — ne pas extrapoler hors capture :

- Legacy : entre autres **`GET …/users/me`**, **`GET …/users/me/permissions`**, **`GET …/cash-registers/status`**, **`POST …/activity/ping`**.
- Peintre : **`GET …/users/me/context`**, **`GET …/v1/cash-sessions/current`**, **`GET …/v1/cash-registers/status`**.

**Décisions / gaps nommés** :

- **Menu gestion postes (super-admin)** : présent sur le legacy hub ; **non** recréé dans le widget `caisse-brownfield-dashboard` — portée **admin** hors slice hub CREOS ; **gap** assumé (matrice **`ui-pilote-03e-rcn-01-hub-caisse`**).
- **Composition** : sur `/caisse`, `RuntimeDemoApp` **retire** le wizard + ticket latéral (`suppressCashflowNominalWorkspaceSaleAndAside`) pour l’intention « hub seul » (cohérent Story 13.1) ; même `page_key` reviewable.

**Tests** : `runtime-demo-cash-register-hub-rcn-01-13-4`, `cash-register-hub-rcn-01-13-4.e2e`.

## Transition hub → vente plein cadre RCN-02 (Story 13.5)

**Tronçon** : passage **`/caisse`** → **`/cash-register/sale`** (branche **réelle** : préfixe **`/cash-register`** sans `/virtual` ni `/deferred`), aligné `_bmad-output/implementation-artifacts/rattrapage-caisse-nominale-decoupe-stories-ui-observables-2026-04-12.md` **RCN-02**.

**Référence legacy** : `CashRegisterDashboard.tsx` — **`Reprendre`** / continuation vers `` `${basePath}/sale` `` avec `basePath` **`/cash-register`** ; `OpenCashSession.tsx` — `navigate(\`${basePath}/sale\`)` après ouverture ; `SaleWrapper.tsx` — shell vente plein cadre.

**Décision Peintre_nano** : pas de second `PageManifest` pour `/cash-register/sale` — **alias runtime** vers le même `page_key` **`cashflow-nominal`** que le hub (§ 11.3). Depuis le hub, le widget `caisse-brownfield-dashboard` appelle **`spaNavigateTo(\`${cashRegisterHubBasePath}/sale\`)`** (`handleHubResumeRegister`, défaut **`/cash-register/sale`**). `RuntimeDemoApp` : `syncSelectionFromPath` + `resolvedPageKey` → **`cashflow-nominal`** ; **`hideNav={kioskSaleObservable}`** sur `RootShell` ; **`suppressCashflowNominalWorkspaceSaleAndAside`** est **false** sur `/cash-register/sale` — le wizard + ticket latéral du manifeste s’affichent (intention kiosque plein viewport métier, sans double chrome hub).

**Extension Story 13.6** : le manifeste reviewable garde `presentation_surface: hub` sur le widget brownfield ; sur les chemins kiosque **`/cash-register/sale`** (et variantes **`/virtual/sale`**, **`/deferred/sale`**), `RuntimeDemoApp` fusionne **`sale_kiosk_minimal_dashboard: true`** (`withCashflowNominalKioskSaleDashboard`) afin qu’un **reload** ou un **deep link** ne réaffiche pas le bloc « Sélection du Poste » + modes + cartes variantes **au-dessus** du wizard (écran hybride) — toujours **sans** second `PageManifest`.

**Extension Story 13.8** : sur les mêmes chemins kiosque, `RuntimeDemoApp` fusionne **`sale_kiosk_category_workspace: true`** sur le placement **`cashflow-nominal-wizard`** (`withCashflowNominalKioskSaleWizard`). Le widget **`CashflowNominalWizard`** affiche alors une **grille de catégories** alimentée par **`GET /v1/categories/`** via le client partagé **`fetchCategoriesList`** (`src/api/dashboard-legacy-stats-client.ts`), avec navigation racine → sous-catégories lorsque `parent_id` relie les lignes — **sans** second `PageManifest` ni iframe legacy. Les étapes **FlowRenderer** (Total, Paiement, etc.) restent le **langage Peintre** documenté au blueprint 13.7 (écart structurel volontaire vs tablist legacy).

**Observables de parité** : sur le hub, **nav transverse** visible ; sur **`/cash-register/sale`**, zone nav **masquée**, marqueur test **`data-testid="cash-register-sale-kiosk"`**, bandeau bac à sable masqué en mode démo hors live auth sur l’alias kiosque. États **Chargement** intermédiaires : hérités du widget / flow (ex. overlay postes sur le hub — RCN-01) ; pas de seconde barre « hub + vente » empilée après navigation.

**Tests** : `runtime-demo-cash-register-hub-to-sale-rcn-02-13-5`, `cash-register-hub-to-sale-rcn-02-13-5.e2e` ; complètent `runtime-demo-cash-register-sale-kiosk-11-3` (alias direct, **dont** scénario Story 13.8 grille catégories) et RCN-01 hub ; **`cashflow-nominal-wizard-kiosk-13-8`** (widget isolé).

## Certification equivalence utilisateur caisse (Story 13.6)

**Perimetre** : relecture transversale des lignes **`ui-pilote-03*`** dans `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` ; paquet de preuves navigateur **legacy `http://localhost:4445`** vs **Peintre `http://localhost:4444`** (MCP **`user-chrome-devtools`** : `list_pages` → `select_page` → `navigate_page` → `take_snapshot`). **Secrets** : compte recette **hors depot** (variables locales / runbook).

**Slice livre dans ce run** : (1) **chrome demo** sur chemins `cashflow-nominal` borne et teste ; (2) **textes** cartes caisse sans vocabulaire contractuel visible ; (3) **matrice** : colonne **Equiv.** normalisee (**Derogation PO** avec ref. explicite ou **OK**) pour les lignes § perimetre story ; (4) **snapshots** apparies hub + kiosque dans `references/artefacts/2026-04-12_04_certification-13-6-preuves/` (voir synthese `references/artefacts/2026-04-12_04_certification-caisse-equivalence-legacy-13-6.md`).

**Suite decoupee** (hors completude silencieuse) : parcours MCP **complet** pour **chaque** intention (session open POST, virtuel/deferred bout a bout, session close avec session ouverte, RCN-02 clic **Reprendre** appaire) ; captures reseau `list_network_requests` ; alignement badge **SIMULATION** / casse si exige PO ; preuve **POST /v1/sales/** kiosque authentifie (HITL ou MCP selon disponibilite).

## Shell admin transverse — périmètre site visible (Epic 14.1)

**Référence legacy** : `recyclique-1.4.4/frontend/src/components/AdminLayout.jsx` — barre supérieure verte (`#2e7d32`), marque **RecyClique**, liens **Tableau de bord** (`/`), **Caisse**, **Réception**, **Administration** (`/admin`), menu utilisateur (libellé + **Mon profil** / **Se déconnecter**). Le contenu des pages admin vit dans l’`<Outlet />` (ex. `DashboardHomePage.jsx` sur `/admin`).

**Peintre_nano (auth live `VITE_LIVE_AUTH`)** : la barre horizontale verte est déjà portée par `RootShell` + `FilteredNavEntries` (`navPresentation=legacyToolbar`, `RootShell.module.css` `.navAppLegacyToolbar`). **Story 14.1** ajoute :

1. **`LiveAdminPerimeterStrip`** — affiché pour toute URL sous **`/admin`** lorsque le bac à sable est masqué : lit **`presentation_labels.context.active_site_display_name`** sur le `ContextEnvelope` (`GET /v1/users/me/context`). Valeur **émise par le backend** (`context_envelope_service.build_context_envelope`, nom du `Site` lié à `user.site_id`). Si la clé est absente, bannière **gap** explicite (sans afficher d’UUID).
2. **`TransverseHubLayout`** — variante **`shellAdmin`** (`family === 'admin'`) : carte principale blanche + ombre légère pour rapprocher le ressenti `AdminLayout` / `MainContent` legacy.

**Décisions / écarts** :

- **Tableau de bord** : legacy ancre le lien transverse sur **`/`** ; Peintre reste sur **`/dashboard`** (déjà documenté § routage 11.2).
- **Mon profil** : route **`/profil`** non portée par le `NavigationManifest` servi — **gap** (hors Story 14.1 si non manifesté).
- **Preuves Chrome DevTools MCP** : à réitérer dès que l’instance MCP n’est pas en conflit (`user-chrome-devtools` — session orchestrateur 2026-04-12 : erreur *browser already running*).

## Admin legacy `/admin/cash-registers`, `/admin/sites` vs hub `/admin/site` (Story 17.2)

**Référence legacy** : `recyclique-1.4.4/frontend/src/App.jsx` — routes `cash-registers` et `sites` sous le layout `adminOnly` → URLs **`/admin/cash-registers`** et **`/admin/sites`** (`CashRegisters.tsx`, `Sites.tsx`).

**Ce que le manifeste CREOS servi couvre** : deux entrées **`transverse-admin-cash-registers`** et **`transverse-admin-sites`** dans `contracts/creos/manifests/navigation-transverse-served.json`, avec `page_key` **`transverse-admin-cash-registers`** et **`transverse-admin-sites`** (`page-transverse-admin-*.json`). Shell : même périmètre **`isTransverseAdminShellPath`** (`RuntimeDemoApp.tsx`) que **`/admin/pending`** — `LiveAdminPerimeterStrip` + `TransverseHubLayout` `family='admin'` en auth live.

**OpenAPI canon** (`contracts/openapi/recyclique-api.yaml`) : au DS **2026-04-12**, recherche ciblée **`cash-registers`** sans opérations alignées sur le CRUD legacy admin ; famille **Sites** / **`/v1/sites/`** non matérialisée — gap **G-OA-02** (cartographie **15.2**). **Rail U** : widgets **`admin.cash-registers.demo`** et **`admin.sites.demo`** sans `data_contract` ni données simulées ; fermeture contractuelle → **Epic 16** (rail **K**).

**Décision produit — coexistence `/admin/site` et `/admin/sites`** : le hub **singulier** **`/admin/site`** (Story **14.2**, `page-transverse-admin-site-overview.json`) reste l’intention « site et périmètre » transverse **léger**. Le chemin **pluriel** **`/admin/sites`** porte l’intention legacy **CRUD** observée sur le brownfield. Les deux coexistent dans la navigation servie ; ce n’est **pas** une fusion silencieuse des intentions (matrice **`ui-pilote-14-02-admin-parametres-simples`**, lignes **`ui-admin-15-4-sites`** / **`ui-admin-15-4-cash-registers`**).

**Tests** : `navigation-transverse-served-5-1.test.ts` (contrat bundle) ; `navigation-transverse-5-1.e2e.test.tsx` (parcours nav + placeholders).

## Hub rapports admin / supervision caisse (Story 18.1)

**Périmètre rail U** : restituer la **structure** et les **points d'entrée** alignés sur le manifeste servi — **sans** seconde entrée nav dédiée (pas de **`/admin/reports`** tant que non arbitré) ni exports bulk classe **B** (rail **K** / **Epic 16**). La liste **session-manager** et le détail **cash-sessions** : **Story 18.2** (routes manifestées ou résolues par le runtime, gaps **K** nommés, pas de données simulées).

**PageManifest** : `contracts/creos/manifests/page-transverse-admin-reports-hub.json` (`page_key` **`transverse-admin-reports-hub`**), référencé par l'entrée **`transverse-admin`** (`path` **`/admin`**). Slots **17.3** pour l'en-tête + l'écart contrat (`admin.transverse-list.*`), widget principal **`admin.reports.supervision.hub`** (gap **K**, cartes d'intention, liens **`spaNavigateTo`** vers chemins déjà manifestés, dont **`/admin/session-manager`** — **18.2**), puis **`admin.legacy.dashboard.home`** (dette données **14.3** inchangée).

**Navigation** : une seule autorité — chemins dans **`navigation-transverse-served.json`** ; entrée **`transverse-admin-session-manager`** sur **`/admin/session-manager`** (`page_key` **`transverse-admin-session-manager`**, widget **`admin.session-manager.demo`**). Le détail **`/admin/cash-sessions/:id`** reste rendu via **`page-admin-cash-session-detail.json`** (`page_key` **`admin-cash-session-detail`**) avec sélection nav hub **`transverse-admin`** (pas d'entrée nav par `session_id`, pour éviter un second plan de routes).

**Matrice** : **`ui-admin-15-4-home-index-dashboard`**, **`ui-pilote-14-03-admin-supervision-simple`**, ligne backlog **`ui-admin-15-4-reports-hub`** (`references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`).

**Fichier historique** : `page-transverse-admin-placeholder.json` reste dans le dépôt ; le bundle servi (`runtime-demo-manifest.ts`) pointe **`/admin`** vers **`transverse-admin-reports-hub`**.

### Story 18.2 — session-manager (liste) et détail cash-session hors export sensible

**Routes SPA** : **`/admin/session-manager`** — entrée nav **`transverse-admin-session-manager`**, `PageManifest` **`page-transverse-admin-session-manager.json`** (`page_key` **`transverse-admin-session-manager`**), slots **17.3** + widget **`admin.session-manager.demo`**. Synchronisation sélection nav : **`RuntimeDemoApp`** (`syncSelectionFromPath`, même périmètre **`isTransverseAdminShellPath`** que les autres **`/admin/*`**).

**Gaps OpenAPI (rail K)** : pas de **`GET /v1/cash-sessions/`** ni **`GET /v1/cash-sessions/stats/summary`** dans **`contracts/openapi/recyclique-api.yaml`** au DS — message honnête à l’écran (pas de client parallèle, pas de **`dashboard-legacy-stats-client`** pour simuler liste ou KPIs). Fermeture → **Epic 16**.

**Détail session** : **`/admin/cash-sessions/:id`** — inchangé côté contrat : widget **`admin-cash-session-detail`**, client **`cash-session-client.ts`** (`recyclique_cashSessions_getSessionDetail`). Améliorations UX bornées au contrat existant.

**Exports exclus (classe B)** : pas d’appel UI à **`…/cash-sessions/by-session/:id`** (blob) ni à **`recyclique_admin_reports_cashSessionsExportBulk`** ; exclusion **visible** dans le widget liste (alerte + renvoi **Epic 16**).

**Tests** : **`navigation-transverse-served-5-1.test.ts`**, **`navigation-transverse-5-1.e2e.test.tsx`** — présence nav **`/admin/session-manager`**, non-régression chemin **`/admin/cash-sessions/:id`**.

### Story 19.1 — réception admin : stats et supervision nominative

**Route canonique** : **`/admin/reception-stats`** — entrée nav **`transverse-admin-reception-stats`** dans **`contracts/creos/manifests/navigation-transverse-served.json`** (copie **`peintre-nano/public/manifests/navigation.json`**), `page_key` **`transverse-admin-reception-stats`**, manifeste **`page-transverse-admin-reception-stats.json`**, slots **`admin.transverse-list.*`** (Story **17.3**), widget principal **`admin.reception.stats.supervision`**. Synchronisation nav : **`RuntimeDemoApp.syncSelectionFromPath`** (même périmètre **`isTransverseAdminShellPath`**). Point d'entrée hub : bouton **`admin-hub-link-reception-stats`** dans **`AdminReportsSupervisionHubWidget`** (Story **18.1**).

**`operation_id` consommés** (client unique `peintre-nano/src/api/dashboard-legacy-stats-client.ts`, pas de client parallèle) : **`recyclique_stats_receptionSummary`** (`GET /v1/stats/reception/summary`), **`recyclique_stats_receptionByCategory`** (`GET /v1/stats/reception/by-category`), **`recyclique_stats_unifiedLive`** (`GET /v1/stats/live`, paramètres `period_type`, `site_id` optionnel depuis le **ContextEnvelope**). **`recyclique_reception_statsLiveDeprecated`** (`GET /v1/reception/stats/live`) **non** appelé — préférence successeur explicite dans l'UI.

**Écarts vs legacy `ReceptionDashboard.tsx`** : graphiques Recharts et métriques non couvertes par les schémas de réponse des trois GET ci-dessus = **dette nommée** (alerte jaune dans le widget, pas d'approximation silencieuse). **Supervision nominative** (classements par opérateur, tableaux hors champs des GET stats) : **aucun** `operation_id` stabilisé dans le périmètre **19.1** — carte **gap K** visible (`admin-reception-nominative-gap-k`). La **liste tickets + détail ticket** admin relève de la **Story 19.2** ; pas de masquage.

**UserRuntimePrefs** : uniquement contrôles UI locaux hors métier (présets de période / `period_type` dans l'état React du widget, pas de cache d'autorisation ni d'agrégat métier persistant).

**Tests** : **`navigation-transverse-served-5-1.test.ts`** (bundle + `resolvePageAccess`) ; **`navigation-transverse-5-1.e2e.test.tsx`** (nav + URL profonde + marqueurs `recyclique_stats_*`) ; unitaire **`admin-reception-stats-supervision-widget.test.tsx`**. Types de réponse : **`operations[…]`** générés depuis **`contracts/openapi/generated/recyclique-api.ts`** dans **`dashboard-legacy-stats-client.ts`**.

### Réception admin — sessions liste + détail ticket (Story 19.2)

**Routes canoniques** : **`/admin/reception-sessions`** — entrée nav **`transverse-admin-reception-sessions`** dans **`contracts/creos/manifests/navigation-transverse-served.json`** (copie **`peintre-nano/public/manifests/navigation.json`**), `page_key` **`transverse-admin-reception-sessions`**, manifeste **`page-transverse-admin-reception-sessions.json`**, slots **`admin.transverse-list.*`** (Story **17.3**), widget principal **`admin.reception.tickets.list`**. Détail ressource **`/admin/reception-tickets/:id`** (UUID ticket) : **`page-admin-reception-ticket-detail.json`**, `page_key` **`admin-reception-ticket-detail`**, widget **`admin-reception-ticket-detail`** — pas d'entrée `NavigationManifest` par `ticket_id` (même discipline que **`/admin/cash-sessions/:id`** / Story **18.2**) ; sous navigation profonde, **`RuntimeDemoApp`** (`ADMIN_RECEPTION_TICKET_PATH`, `resolvedPageKey`) retient le hub **`transverse-admin`** pour la surbrillance toolbar et résout le **`page_key`** détail.

**`operation_id` de lecture utilisés** : **`recyclique_reception_listTickets`** et **`recyclique_reception_getTicketDetail`** exclusivement via **`peintre-nano/src/api/reception-client.ts`** (pas de client HTTP parallèle).

**Drill-down liste → détail** : bouton « Détail » sur chaque ligne (`spaNavigateTo` vers **`/admin/reception-tickets/<uuid>`**). Colonnes liste strictement **`ReceptionTicketSummary`**.

**Écarts vs legacy** : KPIs ou agrégats calculés côté client au-delà des champs de la réponse liste = **gap K** nommé dans le slot **`admin.transverse-list.contract-gap`** du manifeste (pas de contournement). Export bulk, jeton téléchargement / CSV ticket, fermeture ticket, patch poids ligne : **hors Story 19.2** — aucun branchement UI silencieux ; message explicite dans les widgets liste et détail (AC4, **Epic 16** / step-up).

**Hub 18.1** : bouton **`admin-hub-link-reception-sessions`** dans **`AdminReportsSupervisionHubWidget`**.

**Tests** : **`navigation-transverse-served-5-1.test.ts`** (bundle, guards, `admin-reception-ticket-detail`) ; **`navigation-transverse-5-1.e2e.test.tsx`** (nav, **`/admin/reception-sessions`**, **`/admin/reception-tickets/<uuid>`** avec mocks `fetch` optionnels).

### Story 19.3 — preuve de parité observable (pilotage réception)

**Paquet de preuve** : matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (lignes **`ui-admin-15-4-reception-stats`**, **`ui-admin-15-4-reception-sessions`**, **`ui-admin-15-4-reception-ticket-detail`** relues **2026-04-12** ; ligne **`ui-admin-15-4-reception-reports`** **hors critère** de succès parité **19.x** mais **conservée** explicitement — pas de fusion silencieuse avec stats/sessions) ; tests contrat **`peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`** (bloc **Story 19.3** : absence d’entrée nav **`/admin/reception-reports`**, texte reviewable **export B** dans le slot **`admin.transverse-list.contract-gap`** du manifeste sessions) ; e2e **`peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`** (parcours hub **18.1** → stats → hub → sessions avec **gap** + **`admin-reception-tickets-scope-note`** ; absence nav dédiée rapports réception) ; alignement manifestes **`page-transverse-admin-reception-stats.json`**, **`page-transverse-admin-reception-sessions.json`**, **`page-admin-reception-ticket-detail.json`**, **`navigation-transverse-served.json`**, **`page-transverse-admin-reports-hub.json`**. **Preuve navigateur** legacy **`http://localhost:4445`** vs Peintre **`http://localhost:4444`** (MCP **`user-chrome-devtools`**, compte autorisé) : **non exécutée** au DS — enregistrement **`references/artefacts/2026-04-12_08_preuve-parite-pilotage-reception-19-3-needs-hitl.md`** + bloc **NEEDS_HITL** dans le fichier story **19.3** (Dev Agent Record).

**Exports et mutations bloqués par le rail contrat** (références **16.4** / **Epic 16** / placeholders **19.2**) — **non** critères verts de parité **19.x** : **`recyclique_admin_reports_receptionTicketsExportBulk`**, **`recyclique_reception_exportTicketCsv`**, **`recyclique_reception_createTicketDownloadToken`**, **`recyclique_reception_closeTicket`**, **`recyclique_reception_patchLigneWeight`** ; visibles dans le hub admin (rappel dette **K**), le slot **contract-gap** du manifeste sessions, l’alerte liste tickets, le bloc exclusions du widget détail — **sans** appel UI ni test qui simule un `operation_id` absent du **`contracts/openapi/recyclique-api.yaml`**.

**Dettes résiduelles (branches legacy différées)** : route legacy **`/admin/reception-reports`** (`ReceptionReports.tsx`) — **Gap CREOS** ; rapports CSV / volumétrie — **15.2** ; toute différence legacy ↔ Peintre : **gap contrat** (rail **K**) ou **dérogation PO** datée en matrice — jamais simple absence UI sans mention du rail. Cartographie familles réception : **`references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`**.

### Story 18.3 — preuve de parité admin (surfaces caisse supervisées)

**Paquet de preuve** : matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (lignes **`ui-admin-15-4-home-index-dashboard`**, **`ui-admin-15-4-reports-hub`**, **`ui-admin-15-4-session-manager`**, **`ui-admin-15-4-cash-session-detail`**) ; tests contrat **`peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`** (bloc **Story 18.3** : co-présence des `page_key` **`transverse-admin-reports-hub`**, **`transverse-admin-session-manager`**, **`admin-cash-session-detail`** dans le bundle servi + absence d’entrée nav **`/admin/reports`**) ; e2e **`peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`** (parcours hub → bouton **Sessions caisse (supervision)** → **`/admin/session-manager`** avec texte gap **K** explicite + marqueur dette export **B** `admin-session-manager-export-debt` → retour entrée nav **Administration** sur **`/admin`** ; non-régression URL profonde **`/admin/cash-sessions/:id`** ; gouvernance OpenAPI **`peintre-nano/tests/contract/recyclique-openapi-governance.test.ts`** (`recyclique_cashSessions_getSessionDetail`). **Preuve navigateur appariée** legacy **`http://localhost:4445`** vs Peintre **`http://localhost:4444`** (guide pilotage, compte autorisé, MCP **`user-chrome-devtools`**) : **non exécutée** dans le run DS Task — enregistrement **`references/artefacts/2026-04-12_07_preuve-parite-admin-surfaces-caisse-18-3-needs-hitl.md`** + bloc **NEEDS_HITL** dans le fichier story **`18-3-stabiliser-la-preuve-de-parite-admin-pour-les-surfaces-caisse-supervisees.md`** (Dev Agent Record).

**Dettes résiduelles** : agrégats rapports / liste sessions / KPIs tant que **`GET /v1/cash-sessions/`**, **`GET /v1/cash-sessions/stats/summary`** et lectures **`/v1/admin/reports/`** ne sont pas dans le YAML canon — rail **K** / **Epic 16** ; corrélation détaillée familles **`cash-sessions`** dans **`references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`**. Exports **B** (bulk) : **aucun** branchement UI tant que non contractualisés (Story **16.4**). Widget **`admin.legacy.dashboard.home`** sur le hub : dette données alignée **14.3** / **`ui-pilote-14-03`**, pas de contournement métier dans le moteur.

### Primitive liste admin, guards et « détail simple » (Story 17.3, rail U)

**Shell liste admin (React)** : `AdminListPageShell` (`peintre-nano/src/domains/admin-config/AdminListPageShell.tsx`) — structure partagée (titre, alerte d’écart contrat, liste d’état honnête **sans fetch**) consommée par les widgets CREOS **`admin.pending-users.demo`**, **`admin.cash-registers.demo`**, **`admin.sites.demo`**, **`admin.session-manager.demo`** (**18.2**). Les widgets **`admin.reception.stats.supervision`** (**19.1**) et **`admin.reception.tickets.list`** (**19.2**) réutilisent les mêmes **`slot_id`** dans le manifeste et le bandeau **`AdminDetailSimpleDemoStrip`** exporté depuis ce shell, avec des **fetch** contractuels dans le slot **main** (pas le placeholder « sans fetch » du shell liste). Aucune donnée métier ni cache dans **UserRuntimePrefs** ; les seuls textes « métier » restent ceux portés par les blocs `demo.text.block` des manifestes ou les réponses OpenAPI (écarts **K** / **G-OA-02** toujours explicites).

**Slots CREOS homogènes** : les `PageManifest` liste admin (pending, caisses enregistrées, sites, session-manager, stats réception, **sessions tickets réception** — **17.1–17.3** + **18.2** + **19.1** + **19.2**) utilisent les mêmes `slot_id` dans le même ordre — **`admin.transverse-list.header`**, **`admin.transverse-list.contract-gap`**, **`admin.transverse-list.main`** (`admin-transverse-list-shell-slots.ts`). Le slot **main** héberge le widget démo, le widget stats **19.1**, ou le widget liste tickets **19.2** ; les deux premiers restent des `demo.text.block` reviewables (gaps + renvoi **Epic 16** / stories futures selon le cas).

**Guards (manifeste + enveloppe)** : constantes documentées **`ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS`** (`admin-transverse-list-page-guards.ts`) — `required_permission_keys` = **`transverse.admin.view`**, `requires_site` = **true** ; alignement legacy **`adminOnly`** sans permission fantôme. Le runtime **filtre** à partir du **ContextEnvelope** et des champs CREOS déjà servis ; il ne recalcule pas une autorisation métier parallèle.

**Convention « détail simple »** (préparation epics **18** / **19**) :

1. **Liste** : slots principaux du manifeste (comme ci-dessus).
2. **Détail** : soit **deuxième page** sous `page_key` **`transverse-admin-*`** lorsque l’OpenAPI portera la ressource, soit **panneau latéral / expansion** alimenté **uniquement** par des données **déjà** contractuelles (pas de seconde vérité dans **UserRuntimePrefs**).
3. **Tant que** l’OpenAPI canon ne porte pas la ressource : **placeholder honnête** ou absence de drill-down — pas de CRUD simulé.

**Illustration UI bornée** : le shell inclut un bandeau **`admin-detail-simple-demo-strip`** (libellé **Démo UI**) — texte statique, **sans** `data_contract`, rappelant que tout drill-down attend les opérations dans **`contracts/openapi/recyclique-api.yaml`**.

## Dashboard transverse : KPIs (`transverse-dashboard`)

Sur `page-transverse-dashboard.json`, le widget `demo.legacy.dashboard.workspace` peut déclarer `use_live_source: true` : les cartes KPI lisent alors `daily_kpis_aggregate` renvoyé par `GET /v2/exploitation/live-snapshot` (`operationId` `recyclique_exploitation_getLiveSnapshot`, champs alignés `UnifiedLiveStatsResponse` / Story 2.7). Le frontend ne refait aucune agrégation métier (seulement formatage monétaire et entiers). Si le slice bandeau est désactivé, si l’agrégat est absent (pas de site, runtime `forbidden`, etc.) ou si la requête échoue, l’UI retombe sur les `widget_props.kpis` du manifeste. Attribut de diagnostic : `data-dashboard-kpi-source` = `live-snapshot` ou `manifest`.

## Checklist rapide pour les contributions

Avant d'ajouter un nouveau widget ou un nouveau flow, verifier :

- quelle source de verite porte l'operation ou le schema ;
- quel manifeste declare la structure ;
- quel point du runtime consomme ce contrat ;
- si l'ajout preserve bien la separation entre moteur et metier.
