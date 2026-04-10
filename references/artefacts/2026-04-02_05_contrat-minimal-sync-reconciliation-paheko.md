# Contrat minimal — synchronisation et réconciliation Recyclique ↔ Paheko

**Date :** 2026-04-02  
**Dernière mise à jour :** 2026-04-02 — **HITL terrain (Strophe)** : résumé « langage plancher » ; lexique §0 ; alignement **bénévole** (pas « opérateur ») avec **Story 1.3** ; **§5.3** complété (blocages *finales critiques* = **cas par cas** + Paheko = référence comptable) ; **§6** : rôles **FR26–FR27** (responsable ressourcerie, admin local, super-admin) et exemple **qui / quoi / quand** ; liens artefacts **01–04**. **Révision intégrale (même jour) :** correction renvoi §7→**§9**/1.6 (évitait confusion avec §8 AR39) ; typo « épique »→PRD ; §5.4 aligné §6 ; §10 statut validé.

**Story BMAD :** Epic 1 — `1-5-definir-le-contrat-minimal-de-synchronisation-et-reconciliation-avec-paheko`  
**Piste :** B (prérequis Recyclique / Paheko).  
**Périmètre :** sémantique **documentaire** et invariants stables pour Epics 6, 7 et 8 — **sans** implémenter outbox, workers ni journal d'audit complet (voir stories Epic 2 et Epic 8).

**Documents liés (Stories 1.1–1.4 — à jour avec ta relecture) :**

| Artefact | Rôle pour la sync |
|----------|-------------------|
| `2026-04-02_01_surface-travail-v2-mode-reference-paheko.md` | Où vit Paheko en dev / comment on teste — cadre pour intégration sans tout mélanger avec l'existant 1.4.4. |
| `2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` | Ce que le backend actuel fait / fragile — utile pour ne pas promettre dans ce contrat ce que l'existant ne porte pas. |
| `2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` | **Bénévole** vs **admin** ; PIN ; step-up ; **qui** peut débloquer quoi — base pour §6 ci-dessous. |
| `2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` | Erreurs JSON, `correlation_id`, OpenAPI reviewable — aligné §4. |

**Compléments :** `contracts/README.md`, `contracts/openapi/recyclique-api.yaml`, `_bmad-output/planning-artifacts/epics.md` (FR23–FR25, FR39, AR8, AR11, AR17, AR21, AR24), `references/paheko/index.md`, `references/migration-paeco/index.md`.

**Suite documentaire :** Story **1.6** — matrice opération → API Paheko réelle et liste des gaps.

---

## 0. Lire d'abord — en bref

**Ce que dit ce document (sans jargon).** Recyclique enregistre le **terrain** en premier. Ensuite le système **essaie** d'envoyer vers Paheko (compta). Si ça coince, il y a des **états nommés** (réessayer, quarantaine, résolu, rejeté) pour que tout le monde parle la même langue. Rien ici ne remplace une **décision métier** sur *chaque* bouton critique : ça viendra au **fil des epics** caisse / réception / sync, avec **Paheko** comme référence **comptable**.

**Pourquoi les Epics 6–7 peuvent s'appuyer dessus sans tout refaire.** Les **mots** et **états** de ce fichier sont volontairement **stables** : les stories caisse et réception **ajoutent** écrans et règles détaillées ; elles ne doivent **pas** réinventer une autre définition de « quarantaine » ou « résolu » sans **changement de version** du contrat (voir §2.3).

**Lexique (rappel).**

| Terme | En une phrase |
|-------|----------------|
| **Outbox durable** | Une **liste en base de données** (PostgreSQL) où l'on enregistre « ce qu'il faudra envoyer à Paheko » **au même moment** que la vente — comme une **file d'attente** qui ne disparaît pas si le serveur redémarre. |
| **Idempotence** | Si le même message part **deux fois** par erreur, Paheko (ou Recyclique) **ne doit pas** comptabiliser deux fois la même chose — d'où des **clés** reconnues par le système. |
| **Corrélation** | Un **numéro de dossier** (`correlation_id`, header `X-Correlation-ID`) pour suivre une opération dans les **logs** et les **erreurs** d'un bout à l'autre (support, debug). |

---

## Traçabilité Acceptance Criteria → sections

