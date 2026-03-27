# Handoff long run — nettoyage backend (canal externe historique) et reliquats transversaux

Date : 2026-03-26
Repo : `JARVOS_recyclique`
Branche : `chore/v1.4.5-consolidation`
HEAD au moment du handoff : `41be20c` puis lots suivants jusqu'a `19bac6d` et `f214c30`, et dernier lot service messager tiers `41be20c` deja pousse.

## But du handoff

Reprendre en **contexte frais** pour terminer la sortie du **canal messager tiers historique** de facon **chirurgicale**, apres une longue sequence de micro-lots backend.

Le travail deja fait a fortement nettoye `admin.py` et a neutralise les principaux flux lies a ce canal. Le prochain agent doit eviter les gros refactors diffus et avancer par micro-lots testes.

## Preferences utilisateur a respecter

- Repondre en francais.
- Style court et net.
- Utiliser beaucoup de sous-agents quand c'est utile.
- Continuer de facon autonome.
- Commit et push autorises.
- QA seule toujours en dernier sur chaque lot.

## Methode de travail a conserver

Pour chaque lot :

1. cadrage court
2. implementation micro-lot
3. tests cibles du perimetre
4. lints
5. QA seule
6. mise a jour du journal de consolidation
7. commit/push

Ne pas chercher un `pytest` full green a chaque lot : il existe encore du bruit historique / environnement. Prioriser les tests anti-regression **cibles** du perimetre touche.

## Etat acquis recent

### Grands nettoyages `admin.py`

Les sous-blocs suivants ont deja ete sortis de `admin.py` :

- sante / probes
- observabilite / journaux
- seuil d'activite
- lecture utilisateurs
- mutations compte utilisateur
- groupes utilisateur
- credentials utilisateur
- historique utilisateur
- maintenance cash sessions
- template reception offline

### Lots canal externe / bot deja fermes

- `2BD` : notifications sortantes canal tiers desactivees par defaut
- `2BE` : `POST /users/link-*` (liaison compte messager) desactive en `410 Gone`
- `2BF` : `POST /deposits/from-bot` et `POST /deposits/{deposit_id}/classify` desactives en `410 Gone`
- `2BG` : appels directs au service messager tiers retires de `admin.py`
- `2BH` : module service messager elague ; seul le reliquat vraiment utilise reste

## Commits recents utiles (messages originaux dans l'historique Git)

- `41be20c` — elagage chemins morts du service messager optionnel
- `19bac6d` — retrait appels admin directs vers le canal messager
- `f214c30` — desactivation endpoints depot lies au bot messager
- `871e590` — desactivation liaison de compte messager
- `1fb2d5b` — desactivation notifications sortantes canal tiers par defaut

## Etat du worktree au moment du handoff

Attention : il reste un fichier **modifie localement hors lot** :

- `recyclique-1.4.4/tests/test_admin_pending_endpoints.py`

Ce fichier n'appartient pas a la suite canonique `api/tests` et a ete laisse volontairement hors commit. Le prochain agent doit faire attention a ne pas l'embarquer par erreur.

## Journal principal a lire

- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

La zone la plus utile a relire est la fin du journal, autour des lots :

- `2BD`
- `2BE`
- `2BF`
- `2BG`
- `2BH`

## Prochains chantiers recommandes

### 1. Decider du reliquat `get_bot_token_dependency` sur `PUT /deposits/{id}`

C'est le prochain sujet le plus delicat.

- ne pas le casser brutalement
- verifier qui appelle encore ce flux
- soit le laisser en place pour l'instant
- soit preparer une bascule propre vers une autre auth si le produit le permet

Fichiers probables :

- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/deposits.py`
- `recyclique-1.4.4/api/src/recyclic_api/core/bot_auth.py`
- tests depots / bot auth associes

### 2. Nettoyage transversal des champs et fallbacks lies au messager tiers

C'est la vraie zone diffuse qui justifie le handoff frais.

Exemples :

- identifiants messager tiers dans les modeles / schemas / reponses
- fallbacks du type `username or <id messager>`
- usages cosmetiques dans logs, exports, services

Ici, il faudra etre plus fin que sur les lots precedents :

- cartographier avant d'editer
- choisir des micro-lots thematiques
- verifier l'impact schema / front / tests

### 3. Eventuels reliquats mineurs

- ~~methode morte dans le service de liaison~~ : **paquet 5 (2026-03-26)** — module liaison, test d'integration arch03 et erreur « liaison desactivee » supprimes ; doublon `api/api/` retire
- fichiers / tests orphelins lies au canal messager historique
- documentation ou OpenAPI statique a regenerer si necessaire

## Risques principaux

- casser un flux encore reellement utilise autour de `PUT /deposits/{id}`
- toucher trop tot aux champs messager legacy sans strategie de migration
- embarquer des fichiers hors lot locaux
- confondre code mort, code cosmetique et contrat encore vivant

## Regle de prudence

Le prochain agent doit considerer que :

- les **micro-lots bornes** sont encore souhaitables
- le **grand nettoyage transversal** commence maintenant
- si un lot devient trop diffus, il faut re-decouper avant implementation

## Resume en une phrase

Le backend a deja ete fortement nettoye ; le canal messager tiers n'est plus actif comme voie principale, mais il reste a traiter le **reliquat transversal** avec une approche plus chirurgicale et plus prudente.
