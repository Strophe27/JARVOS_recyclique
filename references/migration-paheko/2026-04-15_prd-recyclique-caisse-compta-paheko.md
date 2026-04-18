# PRD — Recyclique × Paheko (V2 corrigée QA)

## Refonte complète du modèle caisse, moyens de paiement, dons, remboursements et synchronisation comptable

Version : 2.0  
Date : 15/04/2026
Statut : version révisée après QA approfondi

## 1. Objet du document

Ce document formalise la refonte fonctionnelle et technique de la chaîne **caisse → clôture de session → écriture comptable Paheko** pour Recyclique.

L’objectif est de fiabiliser la comptabilisation des ventes, des paiements mixtes, des dons en caisse, des gratuités et des remboursements, tout en gardant une expérience simple pour des utilisateurs non comptables.

Ce document couvre :
- le paramétrage SuperAdmin des moyens de paiement ;
- les règles comptables embarquées dans Recyclique ;
- la production du récapitulatif comptable de session ;
- la synchronisation asynchrone vers Paheko ;
- les cas spéciaux, dont le remboursement sur exercice antérieur clos.

## 2. Principes directeurs

### 2.1 Clôture par session, pas ticket par ticket

Les ventes au détail réglées au comptant peuvent être comptabilisées par écriture globale de fin de journée à condition de conserver les justificatifs détaillés permettant d’en retrouver le détail opération par opération.[1]

Paheko est lui-même organisé autour de la logique de **session de caisse** et de **clôture de caisse**, avec vérification du théorique, saisie du réel et synchronisation comptable lors de la fermeture de session.[2]

**Décision produit :** Recyclique reste sur un modèle de comptabilisation **par session de caisse**, et non par ticket unitaire.

### 2.2 Source de vérité comptable

La source de vérité comptable des paiements dans Recyclique doit être la table `payment_transactions`.

Le champ legacy `sales.payment_method` peut subsister temporairement pour compatibilité, mais il ne doit plus servir ni au calcul de clôture, ni aux exports comptables, ni à la synchronisation vers Paheko.

### 2.3 Écriture avancée multi-lignes

Paheko permet de saisir des **écritures avancées** multi-lignes, adaptées aux opérations qui ventilent plusieurs comptes dans une même écriture.[3]

Pour le backlog canonique v2, l'unité retenue n'est toutefois **pas** "une unique écriture au singulier" par clôture.

La clôture de session produit un **batch de session** contenant **une ou plusieurs sous-écritures équilibrées**, chacune pouvant elle-même être multi-lignes.

Paheko expose une API REST permettant l’automatisation comptable depuis un système externe comme Recyclique.[4]

**Décision produit :** chaque clôture de session Recyclique doit produire une **écriture avancée multi-lignes** dans Paheko.

## 3. Décisions métier retenues

| Sujet | Décision retenue |
|---|---|
| Compte de vente par défaut | `7070` — Ventes de réemploi |
| Ventilation par famille comptable | Non, hors périmètre de cette version |
| Changement du compte de vente | Oui, configurable en SuperAdmin |
| `free` | Vente à 0 €, pas un moyen de paiement |
| Don en caisse | Distinct du paiement, comptabilisé comme don manuel |
| Compte don par défaut | `7541` — Dons manuels |
| Paiements mixtes | Support obligatoire |
| Remboursement sur autre moyen de paiement | Autorisé |
| Remboursement exercice antérieur clos | Mode spécial automatique, compte configurable, candidat par défaut `672`, validation expert-comptable requise[5][6] |
| Assistance utilisateur | Paramétrage simple + aide explicative sur cas spéciaux |

## 4. Modèle conceptuel cible

### 4.1 Vente

Une vente finalisée doit continuer à produire localement :
- une entrée `sales` ;
- des lignes `sale_items` ;
- une ou plusieurs lignes `payment_transactions` ;
- des agrégats de session dans `cash_sessions`.

La comptabilité Paheko n’est pas générée à la vente unitaire mais à partir d’un **snapshot comptable figé de la session**.

### 4.2 Paiement

Un paiement représente un mouvement financier lié à une vente. Une vente peut comporter plusieurs paiements.

Exemples :
- 5 € espèces + 3 € carte ;
- 8 € réglés et 2 € laissés en don ;
- 0 € si gratuité.

### 4.3 Don en caisse

Le don en caisse ne doit pas être mélangé au paiement de la vente.

Exemple :
- valeur de vente : 8 € ;
- paiements : 10 € espèces ;
- ventilation : 8 € en vente, 2 € en don.

