# Matrice d'intégration Paheko — opérations v2 et gaps API

**Date :** 2026-04-02  
**Story BMAD :** Epic 1 — `1-6-produire-la-matrice-dintegration-paheko-et-les-gaps-api-reels`  
**Piste :** B (prérequis Recyclique / Paheko).  
**Documents liés :** `2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` (états FR24, outbox, quarantaine — **ne pas redéfinir** ici), `references/paheko/liste-endpoints-api-paheko.md`, `references/paheko/analyse-brownfield-paheko.md`, `references/migration-paeco/audits/matrice-correspondance-caisse-poids.md`, `contracts/openapi/recyclique-api.yaml` (surface Recyclique v2 — **pas** fusionnée comme source unique avec cette matrice).

---

## Traçabilité Acceptance Criteria → sections

| AC (Story 1.6) | Sections |
|----------------|----------|
| Matrice opération par opération : API officielle / plugin minimal / SQL analyse-admin / hors scope v2 | §2 (table principale), §3 (compléments par domaine) |
| Liste gaps API réels + inconnues ; chaque ligne → conséquence produit ou backlog | §4 |
| Rationale plugin si API insuffisante ; interdiction SQL transactionnel nominal (FR5, FR40, AR9) | §2 (colonne Notes), §5 |

---

## 1. Objet et périmètre

**Objet.** Classer **chaque opération métier majeure** visée par la v2 (Recyclique → Paheko) selon le **mécanisme d’intégration autorisé** par la hiérarchie **FR40** / **FR5** / **AR9**, avec **preuve** ou mention **inconnu à valider**.

**Périmètre.** Couche **intégration backend** Recyclique → Paheko (**AR8**) ; alignement vocabulaire sync (**FR39**, contrat **1.5**) sans dupliquer les états `a_reessayer`, `en_quarantaine`, `resolu`, `rejete`.

**Non-objectifs.** Implémentation connecteurs, workers, OpenAPI Recyclique détaillé par opération : **Epics 2, 8** et stories dédiées.

---

## 2. Table principale — opération → classification → mécanisme → preuve

Légende **Classification** (exactement une par ligne) :

- **API officielle** — mutation ou lecture via routes documentées sous `/api/…` (cf. liste endpoints).
- **Plugin minimal** — extension Paheko (PHP, signaux, stockage `ext/p/…`) **justifiée** car l’API ne couvre pas le besoin nominal.
- **SQL analyse-admin uniquement** — lecture / export / investigation (**GET** `/api/sql`, exports comptables, requêtes d’administration), **hors** chemin transactionnel métier.
- **Hors scope v2** — pas d’intégration Paheko obligatoire pour cette brique en v2, ou sujet explicitement reporté (évite le scope creep, **AR38**).

