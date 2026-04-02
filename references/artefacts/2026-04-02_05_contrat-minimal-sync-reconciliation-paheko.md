# Contrat minimal — synchronisation et réconciliation Recyclique ↔ Paheko

**Date :** 2026-04-02  
**Story BMAD :** Epic 1 — `1-5-definir-le-contrat-minimal-de-synchronisation-et-reconciliation-avec-paheko`  
**Piste :** B (prérequis Recyclique / Paheko).  
**Périmètre :** sémantique **documentaire** et invariants stables pour Epics 6, 7 et 8 — **sans** implémenter outbox, workers ni journal d'audit complet (voir stories Epic 2 et Epic 8).

**Documents liés :** `2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` (Story 1.4, AR39), `contracts/README.md`, `contracts/openapi/recyclique-api.yaml`, `_bmad-output/planning-artifacts/epics.md` (FR23–FR25, FR39, AR8, AR11, AR17, AR21, AR24), `references/paheko/index.md`, `references/migration-paeco/index.md`.

**Suite documentaire :** Story **1.6** — matrice opération → API Paheko réelle et liste des gaps.

---

## Traçabilité Acceptance Criteria → sections

| Bloc Given / When / Then (Story 1.5) | Sections qui répondent |
|--------------------------------------|-------------------------|
| Cycle de vie minimal : enregistrement local, retry, quarantaine, résolution, rejet, état comptable final (sémantique Recyclique / Paheko, sans implémentation ici) ; rôle outbox durable, idempotence, corrélation (AR11, AR17, AR24) | §2, §3, §4 |
| Distinction acceptation locale non bloquante, blocage sélectif des actions finales critiques, parcours résolution manuelle ; piste d'audit minimale levée quarantaine / corrections manuelles (qui, quoi, quand) | §5, §6 |
| Contrat stable pour stories ultérieures ; clôture locale et sync différée sans redéfinir les états comptables métier (FR23–FR25, FR39) | §2, §5, §7, §8 |
| **Validation humaine (HITL)** — relecture pair | §10 |

---

## 1. Objet et non-objectifs

**Objet.** Poser un **vocabulaire** et des **invariants** partagés pour que Recyclique enregistre d'abord le terrain et pousse (ou retente) vers Paheko selon une politique explicite, avec états de sync observables et réconciliation maîtrisée.

**Non-objectifs (hors Epic 1).**

- Implémentation PostgreSQL outbox, consommateurs, backoff concret, UI quarantaine : **Epic 2** / **Epic 8**.
- Détail des **endpoints** Recyclique exposant chaque transition d'état : évolution de `contracts/openapi/recyclique-api.yaml` dans les stories dédiées ; ce document **ne** duplique **pas** une seconde source HTTP.
- Matrice **opération par opération** et arbitrage API officielle / plugin / SQL : **Story 1.6** et références `references/paheko/liste-endpoints-api-paheko.md`, audits `references/migration-paeco/audits/`.

---

## 2. Cycle de vie minimal d'une opération synchronisée

### 2.1 Enregistrement local (source de vérité terrain)

- Toute opération **terrain** (caisse, réception, etc.) est **acceptée et persistée dans Recyclique** en premier, conformément à **FR23**.
- L'opération possède des identifiants **stables côté Recyclique** (clé métier / UUID logique) utilisables pour l'idempotence et la corrélation (voir §3–§4).
- **Acceptation locale** : l'utilisateur peut poursuivre le travail courant tant que les **garde-fous métier** locaux sont respectés ; cela **ne** garantit **pas** que Paheko reflète déjà l'opération.

### 2.2 Tentatives de livraison et retry

- Les messages ou lots destinés à Paheko transitent par une **file logique** matérialisée en pratique par une **outbox durable** (§3).
- En cas d'échec **transitoire** (réseau, indisponibilité, erreur HTTP retryable au sens **AR21** : champ `retryable` dans l'enveloppe d'erreur JSON lorsque exposée par l'API Recyclique), l'opération de sync reste éligible aux **nouvelles tentatives** avec politique de **backoff** (détail d'implémentation Epic 8).
- Tant que l'échec est traité comme transitoire, l'état métier de sync côté Recyclique peut rester dans **`a_reessayer`** (**FR24**).