Les dons manuels reçus par une association peuvent être comptabilisés dans des comptes dédiés comme `7541` selon le plan retenu par l’association.[7]

**Décision produit :** par défaut, le surplus volontaire de règlement est ventilé vers `7541 — Dons manuels`.

### 4.4 Gratuité (`free`)

`free` ne doit plus être traité comme un moyen de paiement.

Il s’agit d’une **vente à 0 €** ou d’une **cession gratuite**, sans encaissement.

Conséquences :
- pas de ligne `payment_transactions` financière positive ;
- la vente existe dans Recyclique ;
- le ticket mentionne explicitement la gratuité ;
- aucun débit de trésorerie n’est généré pour cette vente.

## 5. Paramétrage SuperAdmin

### 5.1 Écran “Moyens de paiement”

Le SuperAdmin doit pouvoir créer, modifier, activer, désactiver et ordonner les moyens de paiement.

#### Champs obligatoires

| Champ | Type | Exemple | Description |
|---|---|---|---|
| `code` | string | `cash`, `check`, `card`, `local_currency` | Identifiant technique interne |
| `label` | string | Espèces | Libellé affiché en caisse |
| `active` | bool | `true` | Moyen disponible ou non |
| `kind` | enum | cash / bank / third_party / other | Type de flux |
| `paheko_debit_account` | string | `530` | Compte débité lors d’une vente |
| `paheko_refund_credit_account` | string | `530` | Compte crédité lors d’un remboursement |
| `min_amount` | decimal nullable | `1.00` | Montant minimum éventuel |
| `max_amount` | decimal nullable | `500.00` | Montant maximum éventuel |
| `display_order` | integer | `1` | Ordre d’affichage |
| `notes` | text nullable |  | Commentaire admin |

Paheko permet de configurer des moyens de paiement nommés librement, associés à des comptes comptables, avec éventuellement des seuils mini/maxi par moyen de paiement.[2]

#### Comptes par défaut recommandés

| Moyen | Compte recommandé | Commentaire |
|---|---|---|
| Espèces | `530` | Caisse[8] |
| Chèque | `5112` | Chèques à encaisser[9] |
| Carte | `511` ou `512` | À arbitrer une fois pour l’instance, sans mélange dans la spec |
| Monnaie locale | compte dédié paramétrable | Selon politique locale |

#### Règles de validation

- `code` unique.
- `label` obligatoire.
- `paheko_debit_account` obligatoire si `active = true`.
- `paheko_refund_credit_account` obligatoire si `active = true`.
- désactivation interdite si le moyen est utilisé dans une session ouverte, sauf archivage différé.

### 5.2 Écran “Comptabilité caisse”

Un écran séparé du paramétrage des moyens de paiement doit permettre de configurer les **comptes globaux**.

#### Champs obligatoires

| Champ | Valeur par défaut | Description |
|---|---|---|
| `default_sales_account` | `7070` | Compte de produit par défaut des ventes de réemploi |
| `default_donation_account` | `7541` | Compte par défaut des dons en caisse |
| `prior_year_refund_account` | `672` (proposé) | Compte spécial pour remboursement d’exercice antérieur clos, à valider par l’expert-comptable[5][6] |
| `cash_journal_code` | à définir selon instance | Journal cible Paheko |
| `default_entry_label_prefix` | `Z caisse` | Préfixe du libellé d’écriture |
| `special_case_admin_validation` | `true` | Validation renforcée sur cas spéciaux |

## 6. Règles comptables détaillées

### 6.1 Vente standard

Pour une vente standard, la clôture de session doit débiter les comptes des moyens de paiement et créditer le compte `7070`.

#### Exemple

- Ventes espèces : 120 €
- Ventes chèques : 30 €
- Ventes carte : 50 €

Écriture cible :
- Débit `530` : 120 €
- Débit `5112` : 30 €
- Débit `511` ou `512` : 50 €
- Crédit `7070` : 200 €

### 6.2 Paiement mixte

Les paiements mixtes doivent être supportés nativement.

Exemple :
- ticket = 12 €
- paiement = 5 € espèces + 7 € carte

Conséquence comptable à la clôture :
- Débit `530` : 5 €
- Débit compte CB : 7 €
- Crédit `7070` : 12 €

### 6.3 Don en caisse sur ticket payant

Quand un client donne plus que le montant de la vente, la différence doit être traitée comme un **don distinct**.

Exemple :
- vente = 8 €
- paiement = 10 € espèces
- ventilation = 8 € vente + 2 € don

