# Brief de révision — Ordre de construction JARVOS_recyclique

**Date :** 2026-02-26  
**Contexte :** Epic 1 livré. Epic 2 revert complet (2.1 effacé). Trois artefacts de vision architecturale produits (08, 09, 10). Ce brief propose l'**ordre logique de construction** couche par couche, le confronte à l'ordre actuel des epics, et liste ce qu'il faut remanier.

---

## 1. Principe directeur : construire comme une maison

On ne pose pas les fenêtres avant les murs, ni les murs avant les fondations.  
Dans une application, ça se traduit ainsi :

> **Référentiels d'abord, comportements ensuite, synchronisations à la fin.**

Un « référentiel » est une entité qui existe indépendamment de tout workflow : sites, postes de caisse, catégories, utilisateurs, presets. Tant qu'ils ne sont pas livrés (modèle BDD + API CRUD), aucune story métier ne peut s'y appuyer sans supposer leur existence.

---

## 2. Propositions des couches de construction

### Couche 0 — Socle technique (FAIT — Epic 1)

| Ce qui est livré |
|------------------|
| Stack Docker (RecyClique, Paheko, PostgreSQL, Redis) |
| Frontend Vite React TS + structure par domaine |
| FastAPI structure, health check, montage statics |
| Loader modules (TOML, ModuleBase, EventBus, slots) |
| Story 1.5 (déploiement Docker vérifié) |

**Résultat :** l'environnement tourne. On peut maintenant poser les briques métier les unes sur les autres.

---

### Couche 1 — Référentiels métier (brique manquante — à poser EN PREMIER)

Ces entités sont **nécessaires à presque tout le reste**. Elles n'ont pas de dépendance entre elles (sauf presets → catégories).

| Entité | Tables BDD | API minimale | Dépend de |
|--------|-----------|--------------|-----------|
| **Sites** | `sites` | CRUD /v1/sites | — |
| **Postes de caisse** | `cash_registers` | CRUD /v1/cash-registers | sites |
| **Catégories** | `categories` | CRUD /v1/categories (hiérarchie, visibilité) | — |
| **Presets** | `preset_buttons` | CRUD /v1/presets | catégories |

**Références :** artefact 08 (§ 2.2 Sites et postes, § 2.5 Catégories, § 2.6 Presets), artefact 09 (§ 3.4 Sites, § 3.8 Postes caisse, § 3.9 Catégories, § 3.12 Presets), `references/ancien-repo/checklist-import-1.4.4.md`.

**Livrable = migration/copie** depuis RecyClique 1.4.4 (modèles + API) selon la checklist import.

---

### Couche 2 — Identité et authentification

On peut modéliser les utilisateurs **dès la couche 1** (table `users` + groupes/permissions) mais le workflow auth complet (JWT, PIN, permissions API) vient en couche 2.

| Ce qu'on livre | Dépend de |
|----------------|-----------|
| Modèle `users`, `groups`, `permissions`, `user_groups`, `group_permissions` | Couche 0 (DB ready) |
| POST /v1/auth/login (JWT), logout, refresh, forgot/reset password | users |
| GET/PUT /v1/users/me (profil, password, PIN) | users |
| POST /v1/auth/pin (connexion caisse) | users + PIN |
| Permissions API (middleware vérifiant le token et les droits) | groups/permissions |
| Admin utilisateurs (CRUD, approve/reject, groupes) | users + groups |

**Références :** artefact 08 (§ 2.1 Utilisateurs), artefact 09 (§ 3.2 Auth, § 3.3 Utilisateurs), artefact 10 (§ 4 Auth), audit caisse 1.4.4, checklist import.

---

### Couche 3 — Démarrage de postes (caisse et réception)

**Dépend de :** couche 1 (sites + cash_registers) + couche 2 (auth + permissions).  
C'est ici que la story 2.2 actuelle aurait dû atterrir — mais elle suppose les couches 1 et 2 déjà en place.

