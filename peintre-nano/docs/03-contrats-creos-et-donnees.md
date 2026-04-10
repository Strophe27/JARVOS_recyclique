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

## Dashboard transverse : KPIs (`transverse-dashboard`)

Sur `page-transverse-dashboard.json`, le widget `demo.legacy.dashboard.workspace` peut déclarer `use_live_source: true` : les cartes KPI lisent alors `daily_kpis_aggregate` renvoyé par `GET /v2/exploitation/live-snapshot` (`operationId` `recyclique_exploitation_getLiveSnapshot`, champs alignés `UnifiedLiveStatsResponse` / Story 2.7). Le frontend ne refait aucune agrégation métier (seulement formatage monétaire et entiers). Si le slice bandeau est désactivé, si l’agrégat est absent (pas de site, runtime `forbidden`, etc.) ou si la requête échoue, l’UI retombe sur les `widget_props.kpis` du manifeste. Attribut de diagnostic : `data-dashboard-kpi-source` = `live-snapshot` ou `manifest`.

## Checklist rapide pour les contributions

Avant d'ajouter un nouveau widget ou un nouveau flow, verifier :

- quelle source de verite porte l'operation ou le schema ;
- quel manifeste declare la structure ;
- quel point du runtime consomme ce contrat ;
- si l'ajout preserve bien la separation entre moteur et metier.