Conséquence comptable :
- Débit `530` : 10 €
- Crédit `7070` : 8 €
- Crédit `7541` : 2 €

### 6.4 Vente gratuite

Une vente gratuite ne génère aucun encaissement.

Le système doit néanmoins conserver :
- le ticket ;
- la traçabilité des objets ;
- le motif éventuel de gratuité ;
- l’utilisateur ayant accordé la gratuité.

Par défaut, aucune écriture financière n’est envoyée à Paheko pour une vente à 0 €.

### 6.5 Remboursement standard sur exercice courant

Le remboursement d’une vente déjà finalisée doit être enregistré comme un mouvement inverse, daté du jour réel du remboursement.

Exemple : remboursement de 12 € d’une vente antérieure de l’exercice en cours, réglé aujourd’hui en espèces.

Conséquence comptable :
- Débit `7070` : 12 €
- Crédit `530` : 12 €

### 6.6 Remboursement sur autre moyen de paiement

Le remboursement sur un moyen de paiement différent de celui d’origine est **autorisé**.

Le système doit donc distinguer :
- `original_payment_method` ;
- `refund_payment_method`.

Exemple :
- vente initiale réglée par carte ;
- remboursement effectué en espèces.

Conséquence comptable :
- Débit `7070` : montant remboursé
- Crédit compte du moyen de remboursement effectivement utilisé

### 6.7 Remboursement sur exercice antérieur clos

Quand la vente d’origine appartient à un exercice comptable déjà clos, le système doit proposer automatiquement un **mode cas comptable spécial**.

Les opérations sur exercices antérieurs passent par des comptes dédiés de charges ou de produits sur exercices antérieurs ; pour un remboursement client tardif, le compte à viser est de nature charge et non produit, ce qui rend `672` cohérent comme candidat par défaut et `772` inadapté dans ce cas.[5][10][6][11]

#### Règle produit

Si `sale.accounting_period_closed = true` ou si l’exercice de la vente d’origine est clos dans Paheko :
- le formulaire de remboursement bascule automatiquement en **mode exercice antérieur clos** ;
- le compte de contrepartie devient `prior_year_refund_account` ;
- la valeur proposée par défaut est `672` ;
- une confirmation renforcée est demandée ;
- un message d’aide explique pourquoi le traitement diffère.

#### Exemple

- vente initiale : 20/12/2025
- exercice 2025 clos
- remboursement effectué le 10/01/2026 en espèces

Écriture cible :
- Débit `672` : montant remboursé
- Crédit `530` : montant remboursé

#### Garde-fous

- action réservée à un rôle autorisé ;
- bannière orange “Cas comptable spécial” ;
- journalisation renforcée ;
- possibilité d’exiger un motif.

## 7. Modèle de données cible

### 7.1 Nouvelle table `payment_methods`

| Champ | Type | Contraintes |
|---|---|---|
| id | UUID | PK |
| code | string | unique, immutable |
| label | string | required |
| active | bool | required |
| kind | enum | required |
| paheko_debit_account | string | required if active |
| paheko_refund_credit_account | string | required if active |
| min_amount | decimal nullable | optional |
| max_amount | decimal nullable | optional |
| display_order | int | required |
| created_at | datetime | required |
| updated_at | datetime | required |
| archived_at | datetime nullable | optional |

### 7.2 Évolution de `payment_transactions`

| Champ | Type | Usage |
|---|---|---|
| `payment_method_id` | FK | référence vers `payment_methods` |
| `nature` | enum | `sale_payment` / `donation_surplus` / `refund_payment` |
| `direction` | enum | `inflow` / `outflow` |
| `original_sale_id` | FK nullable | pour remboursement |
| `original_payment_method_id` | FK nullable | audit |
| `is_prior_year_special_case` | bool | remboursement exercice clos |
| `paheko_account_override` | string nullable | cas exceptionnel |
| `notes` | text nullable | justification |

### 7.3 Snapshot comptable de session

À la clôture, Recyclique doit calculer et figer un objet de synthèse.

```json
{
  "session_id": "...",
  "closed_at": "2026-04-15T17:55:00Z",
  "sales_account": "7070",
  "donation_account": "7541",
  "prior_year_refund_account": "672",
  "totals_by_payment_method": {
    "cash": {"sales": 120.00, "donations": 2.00, "refunds_current_year": 10.00, "refunds_prior_year": 5.00},
    "check": {"sales": 30.00, "donations": 0.00, "refunds_current_year": 0.00, "refunds_prior_year": 0.00},
    "card": {"sales": 50.00, "donations": 0.00, "refunds_current_year": 0.00, "refunds_prior_year": 0.00}
  },
  "free_sales_total": 18.00,
  "counted_cash": 107.00,
  "expected_cash": 107.00,
  "cash_difference": 0.00,
  "status": "ready_for_outbox"
}
```

