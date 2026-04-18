# Monorepo et extraction future

> Statut : trajectoire documentee, pas extraction immediate.

## Pourquoi ne pas extraire maintenant

Tant que `Peintre_nano`, `Recyclique`, les contrats `OpenAPI` et les manifests `CREOS` evoluent ensemble dans la meme cadence de sprint, le monorepo reste le choix le plus economique et le plus simple a faire evoluer.

Extraire trop tot ajouterait :

- du versioning supplementaire ;
- des publications intermediaires ;
- des couts de synchronisation entre backend, contrats et frontend ;
- des risques de casser une frontiere encore en cours de stabilisation.

La bonne strategie actuelle n'est donc pas de separer physiquement au plus vite. C'est de tenir des frontieres propres pour que l'extraction future reste possible.

## Couplages actuels au monorepo

Aujourd'hui, `Peintre_nano` depend explicitement de ressources situees hors de son dossier.

Exemples importants :

- `contracts/openapi/`
- `contracts/openapi/generated/`
- `contracts/creos/manifests/`
- certains schemas `CREOS`
- certains tests de gouvernance relies a des artefacts documentaires du repo principal

Ces couplages ne sont pas forcement un probleme tant qu'ils sont :

- visibles ;
- assumes ;
- documentes ;
- testes.

Le danger serait au contraire de les masquer derriere des bricolages locaux non traces.

## Cible prudente

La trajectoire la plus saine a terme est la suivante :

- un moteur `Peintre` autonome ;
- une ou plusieurs applications contributrices ;
- des contrats publies et consommes proprement ;
- aucune double verite metier entre moteur et application.

Dans ce modele :

- le moteur porte le shell, le runtime de composition, le registre, les regles de rendu et les fallbacks ;
- l'application contributrice porte les widgets metier, les parcours, les bindings backend et l'autorite metier ;
- les contrats reviewables restent du cote de l'application qui les produit.

Important : ceci decrit une cible de separation future. Dans l'etat actuel du monorepo, des domaines et widgets metier vivent encore dans `peintre-nano/src/domains/`, ce qui est normal tant que les frontieres restent explicites et que le moteur ne se confond pas avec le metier.

## Invariant non negociable

Si extraction il y a plus tard, `Peintre` ne doit pas devenir un nouveau writer des contrats metier.

Formulation courte :

> l'application contributrice reste canonique sur ses contrats ; le moteur les consomme.

Cela evite d'introduire une double verite entre :

- un repo moteur ;
- un repo applicatif ;
- et d'eventuels artefacts generes.

## Garde-fous a maintenir des maintenant

- ne pas coder les regles metier `Recyclique` dans le shell generique ;
- garder les domaines branches via le registre et les contrats ;
- laisser `OpenAPI` porter la verite des operations et schemas ;
- maintenir les manifests `CREOS` comme grammaire de composition plutot que comme cache-misere metier ;
- documenter clairement tout import ou dependance hors `peintre-nano/`.

## Checklist de preparation a l'extraction

Avant d'envisager serieusement un split, verifier :

- la liste exacte des imports hors `peintre-nano/` ;
- la surface publique du moteur ;
- la separation entre shell generique et domaines applicatifs ;
- le mode de publication des contrats et types generes ;
- la strategie de test cross-repo ;
- la gouvernance des breaking changes.

## Decision pratique aujourd'hui

La bonne discipline est donc :

1. continuer a livrer la v2 dans le monorepo ;
2. durcir les frontieres ;
3. documenter les couplages ;
4. preparer une extraction evolutive plutot qu'une refonte brutale.

Le succes de cette trajectoire se mesure moins au fait d'avoir "deux repos" qu'au fait de pouvoir un jour separer le moteur sans devoir rearchitecturer tout le frontend.
