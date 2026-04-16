# Delta architecture - chaine comptable canonique caisse -> `Paheko`

## Purpose

Ce delta precise la chaine d'autorite pour le sous-domaine **caisse / compta / `Paheko`** ajoute par le correct course du `2026-04-15`.

Il ne remplace pas les fondations existantes :

- `Epic 6` reste la fondation **caisse terrain** ;
- `Epic 8` reste la fondation **outbox / sync / quarantaine / correlation** ;
- ce document fixe la **couche comptable canonique intermediaire** qui manquait entre les deux.

## Canonical chain

La chaine canonique devient :

1. **Referentiel des moyens de paiement**
2. **Journal detaille des transactions de paiement**
3. **Snapshot comptable fige de session**
4. **Entry builder `Paheko`**
5. **Outbox `Paheko`**

## Decisions

### 1. Referential des moyens de paiement

- Les moyens de paiement administrables forment un **referentiel explicite** distinct du champ legacy de paiement porte par la vente.
- Chaque moyen de paiement porte son identite metier stable et ses informations comptables associees.
- Les cas comptables speciaux (don en surplus, gratuite, remboursement, exercice anterieur clos) ne sont pas modeles comme de simples variantes d'un champ legacy.

### 2. Journal detaille des transactions de paiement

- La **source de verite comptable locale** des paiements est le **journal detaille des transactions de paiement**.
- Ce journal supporte au minimum :
  - paiements mixtes ;
  - don en surplus distinct du paiement de vente ;
  - gratuite comme vente a `0` ;
  - remboursement standard ;
  - remboursement sur exercice anterieur clos.
- Le champ legacy de paiement porte par la vente devient un **artefact de compatibilite brownfield**, pas l'autorite canonique.

### 3. Snapshot comptable fige de session

- La cloture de session produit un **snapshot comptable fige**.
- Ce snapshot capture au minimum :
  - contexte (`site`, `caisse`, `session`) ;
  - totaux et details utiles a la cloture ;
  - version des mappings et regles comptables appliquees ;
  - identifiant de correlation de batch ;
  - statut local de preparation comptable.
- Une session cloturee ne doit plus etre retransformee silencieusement par recalcul mouvant.

### 4. Entry builder `Paheko`

- Le builder `Paheko` consomme le snapshot comptable fige, pas les ecrans ni le legacy directement.
- Il produit **N sous-ecritures deterministes et equilibrees** pour une session cloturee.
- Decomposition canonique retenue pour le backlog actif :
  - sous-ecriture 1 : ventes + dons ;
  - sous-ecriture 2 : remboursements exercice courant ;
  - sous-ecriture 3 : remboursements exercice anterieur clos.
- L'unite canonique n'est plus "une unique transaction au singulier".

### 5. Outbox `Paheko`

- L'unite canonique de sync devient :
  - **1 batch outbox idempotent par session cloturee**
  - contenant **N sous-ecritures deterministes**
  - avec **1 correlation de batch commune**
  - et **1 index stable par sous-ecriture**
- `Recyclique` doit persister :
  - l'identite du batch local ;
  - l'etat de chaque sous-ecriture ;
  - les identifiants distants `Paheko` multiples s'ils existent ;
  - un etat explicite de succes partiel si toutes les sous-ecritures n'ont pas le meme resultat.

### 6. Separation des responsabilites

- **Calcul comptable local** : `Recyclique`
- **Snapshot fige** : `Recyclique`
- **Construction des sous-ecritures `Paheko`** : builder dedie
- **Transport resilient / idempotence / retry / quarantaine** : outbox + processor existants
- **Verite comptable finale** : `Paheko`

Cette separation evite de reabsorber le calcul comptable metier dans le simple transport outbox.

### 7. Autorite sur `accounting_period_closed`

- L'autorite produit pour savoir si un remboursement touche un **exercice anterieur clos** ne peut pas etre guess par l'UI.
- La source d'autorite doit etre :
  - soit `Paheko` directement, si l'information est reachable ;
  - soit une representation locale explicitement versionnee et rafraichie, si l'architecture la formalise.
- Si cette autorite n'est pas disponible au moment d'un remboursement potentiellement N-1 clos :
  - le systeme ne doit pas supposer ;
  - l'operation doit etre bloquee ou reroutee vers un traitement expert explicite et trace.

## Brownfield migration

La migration cible suit trois phases :

### Phase A - Preparation

- introduire le referentiel des moyens de paiement ;
- enrichir le journal detaille des transactions de paiement ;
- preparer la compatibilite avec l'historique legacy ;
- fixer les regles de backfill minimal utile.

### Phase B - Double lecture

- faire coexister l'ancien calcul et le calcul canonique ;
- comparer les agregats de cloture ;
- detecter les ecarts avant bascule.

### Phase C - Bascule

- couper l'autorite du champ legacy pour la compta canonique ;
- utiliser exclusivement le snapshot fige et le batch outbox canonique ;
- conserver l'historique et la tracabilite de transition.

## Impact on planning

- `Epic 6` et `Epic 8` restent **done** comme fondations historiques.
- Un **epic correctif dedie** doit porter cette chaine comptable canonique.
- Les slices UI/admin qui touchent la cloture, la supervision de session ou le parametrage comptable ne doivent plus inventer leur propre verite en attendant ce rail correctif.