### 2.3 États explicites alignés FR24

| État (clé stable) | Sémantique opérationnelle (contrat minimal) |
|-------------------|---------------------------------------------|
| `a_reessayer` | Échec récent ou en cours de traitement ; nouvelles tentatives automatiques ou manuelles possibles ; **pas** encore classé comme incohérence persistante. |
| `en_quarantaine` | **FR25** : échec **persistant**, **incohérence comptable** détectée, ou **absence de correspondance** Paheko requise pour poursuivre la chaîne comptable ; **intervention** humaine ou règle métier explicite nécessaire avant de réutiliser la donnée dans des flux comptables « fermés ». |
| `resolu` | La représentation attendue côté Paheko (ou la décision métier de abandonner un push tout en conservant la cohérence) est **alignée** avec l'intention Recyclique ; la sync pour cette opération est **close** du point de vue métier. |
| `rejete` | Décision **explicite** de ne pas pousser ou d'annuler la perspective Paheko pour cette opération, avec **raison** traçable (rejet métier, impossibilité technique acceptée, doublon détecté, etc.) ; distinct d'un simple échec temporaire. |

**Règle de stabilité.** Ces quatre états constituent le **noyau** dont se servent **Epics 6 et 7** (parcours défensifs, clôture locale) et **Epic 8** (implémentation complète). Les stories ultérieures **ajoutent** champs, APIs et écrans ; elles **ne redéfinissent** pas la sémantique métier de ces états sans **changement de version** du contrat documentaire / OpenAPI.

### 2.4 État comptable final (sémantique documentaire)

- **Côté Recyclique :** une opération peut être **clôturée localement** (ex. session de caisse clôturée côté terrain) **avant** que Paheko ne soit à jour ; le contrat impose de **rendre visible** le **décalage** (signaux exploitables, bandeau, listes de sync — hors périmètre rédactionnel détaillé ici, voir Story 1.7 et Epic 4).
- **Côté Paheko :** au niveau **sémantique**, une opération peut être « reflétée » (écriture, transaction, pièce) ou « en attente de réconciliation » selon les capacités réelles documentées en **1.6** ; ce document **n'attribue** pas de schéma SQL ou d'endpoint Paheko sans étayage.

---

## 3. Outbox durable et livraison at-least-once

### 3.1 Rôle (AR11)

- Le backend cible s'appuie sur une **outbox durable** persistée (**PostgreSQL** — **AR11**) pour garantir qu'aucun événement de sync **validé** n'est perdu entre la transaction métier locale et la livraison vers Paheko.
- Sémantique de livraison : **at-least-once** vers le connecteur Paheko (HTTP API, adaptation plugin, etc.) ; le **consommateur** et Paheko doivent tolérer des **duplicatas** logiques.

### 3.2 Handlers idempotents et clés (AR24)

