# Cadrage — Parite UI Legacy Recyclique -> Peintre_nano

Date : 2026-04-10

## Objectif

Retrouver dans `Peintre_nano` l'experience du frontend legacy `recyclique-1.4.4`, en s'appuyant sur le legacy vivant sur `http://localhost:4445` et sur des donnees metier reelles, sans creer de seconde verite cote frontend.

Ce chantier vise une **parite observable**, pas un clone pixel-perfect integral.

## References de verite

1. `OpenAPI` : operations, schemas, types, autorite metier.
2. `ContextEnvelope` : contexte actif, session, signaux, droits affiches, bornes de visibilite et d'activation.
3. `CREOS` : navigation, pages, widgets, composition declarative.
4. `Legacy sur localhost:4445` : reference UX observable pour comparer le rendu et les parcours.

## Definition de la parite observable

Pour un perimetre donne, un utilisateur doit pouvoir realiser dans `Peintre_nano` les memes intentions metier que dans le legacy, avec :

- le meme shell pertinent (`standard`, `admin`, `kiosque`, `public`) ;
- le meme chrome utile : bandeau session, header, navigation, layout ;
- les memes blocs / widgets principaux ou des equivalents fonctionnels explicites ;
- les memes etats visibles majeurs : chargement, vide, erreur, succes ;
- des donnees coherentes avec `OpenAPI` et `ContextEnvelope`.

Les ecarts visuels mineurs sont acceptables s'ils ne degradent ni la lisibilite metier, ni les garde-fous, ni le parcours utilisateur.

## Hors perimetre

- Paheko comme reference d'ecran.
- Clone visuel 1:1 complet du legacy.
- Logique metier recreee ou recalculee dans le frontend.
- Contrats concurrents a `OpenAPI`, `ContextEnvelope` ou `CREOS`.

## Principes d'architecture

- `API = verite metier`.
- `ContextEnvelope` borne ce qui est visible, activable, masque ou degrade.
- `CREOS` compose l'interface ; il ne redefinit pas le metier.
- Tout besoin UI non soutenu par `OpenAPI`, `ContextEnvelope` ou les manifests doit etre nomme comme `gap API` ou `gap contrat`, jamais masque par un bricolage local.

Exemples de contournements interdits :

- recalculer une autorisation metier cote client ;
- recreer un schema backend "pratique" seulement dans le front ;
- rendre valide un ecran en s'appuyant sur des donnees mockees non tracees au contrat reviewable.

## Protocole minimal de preuve

Chaque ligne de matrice candidate a `Valide` ou `Ecart accepte` doit renseigner :

- la source legacy exacte : URL ou entree observable sur `localhost:4445` ;
- le contexte de comparaison : compte, role, site, preconditions, jeu de donnees ;
- une preuve : capture, checklist, scenario manuel, ou test ;
- le perimetre contractuel : `operationId`, `ContextEnvelope`, et artefact `CREOS` cible ;
- le decideur : qui valide la ligne ou accepte l'ecart.

Pour les slices pilotes, la comparaison doit se faire avec :

- la meme base de donnees de reference ;
- le meme compte utilisateur ;
- le meme contexte actif, quand il est applicable ;
- une reference `OpenAPI` figee pour le slice travaille.

## Matrice normative

| Colonne | Usage |
|---------|-------|
| `Cle` | Identifiant stable, ex. `PAR-001`. |
| `Perimetre` | `navigation`, `page`, `widget`, `flux`. |
| `Reference legacy` | Route, entree, onglet ou comportement observe sur `localhost:4445`. |
| `Artefact CREOS` | Entree de navigation, `page_key`, widget, slot, ou manifest cible. |
| `OpenAPI` | `operationId`, schemas ou tags concernes. |
| `Contexte` | Role, site, session, etat metier, signaux de contexte. |
| `Critere de parite` | Formulation testable en 1 a 3 points. |
| `Preuve / validation` | Capture, scenario, test, checklist, date, contexte. |
| `Statut` | Valeur fermee. |
| `Story / lien` | Backlog ou story issue de la ligne. |
| `Ecarts / decisions` | Divergence acceptee, limitation, arbitrage. |

## Statuts fermes

- `Backlog`
- `Specifie`
- `En cours`
- `A valider`
- `Valide`
- `Ecart accepte`
- `Bloque`

Regle : aucune ligne ne passe a `Valide` si `Preuve / validation` est vide.

## Sortie attendue des pilotes

Un pilote est considere ferme quand :

- les intentions utilisateur definies sont realisables dans `Peintre_nano` ;
- aucun contournement metier frontend n'a ete introduit ;
- la preuve est renseignee ;
- les ecarts restants sont explicitement documentes et attribues ;
- la ligne de matrice peut engendrer ou referencer une story courte et traçable.

## Enchainement immediat recommande

1. Verrouiller le slice pilote n°1 et son contexte de comparaison.
2. Renseigner 3 lignes pilotes dans la matrice, pas plus.
3. Lier ces 3 lignes a un smoke reproductible ou a une checklist de validation courte.