| Bloc Given / When / Then (Story 1.5) | Sections qui répondent |
|--------------------------------------|-------------------------|
| Accès lecture rapide (pas d'AC formel — aide HITL) | §0 |
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
- **Acceptation locale** : le **bénévole** (utilisateur terrain au sens **Story 1.3** / §1 bis) peut poursuivre le travail courant tant que les **garde-fous métier** locaux sont respectés ; cela **ne** garantit **pas** que Paheko reflète déjà l'opération.

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
- **Mise à jour terrain (2026-04-10, endpoint `POST /api/accounting/transaction`)** : dans le setup local testé, Paheko a accepté **deux** requêtes strictement identiques avec le **même** `Idempotency-Key` et a créé **deux** écritures distinctes ; l’idempotence comptable distante ne doit donc **pas** être présumée sur cet endpoint sans mécanisme complémentaire.

---

## 4. Corrélation inter-systèmes

### 4.1 Propagation (AR17)

- Un identifiant de **corrélation** unique par **unité de travail** (session utilisateur, lot de sync, requête API traversant plusieurs services) est propagé dans les **logs structurés** et, pour le HTTP, via le header canonique **`X-Correlation-ID`** (**AR17**).
- **Mise à jour terrain (2026-04-10)** : le probe HTTP local contre Paheko n’a montré **aucune** réémission visible de `X-Correlation-ID` dans les en-têtes de réponse ; cela prouve l’émission côté Recyclique, **pas** une exploitation serveur Paheko.

### 4.2 Erreurs JSON et alignement gouvernance 1.4 (AR21)

- L'**enveloppe d'erreur** JSON côté Recyclique reste **stable** avec au minimum : `code`, `detail`, `retryable`, `state`, **`correlation_id`** (**AR21**), en cohérence avec la **Story 1.4** et les évolutions futures de `contracts/openapi/recyclique-api.yaml`.
- Les erreurs **liées à la sync** (échec Paheko, état `en_quarantaine`, conflit idempotence) **doivent** réutiliser ce schéma lorsqu'elles sont exposées en HTTP ; le champ `state` peut porter une valeur compatible avec les états **FR24** ou un sous-ensemble nommé dans l'OpenAPI au fil des stories.

### 4.3 Pas de seconde source HTTP

- Toute exposition **nouvelle** d'états ou de codes sync sur l'API Recyclique **descend** du fichier **reviewable** OpenAPI — **AR39** ; ce document **décrit** la sémantique métier ; le **contrat HTTP** reste dans `recyclique-api.yaml`.

---

## 5. Réconciliation métier (FR23, FR25) et blocage sélectif

### 5.1 Terrain d'abord et sync reportable (FR23)

- Les données terrain **ne** sont **pas** bloquées par défaut en l'absence de sync Paheko immédiate.
- Le système **expose** (pour **bénévole** / support / **admin**) que la sync est **en retard**, **en erreur** ou **en quarantaine**, afin que la décision soit **informée**. (Vocabulaire terrain : **bénévole** — pas « opérateur » — aligné **Story 1.3**.)

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

**Cas des actions « finales critiques » (liste ouverte en Epic 1).** La ligne du tableau « **blocage sélectif** » ne peut pas nommer **tous** les écrans maintenant : les cas exacts (quelle clôture, quel export, quel seuil) seront **affinés au cas par cas** avec le métier dans Epics **6**, **7** et **8**, en gardant **Paheko** comme **autorité comptable** et le **bon sens produit** (ne pas bloquer le quotidien pour un détail ; ne pas laisser passer une action **irréversible** comptablement dangereuse). Tant que cette liste n'est pas figée dans une story ultérieure, le repère utile est : **distinction fonctionnelle** du tableau + **quarantaine** quand la chaîne vers Paheko n'est pas sûre.

### 5.4 Résolution et rejet (parcours manuel)

- **Résolution** : action humaine sous **profil habilité** (voir §6) ou règle d'automatisation **nommée** pour corriger mapping, données, ou forcer une resynchronisation après correction Paheko / Recyclique ; transition vers **`resolu`** ou retour temporaire à **`a_reessayer`** selon processus défini en Epic 8.
- **Rejet** : décision documentée menant à **`rejete`** ; le système **ne** doit **pas** réessayer indéfiniment la même livraison sans changement de contexte.

---

## 6. Piste d'audit minimale (levée de quarantaine et corrections manuelles)

**Objectif.** Traçabilité **qui, quoi, quand** pour les actions qui **déplacent** une opération hors de **`en_quarantaine`** ou qui **modifient** une décision de sync (forçage, rejet, correction de mapping). Ce n'est **pas** de l'abstraction : c'est la promesse qu'on pourra **expliquer après coup** à un contrôle ou au support **quelle personne habilitée** a fait **quoi** sur **quel dossier** et **à quel moment**.

**Ce que « qui / quoi / quand » veut dire concrètement.**

- **Qui** — pas un fantôme : compte **authentifié** avec un **rôle** suffisant. Pour les actes **sensibles** (levée de quarantaine, correction de mapping, forçage de sync), le **PRD** (**FR26–FR27**) parle d'un **responsable de ressourcerie** ou d'un **super-admin** *selon le workflow retenu* ; le cadre des stories **1.1–1.4** complète avec **admin local** (périmètre site), **super-admin** (arbitrages larges, panel) — **aligné Story 1.3** (PIN, step-up). Le **bénévole** terrain n'est **pas** supposé lever seul une quarantaine **comptable** sans cette chaîne d'habilitation (détail d'écrans : Epic **2** / **8**).
- **Quoi** — l'**identifiant** de l'opération Recyclique, l'**état avant / après**, une **raison** courte **obligatoire** (« mapping corrigé », « doublon reconnu », etc.), et le **correlation_id** si on en a un.
- **Quand** — date/heure **ISO 8601** (même idée que partout ailleurs dans les contrats **1.4**).

**Exemple fictif (à visée pédagogique).**  
*« Le 2026-04-15 à 14:32, **compte super-admin** `marie.dupont` a passé l'opération `vente-abc-123` de `en_quarantaine` à `resolu` — raison : « mapping compte analytique corrigé côté Paheko » — `correlation_id` : `req-xyz-789`. »*

**Minimum requis (contrat documentaire) :**

- **Qui :** identité **authentifiée** avec rôle **explicitement habilité** (p. ex. **responsable de ressourcerie**, **admin local**, **super-admin**, ou **service** d'automatisation **nommé** dans la spec d'exploitation) — pas d'action **anonyme** sur la levée ; cohérent avec **FR26–FR27** (PRD : levée de quarantaine tracée, résolution manuelle auditée).
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
| Statut final Recyclique / Paheko | **`resolu`** = alignement intentionnel clos ; côté Paheko, réalisation **conditionnée** aux capacités API réelles (voir **§9** et **Story 1.6** — pas la §8 ci-dessous, qui traite d'AR39 / intégration backend). |

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

**Validé terrain — 2026-04-02 (Strophe) :** relecture intégrale du §0 au §11 ; les cases ci-dessous sont **toutes cochées** comme critères satisfaits (preuve de **done** documentaire).

Un pair peut réutiliser la même grille pour une revue ultérieure ; état **2026-04-02** :

- [x] Cycle de vie : local → retry → quarantaine → résolution / rejet → état final.
- [x] Outbox durable, idempotence, corrélation (y compris erreurs AR21).
- [x] Distinction acceptation locale / blocage **sélectif** des actions finales critiques / résolution manuelle — en acceptant que la **liste** des actions finales critiques soit **complétée au cas par cas** (§5.3).
- [x] Vocabulaire terrain : **bénévole** (pas « opérateur ») cohérent avec **Story 1.3**.
- [x] Audit minimal levée quarantaine et corrections : **qui** (profil habilité : **responsable ressourcerie** / admin local / super-admin / service nommé), **quoi**, **quand** — compréhensible sans jargon (§6).
- [x] Stabilité pour Epics 6–7–8 : états FR24 et vocabulaire **sans** redéfinition implicite dans les stories futures.
- [x] Alignement AR39 / OpenAPI reviewable / Story 1.4 ; cohérence **globale** avec artefacts **01–04** (pas de contradiction sur erreurs JSON, rôles, Paheko Docker par défaut).
- [x] Aucune capacité Paheko **inventée** : hypothèses et gaps renvoyés à **1.6**.

---

## 11. Données sensibles

Aucun secret, identifiant réel, credential ou donnée personnelle ne figure dans ce document. Les exemples restent **génériques**.