- Chaque handler de livraison doit être **idempotent** : un second envoi avec la même **clé d'idempotence** ne doit pas corrompre l'état distant (création en double non désirée, montants additionnés deux fois, etc.).
- Mécanismes attendus (détail Epic 8) :
  - en-tête ou champ de type **`Idempotency-Key`** pour les mutations HTTP exposées par Recyclique (**AR24**) ;
  - **clés métier** stables (identifiant d'opération Recyclique, lot de clôture, etc.) réutilisées dans la couche d'intégration Paheko pour détecter ou éviter les doublons côté Paheko **lorsque** l'API ou l'extension le permet — sinon **quarantaine** ou **gap** documenté en **1.6**.

---

## 4. Corrélation inter-systèmes

### 4.1 Propagation (AR17)

- Un identifiant de **corrélation** unique par **unité de travail** (session utilisateur, lot de sync, requête API traversant plusieurs services) est propagé dans les **logs structurés** et, pour le HTTP, via le header canonique **`X-Correlation-ID`** (**AR17**).

### 4.2 Erreurs JSON et alignement gouvernance 1.4 (AR21)

- L'**enveloppe d'erreur** JSON côté Recyclique reste **stable** avec au minimum : `code`, `detail`, `retryable`, `state`, **`correlation_id`** (**AR21**), en cohérence avec la **Story 1.4** et les évolutions futures de `contracts/openapi/recyclique-api.yaml`.
- Les erreurs **liées à la sync** (échec Paheko, état `en_quarantaine`, conflit idempotence) **doivent** réutiliser ce schéma lorsqu'elles sont exposées en HTTP ; le champ `state` peut porter une valeur compatible avec les états **FR24** ou un sous-ensemble nommé dans l'OpenAPI au fil des stories.

### 4.3 Pas de seconde source HTTP

- Toute exposition **nouvelle** d'états ou de codes sync sur l'API Recyclique **descend** du fichier **reviewable** OpenAPI — **AR39** ; ce document **décrit** la sémantique métier ; le **contrat HTTP** reste dans `recyclique-api.yaml`.

---

## 5. Réconciliation métier (FR23, FR25) et blocage sélectif

### 5.1 Terrain d'abord et sync reportable (FR23)

- Les données terrain **ne** sont **pas** bloquées par défaut en l'absence de sync Paheko immédiate.
- Le système **expose** (pour opérateur / support / admin) que la sync est **en retard**, **en erreur** ou **en quarantaine**, afin que la décision soit **informée**.

### 5.2 Quarantaine obligatoire (FR25)

Le passage en **`en_quarantaine`** est **obligatoire** lorsque :

1. **Échec persistant** de livraison après politique de retry définie (seuils Epic 8) ;
2. **Incohérence comptable** détectée (montants, signes, devise, période, mapping compte / analytique) ;
3. **Absence de correspondance** requise (site, caisse, catégorie, utilisateur, pièce comptable) empêchant une écriture **sûre** côté Paheko.

### 5.3 Acceptation locale vs blocage des actions finales critiques

| Situation | Comportement contractuel |
|-----------|---------------------------|
| Sync **non** à jour, état `a_reessayer` ou délai acceptable | **Acceptation locale** des opérations courantes (ventes, réceptions, corrections locales selon règles Epic 6 / 7) ; **signaux** de dette sync visibles. |
| **`en_quarantaine`** sur une ressource **bloquante** pour une action finale | **Blocage sélectif** de cette action **critique** (ex. clôture comptable **globale** exportée vers Paheko, validation fiscale dépendant d'une pièce manquante) jusqu'à **résolution** ou **rejet** documenté. |
| **`resolu` / `rejete`** | Les règles de blocage **spécifiques** à l'action sont levées ou remplacées selon la décision métier. |

**Epic 8** détaille la politique de **blocage sélectif** (Story 8.6) ; le présent contrat **impose** la distinction **fonctionnelle** : pas de « tout bloquer » sur un retard mineur, pas de « tout autoriser » si la quarantaine porte sur une **garantie comptable** explicite.

### 5.4 Résolution et rejet (parcours manuel)

- **Résolution** : action humaine (ou règle admin) pour corriger mapping, données, ou forcer une resynchronisation après correction Paheko / Recyclique ; transition vers **`resolu`** ou retour temporaire à **`a_reessayer`** selon processus défini en Epic 8.
- **Rejet** : décision documentée menant à **`rejete`** ; le système **ne** doit **pas** réessayer indéfiniment la même livraison sans changement de contexte.

---

## 6. Piste d'audit minimale (levée de quarantaine et corrections manuelles)

**Objectif.** Traçabilité **qui, quoi, quand** pour les actions qui **déplacent** une opération hors de **`en_quarantaine`** ou qui **modifient** une décision de sync (forçage, rejet, correction de mapping).

**Minimum requis (contrat documentaire) :**

- **Qui :** identité **authentifiée** (utilisateur admin / rôle support) ou **service** d'automatisation nommé ; pas d'action anonyme sur la levée.
- **Quoi :** identifiant de **l'opération** Recyclique concernée, **ancien** et **nouvel** état (ou intention), **raison** courte obligatoire, lien vers **correlation_id** si disponible.
- **Quand :** horodatage **ISO 8601** (**AR21**).

**Implémentation.** Journal dédié, table d'audit, ou append-only — **Epic 2 / 8 / 10** ; ce document **exige** la **sémantique** d'audit, pas le stockage technique.

---

## 7. FR39 — version « minimal contract » (Epic 1)

Pour **éviter** qu'Epics 6–7 attendent Epic 8 pour le **vocabulaire**, le contrat minimal couvre **au moins** les notions suivantes (détail d'implémentation et API : Epic 8) :

| Thème FR39 | Contenu minimal posé ici |
|------------|---------------------------|
| Sessions de caisse et clôture | Clôture **locale exploitable** possible avec **dette de sync** visible ; alignement Paheko **différé** ; états FR24. |
| Écritures comptables | Représentation **conceptuelle** : une opération Recyclique peut générer **zéro, une ou plusieurs** écritures / transactions côté Paheko selon mapping (1.6) ; incohérence → quarantaine. |
| Politique de réconciliation | FR23 + FR25 + §5 ; résolution / rejet §5.4. |
| Granularité du push | Unité **logique** (événement, lot, clôture) définie par produit ; **pas** imposée dans ce document — **1.6** et Epic 8 tranchent par domaine. |
| Idempotence / retry | §3. |
| Rejets | État **`rejete`** §2.3. |
| Reprise après incident | Outbox durable §3.1 ; reprise des **`a_reessayer`** ; relecture des **`en_quarantaine`**. |
| Statut final Recyclique / Paheko | **`resolu`** = alignement intentionnel clos ; côté Paheko, réalisation **conditionnée** aux capacités API réelles (voir §8). |

---

## 8. Cohérence contractuelle (AR39) et intégration Paheko (AR8)

- **AR39 :** la sémantique **HTTP** et les schémas **publics** de sync **émanent** de `contracts/openapi/recyclique-api.yaml` ; le présent texte est une **couche métier intégration** **alignée** avec la gouvernance **1.4** et **sans** seconde source de vérité pour les routes ou les noms d'opérations.
- **AR8 :** Paheko est intégré **côté backend** Recyclique avec un **mapping métier** explicite ; les flux UI **ne** parlent **pas** directement à Paheko.

---

## 9. Croisement Paheko / migration — hypothèses et gaps (Story 1.6)

**Éléments étayés (ne pas réinventer ailleurs).**

- Paheko expose une API sous **`/api`** avec préfixes documentés (`accounting`, `user`, `web`, etc.) et niveaux d'accès ; comptabilité : création de transactions, journal, exports — voir `references/paheko/analyse-brownfield-paheko.md` et `references/paheko/liste-endpoints-api-paheko.md`.
- Limites déjà notées : **pas** d'upload fichier générique simple via API documentée pour tous les cas ; chemins possibles via plugins, WebDAV, ou extensions — **à** classer en **1.6**.
- Audits caisse / poids et matrice de correspondance : `references/migration-paeco/audits/index.md`.

**Hypothèses de travail (à valider en 1.6).**

- Quels endpoints Paheko couvrent **nominallement** chaque type d'opération Recyclique v2 (vente, remboursement, réception, clôture).
- Où l'API officielle est **insuffisante**, le **plugin minimal** ou l'exception SQL reste **exceptionnelle** avec justification (critères Story 1.6).

**Gaps explicitement renvoyés à Story 1.6.**

- Tableau **opération → endpoint Paheko → preuve / gap**.
- Liste des **inconnues** (version Paheko cible, champs obligatoires transactions, idempotence côté Paheko si absente).
- Conséquences backlog (Epic 8, plugins).

---

## 10. Validation humaine (HITL) — grille de relecture

Un pair valide que le document couvre bien :

- [ ] Cycle de vie : local → retry → quarantaine → résolution / rejet → état final.
- [ ] Outbox durable, idempotence, corrélation (y compris erreurs AR21).
- [ ] Distinction acceptation locale / blocage actions finales / résolution manuelle.
- [ ] Audit minimal levée quarantaine et corrections manuelles (qui, quoi, quand).
- [ ] Stabilité pour Epics 6–7–8 : états FR24 et vocabulaire **sans** redéfinition implicite dans les stories futures.
- [ ] Alignement AR39 / OpenAPI reviewable / Story 1.4.
- [ ] Aucune capacité Paheko **inventée** : hypothèses et gaps renvoyés à **1.6**.

---

## 11. Données sensibles

Aucun secret, identifiant réel, credential ou donnée personnelle ne figure dans ce document. Les exemples restent **génériques**.