| Ce qu'on livre | Dépend de |
|----------------|-----------|
| Démarrer un poste caisse (compte admin, choix site/caisse) | cash_registers + auth |
| Mode caisse verrouillé (menu caisse uniquement) | postes + permissions |
| Déverrouillage PIN (opérateur habilité) | users/PIN + postes |
| Démarrer un poste réception | auth + permissions |
| SSO documentation (story légère, phase ultérieure) | — |

**Références :** artefact 08 (§ 2.2 Postes), artefact 09 (§ 3.8 Postes caisse), artefact 10 (§ 5.1 Dashboard caisses, § 5.2 Ouverture session), audit caisse 1.4.4.

---

### Couche 4 — Canal push Paheko (worker + config)

Peut démarrer **en parallèle** des couches 2 et 3. Ne dépend pas du métier caisse, seulement de la stack technique (Redis, Paheko joignable).

| Ce qu'on livre | Dépend de |
|----------------|-----------|
| Config canal push (endpoint, secret, retry) — story 3.1 actuelle | Couche 0 (Docker, Redis) |
| Worker Redis Streams (consumer qui poste vers le plugin Paheko) | config canal + Redis |

**Référence :** artefact 09 (§ 4 Synthèse cas RecyClique → Paheko), Epic 3 story 3.1 actuelle.

---

### Couche 5 — Caisse et sync Paheko

**Dépend de :** couche 1 (cash_registers, catégories, presets) + couche 2 (auth) + couche 3 (postes démarrés) + couche 4 (canal push prêt).

| Ce qu'on livre | Dépend de |
|----------------|-----------|
| Ouvrir session caisse (fond de caisse, multi-sites/multi-caisses) → push Paheko (création session) | Couches 1-4 |
| Enregistrer ventes (tickets, lignes, catégories, poids, paiements multi-moyens) → push par ticket | Couches 1-4 |
| Clôturer session (comptage, totaux, écart) → clôture Paheko + syncAccounting | Couches 1-4 |
| Saisie hors ligne + sync (optionnel v1) | Couches 1-4 |

**Références :** artefact 08 (§ 2.3 Sessions et ventes), artefact 09 (§ 3.6 Ventes, § 3.7 Sessions), artefact 10 (§ 5 Caisse), audit caisse 1.4.4, checklist import.

---

### Couche 6 — Réception et flux matière

**Dépend de :** couche 1 (catégories) + couche 2 (auth) + couche 3 (postes réception).  
Pas de dépendance sur Paheko (couche 4) : récep = source de vérité RecyClique, pas de push obligatoire.

| Ce qu'on livre | Dépend de |
|----------------|-----------|
| Ouvrir poste réception | Couche 3 |
| Créer tickets de dépôt + lignes (poids, catégorie, destination) | Couche 1 (catégories) + postes |
| Export CSV, stats live réception | Couche 6 elle-même |

**Références :** artefact 08 (§ 2.4 Réception), artefact 09 (§ 3.10 Réception), artefact 10 (§ 6 Réception), audit réception 1.4.4, checklist import.

---

### Couche 7 — Correspondance détaillée RecyClique ↔ Paheko (mapping)

