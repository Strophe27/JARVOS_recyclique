# Documentation Peintre_nano

`Peintre_nano` est le frontend manifeste-driven de `Recyclique v2`, conçu comme un moteur de composition UI borné et extractible a terme vers un repo autonome.

Cette documentation sert de base locale au dossier `peintre-nano/`. Elle explique ce que le projet est aujourd'hui, ce qu'il consomme, ce qu'il ne doit pas embarquer, et comment preparer une extraction future sans casser la v2 en cours.

Convention de nommage dans cette doc :

- `Peintre_nano` designe le concept ou le composant logique ;
- `peintre-nano/` designe le dossier et le package du projet.

## Ordre de lecture recommande

1. `01-perimetre-et-positionnement.md`
2. `02-architecture-runtime.md`
3. `03-contrats-creos-et-donnees.md`
4. `04-guide-developpeur.md`
5. `05-monorepo-et-extraction.md`

## Ce que couvre cette doc

- le positionnement de `Peintre_nano` dans l'ecosysteme JARVOS ;
- l'architecture runtime minimale du moteur ;
- les contrats `CREOS` et la relation avec `OpenAPI` ;
- les conventions de travail utiles pour contribuer ;
- les dependances actuelles au monorepo et les garde-fous d'extractibilite.

## Ce que cette doc ne remplace pas

Cette base ne remplace pas les sources de reference plus larges du monorepo :

- `references/peintre/` pour la vision Peintre, le pipeline et les ADR associees ;
- `_bmad-output/planning-artifacts/architecture/` pour les decisions d'architecture, les frontieres de projet et les hypotheses post-v2 ;
- `contracts/` pour les artefacts contractuels reviewables ;
- `_bmad-output/implementation-artifacts/` pour l'etat d'avancement story par story.

## Resume rapide

- Aujourd'hui, `Peintre_nano` vit dans le monorepo `JARVOS_recyclique`.
- Il rend une UI a partir de contrats et de manifests, mais n'est pas l'auteur de la verite metier.
- `Recyclique` reste l'application commanditaire et l'autorite sur les operations, permissions et schemas.
- L'extraction vers un repo autonome est une trajectoire documentee, pas un chantier immediat.
