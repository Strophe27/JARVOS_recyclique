# Implementation Patterns & Consistency Rules

## Pattern Categories Defined

**Critical Conflict Points Identified:**
10 zones ou plusieurs agents pourraient diverger et produire du code incompatible :
- nommage API / DTO / routes ;
- frontiere `OpenAPI` / `CREOS` ;
- fusion des routes coeur / modules ;
- stockage et overrides des manifests ;
- contrats de widgets et props serialisables ;
- etat UI local vs etat metier vs etat de flow ;
- formats d'erreur, dates et etats de sync ;
- idempotence des mutations sensibles ;
- emplacement des tests et type de validation attendu ;
- coexistence old front / `Peintre_nano`.

## Naming Patterns

**Database Naming Conventions:**
- Nouvelles tables et nouvelles colonnes en `snake_case`.
- Cle primaire standard pour les nouvelles entites : `id`.
- Cles etrangeres nouvelles : `{entity}_id`.
- Classes ORM en `PascalCase`, objets SQL en `snake_case`.
- Index et contraintes suivent des prefixes deterministes :
  - `idx_{table}_{column}`
  - `uq_{table}_{column}`
  - `fk_{table}_{ref_table}`
- Les ecarts legacy brownfield sont toleres s'ils sont documentes et encapsules ; on n'ouvre pas de chantier de renommage SQL global uniquement pour "nettoyer".

**API Naming Conventions:**
- Nouveaux endpoints v2 en noms pluriels : `/users`, `/cash-sessions`, `/sync-events`.
- Segments d'URL en `kebab-case`.
- Parametres de route semantiques : `{user_id}`, `{cash_session_id}`, pas `{id}` si ambigu.
- Query params en `snake_case`.
- Headers techniques documentes explicitement ; pas de headers ad hoc inventes par feature.
- Les paths historiques brownfield sont geles jusqu'a migration explicite ; on ne cree pas de double convention implicite en renommant des routes existantes sans strategie de transition/versionnement.

**Code Naming Conventions:**
- Composants React : `PascalCase`
- Fichiers composants React : `PascalCase.tsx`
- Fichiers TS non composants : `kebab-case.ts`
- Modules Python : `snake_case.py`
- Fonctions/variables TS : `camelCase`
- Fonctions/variables Python : `snake_case`
- IDs techniques (`slot`, `widget`, `event`, `manifest`, `route key`) en minuscules stables ; les labels d'affichage ne servent jamais d'identifiants.

## Structure Patterns

**Project Organization:**
- Le backend reste organise par domaine et couches contractuelles, pas par dossiers "misc" ou "utils" attrape-tout.
- `Peintre_nano` est a ce stade le frontend v2 lui-meme ; l'extraction future du moteur restera possible mais n'impose pas encore une separation physique `packages/` / `apps/`.
- Le frontend historique est une source de migration, pas une cible structurelle.
- Les clients/types `OpenAPI`, schemas `CREOS`, manifests et overrides runtime vivent dans des emplacements dedies et reviewables.
- Les artefacts generes vivent dans des dossiers explicites (par exemple `generated/` ou `contracts/generated/`) et ne sont jamais modifies a la main.
- `Peintre_nano` garde un registre central de routes modules ; les manifests peuvent proposer des routes, mais la fusion et l'activation passent toujours par ce registre.
- Mapping des quatre artefacts minimaux :
  - `NavigationManifest` et `PageManifest` = contrats commanditaires reviewables ;
  - `ContextEnvelope` = contrat backend de contexte actif ;
  - `UserRuntimePrefs` = preferences runtime locales non autoritatives ;
  - aucun de ces artefacts ne doit etre remplace par un state global frontend ad hoc.

**File Structure Patterns:**
- Tests unitaires co-localises quand ils valident une logique locale pure.
- Tests de contrats, integration et e2e dans des emplacements dedies par couche.
- Les overrides runtime ne doivent jamais masquer silencieusement un manifest versionne.
- Les assets et configurations ont un proprietaire explicite (`Peintre_nano`, module, domaine), jamais un depot global sans responsabilite.
- Les composants de transition `Mantine` restent confines a une couche d'adaptation ou de migration ; ils ne deviennent pas la structure racine de `Peintre_nano`. Cadrage detaille et interdits stack : **ADR P1** `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`.

## Format Patterns

**API Response Formats:**
- Les succes suivent des contrats explicites et stables par endpoint ; pas de wrappers improvises differents selon les dossiers.
- Les erreurs utilisent une enveloppe stable contenant au minimum :
  - `code`
  - `detail`
  - `retryable`
  - `state`
  - `correlation_id`
- Les etats de sync/quarantaine sont enumes et non derives de texte libre.
- Semantique HTTP et semantique metier doivent etre coherentes mais distinctes.
- Pour les endpoints de flux critiques, `correlation_id` et `state` sont obligatoires, meme si `state` vaut explicitement `not_applicable`.
- Le mapping minimal attendu est stable :
  - validation metier -> `422`
  - auth/permission -> `401/403`
  - conflit de mutation / idempotence -> `409`
  - echec externe retryable -> `502/503/504`
  - quarantaine / blocage metier -> statut HTTP documente + `state` metier explicite