**Dépend de :** couche 1 + BDD stabilisée + instance dev en place (condition pour les HITL 3.2/3.3 de l'Epic 3 actuel). C'est le chantier de découverte qui **ne peut pas démarrer avant** que les référentiels et la caisse aient tourné.

| Ce qu'on livre | Dépend de |
|----------------|-----------|
| Modèle et stockage du mapping (moyens de paiement, catégories, sites → Paheko) | Couches 1-5 stables |
| Interface/API d'admin du mapping | Modèle mapping |

**Références :** Epic 3 stories 3.2/3.3 actuelles (avec HITL obligatoires avant).

---

### Couche 8 — Administration et rapports

**Dépend de :** toutes les couches précédentes. On administre ce qui existe.

| Ce qu'on livre |
|----------------|
| Écrans admin complets (sessions, rapports, santé, logs, paramètres, BDD) |
| Vie associative (placeholders v1) |
| Accès compta via Paheko (doc/lien) |

---

### Couche 9 — Données déclaratives et éco-organismes

**Dépend de :** couche 6 (réception = source de vérité poids) + couche 5 (flux ventes).

---

### Couche 10 — Extension points (en parallèle ou fin)

Stubs `LayoutConfigService`, `VisualProvider` — peut se faire en parallèle de n'importe quelle couche une fois le frontend structure en place.

---

## 3. Tableau récapitulatif : couches vs epics actuels

| Couche | Contenu | Epic actuel | Problème actuel |
|--------|---------|-------------|-----------------|
| **0** | Socle Docker, frontend, FastAPI | **Epic 1** ✓ FAIT | — |
| **1** | Référentiels : sites, cash_registers, catégories, presets | **Absent** dans l'ordre actuel | **Trou critique** : aucune story ne livre ces référentiels avant qu'ils soient supposés exister |
| **2** | Auth JWT, users, PIN, permissions | **Epic 2** (stories 2.1–2.5) | Story 2.1 OK pour JWT ; users model probablement dans 2.1 aussi (à vérifier) |
| **3** | Démarrage postes (caisse + réception), mode verrouillé | **Epic 2** (story 2.2, 2.3, 2.4) | Dépend de la couche 1, qui n'existait pas → cause du revert |
| **4** | Canal push Paheko (worker, config) | **Epic 3** (story 3.1) | OK — story 3.1 indépendante ; bien identifiée |
| **5** | Caisse + sync Paheko | **Epic 4** | Dépend de la couche 1 (cash_registers, catégories, presets) + couche 4 ; implicitement supposés |
| **6** | Réception | **Epic 5** | Dépend de la couche 1 (catégories) ; implicitement supposée |
| **7** | Correspondance mapping | **Epic 3** (stories 3.2/3.3) | Bien encadrée par HITL ; dépend de BDD + dev stable → OK mais ordre à valider |
| **8** | Admin, compta Paheko, vie asso | **Epic 6** | Dépend de tout le reste ; ordre OK |
| **9** | Données déclaratives éco-orgs | **Epic 7** | Dépend de couches 5+6 ; ordre OK |
| **10** | Extension points / stubs | **Epic 8** | Peut être parallèle ; OK |

---

## 4. Ce qu'il faut remanier

### 4.1 Dans `epics.md`

#### Ajout urgent : story (ou groupe de stories) **Couche 1 — Référentiels métier**

**Option A (recommandée)** : Ajouter un **Epic 1.5** (ou prolonger l'Epic 2 avec une section « Referential foundation ») contenant les stories :

| Story | Titre | Dépend de |
|-------|-------|-----------|
| **R.1** | Sites : modèle BDD + API CRUD (`/v1/sites`) | Epic 1 |
| **R.2** | Postes de caisse : modèle BDD + API CRUD (`/v1/cash-registers`) | R.1 (sites) |
| **R.3** | Catégories : modèle BDD + API CRUD + hiérarchie + visibilité (`/v1/categories`) | Epic 1 |
| **R.4** | Presets : modèle BDD + API CRUD (`/v1/presets`) | R.3 (catégories) |

Chaque story : livrable = **migration/copie** depuis 1.4.4 selon checklist import. Références : artefact 08, artefact 09, audit caisse/réception 1.4.4, data-models-api 1.4.4.

**Option B** : Numéroter ces stories dans l'Epic 2 comme 2.0a, 2.0b, 2.0c, 2.0d (avant la story 2.1 JWT).

#### Restructuration Epic 2

| Avant | Après |
|-------|-------|
| Story 2.1 : JWT (terrain) | **Inchangée** — mais ajouter prérequis : couche 1 (users table = R.1 ou modèle dans 2.1 lui-même). |
| Story 2.2 : Démarrer poste | **Prérequis explicite** : R.1 Sites + R.2 Postes livrés. Contenu OK sinon. |
| Stories 2.3 à 2.5 | Inchangées. |

#### Epics 4, 5 : ajouter prérequis de couche 1

- **Epic 4** : préciser « Prérequis : R.1 Sites, R.2 Postes caisse, R.3 Catégories, R.4 Presets livrés. Canal push (Epic 3 story 3.1) opérationnel. »
- **Epic 5** : préciser « Prérequis : R.3 Catégories livrées. Poste réception (story 2.2) opérationnel. »

#### Ajouter règle refactor + table des référentiels en tête

- **Règle refactor** : pour toute story métier = livrable migration/copie 1.4.4 selon `references/ancien-repo/checklist-import-1.4.4.md`.
- **Table des référentiels** : qui livre quoi en premier (R.1 → R.4 + story qui les referencing).
- **Références artefacts 08, 09, 10** : à ajouter dans la section « Décisions architecturales de référence ».

---

### 4.2 Dans le PRD (`prd.md`)

Pas de réécriture. Ajouts ciblés :

| Section | Ajout |
|---------|-------|
| **Product Scope / MVP** | Phrase : « Le MVP suit un ordre de construction en couches (référentiels → auth → postes → caisse/réception → admin). Voir brief révision `references/artefacts/2026-02-26_11_brief-revision-ordre-construction.md`. » |
| **Implementation Considerations** | Renforcer : « Le livrable des stories métier (caisse, réception, auth, admin) est une **migration/copie** depuis 1.4.4, selon `references/ancien-repo/checklist-import-1.4.4.md`. » |
| **Références projet** | Ajouter les artefacts 08, 09, 10 et ce brief (11). |

---

### 4.3 Dans l'architecture (`architecture.md`)

Ajouts courts :

| Section | Ajout |
|---------|-------|
| **Project Context Analysis** ou **Cross-Cutting Concerns** | Référencer les artefacts 08 (qui stocke quoi), 09 (périmètre API v1), 10 (traçabilité écran → API) comme sources de vérité pour la répartition des données. |
| **Implementation Handoff** ou nouvelle sous-section | Ordre de construction en couches (résumé du §2 de ce brief) — pour que les agents/dev aient l'ordre sous les yeux. |

---

## 5. Synthèse : ordre de construction validé

```
Couche 0  [FAIT]  Epic 1 — Socle Docker/FastAPI/Frontend
Couche 1  [URGENT] Référentiels : Sites → Postes caisse → Catégories → Presets
Couche 2          Auth : Users, JWT, PIN, Permissions (Epic 2 stories 2.1, 2.3)
Couche 3          Postes : Démarrage caisse/réception, mode verrouillé, PIN (Epic 2 stories 2.2, 2.4)
Couche 4  [//]    Canal push Paheko (Epic 3 story 3.1) — peut aller en parallèle de 2-3
Couche 5          Caisse + sync (Epic 4) — dépend de 1+2+3+4
Couche 6          Réception (Epic 5) — dépend de 1+2+3
Couche 7          Mapping correspondance (Epic 3 stories 3.2+3.3) — dépend de 5+BDD stable
Couche 8          Admin/compta/vie asso (Epic 6) — dépend de tout
Couche 9          Déclaratif éco-orgs (Epic 7) — dépend de 5+6
Couche 10 [//]    Extension points/stubs (Epic 8) — parallèle possible
```

---

## 6. Questions à trancher avant de mettre à jour epics.md

1. **Couche 1 — Emplacement :** Stories R.1–R.4 dans un **Epic 1.5 dédié** ou dans **Epic 2 en stories 2.0a–2.0d** ? (Recommandation : stories 2.0a–2.0d dans Epic 2 — moins de friction, dépendances clairement lisibles dans le même epic.)
2. **Catégories :** L'admin complet des catégories (hiérarchie, import/export) est-il couche 1 (référentiel) ou couche 8 (admin) ? (Recommandation : CRUD de base + hiérarchie en couche 1 ; import/export et raffinements admin en couche 8.)
3. **Canal push (couche 4) :** Doit-il être livré **avant** l'ouverture de session caisse (couche 5 stricte) ou **en même temps** (les deux en parallèle, on intègre au moment de la story 4.1) ? (Recommandation : canal push en précondition de la story 5 « Ouvrir session » → tester le push dès le premier ticket.)

---

*Ce brief est à valider par Strophe. Une fois validé, il pilote la mise à jour de `epics.md`, `prd.md` et `architecture.md` (Sprint Change Proposal `_bmad-output/planning-artifacts/sprint-change-proposal-2026-02-26.md`).*
