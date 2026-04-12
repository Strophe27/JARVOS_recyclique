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

## Dashboard transverse : KPIs (`transverse-dashboard`)

Sur `page-transverse-dashboard.json`, le widget `demo.legacy.dashboard.workspace` peut déclarer `use_live_source: true` : les cartes KPI lisent alors `daily_kpis_aggregate` renvoyé par `GET /v2/exploitation/live-snapshot` (`operationId` `recyclique_exploitation_getLiveSnapshot`, champs alignés `UnifiedLiveStatsResponse` / Story 2.7). Le frontend ne refait aucune agrégation métier (seulement formatage monétaire et entiers). Si le slice bandeau est désactivé, si l’agrégat est absent (pas de site, runtime `forbidden`, etc.) ou si la requête échoue, l’UI retombe sur les `widget_props.kpis` du manifeste. Attribut de diagnostic : `data-dashboard-kpi-source` = `live-snapshot` ou `manifest`.

## Checklist rapide pour les contributions

Avant d'ajouter un nouveau widget ou un nouveau flow, verifier :

- quelle source de verite porte l'operation ou le schema ;
- quel manifeste declare la structure ;
- quel point du runtime consomme ce contrat ;
- si l'ajout preserve bien la separation entre moteur et metier.