| Opération métier majeure (Recyclique v2 → Paheko) | Classification | Mécanisme Paheko (nominal) | Preuve / source | Notes |
|--------------------------------------------------|----------------|----------------------------|-----------------|-------|
| **Représentation comptable par écriture / transaction** (montants, comptes, liens, pièces) | API officielle | `POST` / `POST …/id` `/api/accounting/transaction` ; lectures `GET …/transaction/<id>`, journaux, `GET /api/accounting/charts`, `GET /api/accounting/years/...` | `liste-endpoints-api-paheko.md` § Accounting ; `analyse-brownfield-paheko.md` § 3.2 | Chemin **préféré** pour toute compta structurée exposée en HTTP. Idempotence / clés métier : **voir §4** (gap). |
| **Lecture contrôle comptable** (journal, exercice, export fichier) | API officielle | `GET /api/accounting/years/.../journal`, `.../export/...` | Liste endpoints | Export = lecture ; pas une mutation métier Recyclique. |
| **Push ticket de caisse** (session, lignes, paiements, poids ligne) vers équivalent Paheko | Plugin minimal | Extension **Caisse** (tables `plugin_pos_*`, flux `session_open` / onglets / `session_close`, `POS::syncAccounting` côté Paheko) | `liste-endpoints-api-paheko.md` : **aucune** route `/api/...` pour POS ; `matrice-correspondance-caisse-poids.md` ; `references/migration-paeco/audits/audit-caisse-paheko.md` | **Rationale :** l’API officielle documentée ne expose pas la création de sessions POS, onglets et lignes ; l'alignement métier déjà cadré passe par le **plugin** (push par ticket, clôture déclenchée depuis Recyclique). **Pas** de SQL direct comme nominal (**§5**). |
| **Clôture session caisse terrain → clôture + sync comptable côté Paheko** | Plugin minimal | Même extension Caisse : clôture session + `syncAccounting` | `matrice-correspondance-caisse-poids.md` (ligne clôture) ; audits migration | **Rationale :** même absence d’API POS ; la séquence est **dans** le plugin. Cohérent avec **FR39** (sessions / clôture) et contrat **1.5** (dette sync visible, pas double définition d’états). |
| **Remboursement / annulation / correction** liés au **POS Paheko** ou au **ticket** | Plugin minimal | Extension **Caisse** (flux plugin) **ou**, si arbitrage produit « compta seule », `POST /api/accounting/transaction` | Liste endpoints : compta **oui** ; **inconnu à valider** : détail **remboursement** dans plugin POS (preuve code / doc à compléter en Epic 6) | **Classification provisoire** alignée sur le **même gap API POS** que le ticket nominal ; si la v2 tranche « pas de miroir POS pour les annulations », la branche nominale devient **API officielle** — mettre à jour cette ligne après arbitrage **6-4** / **8**. |
| **Correspondances site / caisse / emplacement Paheko** (**FR41**) | Plugin minimal | Mapping stocké **dans Recyclique** (autorité terrain) ; côté Paheko : `plugin_pos_locations` et config **via plugin / admin Paheko** (pas d’endpoint REST dédié « mapping » dans la liste) | `matrice-correspondance-caisse-poids.md` (emplacements) ; `liste-endpoints-api-paheko.md` (pas de préfixe `mapping`) | **Rationale :** pas d’API REST documentée pour le référentiel de correspondance ; le **plugin** Recyclique (ou module) applique le mapping à la livraison. **FR42** : absence mapping → pas d’écriture silencieuse ; **quarantaine** côté Recyclique (**1.5**). |
| **Réception / flux matière** (poids, catégories, historique) — **sans** obligation d’intégration Paheko (v2) | Hors scope v2 | N/A | **FR29** Recyclique autorité flux matière ; `matrice-correspondance-caisse-poids.md` § 2.1 (pas de sync obligatoire) | Paheko **n’est pas** la source de vérité du flux matière en v2. |
| **Copie optionnelle** réception / stats vers **Saisie au poids** Paheko | Plugin minimal | Module **`saisie_poids`** (`module_data_saisie_poids`, UI / sync interne module) | `analyse-brownfield-paheko.md` § Addendum saisie_poids ; pas d’endpoint `/api/user/...` équivalent pour ce stockage JSON | **Rationale :** pas d’API HTTP documentée pour CRUD métier de ce module ; toute copie = **plugin** (signaux / écriture contrôlée) ou action manuelle. |
| **Adhérents / membres** (création, mise à jour, abonnement, import CSV) | API officielle | `POST /api/user/new`, `POST /api/user/<id>`, `POST .../subscribe`, `POST|PUT /api/user/import` | Liste endpoints § User | Niveaux **write** / **admin** selon route ; alignement **Epic 9** (adhérents min). |
| **Import abonnements / services (CSV)** | API officielle | `POST|PUT /api/services/subscriptions/import` | Liste endpoints § Services | **admin** ; usage plutôt **batch** / admin. |
| **Pièces jointes liées à une transaction comptable** | API officielle (contraint) | `POST /api/accounting/transaction` avec `move_attachments_from` (répertoire **déjà** dans stockage autorisé) | Liste endpoints ; `analyse-brownfield-paheko.md` § 3.3 | **Rationale API :** pas besoin de plugin **si** le fichier est déjà dans une racine autorisée (`setAllowedFilesRoot`). **Gap** : upload générique (**§4**). |
| **Publication / consultation pages web / pièces jointes site** | API officielle (lecture) | `GET /api/web/...` | Liste endpoints § Web | Utile pour liens documentaires ; hors flux caisse nominal. |
| **Investigation données, exports ad hoc, contrôle admin** | SQL analyse-admin uniquement | `GET` / `POST` `/api/sql` en **lecture** ou export ; schéma `references/dumps/schema-paheko-dev.md` pour **comprendre** le modèle | Liste endpoints § SQL ; story 1.6 (ne pas substituer schéma à l’API pour le nominal) | **Uniquement** analyse, contrôle, admin — **FR40**. **Interdit** comme chemin nominal de mutation métier (**§5**). |
| **Déclarations éco-organismes** (production déclarative, mappings officiels) | Hors scope v2 | N/A côté Paheko obligatoire | **FR59**, artefacts migration (données déclaratives dans Recyclique) | Paheko peut avoir une **copie** optionnelle stats (Saisie au poids) ; pas d’intégration API nominale requise en v2. |
| **HelloAsso / rapprochement adhérents** | Hors scope v2 (intégration Paheko) | N/A pour **cette** matrice ; API Paheko **user** si besoin de refléter un membre | **FR47**, **Epic 9** | Décision d’architecture HelloAsso **avant** implémentation large. |
| **Upload fichier générique** (hors CSV user/services, hors `move_attachments_from`) | Plugin minimal | **WebDAV** `/dav/` (hors contrat nominal Recyclique à trancher) ou **endpoint dédié** dans un **plugin** Recyclique | `analyse-brownfield-paheko.md` § 3.3 — **pas** d’upload générique `/api` documenté | **Rationale :** l’API officielle ne fournit pas l’upload générique ; WebDAV n’est pas une « API métier » au sens **liste-endpoints** ; solution nominale v2 = **plugin** (ou design sans upload distant). Conséquence détaillée **§4**. **Pas** de `/api/sql` en écriture. |