- Si `retryable = true`, le contrat doit indiquer comment reessayer (`Retry-After` ou champ equivalent documente).

**Data Exchange Formats:**
- JSON en `snake_case` cote backend et contrats publics, sauf couche de traduction explicite.
- Les schemas `OpenAPI` exposent les proprietes en `snake_case`.
- Les types/clients generes pour le frontend conservent cette forme ou passent par un mapper unique documente ; toute transformation manuelle dispersee est interdite.
- Dates/heures en ISO 8601.
- Booleens en vrais `true/false`.
- Nullabilite explicite dans les schemas.
- Un endpoint ne change pas librement entre objet singleton et tableau selon le contexte.

## Communication Patterns

**Event System Patterns:**
- Les couches sont distinguees explicitement :
  - evenements de domaine et de sync persistants ;
  - evenements/logs d'observabilite ;
  - evenements UI/runtime internes a `Peintre_nano`.
- Les evenements nommes de facon stable et semantique, en minuscules scopees.
- Chaque payload d'evenement critique contient au minimum :
  - type/version
  - identifiant(s) d'entite ou d'operation
  - identifiants de contexte utiles
  - `correlation_id`
- Le modele d'execution async est `at-least-once` ; les handlers doivent etre idempotents.
- `CREOS`, backend et sync ne doivent pas inventer trois vocabulaires differents pour le meme fait metier.
- La propagation HTTP accepte et propage un header canonique `X-Correlation-ID`; ce header est rejoue dans les logs et les erreurs des flux critiques.

**State Management Patterns:**
- La verite metier vit dans les contrats backend, pas dans un store frontend.
- L'etat global de `Peintre_nano` reste borne a des besoins runtime UI.
- L'etat d'un flow est distinct de l'etat UI generique.
- `Zustand` est autorise pour etat UI ephemere/local, interdit comme autorite sur permissions, contextes, sync ou decisions metier.
- Les flows suivent d'abord des `FlowDefinition` declaratives `CREOS` interpretees par `Peintre_nano` ; si un moteur local est necessaire, il doit etre unique par frontend et ne pas creer une seconde verite du flow.
- `UserRuntimePrefs` peut vivre dans un store/frontend local ou une persistance locale documentee ; `ContextEnvelope`, navigation structurelle et permissions n'y vivent jamais comme source de verite.

## Process Patterns

**Error Handling Patterns:**
- Logs techniques et messages utilisateur sont deux sorties distinctes.
- Chaque mutation critique doit distinguer :
  - echec de validation
  - echec d'autorisation
  - echec externe retryable
  - etat bloque/quarantaine
- Un probleme de contrat ou de manifest doit echouer visiblement, pas degrader en comportement implicite.
- Les mutations sensibles utilisent un header `Idempotency-Key` documente ; un identifiant client de requete complementaire peut etre ajoute pour la trace, mais ne remplace pas la cle d'idempotence.

**Loading State Patterns:**
- Les flags de loading sont nommes par intention : `isLoading`, `isSubmitting`, `isSyncing`, etc.
- Local par defaut ; global uniquement si coordination au niveau de `Peintre_nano` est requise.
- Les operations longues exposent un statut explicite, pas seulement un spinner.
- Les etats de sync affiches doivent provenir des contrats backend, jamais d'une inference frontend.

## Enforcement Guidelines

**All AI Agents MUST:**
- Traiter `OpenAPI` comme autorite des contrats backend et `CREOS` comme autorite des contrats de composition UI.
- Eviter toute seconde source de verite pour manifests, routes, permissions ou etats de sync.
- Utiliser des cles d'idempotence ou identifiants de requete sur les mutations sensibles.
- Propager `correlation_id` sur les flows critiques.
- Garder la verite metier hors du state frontend.
- Ajouter ou mettre a jour les tests au bon niveau de risque : unitaire, contrat, integration ou e2e.
- Ne pas reinvestir structurellement dans le frontend historique comme cible v2.
- Ne pas introduire de nouveaux composants metier racine dependants durablement de `Mantine` hors de la couche de migration.

**Pattern Enforcement:**
- La CI valide au minimum :
  - generation/diff `OpenAPI`
  - validation des schemas/manifests `CREOS`
  - smoke test de rendu de `Peintre_nano` pour les modules critiques
  - visibilite des drifts contractuels
- Le chemin de generation `OpenAPI` doit etre unique, versionne et non edite a la main ; tout drift breaking non approuve echoue en CI.
- Le merge des routes modules passe par un registre unique de `Peintre_nano` ; les routes coeur ont priorite, et toute collision entre modules ou avec le coeur echoue par defaut a la validation tant qu'un arbitrage explicite n'a pas ete documente.
- La resolution runtime ne peut ni creer une route metier absente du contrat commanditaire, ni rendre visible une entree de navigation interdite par le contexte/les permissions ; l'affichage effectif est l'intersection contrat commanditaire x contexte serveur.
- Les violations de patterns sont traitees comme violations d'architecture, pas comme preferences de style.
- Source primaire des patterns : ce document d'architecture. Les regles derivees ne peuvent que le specialiser, jamais le contredire.
- Toute exception ou evolution durable doit etre documentee ici puis relayee dans les regles derivees du projet ; une PR ne doit pas "creer" sa propre convention locale.

