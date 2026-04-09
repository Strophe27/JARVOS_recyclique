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

## Checklist rapide pour les contributions

Avant d'ajouter un nouveau widget ou un nouveau flow, verifier :

- quelle source de verite porte l'operation ou le schema ;
- quel manifeste declare la structure ;
- quel point du runtime consomme ce contrat ;
- si l'ajout preserve bien la separation entre moteur et metier.