## 8. Workflow cible

### 8.1 Avant la session

1. Le SuperAdmin configure les moyens de paiement.
2. Le SuperAdmin configure les comptes globaux.
3. La caisse ouvre une session.
4. Les moyens de paiement actifs sont chargés dans l’interface.

### 8.2 Pendant la session

1. La vente est saisie.
2. Les paiements sont ajoutés, possiblement en plusieurs lignes.
3. Le surplus éventuel est identifié comme don.
4. La vente gratuite est marquée comme telle.
5. Les remboursements créent des mouvements dédiés.

### 8.3 À la clôture de session

Paheko fonctionne avec une logique de fermeture de session intégrant comparaison entre montant théorique et montant réel compté, puis synchronisation comptable.[2]

Workflow Recyclique cible :
1. interdire la clôture si des tickets `held` subsistent ;
2. calculer les totaux par moyen de paiement à partir de `payment_transactions` ;
3. calculer les dons ;
4. calculer les remboursements exercice courant ;
5. calculer les remboursements exercice clos ;
6. calculer l’écart de caisse espèces ;
7. produire le snapshot figé ;
8. créer le message d’outbox ;
9. fermer la session localement ;
10. lancer la transmission asynchrone vers Paheko.

### 8.4 Outbox et synchronisation Paheko

Paheko dispose d’une API REST permettant l’intégration depuis une application externe.[4]

Principes imposés :
- l’écran de caisse ne doit pas dépendre directement de la disponibilité immédiate de Paheko ;
- une clôture doit créer un message d’outbox idempotent ;
- le processor d’outbox doit pouvoir relancer sans doublon ;
- le statut de synchronisation doit être visible en back-office.

## 9. Construction de l’écriture Paheko

### 9.1 Principe

Le lot comptable envoyé à Paheko pour une session clôturée est traité comme un **batch de session** contenant **une ou plusieurs sous-écritures équilibrées**.[3]

Historique d'options :
- **stratégie A** : une seule transaction équilibrée ;
- **stratégie B** : plusieurs transactions équilibrées pour une même session.

**Décision active pour la v2 / backlog canonique : la stratégie B est retenue.**  
La stratégie A reste une option étudiée historiquement, mais **n'est plus** la granularité cible du backlog actif.

### 9.2 Recommandation de mise en œuvre

La stratégie B est retenue :
- transaction 1 : ventes + dons ;
- transaction 2 : remboursements exercice courant ;
- transaction 3 : remboursements exercice antérieur clos.

### 9.3 Exemple complet équilibré

#### Transaction 1 — ventes + dons

Hypothèses :
- ventes espèces : 120 €
- ventes chèques : 30 €
- ventes carte : 50 €
- dons espèces : 2 €

Écriture :
- Débit `530` : 122 €
- Débit `5112` : 30 €
- Débit `511` ou `512` : 50 €
- Crédit `7070` : 200 €
- Crédit `7541` : 2 €

#### Transaction 2 — remboursements exercice courant

Hypothèses :
- remboursements espèces exercice courant : 10 €

Écriture :
- Débit `7070` : 10 €
- Crédit `530` : 10 €

#### Transaction 3 — remboursements exercice antérieur clos

Hypothèses :
- remboursements espèces exercice clos : 5 €

Écriture :
- Débit `672` : 5 €
- Crédit `530` : 5 €

## 10. Règles UX et assistance utilisateur

L’utilisateur caisse ne doit pas avoir à comprendre la comptabilité pour utiliser correctement le système.

Principes d’interface :
- les comptes comptables ne sont visibles que côté admin ou dans les cas spéciaux ;
- les écrans caisse parlent en langage métier : espèces, chèque, carte, don, gratuit, remboursement ;
- les cas spéciaux doivent être accompagnés de textes d’aide courts.

### Textes d’aide

**Remboursement standard**  
“Ce remboursement sera compté aujourd’hui dans la clôture de caisse.”

**Remboursement exercice antérieur clos**  
“La vente d’origine appartient à un exercice comptable clôturé. Recyclique applique un traitement comptable spécial et utilisera le compte configuré pour les exercices antérieurs.”

**Remboursement sur autre moyen de paiement**  
“Le moyen de remboursement peut être différent du moyen de paiement d’origine. Le système le trace automatiquement.”