## Pattern Examples

**Good Examples:**
- Un endpoint expose `cash_session_id`, `sync_state` et `correlation_id` dans un schema documente, puis `Peintre_nano` consomme des types generes depuis `OpenAPI`.
- Un manifest `CREOS` reference un `widget_type` stable et un `route_key` sans redefinir localement les enums metier du backend.
- Une mutation sensible porte une cle d'idempotence et retourne une erreur typee retryable ou un etat de quarantaine.
- Un widget enregistre dans `Peintre_nano` expose un contrat serialisable verifiable avant activation.
- Un composant de migration vit sous une couche adapteur UI clairement identifiee, tandis que la racine `Peintre_nano` reste independante du kit `Mantine`.
- Un ecran affiche `isSyncing` a partir d'un etat backend documente, pas a partir d'un spinner local sans statut metier.

**Anti-Patterns:**
- Ecrire a la main des DTOs frontend qui divergent du contrat `OpenAPI`.
- Laisser un manifest transporter une verite metier locale ou des permissions redefinies.
- Enregistrer un widget avec des props non serialisables ou sans schema exploitable.
- Stocker durablement une decision metier ou une autorisation seulement dans un store frontend.
- Laisser deux systemes de routes revendiquer silencieusement le meme path.
- Continuer a faire des investissements structurants dans l'ancien frontend "en attendant".
- Multiplier des mappers `snake_case` -> `camelCase` locaux selon les composants.
- Laisser un flow critique fonctionner sur une combinaison de flags UI sans definition de flow explicite.

## Jalons de durcissement (a declencher manuellement)

Ces actions ne sont pas des taches de sprint ordinaires : ce sont des **seuils** a verifier periodiquement (release, beta, fin d'epic critique). Quand le seuil est atteint, **creer une story** pour executer le durcissement et mettre a jour ce tableau si la regle change.

**Clarification — hooks de domaine et `operation_id` :** les `operation_id` stables vivent dans les **manifests** (`data_contract`). Les **hooks** sont du **code d'implementation** : en Phase 0 ils peuvent appeler le client avec un chemin explicite ; en Phase 1+ avec codegen, l'appel devient genere (ex. `apiClient.operations.getMemberById()`). Le **manifest** ne change pas entre les deux modes. Cela reste aligne sur l'instruction contrats donnees dans `references/peintre/` — pas de contradiction a corriger dans ce fichier.

**Jalon futur — CI `source` ↔ tags OpenAPI :** quand le depot contient au moins **3 manifests reels** et que `recyclique-api.yaml` a ses **tags stabilises**, ajouter une regle CI qui verifie que chaque `data_contract.source` dans un manifest correspond a un **tag existant** dans l'OpenAPI. **Ne pas implementer avant ce seuil** pour eviter la sur-specification.

| Jalon | Seuil de declenchement | Action |
|-------|------------------------|--------|
| Verrouiller `additionalProperties` racine `WidgetDeclaration` | Profil CREOS widget v2 fige (apres stabilisation bandeau + caisse) ou beta interne | Passer la racine du schema `contracts/creos/schemas/widget-declaration.schema.json` en `additionalProperties: false` ; ajouter un motif `x-*` pour extensions experimentales si besoin |
| CI `source` ↔ tags OpenAPI | Au moins 3 manifests reels + tags OpenAPI stabilises | Regle CI : chaque `data_contract.source` reference dans un manifest reviewable mappe a un tag OpenAPI existant (voir paragraphe ci-dessus) |
| CI `operation_id` ↔ OpenAPI | `recyclique-api.yaml` non vide + au moins 1 manifest consommant un `operation_id` | Règle CI : chaque `data_contract.operation_id` dans un manifest correspond a un `operationId` dans l'OpenAPI du meme snapshot — **Story 10.3** (`epics.md`) couvre deja ce cas : verifier a l'implementation que le script/gate inclut bien tous les manifests reviewables |
| Codegen types TS depuis OpenAPI | `recyclique-api.yaml` stable avec au moins **5 endpoints** documentes | Remplacer les types manuels dans `peintre-nano/src/api/types.ts` (ou equivalent) par des types generes ; mettre a jour le script de build / CI |
| Verrouiller les `operationId` comme contrat stable | Apres **Convergence 2** (bandeau live valide bout-en-bout) | Les `operationId` deviennent un **contrat versionne** : tout renommage ou suppression exige une migration des manifests qui les referencent et une entree dans la politique de breaking changes |

## Step 6 Status

Etape 6 terminee : la structure cible est definie ci-dessous. La suite du workflow BMAD releve maintenant de la validation finale et de la preparation des epics/stories.