---

## 3. Synthèse par domaine (Epics 6–9 / 8)

| Domaine | Rappel classification dominante | Renvoi |
|---------|----------------------------------|--------|
| Caisse v2 (vente, clôture, remboursement) | POS : **plugin minimal** ; compta directe possible : **API officielle** | §2 ; Epic **6** ; sync **Epic 8** |
| Réception v2 | **Hors scope v2** (obligatoire Paheko) ; optionnel Saisie au poids : **plugin** | §2 ; Epic **7** |
| Sync / quarantaine / idempotence | Mécanisme transport HTTP / plugin + **outbox** Recyclique (**1.5**, **AR11**) | **1.5** ; Epic **8** |
| Adhérents / services | **API officielle** | §2 ; Epic **9** |

---

## 4. Gaps API réels et inconnues — conséquence produit / backlog

| Gap / inconnu | État | Conséquence produit | Backlog (indicatif) |
|---------------|------|---------------------|---------------------|
| **Aucune API REST documentée pour le module Caisse** (sessions, tickets, lignes, paiements) | Confirmé | Sans **plugin**, pas de miroir fidèle du POS Paheko ; compta seule via `/api/accounting/transaction` ne reproduit pas à elle seule le modèle POS | **Epic 8** (connecteur) + maintien **plugin minimal** ; préciser dans design technique |
| **Idempotence / clés duplicatas** : pas de mention standard dans l’inventaire API Paheko (équivalent `Idempotency-Key`) | À valider | Risque doublons à la **relivraison** (**1.5**, **AR24**) ; corrélation et stratégie côté Recyclique + détection / quarantaine | **8-2** idempotence retries ; **8-5** corrélation ; spike version Paheko cible |
| **Schéma corps `POST /api/accounting/transaction`** (champs obligatoires, remboursements, liens) | À valider | Erreurs de mapping → **en_quarantaine** ; besoin de jeux de test et doc métier | **Epic 8** + doc technique ; tests contrat une fois version figée |
| **Pas d’upload fichier générique** via `/api` | Confirmé | Pas de PJ « upload direct » dans le flux nominal HTTP sans WebDAV / plugin / `move_attachments_from` | **Epic 8** ou **plugin** `recyclique` (endpoint dédié) ; **FR5** |
| **Module Saisie au poids** sans surface `/api` métier | Confirmé | Toute **copie** depuis Recyclique = plugin / batch / manuel | **Epic 7** / **8** si option « copie Paheko » retenue |
| **Correspondances FR41** sans endpoint dédié | Confirmé | Mapping **dans Recyclique** + application à la livraison (plugin) ; **FR42** si invalide | **8-3** correspondances site/caisse/emplacements |
| **Remboursement POS vs écriture comptable seule** | À valider | Parcours terrain (Epic **6-4**) et risque comptable | **6-4** + **8** ; mettre à jour §2 après arbitrage |
| **Version Paheko cible** (compatibilité API, plugins) | À valider | CI contrat / tests bout-en-bout | **Epic 10** / **1.1** mode référence Paheko ; verrouillage version |

---

## 5. Garde-fous explicites (FR5, FR40, AR9)

- **Interdiction du nominal « SQL écriture » / mutation métier via `/api/sql`** : toute mutation comptable ou POS doit passer par **API officielle** (`/api/accounting/...`, `/api/user/...`, etc.) ou par **plugin minimal** documenté — **pas** par requêtes SQL de production (**FR5**, **FR40**).
- **`/api/sql`** et accès schéma (**`references/dumps/schema-paheko-dev.md`**) : **analyse, contrôle, administration, compréhension du modèle** uniquement (**AR9**, story 1.6).
- **Plugin** : autorisé **uniquement** lorsque la **preuve** montre l’**insuffisance** de l’API officielle pour l’opération (ex. Caisse POS, option Saisie au poids).
- Cohérence **1.4** : la matrice **ne** définit **pas** de nouvelles routes Recyclique ; toute exposition HTTP reste **OpenAPI** reviewable (**AR39**).

---

## 6. Références

- `references/paheko/liste-endpoints-api-paheko.md`, `references/paheko/analyse-brownfield-paheko.md`
- `references/migration-paeco/audits/index.md` et audits caisse / poids / matrice
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`
- `_bmad-output/planning-artifacts/epics.md` (**FR5**, **FR40**, **FR41**, **AR8**, **AR9**, **FR39**)

---

## 7. Données sensibles

Aucun secret, credential, PII réel dans ce document.