## 11. Journal d’audit et traçabilité

Chaque événement sensible doit être historisé :
- création ou modification d’un moyen de paiement ;
- changement de compte comptable ;
- désactivation d’un moyen ;
- remboursement ;
- remboursement exercice clos ;
- rejet ou réémission de message d’outbox ;
- correction manuelle d’un mapping.

## 12. Migration et nettoyage technique

Les paiements mixtes et la clôture fiable supposent l’abandon du champ legacy `sales.payment_method` comme source de calcul comptable.

### Phase A — préparation

- créer `payment_methods` ;
- ajouter les nouveaux champs à `payment_transactions` ;
- injecter les moyens historiques (`cash`, `check`, `card`) ;
- requalifier `free` comme nature spéciale et non moyen de paiement financier.

### Phase B — double lecture temporaire

- continuer à alimenter le champ legacy pour compatibilité ;
- basculer tous les calculs comptables sur `payment_transactions` ;
- comparer les agrégats anciens vs nouveaux en environnement de test.

### Phase C — bascule définitive

- supprimer les dépendances métier au champ legacy ;
- conserver éventuellement le champ comme archive ou le déprécier ;
- documenter officiellement la nouvelle source de vérité.

## 13. Phasage recommandé

### Phase 1 — socle comptable fiable

- table `payment_methods` ;
- écran SuperAdmin moyens de paiement ;
- écran SuperAdmin comptabilité caisse ;
- clôture par session basée uniquement sur `payment_transactions` ;
- écriture Paheko multi-lignes ;
- dons séparés du paiement ;
- `free` traité comme vente à 0 €.

### Phase 2 — remboursements robustes

- remboursement standard tracé proprement ;
- remboursement sur autre moyen de paiement ;
- journal d’audit ;
- aide utilisateur sur cas spéciaux.

### Phase 3 — cas spéciaux avancés

- détection automatique exercice clos ;
- bascule automatique vers `prior_year_refund_account` ;
- validations renforcées ;
- reporting back-office des remboursements spéciaux.

### Phase 4 — durcissement opérationnel

- tableau de bord outbox/synchronisation ;
- reprise manuelle sécurisée ;
- alertes en cas d’écarts de caisse ;
- exports d’audit.

## 14. Critères d’acceptation

### 14.1 Moyens de paiement

- Un admin peut créer un nouveau moyen de paiement.
- Un admin ne peut pas l’activer sans compte Paheko valide.
- Le nouveau moyen apparaît automatiquement dans la clôture de session.

### 14.2 Paiements mixtes

- Une vente 5 € espèces + 7 € carte produit deux `payment_transactions`.
- La clôture de session agrège correctement ces deux flux.
- L’écriture Paheko est équilibrée.

### 14.3 Dons

- Une vente 8 € + 2 € don produit un total encaissé de 10 €.
- La clôture affecte 8 € à `7070` et 2 € à `7541`.

### 14.4 Gratuité

- Une vente gratuite crée un ticket et une trace métier.
- Elle n’augmente aucun encaissement dans la session.
- Elle n’envoie pas d’écriture financière à Paheko.

### 14.5 Remboursement exercice courant

- Un remboursement standard crée un flux sortant.
- Le moyen de remboursement réel est celui comptabilisé.

### 14.6 Remboursement exercice antérieur clos

- Le système détecte automatiquement l’exercice clos.
- L’interface affiche le mode spécial.
- Le compte configuré pour ce cas est proposé automatiquement.
- L’opération est auditée.

### 14.7 Synchronisation Paheko

- Une clôture crée un message d’outbox.
- En cas d’échec temporaire, le message est relançable.
- En cas de succès, la session affiche la corrélation du batch et, si besoin, les identifiants de sous-écritures `Paheko`.
- Deux relances ne créent pas de doublon comptable.

## 15. Résumé exécutif

La solution cible retenue est une comptabilisation **par session de caisse**, conforme à la logique de clôture de Paheko et compatible avec l’agrégation admise des opérations de caisse de détail, sous réserve de conserver les justificatifs détaillés.[2][1]

La refonte doit s’appuyer sur `payment_transactions` comme source de vérité, transformer `free` en vente à 0 €, séparer le don du paiement, permettre des moyens de paiement administrables avec mapping comptable, autoriser les remboursements sur autre moyen et détecter automatiquement les remboursements portant sur un exercice clos en les orientant vers un compte configurable de charges sur exercice antérieur, proposé par défaut à `672` sous validation de l’expert-comptable.[3][4][5][7][6][9]