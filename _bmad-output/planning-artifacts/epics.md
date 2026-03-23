---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/research/technical-sso-transversal-recyclique-paheko-multi-structures-research-2026-02-28.md
  - references/artefacts/2026-02-26_01_analyse-separation-frontend-backend-recyclic.md
  - references/artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md
  - references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md
  - references/artefacts/2026-02-26_08_catalogue-qui-stocke-quoi-recyclic-paheko.md
  - references/artefacts/2026-02-26_09_perimetre-api-recyclique-v1.md
  - references/artefacts/2026-02-26_10_tracabilite-ecran-donnees-appels-api.md
  - references/artefacts/2026-02-26_11_brief-revision-ordre-construction.md
  - references/ancien-repo/checklist-import-1.4.4.md
  - references/ou-on-en-est.md
  - references/versioning.md
lastEdited: '2026-03-16'
editHistory:
  - date: '2026-03-16'
    changes: >
      Correct Course approuve (audit terrain 2026-03-16). Ajout Epic 19 "Correction de cap
      post-audit terrain 2026-03-16" (13 stories : 19.1-19.13). P0 : 19.1 import categories
      (parent_id). P1 : 19.2 admin categories Creer/Modifier, 19.3 reception redirection,
      19.4 affichage nom user, 19.5 page non blanche, 19.6 audit caisse post-categories,
      19.7 presets, 19.8 raccourcis AZERTY, 19.9 disposition 1.4.4. P2 : 19.10 Paheko port 8080,
      19.11 dashboard notifications, 19.12 compteur connectes, 19.13 sessions filtres/export.
      Backlog P3 documente dans la section. Discordance Epic 18/terrain documentee.
      Source : sprint-change-proposal-2026-03-16.md.
  - date: '2026-03-02'
    changes: >
      Ajout Epic 18 "Operationnalisation terrain" (10 stories : 18.1-18.10).
      Domaine BDD admin (P0) : 18.1 audit delta, 18.2 refactor backend (pg_dump/pg_restore),
      18.3 refactor frontend AdminDbPage.
      Domaine Caisse (P0) : 18.4 audit inventaire exhaustif, 18.5 layout/header/KPI,
      18.6 grille categories/presets, 18.7 keyboard shortcuts AZERTY, 18.8 ticket/finalisation/
      paiements, 18.9 ouverture/fermeture session. P1 : 18.10 caisse virtuelle/saisie differee.
      Toutes les stories referencent les fichiers source 1.4.4 et appliquent la regle brownfield
      Copy/Consolidate/Security.
  - date: '2026-03-01'
    changes: >
      Ajout Epic 15 "Conformite visuelle et fonctionnelle — parite 1.4.4" (6 stories).
      Contexte : audit complet revele que les epics 11/13 ont declare "done" sans implementation
      visuelle reelle. La nouvelle app n'a jamais ressemble a la 1.4.4. Epic 15 couvre :
      fix URL invalides (bloquant), shell global vert + nav horizontale, dashboard caisse,
      saisie vente caisse, page reception, dashboard admin.
editHistory:
  - date: '2026-02-28'
    changes: >
      Correct Course approuve: ajout Epic 14 "Operationalisation identite unifiee RecyClique-Paheko"
      (gate faisabilite OIDC, IdP commun, config Paheko/RecyClique, E2E auth, runbooks).
  - date: '2026-02-27'
    changes: >
      Renforcements qualité refactor (Create Epic/Story) : dans Règle refactor brownfield — « Copie » = réécriture/adaptation (pas collage) ;
      preuve checklist = trace par écran dans Completion Notes (Copy / Consolidate / Security). Même exigences dans Epic 11 « Qualité refactor ».
  - date: '2026-02-27'
    changes: >
      Ajout Epic 11 « Conformité visuelle 1.4.4 » avec 6 stories (Auth, Caisse, Réception, Admin 1, Admin 2, Admin 3).
      Chaque story : AC = aligner le rendu des écrans du domaine sur le code 1.4.4 + checklist import.
      Admin scindé en 3 stories pour fenêtre de contexte raisonnable (~100k tokens). 29 écrans au total.
  - date: '2026-02-26'
    changes: >
      Refonte complète de l'ordre des epics (Correct Course). Epic 1 inchangé.
      Ajout Epic 2 Référentiels métier (couche manquante). Réorganisation en 10 epics
      selon l'ordre de construction en couches (référentiels → auth → postes → canal push →
      caisse → réception → correspondance → admin → déclaratif → extension points).
      Ajout sections "Ordre de construction", "Règle refactor brownfield", "Table des référentiels".
      Références artefacts 08, 09, 10 et checklist import dans toutes les epics/stories concernées.
---

# JARVOS_recyclique - Epic Breakdown

## Overview

Ce document fournit le découpage complet en epics et stories pour JARVOS_recyclique, construit **en couches de dépendances** (fondations → métier → synchronisation → administration). La cible est la **première version en production** (parité 1.4.4 + sync Paheko, sans rupture).

**Epic 1 livré.** Le reste suit l'ordre ci-dessous : chaque couche dépend de la précédente. On ne commence pas par les murs avant les fondations.

**Human in the Loop (HITL)** : chaque epic métier (3 à 10) contient une section « Human in the Loop — moments possibles ». L'Epic 7 (correspondance) a des HITL **obligatoires**. Les autres epics ont des HITL **recommandés** ou **optionnels**. L'Epic 11 (Conformité visuelle 1.4.4) n'a pas de HITL dédié (travail d'alignement rendu).

---

## Décisions architecturales de référence

**S'appliquent à toutes les épiques et stories.** Tout agent ou workflow travaillant sur le projet doit avoir ces décisions sous les yeux.

| Décision | Contenu court |
|----------|----------------|
| **Convention tests frontend** | Tests **co-locés** : `*.test.tsx` (ou `*.test.ts`) à côté du composant. Pas de dossier `__tests__` au niveau module. |
| **Outil tests frontend** | **Vitest + React Testing Library + jsdom**. Scripts : `npm run test` (watch), `npm run test:run` (CI). E2E hors périmètre v0.1 ; si E2E plus tard = **Playwright**. |
| **Versions stack** | Python 3.12, Node 20 LTS. Figées dans le Dockerfile et README. PostgreSQL 16, Redis 7, Paheko (image officielle). |
| **Loader modules et slots** | `api/config/modules.toml`, `api/core/modules/`, `api/workers/`, `frontend/src/shared/slots/`. Ne pas recréer une autre convention. |
| **Styling / UI frontend** | **Mantine** (alignement RecyClique 1.4.4). Pas de Tailwind ni autre lib UI sans décision. |
| **Module correspondance (FR13b)** | Reporté à l'Epic 7 (stories 7.1/7.2). Ne pas trancher le détail avant BDD + instance dev + analyste. |

**Références uniques :**
- Architecture complète : `_bmad-output/planning-artifacts/architecture.md`
- Checklist v0.1 : `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`
- Rétro Epic 1 : `_bmad-output/implementation-artifacts/epic-1-retro-2026-02-26.md`

---

## Ordre de construction — couches de dépendances

```
Couche 0  [FAIT]  Epic 1  — Socle Docker / FastAPI / Frontend / Modules
Couche 1          Epic 2  — Référentiels métier (Sites, Postes, Catégories, Presets)
Couche 2          Epic 3  — Authentification, Users, PIN, RBAC, Démarrage postes
Couche 3  [//]    Epic 4  — Canal push Paheko (parallèle possible avec Epic 3)
Couche 4          Epic 5  — Caisse et synchronisation (dépend de 1+2+3)
Couche 5          Epic 6  — Réception et flux matière (dépend de 1+2)
Couche 6          Epic 7  — Correspondance et mapping (dépend de Epic 5 stable + HITL)
Couche 7          Epic 8  — Administration, compta v1, vie associative
Couche 8          Epic 9  — Données déclaratives et éco-organismes
Couche 9  [//]    Epic 10 — Extension points / stubs (parallèle possible)
Epic 11           Conformité visuelle 1.4.4 (29 écrans ; parallèle possible une fois les écrans livrés par domaine)
```

**Règle de précédence :** Une story ne peut pas être commencée si une story d'une couche inférieure dont elle dépend n'est pas livrée. Les trous de dépendance sont la cause première du revert Epic 2. La table des référentiels ci-dessous formalise cette règle.

---

## Règle refactor brownfield

> **Pour toute story qui touche au métier caisse, réception, auth, admin, catégories :**
> le livrable est une **migration** depuis RecyClique 1.4.4 selon `references/ancien-repo/checklist-import-1.4.4.md` (copy + consolidate + security). Ce n'est **pas** une conception from scratch ni un simple copier-coller : à chaque import, appliquer une **analyse de cohérence** du code (alignement architecture, pas de doublon) et une **analyse de sécurité** (secrets, audit fichiers, CVE dépendances). Pour toute story qui livre des **écrans** : le rendu final doit être **identique** aux écrans 1.4.4 correspondants (référence audits et artefact 10).

**« Copie » = réécriture / adaptation (pas collage de fichier)**  
Pour chaque écran ou bloc importé : identifier dans l'ancien repo 1.4.4 les composants et styles concernés (traçabilité Copy), puis les **réécrire ou adapter** dans la stack actuelle (Mantine, structure `frontend/src/`) en appliquant Consolidate et Security — pas de collage de fichier tel quel.

**Preuve que la checklist est faite**  
Pour que l'import soit considéré terminé, une **trace** doit exister par écran (ou par lot d'écrans homogène) : dans les Completion Notes de la story ou en commentaire livrable, au minimum une ligne par bloc Copy / Consolidate / Security — ex. : **Copy** : source 1.4.4 identifiée (fichier ou chemin) ; **Consolidate** : dépendances ajoutées / pas de doublon ; **Security** : pas de secret en dur, audit rapide des fichiers, `npm audit` OK (ou équivalent). Sans cette trace, la story n'est pas acceptée comme conforme.

| Domaine | Références |
|---------|------------|
| Caisse (sessions, ventes, clôture) | `references/migration-paeco/audits/audit-caisse-recyclic-1.4.4.md`, `references/ancien-repo/v1.4.4-liste-endpoints-api.md`, `references/ancien-repo/data-models-api.md` |
| Réception (postes, tickets, lignes) | `references/migration-paeco/audits/audit-reception-poids-recyclic-1.4.4.md` |
| Auth, Users, Permissions | `references/ancien-repo/data-models-api.md`, `references/ancien-repo/fonctionnalites-actuelles.md` |
| Catégories, Presets | `references/ancien-repo/data-models-api.md`, `references/ancien-repo/v1.4.4-liste-endpoints-api.md` |
| Correspondance RecyClique ↔ Paheko | `references/migration-paeco/audits/matrice-correspondance-caisse-poids.md`, `references/artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md` |

**Artefacts de vision architecturale (à charger pour toute story métier) :**

| Artefact | Rôle |
|----------|------|
| `references/artefacts/2026-02-26_08_catalogue-qui-stocke-quoi-recyclic-paheko.md` | Qui stocke quoi (RecyClique vs Paheko), source de vérité par entité |
| `references/artefacts/2026-02-26_09_perimetre-api-recyclique-v1.md` | Endpoints v1 par domaine, source données, cas RecyClique → Paheko |
| `references/artefacts/2026-02-26_10_tracabilite-ecran-donnees-appels-api.md` | Pour 29 écrans : route, permissions, données, appels API, actions → endpoints |

---

## Table des référentiels — story de livraison

> Avant de commencer une story qui suppose l'existence d'un référentiel, vérifier que la story qui le livre est marquée done.

| Référentiel | Table BDD | Livré par | Utilisé par |
|-------------|-----------|-----------|-------------|
| Sites | `sites` | Story **2.1** | Stories 2.2, 3.4, 5.1 |
| Postes de caisse | `cash_registers` | Story **2.2** | Stories 3.4, 5.1 |
| Catégories | `categories` | Story **2.3** | Stories 2.4, 5.2, 6.2, 9.1 |
| Presets | `preset_buttons` | Story **2.4** | Story 5.2 |
| Users + roles | `users`, `groups`, `permissions` | Story **3.1** | Stories 3.2–3.6, toutes les stories auth |

---

### Functional Requirements

FR1: Un opérateur habilité peut démarrer une session de caisse (avec fond de caisse) sur un poste donné.
FR2: Un opérateur habilité peut enregistrer des ventes (lignes, catégories, quantités, prix, poids éventuels, paiements multi-moyens) pendant la session.
FR3: Un opérateur habilité peut clôturer la session de caisse (comptage physique, totaux, écart éventuel) et déclencher le contrôle et la sync comptable.
FR4: Le système peut restreindre l'accès au menu caisse uniquement lorsque le poste est en mode caisse (écran verrouillé sur la caisse).
FR5: Une personne habilitée peut déverrouiller la session (ou quitter le mode caisse) en saisissant son code PIN.
FR6: Le système peut gérer plusieurs lieux et plusieurs caisses (multi-sites, multi-caisses).
FR7: Le système peut pousser chaque ticket de vente vers Paheko (push par ticket, file résiliente) sans double saisie compta.
FR7b: Le système peut permettre la saisie caisse hors ligne (buffer local) et synchroniser les tickets vers Paheko au retour en ligne (file Redis Streams côté backend).
FR8: Un opérateur peut ouvrir un poste de réception et créer des tickets de dépôt.
FR9: Un opérateur peut saisir des lignes de réception (poids, catégorie, destination) sur un ticket.
FR10: Le système conserve la réception comme source de vérité matière/poids (aucune sync manuelle obligatoire vers Paheko).
FR11: Le système peut synchroniser les données caisse (sessions, tickets, lignes, paiements) vers Paheko à la clôture (contrôle totaux, syncAccounting). Une session RecyClique = une session Paheko par caisse.
FR12: Un responsable compta peut administrer la compta via l'interface Paheko (v1) en attendant les interfaces RecyClique.
FR13: (Post-MVP) Un responsable compta peut effectuer les opérations compta depuis RecyClique.
FR13b: Le système peut gérer un mapping prédéfini entre RecyClique et Paheko (moyens de paiement, catégories, sites/emplacements) ; périmètre à figer lorsque BDD et instance dev sont stabilisées.
FR14: Un administrateur peut démarrer un poste (caisse ou réception) avec un compte administrateur (ou équivalent).
FR15: Le système peut associer un code PIN à chaque personne habilitée à la caisse pour le déverrouillage de session.
FR16: (Phase initiale) Le système peut authentifier les utilisateurs terrain via JWT (FastAPI) et les utilisateurs admin via Paheko (auth séparée).
FR17: (Phase ultérieure) Le système peut offrir un SSO entre RecyClique et Paheko (à documenter).
FR18: Un admin technique peut déployer et configurer l'instance via Docker Compose.
FR19: Un admin technique peut configurer le canal push RecyClique → Paheko (endpoint, secret, résilience).
FR20: Le système peut conserver les tickets non poussés en file (Redis Streams) et les repousser après indisponibilité de Paheko (retry sans perte).
FR21: Un utilisateur peut accéder à des écrans ou placeholders « vie associative » depuis RecyClique.
FR22: Le système peut produire et conserver les données déclaratives (poids, flux, catégories, périodes) dans RecyClique pour les déclarations éco-organismes.
FR23: (Post-MVP) Le système peut exposer un module décla éco-organismes (exports, multi-éco-organismes) depuis RecyClique.
FR24: Le système peut charger et activer des modules RecyClique via configuration (TOML, ModuleBase, EventBus Redis Streams, slots React).
FR25: Le système peut faire coexister des plugins Paheko et des modules RecyClique.
FR26: Le système peut exposer des points d'extension (LayoutConfigService, VisualProvider) avec implémentations stub en v1.
FR27: (Post-MVP) Le système peut gérer un fonds documentaire RecyClique distinct de la compta/factures Paheko.

### NonFunctional Requirements

NFR-P1: L'enregistrement d'une vente (saisie + envoi) se termine en moins de 2 secondes dans des conditions normales.
NFR-P2: La clôture de session ne bloque pas l'opérateur plus de 10 secondes ; le push et la sync comptable peuvent s'achever en arrière-plan.
NFR-S1: Les échanges RecyClique ↔ Paheko passent par HTTPS avec un secret partagé ; aucun secret en clair dans les requêtes.
NFR-S2: Les secrets sont gérés via variables d'environnement ou secrets manager, pas en dur dans le code.
NFR-S3: Accès caisse restreint par mode verrouillé et déverrouillage par PIN par opérateur habilité.
NFR-S4: Données personnelles (utilisateurs, adhésions) conformes au RGPD dans le périmètre géré par Paheko/RecyClique.
NFR-I1: La file de push (Redis Streams) garantit qu'aucun ticket n'est perdu en cas d'indisponibilité temporaire de Paheko ; retry jusqu'à succès.
NFR-I2: Les écritures compta (syncAccounting) respectent la configuration Paheko (comptes, exercice, moyens de paiement).
NFR-A1: Bonnes pratiques d'accessibilité de base (contraste, navigation clavier) pour les écrans caisse et réception.

### Additional Requirements

**Infrastructure et déploiement :**
- Docker Compose : RecyClique (un container), Paheko (SQLite), PostgreSQL (RecyClique), Redis. Une instance par ressourcerie.
- Config via variables d'environnement / secrets manager ; pas de secrets en dur.

**API et patterns :**
- API REST, JSON ; montants en centimes ; poids en kg (réception) / conversion vers Paheko (g si besoin).
- BDD : snake_case (tables pluriel, index idx_{table}_{colonne}).
- API : endpoints pluriel snake_case ; erreur = `{ "detail": "..." }` ; dates ISO 8601.
- Frontend : composants PascalCase, hooks/fonctions camelCase ; état immuable ; isLoading/isPending.
- Événements Redis : dot.lowercase (ex. `pos.ticket.created`) ; payload JSON snake_case ; idempotence et acks après traitement.

**Règle brownfield (rappel) :**
- Livrable de chaque story métier = migration/copie depuis 1.4.4 selon `references/ancien-repo/checklist-import-1.4.4.md`.
- Artefacts de référence : 08 (qui stocke quoi), 09 (périmètre API v1), 10 (traçabilité écran → API).

**UX v1 :**
- Mêmes écrans que RecyClique 1.4.4 ; pas de refonte UX pour la v1. Pour toute story livrant du front : rendu identique aux écrans 1.4.4 concernés ; méthode d'import = checklist (copy + consolidate + security) avec analyse de cohérence et de sécurité, pas de simple copier-coller.
- Extension points (LayoutConfigService, VisualProvider) en stubs v1.
- Référence : `_bmad-output/planning-artifacts/ux-design-specification.md`.

**Logging et observabilité :**
- Logs structurés (JSON) ; request_id propagé front → back ; pas de données sensibles.
- Health check : app up, BDD RecyClique, Redis ping, Paheko joignable.
- Audit log : table `audit_events` (ouvertures/fermetures caisse, clôtures, connexions, modifications config sensibles).

### FR Coverage Map

FR1: Epic 5 — Démarrer session caisse
FR2: Epic 5 — Enregistrer ventes (lignes, catégories, paiements)
FR3: Epic 5 — Clôturer session et déclencher contrôle + sync
FR4: Epic 3 — Restreindre menu caisse (mode verrouillé)
FR5: Epic 3 — Déverrouiller par PIN
FR6: Epic 2 (modèles sites+caisses) + Epic 5 (multi-sites gestion sessions)
FR7: Epic 4 (push) + Epic 5 (déclenchement)
FR7b: Epic 5 — Saisie caisse hors ligne + sync au retour
FR8: Epic 6 — Ouvrir poste réception, créer tickets dépôt
FR9: Epic 6 — Saisir lignes réception (poids, catégorie, destination)
FR10: Epic 6 — Réception source de vérité matière/poids
FR11: Epic 5 — Sync caisse vers Paheko à la clôture (syncAccounting)
FR12: Epic 8 — Administrer compta via Paheko (v1)
FR13: (Post-MVP)
FR13b: Epic 7 — Mapping RecyClique↔Paheko (et Epic 12 pour la gouvernance IAM cross-plateforme)
FR14: Epic 2 (modèle cash_registers) + Epic 3 (démarrage poste avec compte admin)
FR15: Epic 3 — PIN par opérateur caisse
FR16: Epic 3 — Authentification locale v1 (transition) ; Epic 12 — convergence IAM cross-plateforme
FR17: Epic 12 — SSO RecyClique↔Paheko (surface RecyClique, fédération OIDC)
FR18: Epic 1 — Déployer et configurer instance (Docker Compose)
FR19: Epic 4 — Configurer canal push (endpoint, secret, résilience)
FR20: Epic 4 (file Redis) + Epic 5 (retry)
FR21: Epic 8 — Placeholders vie associative
FR22: Epic 9 — Données déclaratives (poids, flux, catégories, périodes)
FR23: (Post-MVP) Epic 9 — Module décla éco-organismes
FR24: Epic 1 — Charger modules (TOML, ModuleBase, EventBus, slots)
FR25: Epic 1 — Coexistence plugins Paheko et modules RecyClique
FR26: Epic 10 — Points d'extension (LayoutConfigService, VisualProvider) stubs v1
FR27: (Post-MVP) Epic 10 — Fonds documentaire RecyClique
FR-R01: Epic 17 — Verrouillage RBAC super-admin phase 1 (front + back)
FR-R02: Epic 17 — Guard explicite route front `/admin`
FR-R03: Epic 17 — Stabilisation harness auth/session backend (cluster Auth Harness)
FR-R04: Epic 17 — Stabilisation runtime Vitest groupé guard/session (cluster Vitest Runtime)
FR-R05: Epic 17 — Completion opérationnelle admin BDD (export/purge/import)
FR-R06: Epic 17 — Completion opérationnelle pipeline import legacy CSV
FR-R07: Epic 17 — Persistance réelle des paramètres admin (alertes/session/email)
FR-R08: Epic 17 — Supervision admin non-stub (anomalies + test notifications)
FR-R09: Epic 17 — Logs email admin exploitables
FR-R10: Epic 17 — Rapports admin complets (by-session/export-bulk)
FR-R11: Epic 17 — Discoverabilité super-admin phase 2 restaurée
FR-R12: Epic 17 — Contrôle d'accès `/v1/users/me` déconnecté corrigé
FR-R13: Epic 17 — Fiabilisation suite `api/tests/routers/test_auth.py` (cluster Auth Harness)
FR-R14: Epic 17 — Suppression des blocages Vitest multi-fichiers (cluster Vitest Runtime)
FR-R15: Epic 17 — Couverture role-based routes sensibles super-admin phase 1
FR-R16: Epic 17 — Tests d'intégration routeur global/guards critiques
FR-R17: Epic 17 — Tests API ciblés `/v1/admin/settings`
FR-R18: Epic 17 — Tests admin technique au-delà du "happy path stub"

### Epic List

- **Epic 1**: Socle technique et déploiement ✅ LIVRÉ
- **Epic 2**: Référentiels métier (Sites, Postes de caisse, Catégories, Presets)
- **Epic 3**: Authentification, users, PIN, RBAC et démarrage des postes
- **Epic 4**: Canal push Paheko (config + worker Redis Streams)
- **Epic 5**: Caisse et synchronisation Paheko
- **Epic 6**: Réception et flux matière
- **Epic 7**: Correspondance et mapping RecyClique ↔ Paheko
- **Epic 8**: Administration, compta v1 et vie associative
- **Epic 9**: Données déclaratives et éco-organismes
- **Epic 10**: Extension points et évolution
- **Epic 11**: Conformité visuelle 1.4.4
- **Epic 12**: Identité cross-plateforme (SSO, source de vérité Paheko, gouvernance rôles/groupes)
- **Epic 13**: Remédiation visuelle pixel-perfect 1.4.4 (charte + QA continue)
- **Epic 14**: Operationalisation identite unifiee RecyClique-Paheko (IdP, mise en service, runbooks)
- **Epic 15**: Conformite visuelle et fonctionnelle : parite 1.4.4
- **Epic 16**: Audit global de conformation et audit de derive BMAD (sans remediation)
- **Epic 17**: Remediation post-audit 16-0 (vagues P0/P1/P2, execution story par story)

---

## Epic 1: Socle technique et déploiement ✅ LIVRÉ

Permettre à l'admin technique de déployer et faire tourner l'instance (RecyClique + Paheko + PostgreSQL + Redis), avec structure frontend (Vite React TS) et API (FastAPI), health check, et base pour le chargement de modules (TOML, ModuleBase, EventBus Redis Streams, slots React).

**Contexte déploiement :** Paheko a déjà été déployé en Docker avec le dump de prod intégré (instance dev/local existante). Les stories suivantes s'appuient sur cette hypothèse.

**FRs couverts :** FR18, FR24, FR25.

*Stories 1.1 à 1.5 livrées. Référence : `_bmad-output/implementation-artifacts/epic-1-retro-2026-02-26.md`.*

---

## Epic 2: Référentiels métier

Livrer les entités de base dont dépendent toutes les stories métier : sites, postes de caisse, catégories et presets. Ces modèles BDD et leurs API CRUD sont les **fondations business** ; rien ne peut être construit sans eux.

**Prérequis :** Epic 1 livré.

**Règle :** Toutes les stories de cet epic = migration/copie depuis 1.4.4 selon `references/ancien-repo/checklist-import-1.4.4.md`.

**Références transversales :** artefact 08 (§2.2, §2.5, §2.6), artefact 09 (§3.4, §3.8, §3.9, §3.12), `references/ancien-repo/data-models-api.md`.

**FRs couverts :** FR6 (partiel — modèles), FR14 (partiel — modèle cash_registers).

### Human in the Loop — moments possibles

| # | Moment | Ton intervention |
|---|--------|-----------------|
| **HITL-2.0** | Avant de lancer l'Epic 2 | **Optionnel** : confirmer que la stack Epic 1 est opérationnelle (health check OK). |
| **HITL-2.x** | Après chaque story 2.x | **Optionnel** : confirmer le livrable avant d'enchaîner. |

### Story 2.1: Sites — modèle BDD + API CRUD

En tant qu'admin ou développeur,
je veux une table `sites` en BDD RecyClique et les endpoints CRUD correspondants,
afin que les postes de caisse et les sessions puissent être rattachés à un site.

**Prérequis :** Epic 1 livré. Migrations Alembic (ou équivalent) initialisées dans `api/db/`.

**Critères d'acceptation :**

**Étant donné** un environnement RecyClique opérationnel (Epic 1)  
**Quand** la migration crée la table `sites` (id, name, is_active, created_at, updated_at)  
**Alors** les endpoints `GET /v1/sites`, `GET /v1/sites/{site_id}`, `POST /v1/sites`, `PATCH /v1/sites/{site_id}`, `DELETE /v1/sites/{site_id}` répondent correctement  
**Et** la structure respecte les conventions snake_case (artefact 08 §2.2, artefact 09 §3.4) ; livrable = migration/copie 1.4.4.

### Story 2.2: Postes de caisse — modèle BDD + API CRUD

En tant qu'admin ou développeur,
je veux une table `cash_registers` et les endpoints CRUD + statut,
afin de pouvoir démarrer des sessions de caisse sur des postes identifiés par site.

**Prérequis :** Story 2.1 livrée (sites).

**Critères d'acceptation :**

**Étant donné** la table `sites` existante  
**Quand** la migration crée la table `cash_registers` (id, site_id FK, name, location, is_active, enable_virtual, enable_deferred)  
**Alors** les endpoints `GET /v1/cash-registers`, `GET /v1/cash-registers/{register_id}`, `GET /v1/cash-registers/status`, `POST /v1/cash-registers`, `PATCH /v1/cash-registers/{register_id}`, `DELETE /v1/cash-registers/{register_id}` fonctionnent  
**Et** le champ `site_id` fait référence à un site existant (FK) ; livrable = migration/copie 1.4.4 (audit caisse §1.3 Postes).

### Story 2.3: Catégories — modèle BDD + API CRUD, hiérarchie et visibilité

En tant qu'admin ou développeur,
je veux une table `categories` avec hiérarchie parent/enfant et indicateurs de visibilité (caisse/réception),
afin que les lignes de vente et de réception puissent référencer des catégories métier.

**Prérequis :** Epic 1 livré.

**Critères d'acceptation :**

**Étant donné** un environnement RecyClique opérationnel  
**Quand** la migration crée `categories` (id, name, parent_id nullable, official_name, is_visible_sale, is_visible_reception, display_order, display_order_entry, deleted_at)  
**Alors** les endpoints de base fonctionnent : `GET /v1/categories`, `GET /v1/categories/hierarchy`, `GET /v1/categories/{id}`, `POST /v1/categories`, `PUT /v1/categories/{id}`, `DELETE /v1/categories/{id}` (soft delete), `POST /v1/categories/{id}/restore`, `GET /v1/categories/sale-tickets`, `GET /v1/categories/entry-tickets`, `PUT /v1/categories/{id}/visibility`, `PUT /v1/categories/{id}/display-order`  
**Et** la hiérarchie (parent_id auto-référentielle) est requêtable ; livrable = migration/copie 1.4.4 (artefact 08 §2.5, artefact 09 §3.9).  
**Note :** L'import/export CSV des catégories est reporté à l'Epic 8 (admin avancé).

### Story 2.4: Presets (boutons rapides caisse) — modèle BDD + API CRUD

En tant qu'admin ou développeur,
je veux une table `preset_buttons` et les endpoints CRUD + liste des actifs,
afin que l'écran caisse puisse charger les boutons rapides au démarrage.

**Prérequis :** Story 2.3 livrée (catégories).

**Critères d'acceptation :**

**Étant donné** la table `categories` existante  
**Quand** la migration crée `preset_buttons` (id, name, category_id FK nullable, preset_price, button_type, sort_order, is_active)  
**Alors** les endpoints fonctionnent : `GET /v1/presets`, `GET /v1/presets/active`, `GET /v1/presets/{id}`, `POST /v1/presets`, `PATCH /v1/presets/{id}`, `DELETE /v1/presets/{id}`  
**Et** `GET /v1/presets/active` retourne uniquement les presets is_active=true, triés par sort_order ; livrable = migration/copie 1.4.4 (artefact 08 §2.6, artefact 09 §3.12, audit caisse §1.3 Presets).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

---

## Epic 3: Authentification, users, PIN, RBAC et démarrage des postes

Permettre aux utilisateurs de s'authentifier (JWT terrain, Paheko admin), à un admin de démarrer un poste (caisse ou réception), et aux opérateurs caisse d'utiliser un PIN pour déverrouiller la session ; le système restreint l'accès au menu caisse en mode caisse (écran verrouillé).

**Prérequis :** Epic 2 livré (sites + cash_registers nécessaires pour le démarrage de postes).

**Règle :** Livrable = migration/copie 1.4.4 pour auth, users, groups, permissions. Artefact 08 §2.1, artefact 09 §3.2/3.3, artefact 10 §4.

**FRs couverts :** FR4, FR5, FR14, FR15, FR16, FR17 (phase ultérieure).

### Human in the Loop — moments possibles

| # | Moment | Ce que l'agent a produit | Ton intervention |
|---|--------|---------------------------|------------------|
| **HITL-3.0** | Avant de lancer l'Epic 3 | — | **Optionnel** : confirmer que l'Epic 2 (référentiels) est OK. |
| **HITL-3.1** | Après Story 3.1 (users + JWT) | Login/logout, JWT. | **Optionnel** : valider la politique JWT (durée de vie token, refresh) si des choix ont été faits. |
| **HITL-3.2** | Après Story 3.2 (groupes/permissions) | Modèle RBAC, permissions API. | **Optionnel** : valider que la matrice RBAC (PRD) est bien implémentée. |
| **HITL-3.3** | Après Story 3.3 (PIN) | Gestion PIN, déverrouillage. | **Recommandé** : trancher la **politique PIN** (longueur min, blocage après X échecs, durée). |
| **HITL-3.4** | Après Story 3.4 (démarrage poste) | API démarrage poste caisse/réception. | **Optionnel** : valider le flux multi-sites (choix lieu/caisse) avant 3.5. |
| **HITL-3.5** | Après Story 3.5 (mode verrouillé) | Restriction menu caisse, routes masquées. | **Optionnel** : valider que la liste des écrans « caisse » est alignée avec la matrice RBAC. |

### Story 3.1: Users, JWT et gestion de compte (terrain)

En tant qu'opérateur terrain,
je veux me connecter à RecyClique avec un identifiant et un mot de passe et recevoir un token JWT,
afin d'accéder aux fonctionnalités selon mon rôle.

**Prérequis :** Epic 1 livré.

**Critères d'acceptation :**

**Étant donné** les tables users, user_sessions, login_history, registration_request créées par migration  
**Quand** je soumets mes identifiants à `POST /v1/auth/login`  
**Alors** l'API retourne un JWT (access token + refresh token) ; les requêtes avec le token sont reconnues (FR16)  
**Et** les endpoints de compte fonctionnent : logout, refresh, forgot-password, reset-password, PIN login (`POST /v1/auth/pin`) ; `GET/PUT /v1/users/me` (profil, password, PIN) ; secrets et config JWT en env (NFR-S2)  
**Et** livrable = migration/copie 1.4.4 (artefact 08 §2.1, artefact 09 §3.2/3.3, artefact 10 §4.1 à 4.6).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 3.2: Groupes, permissions et RBAC

En tant qu'admin,
je veux pouvoir assigner des rôles et des permissions aux utilisateurs via des groupes,
afin de contrôler l'accès aux différentes fonctionnalités de l'application.

**Prérequis :** Story 3.1 livrée (users).

**Critères d'acceptation :**

**Étant donné** les tables groups, permissions, user_groups, group_permissions créées  
**Quand** un utilisateur possède les permissions requises et envoie son JWT  
**Alors** le middleware API valide le token **et** les permissions avant d'accéder à la ressource  
**Et** les endpoints d'admin groupes/permissions fonctionnent (`GET/POST/PUT/DELETE /v1/admin/groups`, `/v1/admin/permissions`) ; la matrice RBAC du PRD est implémentée (opérateur caisse, réception, responsable compta/admin, admin technique, bénévole)  
**Et** livrable = migration/copie 1.4.4 (artefact 08 §2.1).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 3.3: Gestion des PIN opérateur caisse et déverrouillage de session

**HITL (recommandé)** : après livraison, valider la politique PIN (longueur min, blocage après X échecs) — voir HITL-3.3.

En tant qu'opérateur habilité à la caisse,
je veux avoir un code PIN personnel et pouvoir déverrouiller la session caisse en le saisissant,
afin que seul un opérateur autorisé puisse sortir du mode caisse.

**Prérequis :** Story 3.1 livrée (users + PIN).

**Critères d'acceptation :**

**Étant donné** une personne habilitée à la caisse avec un PIN configuré  
**Quand** le poste est en mode caisse verrouillé et que je saisis mon PIN correct  
**Alors** la session se déverrouille ; un PIN incorrect ne déverrouille pas (FR5, FR15)  
**Et** l'association PIN / utilisateur est gérée de façon sécurisée (hash, NFR-S3) ; livrable = migration/copie 1.4.4.  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 3.4: Démarrer un poste (caisse ou réception) avec un compte administrateur

En tant qu'administrateur,
je veux démarrer un poste de caisse ou de réception en sélectionnant le site et la caisse,
afin qu'un opérateur puisse ensuite utiliser ce poste.

**Prérequis :** Story 3.1 (auth) + Epic 2 stories 2.1 et 2.2 (sites + cash_registers).

**Critères d'acceptation :**

**Étant donné** un utilisateur avec rôle admin authentifié, et des sites + postes existants (Epic 2)  
**Quand** je demande l'ouverture d'un poste caisse ou réception pour un site/caisse donné  
**Alors** le poste est enregistré et l'état est disponible (FR14) ; l'action est tracée (audit_events)  
**Et** en multi-sites/multi-caisses, le site et la caisse sont correctement associés au poste ; livrable = migration/copie 1.4.4 (artefact 08 §2.2, artefact 09 §3.8, artefact 10 §5.1).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 3.5: Mode caisse verrouillé — restriction du menu à la caisse uniquement

En tant qu'opérateur en poste caisse,
je veux que l'écran soit verrouillé sur le menu caisse uniquement tant que la session n'est pas déverrouillée par PIN,
afin de garantir que seules les actions caisse sont possibles sur ce poste.

**Prérequis :** Stories 3.3 (PIN) et 3.4 (poste démarré).

**Critères d'acceptation :**

**Étant donné** un poste en mode caisse actif  
**Quand** je navigue dans l'application sans avoir déverrouillé par PIN  
**Alors** seul le menu caisse est accessible ; les autres routes sont inaccessibles (FR4)  
**Et** le déverrouillage exige le PIN d'un opérateur habilité (Story 3.3) ; comportement cohérent avec la matrice RBAC ; livrable = migration/copie 1.4.4 (artefact 10 §5.1).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 3.6: (Phase ultérieure) SSO RecyClique–Paheko — documentation et objectif

En tant qu'admin technique,
je veux une documentation pour le SSO entre RecyClique et Paheko,
afin de préparer l'authentification unifiée en phase ultérieure.

**Critères d'acceptation :**

**Étant donné** les choix d'auth actuels (JWT terrain, Paheko admin séparé)  
**Quand** le périmètre phase ultérieure inclut le SSO  
**Alors** un document décrit l'objectif, les options et les contraintes Paheko (FR17)  
**Et** cette story peut se limiter à la rédaction de la spec (pas d'implémentation en v1).

---

## Epic 4: Canal push Paheko

Configurer et rendre opérationnel le canal de communication RecyClique → Paheko : endpoint sécurisé, worker Redis Streams, retry sans perte. C'est le **pont technique** entre les deux systèmes ; il doit être opérationnel avant la première session de caisse.

**Prérequis :** Epic 1 livré (Redis opérationnel, Paheko joignable).  
**Parallèle possible :** Peut démarrer en parallèle de l'Epic 3 (ne dépend pas de l'auth).  
**Précondition Epic 5 :** Ce canal doit être opérationnel (story 4.2 livrée) avant la story 5.1 (Ouvrir session caisse avec push Paheko).

**FRs couverts :** FR19, FR20 (partiel).

### Human in the Loop — moments possibles

| # | Moment | Ton intervention |
|---|--------|-----------------|
| **HITL-4.0** | Avant de lancer l'Epic 4 | **Optionnel** : confirmer que Paheko est accessible depuis le réseau Docker (instance dev). |
| **HITL-4.1** | Après Story 4.2 (premier push réussi) | **Recommandé** : valider manuellement que le push d'un message test arrive bien dans Paheko et que la réponse est correcte avant d'enchaîner Epic 5. |

### Story 4.1: Configuration du canal push (endpoint, secret, résilience)

En tant qu'admin technique,
je veux configurer l'endpoint du plugin Paheko, le secret partagé et les paramètres de résilience,
afin que le worker puisse envoyer les tickets de façon sécurisée.

**Critères d'acceptation :**

**Étant donné** une instance RecyClique et Paheko déployées  
**Quand** je configure via `.env` l'URL du plugin, le secret et les options de retry  
**Alors** la config est chargée par `api/config/settings.py` (Pydantic Settings) ; aucun secret en clair dans les requêtes (NFR-S1, NFR-S2)  
**Et** la résilience (nb tentatives, backoff) est documentée (FR19).

### Story 4.2: Worker Redis Streams — consumer → plugin Paheko

En tant que système,
je veux un worker qui consomme la file Redis Streams et envoie les événements au plugin Paheko,
afin que chaque ticket de vente soit traité de façon résiliente.

**Prérequis :** Story 4.1 livrée.

**Critères d'acceptation :**

**Étant donné** une file Redis Streams configurée et le plugin Paheko accessible  
**Quand** un événement est publié dans la file (type `pos.ticket.created` ou similaire)  
**Alors** le worker le consomme, appelle le plugin Paheko (HTTPS, secret partagé) et ACK après succès (NFR-I1)  
**Et** en cas d'échec, le message reste en file et est repris selon la config retry (FR20) ; les erreurs sont loguées (niveau error + request_id)  
**Et** le worker démarre avec l'application (ou comme process séparé selon l'archi workers) ; sa santé est visible dans le health check.

---

## Epic 5: Caisse et synchronisation Paheko

Permettre à un opérateur habilité de gérer des sessions de caisse (ouverture avec fond de caisse, saisie des ventes, clôture avec comptage et contrôle), en multi-sites/multi-caisses, avec push par ticket vers Paheko et sync comptable à la clôture.

**Prérequis :**
- Epic 2 livrée (sites, cash_registers, catégories, presets)
- Epic 3 livrée (auth + postes démarrés + PIN + mode verrouillé)
- Epic 4 livrée (canal push opérationnel + HITL-4.1 validé)

**Règle :** Livrable = migration/copie 1.4.4. Artefact 08 §2.3, artefact 09 §3.6/3.7, artefact 10 §5, audit caisse 1.4.4.

**FRs couverts :** FR1, FR2, FR3, FR6, FR7, FR7b, FR11, FR20.

### Human in the Loop — moments possibles

| # | Moment | Ce que l'agent a produit | Ton intervention |
|---|--------|---------------------------|------------------|
| **HITL-5.0** | Avant de lancer l'Epic 5 | — | **Recommandé** : confirmer que les Epics 2, 3, 4 sont OK et que le canal push a été testé (HITL-4.1). |
| **HITL-5.1** | Après Story 5.1 (Sessions) | Ouverture session, multi-caisses. | **Optionnel** : valider le flux multi-caisses avant 5.2. |
| **HITL-5.2** | Après Story 5.2 (Ventes + push) | Tickets, lignes, paiements, premier push. | **Recommandé** : confirmer que le format payload et la réponse Paheko sont acceptables avant d'enchaîner 5.3. |
| **HITL-5.3** | Après Story 5.3 (Clôture) | Clôture, contrôle totaux, syncAccounting. | **Recommandé** : valider la **séquence clôture** avec un test manuel ou une démo avant de considérer l'Epic 5 « bouclée ». |
| **HITL-5.4** | Avant Story 5.4 (Hors ligne) | — | **Décision** : trancher si la saisie hors ligne est dans le périmètre v1 ou reportée. |

### Story 5.1: Ouverture et fermeture de session de caisse (multi-sites/multi-caisses)

En tant qu'opérateur caisse (poste démarré par un admin),
je veux ouvrir une session de caisse avec un fond de caisse pour un site/caisse donnés, et pouvoir la fermer,
afin de tenir une caisse par point de vente.

**Critères d'acceptation :**

**Étant donné** un poste caisse actif (Epic 3) et un site/caisse identifiés (Epic 2)  
**Quand** j'ouvre une session avec un montant de fond de caisse  
**Alors** la session est créée en BDD RecyClique (table `cash_sessions` : id, operator_id, register_id, site_id, initial_amount, status, opened_at) ; une session Paheko correspondante est créée via le plugin (canal push Epic 4) (FR1, FR6)  
**Et** les sessions sont listables (`GET /v1/cash-sessions`) et tracées (audit_events) ; chaque caisse a sa session ; livrable = migration/copie 1.4.4 (artefact 10 §5.2).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 5.2: Enregistrement des ventes et push par ticket vers Paheko

En tant qu'opérateur caisse,
je veux enregistrer des ventes (tickets avec lignes et paiements multi-moyens) et que chaque ticket soit poussé automatiquement vers Paheko,
afin qu'aucun ticket ne soit perdu et que la compta reçoive les ventes sans double saisie.

**Prérequis :** Story 5.1 livrée (session ouverte) + Epic 2 (catégories, presets).

**Critères d'acceptation :**

**Étant donné** une session de caisse ouverte  
**Quand** j'ajoute des lignes à un ticket (catégorie, quantité, prix en centimes, poids éventuel) et je saisis un ou plusieurs paiements  
**Alors** le ticket et les lignes sont persistés en BDD RecyClique (tables `sales`, `sale_items`, `payment_transactions`) (FR2)  
**Et** le ticket est ajouté à la file Redis Streams ; le worker (Epic 4) consomme la file et envoie au plugin Paheko (HTTPS + secret) (FR7, NFR-S1, NFR-I1)  
**Et** le temps de réponse pour enregistrer une vente reste < 2 s en conditions normales (NFR-P1) ; en cas d'échec Paheko, retry sans perte (FR20) ; livrable = migration/copie 1.4.4 (artefact 08 §2.3, artefact 09 §3.6, artefact 10 §5.3).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 5.3: Clôture de session (comptage physique, totaux, écart) et syncAccounting

En tant qu'opérateur caisse,
je veux clôturer ma session en saisissant le comptage physique et les totaux, et déclencher le contrôle et la sync comptable vers Paheko,
afin que la caisse soit bouclée et la compta à jour sans double saisie.

**Prérequis :** Story 5.2 livrée.

**Critères d'acceptation :**

**Étant donné** une session de caisse avec des tickets (certains poussés, d'autres en file)  
**Quand** je lance la clôture et saisis les totaux (closing_amount, actual_amount, variance_comment)  
**Alors** un contrôle des totaux RecyClique vs Paheko est effectué ; la sync comptable (syncAccounting) est déclenchée côté Paheko ; la session est marquée clôturée (FR3, FR11)  
**Et** l'opérateur n'est pas bloqué plus de 10 s ; push et sync en arrière-plan (NFR-P2) ; écritures compta respectent la config Paheko (NFR-I2) ; livrable = migration/copie 1.4.4 (artefact 10 §5.4).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 5.4: (Optionnel v1) Saisie caisse hors ligne et synchronisation au retour

**HITL (décision) :** trancher si cette story est dans le périmètre v1 ou reportée — voir HITL-5.4.

En tant qu'opérateur caisse,
je veux pouvoir enregistrer des ventes en local quand le réseau est indisponible, puis synchroniser les tickets vers Paheko au retour en ligne,
afin de ne pas bloquer la vente en cas de coupure.

**Critères d'acceptation :**

**Étant donné** un frontend avec buffer local (ex. IndexedDB) et une file Redis Streams côté backend  
**Quand** le frontend est hors ligne, je continue à saisir des ventes ; au retour en ligne, les tickets sont envoyés  
**Alors** les tickets sont bien en file et traités comme en Story 5.2 ; aucune perte de donnée (FR7b)  
**Et** si reporté, la story est marquée optionnelle ou déplacée en post-v1.

---

## Epic 6: Réception et flux matière

Permettre à un opérateur d'ouvrir un poste de réception, de créer des tickets de dépôt et de saisir des lignes (poids, catégorie, destination). La réception reste source de vérité matière/poids dans RecyClique, sans sync manuelle obligatoire vers Paheko.

**Prérequis :**
- Epic 2 story 2.3 livrée (catégories)
- Epic 3 story 3.4 livrée (démarrage poste réception)

**Note :** Epic 6 peut démarrer en parallèle d'Epic 5 (pas de dépendance sur le canal push ni sur la caisse).

**Règle :** Livrable = migration/copie 1.4.4. Artefact 08 §2.4, artefact 09 §3.10, artefact 10 §6, audit réception 1.4.4.

**FRs couverts :** FR8, FR9, FR10.

### Human in the Loop — moments possibles

| # | Moment | Ton intervention |
|---|--------|-----------------|
| **HITL-6.0** | Avant de lancer l'Epic 6 | **Optionnel** : confirmer que l'Epic 3 (poste réception) est OK. |
| **HITL-6.1** | Après Story 6.1 ou 6.2 | **Optionnel** : valider les listes de valeurs (catégories, destinations) avant de figer l'UI. |

### Story 6.1: Ouverture de poste de réception et création de tickets de dépôt

En tant qu'opérateur réception (poste démarré par un admin),
je veux ouvrir un poste de réception et créer des tickets de dépôt,
afin d'enregistrer les entrées matière de façon traçable.

**Critères d'acceptation :**

**Étant donné** un utilisateur autorisé avec un poste réception actif (Epic 3)  
**Quand** j'ouvre un poste de réception et je crée un nouveau ticket de dépôt  
**Alors** le poste (`poste_reception`) et le ticket (`ticket_depot`) sont enregistrés en BDD RecyClique (FR8) ; le ticket est listable via `GET /v1/reception/tickets`  
**Et** aucune sync manuelle vers Paheko n'est requise (FR10) ; livrable = migration/copie 1.4.4 (artefact 10 §6.1/6.2).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 6.2: Saisie des lignes de réception (poids, catégorie, destination)

En tant qu'opérateur réception,
je veux saisir sur chaque ticket des lignes avec poids (kg), catégorie et destination,
afin que les flux matière soient disponibles pour les déclarations et le suivi.

**Critères d'acceptation :**

**Étant donné** un ticket de dépôt ouvert  
**Quand** j'ajoute des lignes avec poids_kg, category_id et destination  
**Alors** les lignes (`ligne_depot`) sont persistées en BDD RecyClique (FR9, FR10)  
**Et** les données sont disponibles pour exports ou déclarations ; bonnes pratiques accessibilité (NFR-A1) ; livrable = migration/copie 1.4.4 (artefact 08 §2.4, artefact 10 §6.4).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 6.3: Export CSV et stats live réception

En tant qu'opérateur ou admin réception,
je veux exporter les données d'un ticket en CSV et consulter les KPI réception en temps réel,
afin de suivre les flux matière sans quitter RecyClique.

**Critères d'acceptation :**

**Étant donné** des tickets et lignes de réception existants  
**Quand** je clique « Export CSV » sur un ticket ou les lignes d'une période  
**Alors** le fichier est généré et téléchargeable (`POST /v1/reception/tickets/{id}/download-token`, `GET .../export-csv`, `GET /v1/reception/lignes/export-csv`)  
**Et** `GET /v1/reception/stats/live` retourne les KPI de réception en temps réel ; livrable = migration/copie 1.4.4 (artefact 09 §3.10, artefact 10 §6.5).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

---

## Epic 7: Correspondance et mapping RecyClique ↔ Paheko

Configurer le mapping entre les référentiels RecyClique (moyens de paiement, catégories, sites) et leurs équivalents Paheko, pour que les pushes caisse produisent les bonnes écritures comptables. **Chantier de découverte et de décisions métier — HITL obligatoires avant les stories 7.1 et 7.2.**

**Prérequis :** Epic 5 tournant + BDD RecyClique et instance Paheko stabilisées (condition pour les HITL).

**FRs couverts :** FR13b.

### Contexte — chantier correspondance (pas entièrement automatisable)

Pour que RecyClique pousse correctement vers Paheko, il faut décider des options Paheko à activer et figer les correspondances (champs, règles) avant d'implémenter les stories 7.1 et 7.2. Ce travail de découverte produit inventaires et matrices, mais les **choix** (config par défaut, arbitrages mapping) doivent être validés par Strophe ou l'analyste.

**Ressources à charger pour les sessions correspondance :**
- `references/migration-paeco/audits/matrice-correspondance-caisse-poids.md`
- `references/migration-paeco/audits/` (audits caisse et réception Paheko)
- `references/dumps/schema-paheko-dev.md`, `references/dumps/schema-recyclic-dev.md`
- `references/artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md`
- `references/artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md`

### Human in the Loop — moments **obligatoires**

| # | Moment | Ce que l'agent a produit | Ton intervention |
|---|--------|---------------------------|------------------|
| **HITL-7.0** | Avant de lancer l'Epic 7 | — | **Décider** si le chantier découverte est à faire maintenant : lancer une session (agent + toi) pour inventaire Paheko et mise à jour de la matrice. |
| **HITL-7.1** | Après inventaire / première matrice | Inventaire des options Paheko, tableau des champs et workflows. | **Valider** les options Paheko à activer en v1 et **trancher les configs par défaut** (moyens de paiement, catégories par défaut, emplacements). |
| **HITL-7.2** | Après matrice détaillée (correspondance champs) | Matrice ou doc : RecyClique → Paheko champ par champ. | **Valider** les décisions de mapping. Signer pour figer le périmètre v1. |
| **HITL-7.3** | Avant de créer stories 7.1 et 7.2 | Spec « Config Paheko par défaut + correspondance » complète. | **Valider** que la spec est complète et donner le feu vert pour l'implémentation. |

**Résumé :** Ne pas enchaîner 7.1 et 7.2 en automatique sans avoir franchi HITL-7.1, 7.2 et 7.3.

### Story 7.1: Modèle et stockage du mapping RecyClique ↔ Paheko

**Prérequis HITL :** HITL-7.1, 7.2, 7.3 franchis (décisions mapping figées).

En tant qu'admin technique ou responsable compta,
je veux que le système gère un mapping configurable entre les référentiels RecyClique et leurs équivalents Paheko,
afin que le push caisse produise les bonnes écritures compta.

**Critères d'acceptation :**

**Étant donné** la spec de correspondance validée (HITL-7.3)  
**Quand** le périmètre exact du mapping est figé (moyens de paiement, catégories, sites/emplacements)  
**Alors** les entités ou tables de mapping existent en BDD avec les champs de correspondance Paheko  
**Et** les données peuvent être créées/mises à jour via API ; la config Paheko reste la référence (NFR-I2, FR13b).

### Story 7.2: Interface ou API d'administration du mapping

**Prérequis HITL :** idem Story 7.1.

En tant qu'admin ou responsable compta,
je veux consulter et modifier le mapping via une interface ou une API RecyClique,
afin de configurer à l'avance tout ce qui est nécessaire pour la sync caisse.

**Critères d'acceptation :**

**Étant donné** le modèle de mapping (Story 7.1)  
**Quand** j'accède à l'écran ou à l'API d'administration du mapping  
**Alors** je peux lister et éditer les correspondances (RecyClique → Paheko)  
**Et** les modifications sensibles sont tracées (audit_events) ; périmètre documenté dans la story.  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

---

## Epic 8: Administration, compta v1 et vie associative

Permettre l'administration complète de l'application (utilisateurs, sites, postes, sessions, rapports, paramètres, BDD) ; accès compta via Paheko en v1 ; placeholders vie associative.

**Prérequis :** Toutes les couches précédentes (Epics 2 à 6 au minimum).

**Note :** Les APIs de base (users, sites, cash_registers, categories) sont déjà en place (Epics 2 et 3). Cet epic ajoute les **interfaces admin complètes** (import/export catégories, gestion groupes, rapports, etc.) et les **écrans admin complexes**.

**Règle :** Livrable = migration/copie 1.4.4. Artefact 10 §7.

**FRs couverts :** FR12, FR21.

### Human in the Loop — moments possibles

| # | Moment | Ton intervention |
|---|--------|-----------------|
| **HITL-8.0** | Avant de lancer l'Epic 8 | **Optionnel** : confirmer que caisse (Epic 5) et réception (Epic 6) sont en place. |
| **HITL-8.1** | Après Story 8.1 (users admin complet) | **Optionnel** : valider le niveau de détail des écrans admin. |
| **HITL-8.2** | Après Story 8.7 (placeholders vie asso) | **Optionnel** : valider le niveau de détail des placeholders. |

### Story 8.1: Administration complète des utilisateurs

En tant qu'admin,
je veux les écrans complets d'administration des utilisateurs (liste, détail, pending, approve/reject, groupes, audit),
afin de gérer les accès à RecyClique.

**Critères d'acceptation :**

**Étant donné** les APIs users/groups/permissions existantes (Epic 3)  
**Quand** j'accède à `/admin/users`  
**Alors** les écrans de liste, détail, pending, approve/reject, changement rôle/statut/groupes, reset password/PIN sont opérationnels  
**Et** livrable = migration/copie 1.4.4 (artefact 10 §7.2/7.3).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 8.2: Administration sites, postes, sessions et rapports caisse

En tant qu'admin,
je veux les écrans complets d'administration des sites, des postes de caisse, du gestionnaire de sessions et des rapports caisse,
afin de piloter les opérations de caisse et d'accéder aux rapports.

**Critères d'acceptation :**

**Étant donné** les APIs sites/cash-registers/cash-sessions existantes (Epics 2 et 5)  
**Quand** j'accède aux écrans admin correspondants  
**Alors** la gestion sites, postes (CRUD), gestionnaire de sessions (filtres, pagination), rapports par session et export bulk sont opérationnels  
**Et** livrable = migration/copie 1.4.4 (artefact 10 §7.4/7.5/7.6/7.7).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 8.3: Import/export catégories et admin avancé

En tant qu'admin,
je veux importer et exporter des catégories (CSV) et accéder à l'interface d'administration avancée des catégories,
afin de gérer facilement le référentiel EEE/décla.

**Critères d'acceptation :**

**Étant donné** la table `categories` existante (Epic 2) et les endpoints de base  
**Quand** j'accède à l'écran admin catégories  
**Alors** les actions import/export CSV (template, analyze, execute), hard delete, restauration et breadcrumb sont opérationnelles  
**Et** livrable = migration/copie 1.4.4 (artefact 10 §8.1).  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 8.4: Réception admin, santé, audit log, logs email, paramètres

En tant qu'admin,
je veux les écrans de réception admin (stats, rapports, tickets), santé, audit log, logs email et paramètres,
afin de surveiller l'instance et de configurer les seuils.

**Critères d'acceptation :**

**Étant donné** les APIs correspondantes existantes  
**Quand** j'accède aux sections admin réception, santé, audit, logs et paramètres  
**Alors** tous les écrans listés dans l'artefact 10 §7.8/7.9 sont opérationnels  
**Et** livrable = migration/copie 1.4.4.  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 8.5: BDD (export, purge, import) et import legacy

En tant qu'admin technique,
je veux les actions BDD (export, purge, import) et l'interface d'import legacy CSV,
afin de maintenir et migrer les données.

**Critères d'acceptation :**

**Étant donné** les permissions super-admin  
**Quand** j'utilise les actions BDD  
**Alors** export, purge transactions et import fonctionnent ; l'interface import legacy (analyze, execute, validate, preview) est opérationnelle  
**Et** livrable = migration/copie 1.4.4 (artefact 10 §7.10) ; scope import legacy à confirmer produit.  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

### Story 8.6: Accès et documentation pour l'administration compta via Paheko (v1)

En tant que responsable compta,
je veux savoir comment accéder à l'interface Paheko pour administrer la compta en v1,
afin de faire la compta pendant que les interfaces RecyClique ne sont pas encore disponibles.

**Critères d'acceptation :**

**Étant donné** une instance avec RecyClique et Paheko déployés et la caisse synchronisée (Epic 5)  
**Quand** je consulte la documentation ou l'aide RecyClique  
**Alors** l'accès à l'interface Paheko pour la compta est documenté (URL, rôle requis) (FR12)  
**Et** un lien ou une redirection depuis RecyClique peuvent être ajoutés si pertinent.

### Story 8.7: Écrans ou placeholders « vie associative » dans RecyClique

En tant qu'utilisateur (ex. bénévole),
je veux accéder à des écrans ou placeholders « vie associative » depuis RecyClique,
afin d'avoir un point d'entrée unique sans ouvrir Paheko.

**Critères d'acceptation :**

**Étant donné** un utilisateur connecté avec accès vie asso  
**Quand** je navigue vers la section vie associative  
**Alors** des écrans ou placeholders sont affichés (FR21) ; le parcours complet sera déroulé en growth.  
**Et** le livrable respecte le rendu des écrans 1.4.4 correspondants (référence : audits, artefact 10) et résulte d'une analyse de cohérence et de sécurité selon `references/ancien-repo/checklist-import-1.4.4.md` — pas de simple copier-coller.

---

## Epic 9: Données déclaratives et éco-organismes

Permettre au système de produire et conserver les données déclaratives (poids, flux, catégories, périodes) dans RecyClique pour les déclarations éco-organismes.

**Prérequis :** Epic 5 (flux ventes caisse) + Epic 6 (flux réception/poids).

**FRs couverts :** FR22, FR23 (post-MVP).

### Human in the Loop — moments possibles

| # | Moment | Ton intervention |
|---|--------|-----------------|
| **HITL-9.0** | Avant de lancer l'Epic 9 | **Recommandé** : valider le **périmètre déclaratif v1** (champs, périodes, alignement éco-organismes) avant de modéliser. |

### Story 9.1: Modèle et persistance des données déclaratives

**HITL (recommandé)** : valider le périmètre déclaratif v1 avant ou au début de cette story — voir HITL-9.0.

En tant que système,
je veux stocker les données nécessaires aux déclarations éco-organismes dans RecyClique,
afin qu'elles soient la source de vérité pour les déclarations officielles.

**Critères d'acceptation :**

**Étant donné** les flux réception et caisse opérationnels (Epics 5, 6) et les catégories mappées (Epic 2)  
**Quand** des données déclaratives sont produites (agrégats par période, catégorie, flux)  
**Alors** elles sont persistées en BDD RecyClique (tables ou vues dédiées) ; exports ou requêtes pour déclarations possibles (FR22)  
**Et** traçabilité et périmètre documentés.

### Story 9.2: (Post-MVP) Module décla éco-organismes

En tant que responsable,
je veux utiliser un module RecyClique dédié aux déclarations éco-organismes,
afin de produire les déclarations officielles sans quitter RecyClique.

**Critères d'acceptation :**

**Étant donné** les données déclaratives (Story 9.1) et le périmètre post-MVP  
**Quand** le module décla est activé  
**Alors** je peux exporter ou soumettre les données selon le format attendu (FR23)  
**Et** la story est marquée post-MVP.

---

## Epic 10: Extension points et évolution

Exposer des points d'extension (LayoutConfigService, VisualProvider) avec implémentations stub en v1 pour brancher ultérieurement affichage dynamique et service Peintre (JARVOS Mini). Peut démarrer en parallèle de n'importe quelle couche une fois le frontend structuré.

**Prérequis :** Epic 1 livré (structure frontend en place).

**FRs couverts :** FR26, FR27 (post-MVP).

### Human in the Loop — moments possibles

| # | Moment | Ton intervention |
|---|--------|-----------------|
| **HITL-10.0** | Avant de lancer l'Epic 10 | **Optionnel** : confirmer que la recherche technique Peintre est à jour. |

### Story 10.1: Interfaces et stubs LayoutConfigService / VisualProvider (v1)

En tant que développeur ou intégrateur,
je veux des interfaces (LayoutConfigService, VisualProvider) et des implémentations stub dans le frontend,
afin de brancher plus tard l'affichage dynamique et le service Peintre sans refonte majeure.

**Critères d'acceptation :**

**Étant donné** la structure frontend (Epic 1)  
**Quand** le code est en place  
**Alors** les interfaces LayoutConfigService et VisualProvider existent et sont utilisables par les modules ; des stubs sont livrés en v1 (FR26)  
**Et** la structure et les slots permettent d'ajouter des implémentations réelles plus tard ; référence : `_bmad-output/planning-artifacts/research/technical-affichage-dynamique-peintre-extension-points-research-2026-02-25.md`.

### Story 10.2: (Post-MVP) Fonds documentaire RecyClique

En tant qu'organisation,
je veux gérer un fonds documentaire RecyClique (statutaire, com, prise de notes) distinct de la compta/factures Paheko,
afin de centraliser la doc et préparer l'évolution JARVOS Nano/Mini.

**Critères d'acceptation :**

**Étant donné** la politique fichiers (artefact 2026-02-25_02) et le périmètre post-MVP  
**Quand** le fonds documentaire est implémenté  
**Alors** le stockage (volume dédié ou K-Drive) et la frontière avec Paheko sont définis (FR27)  
**Et** la story est post-MVP.

---

## Epic 11: Conformité visuelle 1.4.4

Aligner le rendu des 29 écrans RecyClique sur le code et les maquettes 1.4.4, en appliquant à chaque domaine la checklist import (`references/ancien-repo/checklist-import-1.4.4.md`) et les références artefact 10 (traçabilité écran → API) et audits. Découpage par domaine pour rester dans une fenêtre de contexte raisonnable (~100k tokens) ; Admin est scindé en trois stories.

**Prérequis :** Les écrans concernés existent déjà (placeholders ou livraisons des Epics 2 à 8). Cette epic porte sur le **rendu visuel et l’alignement 1.4.4**, pas sur la création des écrans.

**Règle :** Pour chaque story, livrable = aligner le rendu des écrans du périmètre sur le code 1.4.4 + checklist import (copy + consolidate + security). Référence : `references/artefacts/2026-02-26_10_tracabilite-ecran-donnees-appels-api.md` (index §3, détail par domaine §4 à §8).

**Qualité refactor (s’applique à toutes les stories 11.x)**  
- **Pas de copier-coller de fichier** : pour chaque écran, identifier dans 1.4.4 les composants/styles, puis **réécrire ou adapter** dans la stack actuelle (Mantine, `frontend/src/`) en appliquant Consolidate et Security.  
- **Preuve checklist** : dans les Completion Notes (ou livrable), une trace par écran (ou lot homogène) avec au minimum : **Copy** — source 1.4.4 identifiée (fichier/chemin) ; **Consolidate** — dépendances / pas de doublon ; **Security** — pas de secret en dur, audit rapide, `npm audit` OK. Sans cette trace, la story n’est pas acceptée comme conforme.

- **Vérification build et console (obligatoire pour toute story 11.x)** : Avant de considérer la story terminée : (1) **Build** — exécuter `npm run build` dans `frontend/` et `docker compose up --build` à la racine ; les deux doivent réussir sans erreur (aucune TS6133, TS2345, etc.). (2) **Console navigateur (recommandé)** — ouvrir les URLs des écrans livrés, DevTools (F12 → Console), vérifier qu'il n'y a pas d'erreur rouge ; indiquer dans les Completion Notes que la vérification a été faite (ou lister les erreurs corrigées).

**Périmètre des 29 écrans :** Auth 6, Caisse 5, Réception 5, Admin 12, Catégories 1.

### Story 11.1: Conformité visuelle — Auth (6 écrans)

En tant qu’équipe produit,
je veux que les écrans Auth aient un rendu identique à RecyClique 1.4.4,
afin d’assurer la parité visuelle et comportementale pour login, signup, forgot/reset password, profil et connexion PIN.

**Critères d’acceptation :**

**Étant donné** les écrans Auth existants (Login, Signup, Forgot password, Reset password, Profil, Connexion par PIN — artefact 10 §4)  
**Quand** on applique la checklist import 1.4.4 (copy + consolidate + security) et qu’on aligne le rendu sur le code 1.4.4  
**Alors** le rendu des 6 écrans du domaine Auth est identique aux écrans 1.4.4 correspondants  
**Et** l’import respecte `references/ancien-repo/checklist-import-1.4.4.md` (pas de copier-coller sans analyse de cohérence et de sécurité).

### Story 11.2: Conformité visuelle — Caisse (5 écrans)

En tant qu’équipe produit,
je veux que les écrans Caisse aient un rendu identique à RecyClique 1.4.4,
afin d’assurer la parité visuelle pour dashboard, ouverture/fermeture session, saisie vente et détail session admin.

**Critères d’acceptation :**

**Étant donné** les écrans Caisse existants (Dashboard caisses, Ouverture session, Saisie vente, Fermeture session, Détail session admin — artefact 10 §5)  
**Quand** on applique la checklist import 1.4.4 et qu’on aligne le rendu sur le code 1.4.4  
**Alors** le rendu des 5 écrans du domaine Caisse est identique aux écrans 1.4.4 correspondants  
**Et** l’import respecte `references/ancien-repo/checklist-import-1.4.4.md` ; référence audits caisse 1.4.4.

### Story 11.3: Conformité visuelle — Réception (5 écrans)

En tant qu’équipe produit,
je veux que les écrans Réception aient un rendu identique à RecyClique 1.4.4,
afin d’assurer la parité visuelle pour accueil, poste, tickets, lignes, export CSV et stats live.

**Critères d’acceptation :**

**Étant donné** les écrans Réception existants (Accueil/poste, Ouverture poste, Liste tickets, Détail ticket + lignes, Export CSV / Stats live — artefact 10 §6)  
**Quand** on applique la checklist import 1.4.4 et qu’on aligne le rendu sur le code 1.4.4  
**Alors** le rendu des 5 écrans du domaine Réception est identique aux écrans 1.4.4 correspondants  
**Et** l’import respecte `references/ancien-repo/checklist-import-1.4.4.md` ; référence audit réception 1.4.4.

### Story 11.4: Conformité visuelle — Admin 1 (7 écrans : dashboard, users, sites, postes, sessions, rapports caisse)

En tant qu’équipe produit,
je veux que les premiers écrans Admin aient un rendu identique à RecyClique 1.4.4,
afin d’assurer la parité visuelle pour dashboard, utilisateurs, sites, postes de caisse, gestionnaire de sessions et rapports caisse.

**Critères d’acceptation :**

**Étant donné** les écrans Admin existants (Dashboard, Utilisateurs liste/détail/pending, Sites, Postes caisse, Gestionnaire sessions, Rapports caisse — artefact 10 §7.1 à §7.7)  
**Quand** on applique la checklist import 1.4.4 et qu’on aligne le rendu sur le code 1.4.4  
**Alors** le rendu de ces 7 écrans est identique aux écrans 1.4.4 correspondants  
**Et** l’import respecte `references/ancien-repo/checklist-import-1.4.4.md`.

### Story 11.5: Conformité visuelle — Admin 2 (5 écrans : réception admin, santé, audit, logs, paramètres)

En tant qu’équipe produit,
je veux que les écrans Admin réception/santé/audit/logs/paramètres aient un rendu identique à RecyClique 1.4.4,
afin d’assurer la parité visuelle pour la surveillance et la configuration.

**Critères d’acceptation :**

**Étant donné** les écrans Admin existants (Réception admin stats/rapports/tickets, Santé, Audit log, Logs email, Paramètres — artefact 10 §7.8, §7.9)  
**Quand** on applique la checklist import 1.4.4 et qu’on aligne le rendu sur le code 1.4.4  
**Alors** le rendu de ces 5 écrans est identique aux écrans 1.4.4 correspondants  
**Et** l’import respecte `references/ancien-repo/checklist-import-1.4.4.md`.

### Story 11.6: Conformité visuelle — Admin 3 (6 écrans : BDD, import legacy, groupes, permissions, catégories, analyse rapide)

En tant qu’équipe produit,
je veux que les écrans Admin BDD, import legacy, groupes, permissions, catégories et analyse rapide aient un rendu identique à RecyClique 1.4.4,
afin d’assurer la parité visuelle pour la gestion technique et le référentiel catégories.

**Critères d’acceptation :**

**Étant donné** les écrans Admin existants (BDD export/purge/import, Import legacy, Groupes, Permissions, Analyse rapide) et la page Catégories (artefact 10 §7.10, §7.11, §7.12, §8.1)  
**Quand** on applique la checklist import 1.4.4 et qu’on aligne le rendu sur le code 1.4.4  
**Alors** le rendu de ces écrans est identique aux écrans 1.4.4 correspondants  
**Et** l’import respecte `references/ancien-repo/checklist-import-1.4.4.md`.

---

## Epic 12: Identité cross-plateforme (SSO + gouvernance Paheko)

Mettre en place une identité unifiée RecyClique-Paheko sans double mécanisme, en gardant RecyClique comme surface principale et Paheko comme source de vérité membres. La trajectoire suit la décision validée: API Paheko d'abord, puis plugin Paheko pour combler le gap groupes/permissions avancés.

**Prérequis :** Epics 3, 7, 8 et 11 stables (auth locale, mapping, admin, UI).

**FRs couverts :** FR17 (principal), FR16 (transition), FR13b (gouvernance mapping IAM), FR25 (coexistence modules/plugins).

### Story 12.1: Cadrage IAM cible et matrice d'accès cross-plateforme

En tant que product owner,
je veux une matrice IAM unique (rôles, groupes, exceptions, accès Paheko),
afin d'éviter les ambiguïtés d'autorisation entre RecyClique et Paheko.

**Critères d'acceptation :**

**Étant donné** les rôles métier validés (Super Admin, Admin, Bénévole + exceptions)  
**Quand** la matrice IAM est formalisée dans les artefacts projet  
**Alors** chaque rôle a des permissions explicites côté RecyClique et côté Paheko  
**Et** la règle "bénévole sans accès Paheko par défaut" est documentée avec gestion d'exception tracée.

### Story 12.2: Intégration IdP + BFF pour login unifié RecyClique

En tant qu'utilisateur autorisé,
je veux me connecter via un flux SSO standard depuis RecyClique,
afin d'avoir une session unifiée sans manipuler les tokens dans le navigateur.

**Critères d'acceptation :**

**Étant donné** une configuration IdP OIDC active  
**Quand** un utilisateur lance la connexion depuis RecyClique  
**Alors** le flux Authorization Code + PKCE passe via BFF et établit une session sécurisée HTTP-only  
**Et** les claims nécessaires (identité, rôle, structure) sont validés (`iss`, `aud`, `exp`, `sub`) avant tout accès applicatif.

### Story 12.3: Synchronisation membres depuis API Paheko (phase 1)

En tant qu'admin,
je veux que la gestion membres repose sur Paheko via son API standard,
afin que Paheko reste la source de vérité sans bloquer la livraison SSO.

**Critères d'acceptation :**

**Étant donné** les endpoints API Paheko disponibles pour les membres  
**Quand** un membre est créé/modifié/supprimé dans Paheko  
**Alors** RecyClique synchronise l'identité et met à jour son extension locale (périmètres propres RecyClique)  
**Et** l'audit journalise les opérations de sync et les erreurs de cohérence.

### Story 12.4: Contrôle d'accès Paheko par rôle (garde-fous opérationnels)

En tant qu'organisation,
je veux restreindre l'accès Paheko aux seuls rôles autorisés,
afin de réserver Paheko aux usages experts/secours.

**Critères d'acceptation :**

**Étant donné** un utilisateur connecté via SSO  
**Quand** son rôle est évalué  
**Alors** Super Admin et Admin peuvent accéder à Paheko  
**Et** Bénévole est refusé par défaut, sauf exception explicite autorisée et tracée.

### Story 12.5: Résilience IAM et mode dégradé

En tant qu'admin technique,
je veux un comportement défini en cas de panne IdP ou Paheko,
afin d'éviter les pannes en cascade et les contournements dangereux.

**Critères d'acceptation :**

**Étant donné** une indisponibilité IdP ou Paheko  
**Quand** le système entre en mode dégradé  
**Alors** les routes sensibles appliquent un comportement fail-closed documenté  
**Et** des runbooks + alertes permettent diagnostic, reprise et traçabilité de l'incident.

### Story 12.6: Plugin Paheko pour groupes/permissions avancés (phase 2)

En tant qu'équipe produit,
je veux un plugin Paheko exposant les capacités manquantes de groupes/permissions,
afin de finaliser la gouvernance RBAC cross-plateforme sans divergence.

**Critères d'acceptation :**

**Étant donné** les limites de l'API Paheko standard sur les groupes/permissions  
**Quand** le plugin est livré et branché  
**Alors** RecyClique peut piloter les opérations groupes/permissions prévues via interfaces stables  
**Et** la cohérence des droits est vérifiée par des tests de non-régression et d'audit de synchronisation.

---

## Epic 13: Remédiation visuelle pixel-perfect 1.4.4

Mettre en conformité visuelle l'existant Epic 11 avec une approche anti-dette: charte operatoire, socle UI commun, correction écran par écran, et QA visuelle continue. L'objectif est de converger vers une parité 1.4.4 quasi pixel perfect sans redéveloppement from scratch.

**Prérequis :** Epic 11 livré (base fonctionnelle) + artefacts de cadrage visuel validés:
- `_bmad-output/implementation-artifacts/11-x-point-de-verite-parite-v1.4.4.md`
- `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`
- `_bmad-output/implementation-artifacts/11-x-guide-refactor-propre.md`
- `_bmad-output/implementation-artifacts/11-x-gate-qualite-epic11.md`

**Exclusions validées (hors scope correctif prioritaire) :** `pin login`, `users pending`, `permissions`.

**FRs couverts :** FR24 (cohérence structure modulaire), FR25 (cohérence interface cross-modules), FR26 (discipline de points d'extension), qualité transversale Epic 11.

### Story 13.1.1: Socle visuel - shell global (bandeau, menu, layout)

En tant qu'équipe produit,
je veux un shell global homogène aligné 1.4.4 (bandeau, menu, grille),
afin de supprimer les écarts structurels transverses avant les corrections écran par écran.

**Critères d'acceptation :**

**Étant donné** la charte visuelle opératoire validée  
**Quand** le shell global est refactoré dans les composants partagés  
**Alors** les domaines Epic 11 partagent un header/menu/layout cohérents  
**Et** aucune divergence locale non tracée n'est introduite.

### Story 13.1.2: Socle visuel - tokens et composants UI clés

En tant qu'équipe produit,
je veux un jeu de tokens visuels et des composants UI clés normalisés,
afin d'éviter les variations de couleurs/typo/spacing et les patchs répétitifs.

**Critères d'acceptation :**

**Étant donné** le shell global stabilisé  
**Quand** les tokens et composants clés (boutons, champs, tables, alertes, modales) sont harmonisés  
**Alors** les écrans Epic 11 réutilisent les mêmes briques visuelles  
**Et** les styles inline opportunistes sont éliminés du périmètre traité.

### Story 13.2.1: Remédiation visuelle - lot Auth + Caisse

En tant qu'équipe produit,
je veux corriger les écarts visuels du lot Auth + Caisse (hors exclusions),
afin de traiter un premier lot court et fortement visible avec contexte réduit.

**Critères d'acceptation :**

**Étant donné** les écrans des stories 11.1 et 11.2 (hors exclusions)  
**Quand** le lot est corrigé selon la checklist copy/consolidate/security  
**Alors** les écarts critiques/majeurs du lot sont fermés  
**Et** chaque écran modifié a des preuves avant/après dans les manifests.

### Story 13.2.2: Remédiation visuelle - lot Réception + Admin1

En tant qu'équipe produit,
je veux corriger les écarts visuels du lot Réception + Admin1 (hors exclusions),
afin de maintenir des stories courtes tout en couvrant les parcours métiers clés.

**Critères d'acceptation :**

**Étant donné** les écrans des stories 11.3 et 11.4 (hors exclusions)  
**Quand** le lot est corrigé selon la checklist copy/consolidate/security  
**Alors** les écarts critiques/majeurs du lot sont fermés  
**Et** chaque écran modifié a des preuves avant/après dans les manifests.

### Story 13.2.3: Remédiation visuelle - lot Admin2 + Admin3/Categories

En tant qu'équipe produit,
je veux corriger les écarts visuels du lot Admin2 + Admin3/Categories (hors exclusions),
afin de terminer la convergence visuelle admin sans surcharge de contexte.

**Critères d'acceptation :**

**Étant donné** les écrans des stories 11.5 et 11.6 (hors exclusions)  
**Quand** le lot est corrigé selon la checklist copy/consolidate/security  
**Alors** les écarts critiques/majeurs du lot sont fermés  
**Et** chaque écran modifié a des preuves avant/après dans les manifests.

### Story 13.3.1: QA visuelle continue - process et livrables

En tant qu'organisation,
je veux un process QA visuelle standardisé pour chaque livraison UI,
afin que chaque story produise les mêmes preuves et soit reprise facilement.

**Critères d'acceptation :**

**Étant donné** le gate qualité Epic 11 défini  
**Quand** une story visuelle est livrée  
**Alors** build + tests co-locés + captures avant/après + mini-audit domaine sont exécutés  
**Et** les manifests/preuves sont complets et vérifiables.

### Story 13.3.2: QA visuelle continue - enforcement et non-régression

En tant qu'organisation,
je veux un mécanisme d'enforcement systématique avant validation finale,
afin de bloquer les régressions visuelles et maintenir la parité dans le temps.

**Critères d'acceptation :**

**Étant donné** le process QA défini  
**Quand** un lot visuel est proposé en "done"  
**Alors** la validation est refusée si un écart critique/majeur non accepté subsiste  
**Et** toute régression est tracée avec action corrective planifiée avant clôture.

---

## Epic 14: Operationalisation identite unifiee RecyClique-Paheko

Transformer la fondation technique IAM/SSO de l'Epic 12 en parcours reel "pret a l'emploi" (dev puis prod), avec un IdP commun, une configuration OIDC coherente entre RecyClique et Paheko, et des runbooks d'exploitation.

**Prerequis :** Epic 12 done (12.1 a 12.6), Epic 13 stable.

**FRs couverts :** FR17 (principal), FR16 (fallback/transition), FR13b (coherence mapping identite), NFR-S1 a NFR-S4, NFR-I1.

### Story 14.0: Gate de faisabilite OIDC cible (Paheko image/version/environnement)

En tant qu'admin technique,
je veux valider officiellement la faisabilite OIDC sur l'image/version Paheko cible,
afin de lever toute ambiguite avant la generalisation.

**Criteres d'acceptation :**

**Etant donne** l'image Paheko cible dev/prod  
**Quand** un test controle active OIDC (config minimale + verification login)  
**Alors** la capacite est confirmee/invalidee avec preuves techniques  
**Et** les limites/contraintes (version, mode hebergement, prerequis) sont documentees dans un runbook.

### Story 14.1: Provisionner IdP commun (dev/prod) et clients OIDC

En tant qu'equipe technique,
je veux provisionner un IdP commun et declarer les clients OIDC RecyClique/Paheko,
afin d'avoir un socle d'identite unique.

**Criteres d'acceptation :**

**Etant donne** un environnement dev (puis prod)  
**Quand** l'IdP est deploye et les clients OIDC configures  
**Alors** les redirect URIs, secrets et scopes sont en place  
**Et** les secrets sont geres hors code source.

### Story 14.2: Configurer Paheko OIDC et strategie de mapping utilisateur

En tant qu'admin technique,
je veux configurer Paheko en client OIDC avec une strategie de mapping claire,
afin de garantir la continuite d'identite sans ambiguite.

**Criteres d'acceptation :**

**Etant donne** un IdP commun operationnel  
**Quand** Paheko est configure OIDC  
**Alors** le login OIDC Paheko fonctionne avec les utilisateurs attendus  
**Et** la regle de mapping (`email`/`sub`) est documentee et testee.

### Story 14.3: Finaliser integration RecyClique OIDC runtime (env, secrets, checks)

En tant qu'equipe backend,
je veux finaliser la configuration runtime OIDC de RecyClique,
afin que le flux BFF livre en Epic 12 soit exploitable sans bricolage.

**Criteres d'acceptation :**

**Etant donne** un IdP commun et la config runtime  
**Quand** un utilisateur lance la connexion depuis RecyClique  
**Alors** le flux `/v1/auth/sso/start` -> callback -> session fonctionne en conditions reelles  
**Et** les health checks / logs permettent le diagnostic des incidents auth.

### Story 14.4: E2E auth cross-plateforme et non-regression fail-closed

En tant que QA,
je veux des tests E2E et de non-regression sur les parcours auth,
afin de securiser la mise en service et les evolutions futures.

**Criteres d'acceptation :**

**Etant donne** la configuration OIDC complete  
**Quand** les tests auth sont executes  
**Alors** les parcours nominaux et deny/fail-closed sont valides  
**Et** les regressions critiques bloquent la validation.

### Story 14.5: Runbooks d'exploitation (onboarding, incident auth, rollback)

En tant qu'equipe exploitation,
je veux des runbooks operationnels de bout en bout,
afin d'exploiter, diagnostiquer et revenir en arriere en securite.

**Criteres d'acceptation :**

**Etant donne** la mise en service identite unifiee  
**Quand** un incident auth survient ou qu'un rollback est necessaire  
**Alors** les runbooks permettent une action rapide et reproductible  
**Et** les criteres de succes/retour a la normale sont explicites.

---

## Epic 15 — Conformite visuelle et fonctionnelle : parite 1.4.4

**Contexte et diagnostic :**
Audit du 2026-03-01 : les epics 11 et 13 ont declare "done" sans jamais avoir implementé le design
de la 1.4.4. La nouvelle app possede la logique metier mais aucune correspondance visuelle avec
la reference. Screenshots de reference disponibles dans
`_bmad-output/implementation-artifacts/screenshots/11-0/` (captures de la 1.4.4 sur VPS staging).

**Objectif :** Reconstruire proprement le shell global et les pages prioritaires pour obtenir
une experience identique a la 1.4.4 — navigation, couleurs, composants, fonctionnement.

**Dependances amont :**
- Epic 1-10 done (logique metier presente, APIs fonctionnelles)
- Auth legacy local en place (rollback OIDC effectue)
- `FIRST_ADMIN_*` bootstrap .env fonctionnel

**References visuelles obligatoires pour chaque story :**
- Screenshots 11-0 dans `_bmad-output/implementation-artifacts/screenshots/11-0/`
- Code source 1.4.4 dans `references/ancien-repo/` (clone git)
- Charte : `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`

**Definition of done Epic 15 :**
- Build OK (`npm run build` + `docker compose up --build`)
- Chaque page livree = preuve visuelle avant/apres (screenshot)
- Aucun "Failed to construct URL" ni crash console sur les routes concernees
- Tests Vitest co-loces passes sur les composants modifies

---

### Story 15.0: Fix critique — URLs API invalides (bloquant)

En tant qu'utilisateur,
je veux que les pages se chargent sans crash "Failed to construct URL: Invalid URL",
afin de pouvoir utiliser l'application.

**Contexte technique :**
`getBase()` retourne `''` quand `VITE_API_BASE_URL` n'est pas defini.
`new URL('/v1/...')` avec base vide = TypeError en JavaScript.
14 occurrences dans 7 fichiers API : `adminReports.ts`, `reception.ts`, `admin.ts`,
`adminHealthAudit.ts`, `caisse.ts`, `adminUsers.ts`, `categories.ts`.

**Criteres d'acceptation :**

**Etant donne** `VITE_API_BASE_URL` non defini (mode dev Vite avec proxy)  
**Quand** l'utilisateur navigue vers n'importe quelle page (Rapports caisse, Ouverture session, etc.)  
**Alors** aucun "Failed to construct URL: Invalid URL" n'apparait en console  
**Et** les appels API aboutissent correctement via le proxy Vite  

**Implementation :**
- Creer un helper partage `frontend/src/api/_buildUrl.ts` : `buildUrl(path, params?)` qui
  utilise `new URL(path, getBase() || window.location.origin)` + URLSearchParams
- Remplacer tous les `new URL(\`\${getBase()}/...\`)` par `buildUrl('/v1/...')`
- Tester chaque route concernee apres fix

**Fichiers a modifier :**
`frontend/src/api/adminReports.ts`, `reception.ts`, `admin.ts`, `adminHealthAudit.ts`,
`caisse.ts`, `adminUsers.ts`, `categories.ts` + nouveau `_buildUrl.ts`

---

### Story 15.1: Shell global — bandeau vert, navigation horizontale, brand correct

En tant qu'utilisateur,
je veux un header vert avec navigation horizontale identique a la 1.4.4,
afin de retrouver l'experience visuelle de reference.

**Reference visuelle :** `screenshots/11-0/caisse/caisse-01-dashboard.png`,
`screenshots/11-0/auth/auth-01-login.png`

**Criteres d'acceptation :**

**Etant donne** n'importe quelle page de l'application  
**Quand** l'utilisateur la consulte  
**Alors** un bandeau vert pleine largeur est visible en haut avec :
  - Logo RecyClique (icone recyclage SVG + texte "RecyClique") a gauche
  - Navigation horizontale centree : "Tableau de bord" | "Caisse" | "Reception" | "Administration"
  - Dropdown utilisateur a droite (prenom/nom + chevron, logout au clic)
  - Couleur brand : vert (extraire le vert exact depuis les screenshots : approx `#2e7d32`)
**Et** il n'y a plus de sidebar gauche blanche avec liens texte  
**Et** les pages login/pin (non loguees) affichent le bandeau vert sans la navigation (centree)  
**Et** les liens "Creer un compte" et "Mot de passe oublie ?" sont supprimes de la page login  

**Implementation :**
- Réécrire `AppShell.tsx` : header vert + zone contenu (pas de sidebar)
- Réécrire `AppShellNav.tsx` : nav horizontale avec onglets, icones Mantine
- Mettre a jour `tokens.ts` : `brandScale` vert (remplacer le bleu)
- Supprimer sidebar CSS dans `app-shell.css`
- Supprimer liens signup/forgot dans `LoginPage.tsx`
- Conserver mode caisse verrouille (menu reduit caisse uniquement)

---

### Story 15.2: Dashboard Caisse — Sélection du Poste de Caisse

En tant qu'operateur caisse,
je veux retrouver la page de selection du poste identique a la 1.4.4,
afin de choisir mon poste en un coup d'oeil.

**Reference visuelle :** `screenshots/11-0/caisse/caisse-01-dashboard.png`

**Criteres d'acceptation :**

**Etant donne** un utilisateur connecte arrivant sur `/caisse`  
**Quand** la page se charge  
**Alors** les postes de caisse sont affiches en cards horizontales :
  - Card blanche : nom du poste, site, badge status ("FERMEE" rouge ou "OUVERTE"), bouton "Ouvrir"
  - Card "Caisse Virtuelle" : badge "SIMULATION", description, bouton "Simuler", bordure pointillee
  - Card "Saisie differee" : fond orange pale, badge "ADMIN", description, bouton "Acceder"
**Et** le titre de la page est "Selection du Poste de Caisse"

**Implementation :**
- Réécrire `CaisseDashboardPage.tsx` avec les 3 types de cards distincts
- Appliquer les styles specifiques (badge couleur, card orange, bordure pointillee)
- Garder la logique existante (API calls, setCurrentRegister)

---

### Story 15.3: Saisie Vente Caisse — interface complete

En tant qu'operateur caisse,
je veux la page de saisie de vente identique a la 1.4.4,
afin de saisir les ventes efficacement avec les raccourcis clavier et le ticket en temps reel.

**Reference visuelle :** `screenshots/11-0/caisse/caisse-04-saisie-vente.png`

**Criteres d'acceptation :**

**Etant donne** une session caisse ouverte sur `/cash-register/sale`  
**Quand** l'operateur accede a la saisie  
**Alors** la page affiche :
  - Header vert dedie (remplace le bandeau global) : "agent [username] Session #[id]" a gauche,
    bouton rouge "Fermer la Caisse" a droite
  - Barre de stats violette/sombre : TICKETS, DERNIER TICKET, CA JOUR, DONS JOUR,
    POIDS SORTIS, POIDS RENTRES + toggle Live/Session + heure
  - Zone principale : tabs "Categorie" | "Sous-categorie" | "Poids" | "Prix"
  - Grille de cards categories : nom + code raccourci clavier (lettre en badge)
  - Panneau lateral droit "Ticket de Caisse" : liste articles, total, bouton "Entree"

**Implementation :**
- Réécrire `CashRegisterSalePage.tsx` avec layout specifique (pas de PageContainer standard)
- Header caisse dedie + stats bar comme composants internes
- Grille categories en CSS Grid avec cards interactives et raccourcis clavier
- Panneau ticket droit avec mise en page fixe
- Garder la logique metier existante (cart, presets, paiements, offline)

---

### Story 15.4: Page Réception — interface complete

En tant qu'operateur reception,
je veux retrouver la page de reception identique a la 1.4.4,
afin d'ouvrir un poste et gerer les tickets efficacement.

**Reference visuelle :** `screenshots/11-0/reception/reception-01-accueil-module.png`

**Criteres d'acceptation :**

**Etant donne** un utilisateur sur `/reception`  
**Quand** la page se charge  
**Alors** la page affiche :
  - Titre "Module de Reception" avec icone, + "Bonjour [username]" + bouton "Voir tous les tickets"
  - Gros bouton vert pleine largeur "+" "Ouvrir un poste de reception"
  - Bouton secondaire orange "Saisie differee"
  - Section "Tickets Recents" : liste paginee avec ID court (#xxxxxxxx), date, operateur,
    nb articles, poids total, badge statut (Ouvert vert / Ferme gris),
    bouton "Modifier" (si ouvert) ou "Voir les details"
  - Pagination : "Affichage de X a Y sur Z tickets", selecteur "Par page", Precedent/Suivant

**Implementation :**
- Réécrire `ReceptionAccueilPage.tsx` avec le nouveau layout
- Composant ticket card stylise avec statut colore
- Garder la logique existante (openPoste, createTicket, closeTicket, stats, export)

---

### Story 15.5: Dashboard Admin — stats et navigation

En tant qu'administrateur,
je veux retrouver le dashboard admin identique a la 1.4.4,
afin d'avoir une vue d'ensemble et d'acceder aux fonctions admin rapidement.

**Reference visuelle :** `screenshots/11-0/admin-1/admin1-01-dashboard-admin.png`

**Criteres d'acceptation :**

**Etant donne** un admin sur `/admin`  
**Quand** la page se charge  
**Alors** la page affiche :
  - Titre "Tableau de Bord d'Administration"
  - Barre de resumé : Notifications (N) | CA Mois | Utilisateurs connectes (N)
  - Section "Statistiques quotidiennes" : 3 cards colorees :
    * Card verte — "Financier" : montant CA + dons du jour
    * Card orange — "Poids sorti" : kg sortis aujourd'hui
    * Card bleue — "Poids recu" : kg recus aujourd'hui
  - Section "Navigation principale" : 6 blocs en grille 3x2 avec icones et couleurs :
    * Bleu clair : "Utilisateurs & Profils"
    * Vert clair : "Groupes & Permissions"
    * Orange : "Categories & Tarifs"
    * Gris : "Sessions de Caisse"
    * Vert pale : "Sessions de Reception"
    * Rouge pale : "Activite & Logs"
  - Section "Administration Super-Admin" (si super_admin) : 3 blocs :
    * "Sante Systeme", "Parametres Avances", "Sites & Caisses"

**Implementation :**
- Réécrire `AdminDashboardPage.tsx` avec le layout par sections
- API stats du jour a creer si inexistante (ou adapter ce qui existe)
- Blocs navigation avec icones Mantine et couleurs de fond specifiques
- Garder la logique existante (pahekoAccessDecision, etc.)

---

## Epic 16: Audit global de conformation + derive BMAD (sans remediation)

Produire un audit global de conformation de RecyClique (securite/session/acces, conformite fonctionnelle, robustesse/qualite) et un audit de derive BMAD (intention initiale vs etat observe), avec preuves factuelles, priorisation claire et **sans correction de code dans cet epic**.

**Objectif non negociable :** cadrer proprement l'etat reel avant toute remediations.

**Perimetre inclus (sources de preuve) :**
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md` (epics/stories initiaux et evolutions)
- `_bmad-output/implementation-artifacts/` (audits, reviews, snapshots, retros, captures)
- `references/ancien-repo/` (baseline 1.4.4)
- audits precedents deja produits (ex. `11-0-audit-derive-global-staging-vs-1.4.4.md`)

**Exclusions explicites :**
- bruit technique d'execution (`node_modules`, caches, logs runtime)
- etats machine/autopilot (`*.agent-state.json`, `README-autopilot-state`)
- secrets/credentials
- documents hors perimetre conformation RecyClique

**FRs couverts (mode audit/verif uniquement) :** verification transversale FR1 a FR27, avec focus prioritaire FR4/FR5/FR14/FR15/FR16/FR17 (acces et roles), FR21/FR26 (placeholders/stubs), NFR-S*, NFR-I*, NFR-P*.

### Story 16.1: [BLOQUANT] Lot A — Audit securite, session et acces (front + back)

En tant que product owner,
je veux un audit factuel du comportement securite/session/acces (logout, guards front et back, routes sensibles, super-admin phase 1),
afin d'identifier les risques bloquants avant toute remediations.

**Contrainte ferme :** audit seulement, sans remediation code.

**Acceptance Criteria:**

**Given** un environnement de verification et les references PRD/Architecture/Epics/artefacts existants  
**When** l'audit Lot A est execute sur les parcours connecte/deconnecte et sur les routes sensibles  
**Then** un inventaire des ecarts est produit avec severite, reproduction, preuve, impact et hypothese de cause  
**And** le livrable couvre au minimum: logout effectif (token/session), guards front, guards back (API), acces routes sensibles, visibilite/droits super-admin phase 1.

**Given** les role matrices cible et etat observe  
**When** la verif de droits est faite role par role  
**Then** chaque route/ecran sensible est classe en conforme / non conforme / non verifiable  
**And** toute non-conformite est classee avec priorite `bloquant`, `important` ou `confort`.

**Livrables de preuve obligatoires :**
- matrice d'acces (role x route x etat attendu/observe)
- journal de tests manuels cible (logout, routes deconnecte, routes admin, APIs sensibles)
- liste des ecarts P0/P1/P2 avec references aux captures/artefacts existants

### Story 16.2: [IMPORTANT] Lot B — Audit conformite fonctionnelle + inventaire stubs/placeholders

En tant que product owner,
je veux un audit de conformite fonctionnelle et un inventaire des stubs/placeholders (incluant super-admin phase 2 contenu),
afin de distinguer clairement ce qui est reellement implemente de ce qui est partiel ou fictif.

**Contrainte ferme :** audit seulement, sans remediation code.

**Acceptance Criteria:**

**Given** les stories livrees (jusqu'a Epic 15) et les references 1.4.4  
**When** le lot B est audite ecran par ecran et flux par flux  
**Then** chaque fonctionnalite est etiquetee `conforme`, `ecart`, `stub`, `placeholder`, `hors-perimetre`  
**And** les ecarts incluent la preuve associee (artifact/review/snapshot/capture) et le niveau de criticite.

**Given** le domaine super-admin  
**When** l'audit phase 2 contenu est realise  
**Then** la liste des contenus attendus vs observes est completee  
**And** chaque manque est classe entre `manque de role`, `stub`, `dette technique` ou `derive assumee`.

**Livrables de preuve obligatoires :**
- registre stubs/placeholders consolide (avec statut et impact metier)
- matrice conformite fonctionnelle (attendu PRD/epics vs observe)
- annexe super-admin phase 2 (contenus presents/manquants + classification)

### Story 16.3: [IMPORTANT] Lot C — Audit robustesse et qualite (tests, couverture, zones fragiles)

En tant que product owner,
je veux un audit robustesse/qualite focalise sur les tests manquants, la couverture et les zones fragiles,
afin d'objectiver le risque de regression avant remediations.

**Contrainte ferme :** audit seulement, sans remediation code.

**Acceptance Criteria:**

**Given** le code et les preuves QA existantes  
**When** le lot C est audite sur les zones critiques (auth, sessions, admin, routes sensibles)  
**Then** une cartographie des trous de couverture est produite (tests presents vs manquants)  
**And** chaque trou est associe a un risque (securite, fonctionnel, non-regression) et a une priorite.

**Given** les retro/reviews/audits deja produits  
**When** les zones fragiles recurrentes sont consolidees  
**Then** une shortlist des modules a forte fragilite est fournie  
**And** les justifications pointent vers des preuves existantes (review JSON, retro, captures, logs de build/test).

**Livrables de preuve obligatoires :**
- heatmap risque x couverture (par domaine)
- inventaire tests critiques manquants (sans implementation)
- liste des "zones rouges" a surveiller en remediation

### Story 16.4: [BLOQUANT] Audit de derive BMAD — intention initiale vs etat observe

En tant que sponsor produit,
je veux un audit de derive qui compare l'intention initiale (PRD/architecture/epics initiaux) a l'etat observe,
afin de classifier les ecarts et aligner la suite sans ambiguite.

**Contrainte ferme :** audit seulement, sans remediation code.

**Acceptance Criteria:**

**Given** les documents d'intention (PRD, architecture, epics initiaux) et les preuves d'etat actuel  
**When** la comparaison est faite exigence par exigence et story par story  
**Then** chaque ecart est classe dans une taxonomie unique: `bug`, `stub`, `derive assumee`, `manque de role`, `dette technique`  
**And** chaque classification est justifiee par une preuve et une decision explicite (a confirmer si ambigu).

**Given** les ecarts classes  
**When** la priorisation globale est etablie  
**Then** la sortie fournit un backlog d'audit priorise `bloquant / important / confort`  
**And** ce backlog ne contient aucune tache de correction, uniquement des constats et cadrages.

**Livrables de preuve obligatoires :**
- matrice de derive (intention -> observe -> classification -> impact)
- tableau de priorites globales (P0/P1/P2)
- synthese "derive assumee vs derive subie" validable produit

### Story 16.5: [BLOQUANT] Consolidation finale audit global + Definition of Done

En tant que decideur projet,
je veux une sortie audit unique, exécutable et partageable,
afin de lancer ensuite les remediations sur une base stable et objective.

**Contrainte ferme :** audit seulement, sans remediation code.

**Acceptance Criteria:**

**Given** les livrables des lots A/B/C et de l'audit de derive  
**When** la consolidation finale est produite  
**Then** le dossier d'audit contient l'ensemble des preuves et un ordre de priorite unique `bloquant / important / confort`  
**And** chaque item est actionnable sans re-ouvrir un chantier de cadrage.

**Given** la Definition of Done de l'audit global  
**When** la revue de cloture est faite  
**Then** l'audit est considere done uniquement si tous les criteres ci-dessous sont atteints  
**And** aucune remediation code n'a ete introduite dans le cadre de cet epic.

**Definition of Done — Audit Global (obligatoire):**
- perimetre complet couvert (Lot A, Lot B, Lot C, derive BMAD)
- preuves tracees pour chaque ecart (artifact/review/capture/reference)
- classification complete des ecarts (`bug`, `stub`, `derive assumee`, `manque de role`, `dette technique`)
- priorisation unique `bloquant / important / confort`
- zones non verifiees explicitement listees
- decision de passage a la phase remediation possible sans nouveau recadrage

---

## Epic 17: Remediation post-audit 16-0 (sans nouveau scope)

Livrer une remediation strictement limitee aux 18 ecarts du tableau unique `16-0-tableau-unique-ecarts.md`, avec priorisation en vagues P0/P1/P2, preuves obligatoires de fermeture par ID, et execution strictement story par story.

**Prerequis :** Epic 16 done et valide (DoD atteint).

**Contrainte ferme de perimetre :**
- Source unique de priorisation/cadrage: `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md`.
- Aucun nouvel audit global.
- Aucun nouveau perimetre hors ecarts `E16-*`.
- Execution: une story a la fois, avec validation avant la suivante.

**FRs couverts :** FR-R01 a FR-R18.

### Vague 1 — P0 (bloquant)

### Story 17.0: Stabilisation QA/Harness critique (clusters Auth Harness + Vitest Runtime)

As a equipe produit/QA,
I want stabiliser d'abord la base de preuve backend et frontend,
So that toutes les remediations suivantes puissent etre validees de facon fiable, sans faux positifs ni faux negatifs.

**Acceptance Criteria:**

**Given** la campagne actuelle invalidee sur auth/session et les runs Vitest groupes instables  
**When** la story de stabilisation est executee en tete de vague 1  
**Then** le cluster Auth Harness est fiabilise sans doublon d'implementation pour `E16-A-003` + `E16-C-002`  
**And** le cluster Vitest Runtime est fiabilise sans doublon d'implementation pour `E16-A-004` + `E16-C-003`.

**Mapping E16-\* :** `E16-A-003`, `E16-C-002`, `E16-A-004`, `E16-C-003`  
**Dependances :** aucune (story de depart obligatoire)  
**Preuves obligatoires de fermeture :**
- sortie pytest montrant la suite auth/session exploitable (sans erreurs setup bloquantes),
- sortie Vitest multi-fichiers sans blocage de process en fin de run,
- mise a jour du journal de preuves avec liens vers commandes/fichiers concernes.

### Story 17.1: Verrouillage RBAC super-admin phase 1 (front + back)

As a responsable securite,
I want imposer un verrouillage role-based coherent des routes super-admin phase 1 sur front et back,
So that aucun role admin non autorise ne puisse acceder aux surfaces sensibles.

**Acceptance Criteria:**

**Given** les routes super-admin phase 1 actuellement exposées de manière non conforme  
**When** la politique d'accès est appliquee et alignee front/back  
**Then** les routes sensibles super-admin phase 1 ne sont accessibles qu'aux roles autorises  
**And** les cas interdits sont bloques explicitement et traces dans les tests.

**Mapping E16-\* :** `E16-A-001`, `E16-C-004`  
**Dependances :** Story `17.0`  
**Preuves obligatoires de fermeture :**
- matrice role x route mise a jour et conforme,
- tests front/back des routes sensibles (autorise/interdit) verts,
- preuve code sur routes `/admin/health`, `/admin/settings`, `/admin/sites` et guards associes.

### Story 17.2: Correction controle d'acces `/v1/users/me` en etat deconnecte

As a utilisateur non authentifie,
I want recevoir un refus 401 sur `/v1/users/me`,
So that le controle d'acces utilisateur courant respecte le contrat de securite.

**Acceptance Criteria:**

**Given** une requete sur `/v1/users/me` sans session/token valide  
**When** l'endpoint est appele  
**Then** la reponse est 401 (et non 200)  
**And** le test automatique correspondant passe dans la campagne standard.

**Mapping E16-\* :** `E16-C-001`  
**Dependances :** Story `17.0`  
**Preuves obligatoires de fermeture :**
- test `test_get_me_unauthorized` vert,
- sortie pytest de la campagne cible integree,
- reference explicite au diff backend concerné.

### Story 17.3: Completion operationnelle admin BDD (export/purge/import)

As a admin technique,
I want des actions BDD admin reelement operationnelles (sans stub),
So that la maintenance et la reprise de donnees puissent etre executees en conditions reelles.

**Acceptance Criteria:**

**Given** les actions admin BDD actuellement en mode stub  
**When** j'exécute export, purge transactionnelle et import  
**Then** chaque action produit un effet metier reel et verifiable  
**And** les erreurs sont gerees proprement avec reponses API explicites.

**Mapping E16-\* :** `E16-B-001`  
**Dependances :** Story `17.0`  
**Preuves obligatoires de fermeture :**
- test(s) API/integre validant effet reel des trois actions,
- preuve fonctionnelle front reliée a des reponses non-stub,
- artefact de verification (journal manuel ou sortie commande) lie a `E16-B-001`.

### Vague 2 — P1 (important)

### Story 17.4: Guard explicite `/admin` + tests d'integration routeur global

As a administrateur legitime,
I want une protection explicite de la route `/admin` et une couverture d'integration du routeur global,
So that les regressions de guard/routage critiques soient detectees automatiquement.

**Acceptance Criteria:**

**Given** la route front `/admin` et le routeur global critique  
**When** les guards et tests d'integration sont mis en place  
**Then** l'acces non autorise a `/admin` est bloque explicitement  
**And** les parcours de routage critiques ne reposent plus sur un test placeholder.

**Mapping E16-\* :** `E16-A-002`, `E16-C-005`  
**Dependances :** Story `17.1`  
**Preuves obligatoires de fermeture :**
- tests d'integration `App`/guards verts (plus de placeholder),
- verification manuelle autorise/interdit sur `/admin`,
- lien explicite vers les fichiers de tests et routeur modifies.

### Story 17.5: Completion pipeline import legacy CSV (analyze/preview/validate/execute)

As a admin technique,
I want un pipeline import legacy completement operationnel,
So that la migration legacy puisse etre executee de bout en bout sans reponses stub.

**Acceptance Criteria:**

**Given** un jeu de donnees CSV legacy representatif  
**When** je lance analyze, preview, validate puis execute  
**Then** chaque etape retourne un resultat metier reel et coherent  
**And** les cas d'erreur de donnees invalides sont explicitement geres.

**Mapping E16-\* :** `E16-B-002`  
**Dependances :** Story `17.3`  
**Preuves obligatoires de fermeture :**
- trace complete du pipeline (4 etapes) sur jeu de test,
- resultats API non-stub avec assertions sur effets reels,
- preuve UI correspondante sur `AdminImportLegacyPage`.

### Story 17.6: Persistance parametres admin + couverture API `/v1/admin/settings`

As a administrateur,
I want que les parametres admin soient vraiment persistés et couverts par des tests API ciblés,
So that les regressions de configuration ne passent plus silencieusement.

**Acceptance Criteria:**

**Given** des modifications de parametres alertes/session/email  
**When** elles sont enregistrees puis relues  
**Then** les valeurs persistent effectivement et sont restituées correctement  
**And** une couverture de tests API cibles `/v1/admin/settings` valide les parcours nominaux et erreurs.

**Mapping E16-\* :** `E16-B-003`, `E16-C-006`  
**Dependances :** Story `17.0`  
**Preuves obligatoires de fermeture :**
- tests API `/v1/admin/settings` ajoutes et verts,
- preuve de persistance reelle (ecriture + relecture),
- verification front `AdminSettingsPage` sur donnees persistées.

### Story 17.7: Supervision admin non-stub (anomalies + test notifications)

As a admin exploitation,
I want une supervision admin complete et non-stub,
So that la detection d'anomalies et les notifications de test soient exploitables en production.

**Acceptance Criteria:**

**Given** la page de sante admin et les endpoints associes  
**When** je consulte les anomalies et lance un test de notification  
**Then** les informations retournees correspondent a des controles reels  
**And** le test de notification execute un flux effectif, pas un placeholder.

**Mapping E16-\* :** `E16-B-004`  
**Dependances :** Story `17.0`  
**Preuves obligatoires de fermeture :**
- test(s) API sur endpoints health/admin concernes,
- validation front `AdminHealthPage` avec donnees non-stub,
- artefact de verification notification (resultat attendu/observe).

### Vague 3 — P2 (confort)

### Story 17.8: Logs email admin exploitables

As a admin,
I want consulter des logs email utiles,
So that je puisse auditer l'historique des envois et diagnostiquer les incidents.

**Acceptance Criteria:**

**Given** des envois email existants dans le systeme  
**When** j'ouvre la vue logs email admin  
**Then** la liste affiche des donnees exploitables (pas vide par défaut hors cas réel)  
**And** les filtres/champs essentiels permettent une lecture operationnelle.

**Mapping E16-\* :** `E16-B-005`  
**Dependances :** Story `17.7`  
**Preuves obligatoires de fermeture :**
- test(s) API de consultation logs email,
- verification front `AdminEmailLogsPage`,
- preuve de donnees de logs reelles ou jeu de test reproductible.

### Story 17.9: Rapports admin complets (by-session/export-bulk)

As a administrateur,
I want des rapports admin complets et exportables en masse,
So that le reporting operationnel ne soit plus limite a des sorties minimales.

**Acceptance Criteria:**

**Given** des sessions et donnees de caisse disponibles  
**When** je consulte les rapports by-session et lance un export-bulk  
**Then** les sorties contiennent les informations metier attendues  
**And** le format d'export est exploitable sans retraitement manuel lourd.

**Mapping E16-\* :** `E16-B-006`  
**Dependances :** Story `17.3`  
**Preuves obligatoires de fermeture :**
- test(s) API rapports + export-bulk,
- verification front `AdminReportsPage`,
- exemple de sortie export valide.

### Story 17.10: Discoverabilite super-admin phase 2 dans la navigation

As a super-admin,
I want retrouver les routes techniques phase 2 via la navigation,
So that l'acces fonctionnel ne depenne plus de chemins caches.

**Acceptance Criteria:**

**Given** les routes techniques phase 2 existantes mais peu visibles  
**When** la navigation super-admin est revue dans le perimetre 16-0  
**Then** les routes techniques cibles sont accessibles depuis le menu attendu  
**And** cette exposition n'ouvre pas de droits supplementaires non autorises.

**Mapping E16-\* :** `E16-B-007`  
**Dependances :** Story `17.1`  
**Preuves obligatoires de fermeture :**
- verification navigation super-admin sur routes techniques ciblees,
- tests de non-regression d'acces (autorise/interdit),
- trace de conformité avec annexe super-admin phase 2.

### Story 17.11: Renforcement tests admin technique hors "happy path stub"

As a equipe QA,
I want des tests admin technique qui valident des effets metier reels et cas d'erreur,
So that la robustesse ne soit plus surestimee par des tests purement structurels.

**Acceptance Criteria:**

**Given** les modules admin BDD/import legacy et leurs parcours critiques  
**When** les tests sont elargis au-dela du contrat de stub  
**Then** les assertions couvrent des effets metier reels et des chemins d'erreur significatifs  
**And** les tests servent de garde-fous de non-regression sur les zones techniques critiques.

**Mapping E16-\* :** `E16-C-007`  
**Dependances :** Stories `17.3` et `17.5`  
**Preuves obligatoires de fermeture :**
- nouveaux tests backend admin technique verts,
- couverture minimale documentee des cas d'erreur critiques,
- lien explicite entre tests ajoutes et fermeture `E16-C-007`.

**Regle d'execution transversale Epic 17 (obligatoire):**
- ordre strict des vagues: V1 -> V2 -> V3,
- execution stricte story par story (aucun run massif),
- fermeture d'un `E16-*` uniquement apres preuve associee validee.

---

## Epic 18: Operationnalisation terrain

Rendre l'application praticable en conditions réelles : (1) page admin BDD fonctionnelle identique à la 1.4.4 (export/import/purge via pg_dump/pg_restore binaire), (2) interface caisse complète avec toutes les fonctionnalités, workflows et raccourcis clavier de la 1.4.4. Les Epics 1–17 ont livré la structure ; cet epic livre le fonctionnel terrain.

**Règle de refactor brownfield** : s'applique à toutes les stories de cet epic.
Pour chaque story d'implémentation :
- **Copy** : identifier les fichiers source 1.4.4 concernés (chemins listés dans chaque story).
- **Consolidate** : réécrire / adapter dans la stack actuelle (FastAPI + Mantine) — pas de copier-coller brut.
- **Security** : pas de secret en dur, audit rapide, `npm audit` / `pip audit` OK.
Preuve Copy/Consolidate/Security obligatoire dans les Completion Notes de chaque story.

**Règles d'exécution :**
- Ordre strict : stories d'audit avant stories d'implémentation dans chaque domaine.
- Chaque story = un livrable vérifiable (artefact ou preuve fonctionnelle).
- P0 (bloquant terrain) avant P1 (confort) avant P2 (optionnel).
- Toute nouvelle story ajoutée précise son niveau P0/P1/P2 et sa dépendance.

---

### Vague P0 — Domaine BDD admin

### Story 18.1: Audit page BDD admin — delta 1.4.4 vs implémentation actuelle

As a equipe dev,
I want un inventaire précis des écarts entre la page admin BDD 1.4.4 et l'implémentation actuelle,
So that les stories de refactor suivantes aient une cible claire et exhaustive.

**Contexte :**
La 1.4.4 utilise `pg_dump` (format binaire `.dump`, Custom `-F c`) pour l'export et `pg_restore` pour l'import — pas d'exécution SQL textuelle. Le backend actuel (`api/services/db_admin.py`) exécute du SQL texte, ce qui est incompatible avec les dumps binaires de production. La purge 1.4.4 a un périmètre de tables différent du périmètre actuel.

**Fichiers source 1.4.4 à auditer (backend) :**
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_export.py`
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_import.py`
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_purge.py`

**Fichiers source 1.4.4 à auditer (frontend) :**
- `references/ancien-repo/repo/frontend/src/services/adminService.ts` (méthodes exportDatabase, importDatabase, purgeTransactions)
- Localiser la page ou le composant admin qui expose les 3 actions BDD (chercher dans `references/ancien-repo/repo/frontend/src/pages/Admin/` et `src/components/`)

**Fichiers actuels à comparer :**
- `api/routers/v1/admin/db.py`
- `api/services/db_admin.py`
- `frontend/src/admin/AdminDbPage.tsx`
- `frontend/src/api/admin.ts` (ou équivalent)

**Acceptance Criteria:**

**Given** la lecture complète des fichiers source 1.4.4 listés ci-dessus  
**When** l'agent produit l'artefact d'audit  
**Then** l'artefact liste pour chaque action (export / import / purge) :
  - format de fichier attendu par la 1.4.4 (extension, format binaire/texte, taille max)
  - logique backend 1.4.4 (commande système, options, gestion erreurs, audit trail)
  - logique backend actuelle (différences critiques)
  - UI 1.4.4 (labels, messages, comportements UX)
  - UI actuelle (différences)
**And** l'artefact conclut par une liste ordonnée des écarts à corriger en 18.2 et 18.3

**Livrable :** `_bmad-output/implementation-artifacts/18-1-audit-bdd-admin-delta.md`  
**Dépendances :** aucune.

---

### Story 18.2: Refactor backend BDD admin — aligner sur la logique 1.4.4

As a administrateur technique,
I want que l'export, l'import et la purge BDD utilisent exactement la même logique que la 1.4.4,
So that les dumps produits et consommés soient compatibles avec la base de production.

**Contexte :**
Basé sur l'artefact `18-1-audit-bdd-admin-delta.md`.
Points critiques identifiés dans la 1.4.4 à reproduire :
- **Export** : `pg_dump -F c -Z 9 --clean --if-exists --no-owner --no-privileges` → fichier `.dump` binaire (pas SQL texte).
- **Import** : validation `pg_restore --list`, sauvegarde de sécurité automatique (`pre_restore_*.dump` dans `/backups`), terminaison des connexions actives, puis `pg_restore --clean --if-exists --no-owner --no-privileges --disable-triggers`.
- **Import** : discrimination warning vs erreur réelle (pg_restore retourne non-zéro même sur simples warnings).
- **Import** : audit trail complet (succès, timeout, erreur HTTP, exception inattendue) dans `AuditActionType.DB_IMPORT`.
- **Purge** : périmètre de tables à valider contre la 1.4.4 (tables `ligne_depot`, `ticket_depot` présentes en 1.4.4, vérifier dans le schéma actuel).

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_export.py`
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_import.py`
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_purge.py`

**Fichiers à modifier :**
- `api/routers/v1/admin/db.py`
- `api/services/db_admin.py`
- `api/tests/routers/test_admin_db_import_legacy.py` (mettre à jour les tests pour format `.dump`)

**Acceptance Criteria:**

**Given** un fichier `.dump` produit par `pg_dump -F c` (format binaire Custom PostgreSQL)  
**When** l'administrateur l'envoie via `POST /v1/admin/db/import`  
**Then** `pg_restore --list` valide le fichier avant toute action destructive  
**And** une sauvegarde automatique `pre_restore_*.dump` est créée dans `/backups` avant la restauration  
**And** les connexions actives sur la BDD sont terminées avant la restauration  
**And** la restauration s'exécute via `pg_restore --disable-triggers` (gestion contraintes FK)  
**And** les warnings pg_restore non bloquants ne font pas échouer l'import — seules les erreurs critiques remontent en 500  
**And** l'audit trail est enregistré dans tous les cas (succès, timeout, erreur HTTP, exception)

**Given** `POST /v1/admin/db/export`  
**When** appelé par un super-admin  
**Then** un fichier `.dump` binaire (format Custom pg_dump) est retourné en téléchargement  
**And** le fichier est compatible avec `pg_restore` (pas un fichier SQL texte)

**Given** `POST /v1/admin/db/purge-transactions`  
**When** appelé  
**Then** le périmètre de tables purgées correspond exactement à celui de la 1.4.4 (validé contre l'artefact 18.1)  
**And** l'ordre de suppression respecte les contraintes FK  
**And** la transaction est rollbackée intégralement en cas d'erreur

**Preuves obligatoires de fermeture :**
- Export produit un fichier `.dump` que `pg_restore --list` accepte sans erreur.
- Import d'un dump production réel : sauvegarde automatique créée, restauration réussie ou erreur gérée proprement.
- Tests API mis à jour et verts.
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** Story 18.1 (artefact audit).

---

### Story 18.3: Refactor frontend AdminDbPage — aligner UI/UX sur la 1.4.4

As a administrateur technique,
I want que la page admin/db reflète exactement les comportements UX de la 1.4.4,
So that l'interface soit cohérente avec ce que les admins connaissent.

**Contexte :**
Basé sur l'artefact `18-1-audit-bdd-admin-delta.md` (section UI).
La page actuelle `AdminDbPage.tsx` gère des fichiers `.sql` — à aligner sur le format `.dump`.

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/frontend/src/services/adminService.ts` (méthodes DB)
- Page ou composant 1.4.4 exposant les actions BDD (chemin identifié dans l'artefact 18.1)

**Fichiers à modifier :**
- `frontend/src/admin/AdminDbPage.tsx`
- `frontend/src/api/admin.ts` (ou équivalent — méthode d'appel import/export)

**Acceptance Criteria:**

**Given** la page `/admin/db`  
**When** l'admin clique "Exporter la BDD"  
**Then** le téléchargement d'un fichier `.dump` démarre (pas `.sql`)  
**And** les messages de succès/erreur correspondent aux réponses de la story 18.2

**Given** le formulaire d'import  
**When** l'admin tente d'uploader un fichier qui n'est pas `.dump`  
**Then** une erreur de validation s'affiche côté frontend avant même l'envoi

**Given** l'action de purge  
**When** l'admin clique "Purger les transactions"  
**Then** une modale de confirmation explicite s'affiche (action irréversible)  
**And** le résultat (nombre d'enregistrements supprimés par table) est affiché après confirmation

**Preuves obligatoires de fermeture :**
- Export : fichier `.dump` téléchargé visible dans le navigateur.
- Import : test avec un fichier `.dump` valide — message de succès affiché.
- Import : test avec fichier non-`.dump` — erreur validation frontend avant envoi.
- Purge : modale de confirmation visible, résultat affiché.
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** Stories 18.1 (artefact) et 18.2 (backend opérationnel).

---

### Vague P0 — Domaine Caisse

### Story 18.4: Audit caisse 1.4.4 — inventaire fonctionnel exhaustif

As a equipe dev,
I want un inventaire complet et précis de toutes les fonctionnalités de la caisse 1.4.4,
So that les stories de refactor 18.5–18.9 aient une cible exhaustive et sans angle mort.

**Contexte :**
La caisse 1.4.4 est un module très riche (keyboard shortcuts AZERTY, grille catégories, presets, ticket temps réel, multi-paiements, caisse virtuelle, saisie différée). L'implémentation actuelle est visuellement incomplète et fonctionnellement insuffisante pour le terrain.

**Fichiers source 1.4.4 à auditer — Frontend pages :**
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/CashRegisterDashboard.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/Sale.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/OpenCashSession.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/CloseSession.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/VirtualCashRegister.tsx`
- `references/ancien-repo/repo/frontend/src/pages/Admin/CashSessionDetail.tsx`
- `references/ancien-repo/repo/frontend/src/pages/Admin/SessionManager.tsx`

**Fichiers source 1.4.4 à auditer — Composants :**
- `references/ancien-repo/repo/frontend/src/components/SaleWizard.tsx`
- `references/ancien-repo/repo/frontend/src/components/FinalizationScreen.tsx`
- `references/ancien-repo/repo/frontend/src/components/CategorySelector.tsx`
- `references/ancien-repo/repo/frontend/src/components/EnhancedCategorySelector.tsx`
- `references/ancien-repo/repo/frontend/src/components/CashKPIBanner.tsx`
- `references/ancien-repo/repo/frontend/src/components/Ticket.tsx`
- `references/ancien-repo/repo/frontend/src/components/CashRegisterForm.tsx`
- `references/ancien-repo/repo/frontend/src/components/CashSessionHeader.tsx`

**Fichiers source 1.4.4 à auditer — Stores, services, utils :**
- `references/ancien-repo/repo/frontend/src/stores/cashSessionStore.ts`
- `references/ancien-repo/repo/frontend/src/stores/categoryStore.ts`
- `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.ts`
- `references/ancien-repo/repo/frontend/src/utils/azertyKeyboard.ts`
- `references/ancien-repo/repo/frontend/src/utils/keyboardShortcuts.ts`
- `references/ancien-repo/repo/frontend/src/services/cashSessionService.ts`
- `references/ancien-repo/repo/frontend/src/services/cashSessionsService.ts`
- `references/ancien-repo/repo/frontend/src/stores/virtualCashSessionStore.ts`
- `references/ancien-repo/repo/frontend/src/stores/deferredCashSessionStore.ts`

**Acceptance Criteria:**

**Given** la lecture complète de tous les fichiers listés ci-dessus  
**When** l'agent produit l'artefact d'audit  
**Then** l'artefact couvre les sections suivantes :
  1. **Layout et navigation** : structure des pages, routing, états visuels (fond caisse, header dédié, KPI banner)
  2. **Grille catégories et presets** : chargement, affichage, sous-catégories, filtres par onglet
  3. **Raccourcis clavier AZERTY** : mapping complet touche → action, comportements spéciaux (quantité, poids, prix libre)
  4. **Ticket en temps réel** : structure (lignes, total, remises, dons), états (vide, en cours, finalisé)
  5. **Finalisation et paiements** : modes de paiement, saisie montant, rendu monnaie, validation
  6. **Ouverture de session** : flux, fond de caisse, sélection poste/site
  7. **Fermeture de session** : comptage physique, contrôle totaux, écart, sync Paheko
  8. **Caisse virtuelle** : fonctionnement distinct, états spécifiques
  9. **Saisie différée** : flux, différences avec session normale
  10. **State management** : quels stores, quelles actions, quelles dépendances API
**And** pour chaque section : liste des fichiers 1.4.4 sources + composants équivalents dans la nouvelle app + écarts identifiés

**Livrable :** `_bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md`  
**Dépendances :** aucune (peut démarrer en parallèle de 18.1).

---

### Story 18.5: Caisse — layout, header session et KPI banner

As a operateur caisse,
I want retrouver le shell visuel complet de la caisse 1.4.4 (header dédié vert, bannière KPI, navigation),
So that l'interface soit immédiatement reconnaissable et utilisable.

**Contexte :** Basé sur l'artefact `18-4-audit-caisse-inventaire.md` §1 (Layout).
Les stories 15.1–15.3 ont livré une conformité visuelle partielle. Cette story aligne le layout sur la 1.4.4 de façon complète et fonctionnelle (pas seulement visuelle).

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/CashRegisterDashboard.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/` (dossier — structure routing complète)
- `references/ancien-repo/repo/frontend/src/components/CashKPIBanner.tsx`
- `references/ancien-repo/repo/frontend/src/components/CashSessionHeader.tsx`

**Fichiers actuels à réécrire/adapter :**
- `frontend/src/caisse/CaisseDashboardPage.tsx`
- `frontend/src/caisse/CashRegisterSalePage.tsx` (header + bannière stats uniquement)
- Composant équivalent à `CashKPIBanner` dans le nouveau frontend (créer si absent)

**Acceptance Criteria:**

**Given** n'importe quelle page caisse  
**When** une session est active  
**Then** le header caisse dédié remplace le header global : fond vert, icone agent + nom + numéro session à gauche, bouton "Fermer la Caisse" rouge à droite  
**And** la bannière KPI est visible sous le header avec les 6 indicateurs temps réel (TICKETS, DERNIER TICKET, CA JOUR, DONS JOUR, POIDS SORTIS, POIDS RENTRES) + toggle Live/Session + heure

**Given** le dashboard caisse `/caisse`  
**When** l'opérateur arrive  
**Then** les postes de caisse sont affichés en cards identiques à la 1.4.4 (statut, site, bouton Ouvrir)  
**And** les états vides sont gérés (aucun poste : message explicite, pas de crash)

**Preuves obligatoires de fermeture :**
- Capture avant/après layout.
- KPI banner affichée et valeurs mises à jour dynamiquement (ou stub cohérent si pas de session active).
- Zéro erreur JS bloquante sur les pages concernées.
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** Story 18.4 (artefact audit).

---

### Story 18.6: Caisse — grille catégories, sous-catégories et presets

As a operateur caisse,
I want retrouver la grille de sélection de catégories et les presets identiques à la 1.4.4,
So that je puisse saisir une vente rapidement avec les boutons que je connais.

**Contexte :** Basé sur l'artefact `18-4-audit-caisse-inventaire.md` §2 (Grille catégories).

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/frontend/src/components/CategorySelector.tsx`
- `references/ancien-repo/repo/frontend/src/components/EnhancedCategorySelector.tsx`
- `references/ancien-repo/repo/frontend/src/components/CategoryDisplayManager.tsx`
- `references/ancien-repo/repo/frontend/src/stores/categoryStore.ts`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/Sale.tsx` (section grille + onglets)

**Fichiers actuels à réécrire/adapter :**
- `frontend/src/caisse/CashRegisterSalePage.tsx` (zone grille catégories + onglets)
- Composant(s) équivalent(s) à `CategorySelector` / `EnhancedCategorySelector` dans le nouveau frontend (identifier dans `frontend/src/caisse/` ou `frontend/src/shared/`)

**Acceptance Criteria:**

**Given** la page de saisie vente  
**When** les catégories sont chargées  
**Then** elles s'affichent en grille de cards avec nom, code raccourci clavier (badge lettre), couleur si applicable  
**And** les onglets de filtrage (Catégorie / Sous-catégorie / Poids / Prix) sont fonctionnels  
**And** les presets (boutons rapides) sont affichés et cliquables

**Given** un opérateur clique sur une catégorie  
**When** des sous-catégories existent  
**Then** la vue passe automatiquement aux sous-catégories de cette catégorie (navigation identique à 1.4.4)

**Given** aucune catégorie disponible  
**When** la page se charge  
**Then** un état vide explicite est affiché — pas de crash

**Preuves obligatoires de fermeture :**
- Capture grille catégories avec données réelles (ou jeu de test).
- Navigation catégorie → sous-catégorie fonctionnelle.
- Presets visibles et cliquables.
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** Story 18.4 (artefact audit). Story 18.5 recommandée (layout en place).

---

### Story 18.7: Caisse — raccourcis clavier AZERTY et saisie rapide

As a operateur caisse,
I want utiliser les raccourcis clavier AZERTY identiques à la 1.4.4 pour saisir les ventes,
So that la saisie soit aussi rapide qu'avec l'ancienne app.

**Contexte :** Basé sur l'artefact `18-4-audit-caisse-inventaire.md` §3 (Raccourcis clavier).
C'est une fonctionnalité critique terrain — les opérateurs travaillent quasi exclusivement au clavier.

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.ts`
- `references/ancien-repo/repo/frontend/src/utils/azertyKeyboard.ts`
- `references/ancien-repo/repo/frontend/src/utils/keyboardShortcuts.ts`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/Sale.tsx` (binding des événements)
- `references/ancien-repo/repo/frontend/src/components/SaleWizard.tsx` (gestion états clavier)
- Tests de référence : `references/ancien-repo/repo/frontend/src/utils/azertyKeyboard.test.ts`, `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.test.ts`, `references/ancien-repo/repo/frontend/src/components/SaleWizard.keyboard.integration.test.tsx`

**Fichiers actuels à réécrire/adapter :**
- `frontend/src/caisse/CashRegisterSalePage.tsx` (binding événements clavier)
- Équivalent de `cashKeyboardShortcuts.ts` dans `frontend/src/caisse/utils/` ou `frontend/src/shared/` (créer si absent)

**Acceptance Criteria:**

**Given** la page de saisie vente active  
**When** l'opérateur appuie sur une lettre correspondant à un code catégorie  
**Then** la catégorie est sélectionnée immédiatement (mapping AZERTY identique à la 1.4.4)

**Given** un raccourci de quantité, poids ou prix libre  
**When** l'opérateur l'utilise  
**Then** le comportement est identique à la 1.4.4 (saisie numérique, confirmation, annulation)

**Given** les raccourcis système (Entrée, Echap, Backspace, F-keys si applicable)  
**When** utilisés  
**Then** ils déclenchent les mêmes actions que dans la 1.4.4

**Preuves obligatoires de fermeture :**
- Tests unitaires co-locés pour les utils keyboard (sur modèle des tests 1.4.4 listés ci-dessus).
- Test d'intégration : scénario de saisie complète au clavier (catégorie → quantité → ticket → finalisation).
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** Stories 18.4 (artefact), 18.5 (layout), 18.6 (grille catégories).

---

### Story 18.8: Caisse — ticket temps réel, finalisation et paiements multi-moyens

As a operateur caisse,
I want retrouver le ticket temps réel et le flux de finalisation identiques à la 1.4.4,
So that la validation des ventes et l'encaissement soient fiables.

**Contexte :** Basé sur l'artefact `18-4-audit-caisse-inventaire.md` §4 et §5 (Ticket + Finalisation).

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/frontend/src/components/FinalizationScreen.tsx`
- `references/ancien-repo/repo/frontend/src/components/Ticket.tsx`
- `references/ancien-repo/repo/frontend/src/components/TicketDisplay.tsx`
- `references/ancien-repo/repo/frontend/src/components/SaleWizard.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/Sale.tsx` (flux finalisation)
- Tests de référence : `references/ancien-repo/repo/frontend/src/components/FinalizationScreen.test.tsx`, `references/ancien-repo/repo/frontend/src/pages/CashRegister/Sale.finalization.test.tsx`, `references/ancien-repo/repo/frontend/src/pages/CashRegister/Sale.regression.test.tsx`

**Fichiers actuels à réécrire/adapter :**
- `frontend/src/caisse/CashRegisterSalePage.tsx` (panneau ticket + déclenchement finalisation)
- Équivalents de `FinalizationScreen` et `Ticket` dans `frontend/src/caisse/` (identifier ou créer)

**Acceptance Criteria:**

**Given** des articles ajoutés au ticket  
**When** l'opérateur consulte le panneau ticket droit  
**Then** les lignes, sous-totaux, total, remises et dons s'affichent en temps réel identiquement à la 1.4.4

**Given** l'opérateur appuie sur "Entrée" (ou bouton Finaliser)  
**When** le ticket est non vide  
**Then** l'écran de finalisation s'affiche avec les modes de paiement disponibles (identique à 1.4.4)

**Given** un paiement multi-moyens (ex : espèces + carte)  
**When** l'opérateur saisit les montants  
**Then** le rendu monnaie est calculé correctement et affiché  
**And** la validation enregistre la vente en BDD et met à jour le KPI banner

**Given** un ticket vide  
**When** l'opérateur tente de finaliser  
**Then** la finalisation est bloquée avec un message identique à la 1.4.4

**Preuves obligatoires de fermeture :**
- Tests co-locés sur le flux finalisation (sur modèle des tests 1.4.4 listés).
- Scénario E2E manuel : ajout articles → finalisation multi-paiements → ticket enregistré.
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** Stories 18.4 (artefact), 18.5, 18.6, 18.7.

---

### Story 18.9: Caisse — ouverture et fermeture de session complètes

As a operateur caisse,
I want que les flux d'ouverture et de fermeture de session soient identiques à la 1.4.4,
So that la tenue de caisse soit fiable du début à la fin du service.

**Contexte :** Basé sur l'artefact `18-4-audit-caisse-inventaire.md` §6 et §7 (Open/Close session).

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/OpenCashSession.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/CloseSession.tsx`
- `references/ancien-repo/repo/frontend/src/stores/cashSessionStore.ts`
- `references/ancien-repo/repo/frontend/src/services/cashSessionService.ts`
- `references/ancien-repo/repo/frontend/src/services/cashSessionsService.ts`
- Tests de référence : `references/ancien-repo/repo/frontend/src/pages/CashRegister/__tests__/` (ou équivalent co-locé), `references/ancien-repo/repo/frontend/src/stores/__tests__/cashSessionStore.test.ts` (si présent)

**Fichiers actuels à réécrire/adapter :**
- `frontend/src/caisse/CaisseOpenSessionPage.tsx` (ou équivalent — identifier dans `frontend/src/caisse/`)
- `frontend/src/caisse/CaisseCloseSessionPage.tsx` (ou équivalent)
- Store session dans `frontend/src/caisse/` (identifier via l'artefact 18.4 §10)

**Acceptance Criteria:**

**Given** un poste de caisse disponible  
**When** l'opérateur ouvre une session  
**Then** le formulaire demande le fond de caisse (montant, devise si applicable) identiquement à la 1.4.4  
**And** la session est créée en BDD avec `status = open` et les métadonnées correctes

**Given** une session active avec des ventes  
**When** l'opérateur lance la fermeture  
**Then** le flux de comptage physique s'affiche (saisie des montants par moyen de paiement)  
**And** les totaux RecyClique sont affichés en regard des montants comptés  
**And** l'écart éventuel est calculé et affiché  
**And** la session est clôturée et la sync Paheko déclenchée (ou erreur explicite si Paheko indisponible)

**Preuves obligatoires de fermeture :**
- Test scénario ouverture → ventes → fermeture avec écart : résultat cohérent.
- Tests co-locés sur le store session (sur modèle des tests 1.4.4 listés).
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** Stories 18.4 (artefact), 18.5, 18.8.

---

### Vague P1 — Domaine Caisse (confort)

### Story 18.10: Caisse virtuelle et saisie différée

As a operateur caisse,
I want utiliser la caisse virtuelle et la saisie différée identiquement à la 1.4.4,
So that les cas d'usage hors-ligne ou de simulation soient couverts.

**Contexte :** Basé sur l'artefact `18-4-audit-caisse-inventaire.md` §8 et §9 (Caisse virtuelle + Saisie différée).

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/VirtualCashRegister.tsx`
- `references/ancien-repo/repo/frontend/src/stores/virtualCashSessionStore.ts`
- `references/ancien-repo/repo/frontend/src/stores/deferredCashSessionStore.ts`
- Tests de référence : `references/ancien-repo/repo/frontend/src/pages/CashRegister/VirtualCashRegister.test.tsx`, `references/ancien-repo/repo/frontend/src/pages/CashRegister/VirtualSale.workflow.test.tsx`, `references/ancien-repo/repo/frontend/src/test/pages/CashRegister/DeferredCashSession.test.tsx`, `references/ancien-repo/repo/frontend/src/test/stores/deferredCashSessionStore.test.ts`
- Note : la "Saisie différée" est probablement une modale ou un mode de `Sale.tsx` (pas un composant page dédié) — confirmer via l'artefact 18.4.

**Acceptance Criteria:**

**Given** l'opérateur choisit "Caisse Virtuelle" sur le dashboard  
**When** la session virtuelle démarre  
**Then** le flux est identique à la caisse réelle mais sans écriture en BDD principale  
**And** les données de simulation sont isolées du flux réel

**Given** l'opérateur choisit "Saisie différée"  
**When** il saisit des ventes  
**Then** elles sont stockées localement et synchronisables ultérieurement (identique à la logique 1.4.4)

**Preuves obligatoires de fermeture :**
- Tests co-locés sur les stores virtuels (sur modèle des tests 1.4.4 listés).
- Scénario caisse virtuelle complet fonctionnel.
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** Stories 18.4–18.9 (caisse de base complète).

---

## Epic 19: Correction de cap post-audit terrain 2026-03-16

Corriger les écarts bloquants et critiques identifiés lors de l'audit fonctionnel terrain du 2026-03-16, sans remettre en cause les epics 1–18. Objectif : rendre le cœur métier (caisse, réception) utilisable en conditions réelles.

**Source :** `references/artefacts/2026-03-16_audit-fonctionnel-terrain.md`
**Sprint Change Proposal :** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-16.md`

**Note sur la discordance Epic 18 / terrain :** Les stories 18.5–18.7 ont été marquées done/approved lors de la rétro 2026-03-02, mais l'audit terrain du 2026-03-16 constate que ces fonctionnalités restent absentes ou non conformes. Les stories 19.7–19.9 sont des **corrections ciblées**, pas des régressions sur du nouveau code.

**Règles d'exécution :**
- **Pas d'enchaînement automatique** des stories : Strophe valide manuellement après chaque story livrée avant de lancer la suivante.
- Priorité stricte : **P0 → P1 → P2**. Les items P3 restent en backlog (voir Sprint Change Proposal §4.3).
- Chaque story inclut au moins un **critère de validation terrain** vérifiable par Strophe.
- Ne pas créer de stories pour les corrections déjà faites (auth SuperAdmin après F5, lien Réception dans le menu).

**Ordre de livraison recommandé :**
```
19.1 (P0) → validation Strophe
  → 19.2, 19.3, 19.4 (P1 indépendants, dans l'ordre)
  → 19.5 (P1, dépend 19.1 — vérifier si auto-résolu)
  → 19.6 (audit caisse terrain, dépend 19.1)
  → 19.7, 19.8, 19.9 (P1 caisse, dépendent 19.6)
  → 19.10, 19.11, 19.12, 19.13 (P2, indépendants, dans l'ordre)
```

**Références :** PRD (parité 1.4.4), `ux-design-specification.md`, `references/ancien-repo/checklist-import-1.4.4.md`, artefact 2026-02-26_10 (traçabilité écran → API).

---

### Vague P0 — Import catégories

### Story 19.1: Import catégories — correction parent_id / sous-catégories

As a administrateur,
I want importer le CSV 1.4.4 complet (catégories racines + sous-catégories) sans erreur,
So that la caisse affiche les catégories et que la réception puisse saisir des lignes.

**Contexte :**
L'import CSV actuel n'insère que les 20 catégories racines ; les 57 sous-catégories échouent avec l'erreur « parent_id invalide ». Conséquence : caisse affiche « aucune catégorie », liste vide dans la saisie de lignes de réception — tout le flux vente/réception est bloqué.

**Acceptance Criteria:**

**Given** un CSV 1.4.4 contenant des catégories racines et des sous-catégories référençant un parent_id
**When** l'admin lance l'import depuis Admin > Catégories > Importer CSV
**Then** toutes les lignes valides (racines + sous-catégories) sont importées sans erreur « parent_id invalide »
**And** l'ordre d'insertion ou la gestion des contraintes FK garantit que les parents existent avant les enfants
**And** les catégories et sous-catégories apparaissent dans la grille caisse
**And** les catégories et sous-catégories apparaissent dans la liste déroulante de saisie des lignes de réception

**Critère de validation terrain :**
« Strophe importe le CSV 1.4.4 complet (77 lignes) ; aucune erreur ; les catégories et sous-catégories apparaissent en caisse et dans la réception. »

**Livrable :** Import fonctionnel ; trace Copy/Consolidate/Security si code 1.4.4 adapté.
**Dépendances :** Aucune.

---

### Vague P1 — Admin catégories

### Story 19.2: Admin catégories — refonte complète page 1.4.4 (CRUD + UX)

As a administrateur,
I want retrouver l'interface complète de gestion des catégories identique à la 1.4.4,
So que je puisse créer, modifier, archiver, réorganiser et configurer les catégories sans passer par un import CSV.

**Contexte :**
La page actuelle `/admin/categories` ne propose que l'import/export CSV et la suppression. La 1.4.4 avait une interface riche (story B48-P4, livrée et validée) : CRUD complet, arborescence hiérarchique, toggle Vue Caisse / Vue Réception, visibilité par contexte, ordre d'affichage éditable, soft delete / restauration, recherche.

**Note de cadrage :** Cette story est volontairement large — la page catégories 1.4.4 représentait un epic entier (B48-P1 + B48-P4 + B48-P5). L'objectif est la **parité fonctionnelle** avec la 1.4.4, pas le dépassement. S'appuyer obligatoirement sur les sources 1.4.4 listées ci-dessous (Copy/Consolidate/Security).

**Fichiers source 1.4.4 à utiliser comme référence :**

*Frontend — Pages et composants :*
- `references/ancien-repo/repo/frontend/src/pages/Admin/Categories.tsx`
- `references/ancien-repo/repo/frontend/src/components/categories/EnhancedCategorySelector.tsx`
- `references/ancien-repo/repo/frontend/src/components/categories/CategoryDisplayManager.tsx`
- `references/ancien-repo/repo/frontend/src/components/business/CategoryForm.tsx`
- `references/ancien-repo/repo/frontend/src/hooks/useCategoryDragDrop.ts`

*Frontend — Stores et services :*
- `references/ancien-repo/repo/frontend/src/stores/categoryStore.ts`
- `references/ancien-repo/repo/frontend/src/services/categoriesService.ts`
- `references/ancien-repo/repo/frontend/src/services/categoryService.ts`

*Frontend — Tests de référence :*
- `references/ancien-repo/repo/frontend/src/test/pages/Categories.test.tsx`
- `references/ancien-repo/repo/frontend/src/test/stores/categoryStore.test.ts`

*Backend — API, services, modèles :*
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/categories.py`
- `references/ancien-repo/repo/api/src/recyclic_api/services/category_management.py`
- `references/ancien-repo/repo/api/src/recyclic_api/services/category_service.py`
- `references/ancien-repo/repo/api/src/recyclic_api/models/category.py`
- `references/ancien-repo/repo/api/src/recyclic_api/schemas/category.py`

*Documentation de référence :*
- `references/ancien-repo/repo/docs/stories/story-b48-p4-refonte-ux-page-categories.md` (spécification UX complète + AC + wireframes)
- `references/ancien-repo/repo/docs/audits/full-site-ux-20251024/admin/categories.md`

**Périmètre fonctionnel (parité 1.4.4) :**

| Fonctionnalité | Priorité dans cette story |
|----------------|--------------------------|
| Bouton « Nouvelle catégorie » + formulaire (nom, parent, nom officiel) | Indispensable |
| Action « Modifier » sur chaque ligne | Indispensable |
| Soft delete (archiver) + restauration | Indispensable |
| Arborescence hiérarchique avec indentation (catégories racines + sous-catégories) | Indispensable |
| Toggle Vue Caisse / Vue Réception | Indispensable |
| Visibilité par catégorie (checkbox inline — Vue Réception) | Indispensable |
| Ordre d'affichage `display_order` (Caisse) et `display_order_entry` (Réception) — input inline | Indispensable |
| Expand/Collapse des catégories parentes | Indispensable |
| Toggle « Afficher les éléments archivés » | Indispensable |
| Barre de recherche temps réel (filtrage récursif) | Recommandé |
| Drag-and-drop réorganisation (même niveau uniquement) | Optionnel (boutons ↑↓ acceptables en fallback) |

**Acceptance Criteria:**

**Given** l'admin est sur `/admin/categories`
**Then** un bouton « Nouvelle catégorie » est visible et ouvre un formulaire (nom court, parent optionnel, nom officiel optionnel)
**And** la catégorie créée apparaît dans l'arborescence sans rechargement complet

**Given** une catégorie dans la liste
**When** l'admin clique « Modifier »
**Then** le formulaire s'ouvre pré-rempli et permet d'éditer nom, parent, nom officiel
**And** les modifications sont reflétées immédiatement dans la liste

**Given** une catégorie active
**When** l'admin choisit « Archiver »
**Then** la catégorie passe en état archivé (soft delete), elle est grisée / marquée « Archivée »
**And** l'action « Restaurer » remplace « Archiver »

**Given** le toggle « Vue Caisse » / « Vue Réception »
**When** l'admin bascule entre les deux vues
**Then** la liste affiche l'ordre d'affichage correspondant (`display_order` ou `display_order_entry`)
**And** en Vue Réception, les checkboxes de visibilité sont bien proéminentes sur chaque ligne

**Given** l'admin modifie un ordre d'affichage inline
**Then** la valeur est sauvegardée automatiquement (mise à jour optimiste)

**Critère de validation terrain :**
« Strophe : (1) crée une sous-catégorie dans une catégorie existante, (2) la modifie, (3) l'archive puis la restaure, (4) la retrouve dans la caisse et dans la liste de réception. La page reste stable tout au long. »

**Preuves obligatoires de fermeture :**
- Formulaire création + modification fonctionnel (capture écran).
- Soft delete + restauration démontrés.
- Arborescence hiérarchique visible et cohérente.
- Toggle Caisse / Réception opérationnel.
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** 19.1 validé par Strophe (liste peuplée pour tester).

---

### Vague P1 — Réception

### Story 19.3: Réception — redirection vers page de saisie après création de ticket

As a operateur réception,
I want être redirigé vers la page de saisie du ticket dès sa création,
So que je puisse saisir les lignes immédiatement sans navigation manuelle supplémentaire.

**Contexte :**
Actuellement, après la création d'un ticket de dépôt, l'utilisateur reste sur la liste des tickets. Il doit manuellement retrouver le ticket et cliquer « Modifier » pour accéder à la saisie des lignes — friction inutile et source d'erreur.

**Acceptance Criteria:**

**Given** un opérateur sur la page Réception qui clique « Créer un ticket »
**When** le ticket est créé avec succès
**Then** l'utilisateur est redirigé vers la page de saisie du ticket (ex. `/reception/ticket/{id}`)
**And** il peut saisir les lignes immédiatement sans étape de navigation supplémentaire

**Critère de validation terrain :**
« Strophe crée un ticket de dépôt et arrive directement sur la page de saisie des lignes. »

**Dépendances :** 19.1 (catégories disponibles pour saisir des lignes).

---

### Story 19.4: Réception — affichage du nom utilisateur au lieu du code hex

As a operateur réception,
I want voir le nom lisible de l'utilisateur sur les tickets de réception,
So que je sache qui a créé ou pris en charge chaque ticket sans avoir à chercher dans un autre écran.

**Contexte :**
Les tickets de réception affichent l'identifiant technique de l'utilisateur (code hexadécimal, ex. 58841A7F) au lieu du prénom/nom. Ce bug rend la liste des tickets illisible pour un opérateur.

**Acceptance Criteria:**

**Given** un ticket de réception affiché dans la liste ou dans le détail
**When** la colonne ou le champ « utilisateur » est rendu
**Then** le nom lisible de l'utilisateur (prénom + nom ou login) est affiché
**And** aucun code hex ou UUID brut n'est visible à la place du nom

**Critère de validation terrain :**
« Strophe voit le nom de l'utilisateur sur le ticket de réception, pas un code hex. »

**Dépendances :** Aucune (bug indépendant des catégories).

---

### Story 19.5: Réception — page non blanche après import catégories

As a operateur réception,
I want que la page Réception reste fonctionnelle après un import de catégories,
So que je puisse travailler immédiatement sans avoir à recharger ou naviguer.

**Contexte :**
Après un import CSV de catégories depuis l'admin, la page `/reception` devient une page blanche (probable crash JS dû à l'état incohérent causé par l'import partiel). La page `/reception/ticket/{id}` reste partiellement accessible. Ce problème peut être auto-résolu par la correction de 19.1 (import complet) — à vérifier avant d'implémenter un correctif dédié.

**Acceptance Criteria:**

**Given** l'admin a effectué un import de catégories réussi (19.1 validé)
**When** l'utilisateur navigue vers la page Réception
**Then** la page s'affiche correctement (pas de page blanche, pas de crash JS)
**And** les catégories sont disponibles dans la liste déroulante de saisie des lignes de ticket

**Critère de validation terrain :**
« Strophe importe les catégories, ouvre la Réception : page OK, catégories disponibles dans la saisie. »

**Dépendances :** 19.1 (import catégories fonctionnel). Peut être auto-résolu par 19.1 — vérifier avant d'implémenter.

---

### Vague P1 — Caisse (évaluation terrain + corrections)

### Story 19.6: Caisse — audit de conformité 1.4.4 post-catégories (terrain)

As a equipe dev,
I want un audit terrain ciblé de la caisse avec catégories fonctionnelles,
So que les stories de correction 19.7–19.9 aient une cible précise et vérifiée.

**Contexte :**
Les stories 18.5–18.7 ont été marquées done/approved mais la caisse reste non conforme à la 1.4.4 (pas de presets visibles, raccourcis AZERTY absents, disposition différente). L'audit était impossible sans catégories fonctionnelles. Cette story est un **parcours terrain manuel** réalisé par Strophe après validation de 19.1 — elle produit un artefact qui conditionne les stories suivantes.

**Acceptance Criteria:**

**Given** la caisse ouverte avec des catégories disponibles (19.1 validé par Strophe)
**When** Strophe parcourt la caisse (sélection catégorie, ajout article, raccourcis clavier, layout)
**Then** un artefact liste pour chaque point : statut (OK / KO / Partiel), comportement attendu (1.4.4), comportement observé, écart résiduel à corriger

**Critère de validation terrain :**
« Strophe a complété le parcours caisse avec catégories et produit l'artefact d'audit. »

**Livrable :** `_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md`
**Dépendances :** 19.1 validé par Strophe.

---

### Story 19.7: Caisse — presets (Don, Recyclage, Déchèterie) conformes 1.4.4

As a operateur caisse,
I want retrouver les boutons presets (Don, Recyclage, Déchèterie) identiques à la 1.4.4,
So que je puisse saisir rapidement les types de ventes les plus courants.

**Contexte :**
Basé sur l'artefact `19-6-audit-caisse-post-categories.md`. La caisse actuelle n'affiche pas les presets 1.4.4. Les stories 18.6 avaient livré une grille de catégories mais les presets (boutons rapides configurables) restent absents ou non fonctionnels en terrain.

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/frontend/src/components/CategorySelector.tsx`
- `references/ancien-repo/repo/frontend/src/components/EnhancedCategorySelector.tsx`
- `references/ancien-repo/repo/frontend/src/stores/categoryStore.ts`

**Acceptance Criteria:**

**Given** la caisse ouverte avec catégories disponibles
**Then** les boutons presets 1.4.4 (Don, Recyclage, Déchèterie, etc.) sont visibles dans l'interface caisse
**And** le clic sur un preset configure et ajoute la ligne de vente conformément au comportement 1.4.4

**Critère de validation terrain :**
« Strophe ouvre la caisse, clique sur Don / Recyclage / Déchèterie : une ligne est ajoutée correctement. »

**Preuves obligatoires de fermeture :**
- Capture écran : presets visibles.
- Scénario : clic preset → ligne ajoutée avec les bonnes valeurs.
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** 19.6 (artefact audit caisse).

---

### Story 19.8: Caisse — raccourcis clavier AZERTY conformes 1.4.4

As a operateur caisse,
I want utiliser les raccourcis clavier AZERTY de la 1.4.4,
So que je puisse saisir et naviguer sans souris comme dans l'ancienne version.

**Contexte :**
Basé sur l'artefact `19-6-audit-caisse-post-categories.md`. Les raccourcis AZERTY sont absents malgré la story 18.7 marquée done. Référence mapping complet : `18-4-audit-caisse-inventaire.md`.

**Fichiers source 1.4.4 de référence :**
- `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.ts`
- `references/ancien-repo/repo/frontend/src/utils/azertyKeyboard.ts`
- `references/ancien-repo/repo/frontend/src/utils/keyboardShortcuts.ts`

**Acceptance Criteria:**

**Given** la page de saisie vente caisse est ouverte
**When** l'opérateur utilise le clavier
**Then** les raccourcis AZERTY identifiés dans l'artefact 19-6 sont opérationnels (navigation entre champs, raccourcis métier : quantité, poids, confirmation)
**And** aucun raccourci ne provoque de comportement inattendu

**Critère de validation terrain :**
« Strophe utilise la caisse entièrement au clavier (navigation + au moins un raccourci métier AZERTY) sans souris. »

**Preuves obligatoires de fermeture :**
- Mapping raccourcis documenté dans les Completion Notes.
- Tests co-locés couvrant les raccourcis clés.
- Trace Copy/Consolidate/Security.

**Dépendances :** 19.6 (audit caisse post-catégories).

---

### Story 19.9: Caisse — disposition et conformité visuelle 1.4.4

As a operateur caisse,
I want retrouver la disposition de l'écran caisse identique à la 1.4.4,
So que l'interface soit immédiatement utilisable sans réapprentissage.

**Contexte :**
Basé sur l'artefact `19-6-audit-caisse-post-categories.md`. La disposition actuelle diffère de la 1.4.4 (zones de saisie, grille, placement des contrôles). Corriger les écarts résiduels identifiés après l'audit post-catégories.

**Acceptance Criteria:**

**Given** la page de saisie vente caisse
**When** l'opérateur l'ouvre
**Then** le layout (grille catégories, zones de saisie, placement des contrôles) correspond à la référence 1.4.4 telle que décrite dans l'artefact 19-6

**Critère de validation terrain :**
« Strophe compare l'écran caisse à la 1.4.4 ; la disposition est conforme aux écarts identifiés en 19.6. »

**Preuves obligatoires de fermeture :**
- Capture avant/après layout.
- Trace Copy/Consolidate/Security dans les Completion Notes.

**Dépendances :** 19.6 (audit caisse post-catégories).

---

### Vague P2 — Paheko et admin

### Story 19.10: Paheko — exposition du port 8080 sous Docker Windows

As a administrateur technique,
I want accéder à Paheko sur http://localhost:8080 depuis la machine hôte Windows,
So que les tests d'intégration RecyClique → Paheko soient possibles.

**Contexte :**
Sous Docker Desktop Windows, le port 8080 de Paheko n'est pas exposé vers l'hôte. Le problème est connu (connexion inter-ports bloquée, d'où RecyClique sur 90xx). Soit corriger la config Docker Compose, soit documenter une procédure alternative.

**Acceptance Criteria:**

**Given** l'environnement Docker Desktop Windows avec les services lancés
**When** Strophe ouvre http://localhost:8080 dans un navigateur
**Then** l'interface Paheko s'affiche correctement
**Or** une procédure alternative documentée (proxy, port différent) permet d'y accéder sans modifier l'architecture

**Critère de validation terrain :**
« Strophe ouvre http://localhost:8080 et accède à l'interface Paheko. »

**Dépendances :** Aucune.

---

### Story 19.11: Dashboard admin — notifications et tickets réception ouverts

As a administrateur,
I want que les notifications du dashboard pointent vers les bonnes informations et que les tickets réception ouverts soient signalés,
So que le dashboard admin soit un vrai tableau de bord opérationnel.

**Contexte :**
Actuellement, le clic sur « Notifications » redirige vers /users au lieu d'afficher un panel de notifications. Les tickets de réception ouverts (visibles dans Admin > Réception) ne remontent pas en notification sur le dashboard.

**Acceptance Criteria:**

**Given** l'admin est sur le dashboard
**When** il clique sur « Notifications »
**Then** un panel ou liste de notifications s'affiche (comportement cohérent 1.4.4), sans redirection systématique vers /users
**And** les tickets de réception ouverts sont visibles dans les notifications ou dans un bloc dédié du dashboard

**Critère de validation terrain :**
« Strophe ouvre le dashboard admin ; les tickets réception ouverts sont signalés ; le clic Notifications affiche les notifs. »

**Dépendances :** Aucune.

---

### Story 19.12: Dashboard admin — compteur « Utilisateurs connectés »

As a administrateur,
I want que le compteur d'utilisateurs connectés affiche une valeur réelle ou un libellé explicite,
So que le dashboard ne soit pas trompeur (affichage « 0 » alors qu'un utilisateur est connecté).

**Contexte :**
Le compteur affiche « 0 » alors qu'au moins un utilisateur est connecté. Soit implémenter un comptage réel des sessions actives, soit remplacer par un libellé explicite (« Fonctionnalité à venir » ou masquer le widget en v1).

**Acceptance Criteria:**

**Given** au moins un utilisateur est connecté
**When** l'admin consulte le dashboard
**Then** le compteur « Utilisateurs connectés » affiche une valeur réelle ou un libellé non trompeur (ex. « Non disponible en v1 »)
**And** le bouton « Voir » ne redirige plus vers /admin/users si le widget n'est pas implémenté (ou redirige vers un écran pertinent)

**Critère de validation terrain :**
« Strophe voit un compteur cohérent ou un libellé clair pour les utilisateurs connectés. »

**Dépendances :** Aucune.

---

### Story 19.13: Sessions caisse — filtres Site / Poste / Opérateur et export global

As a administrateur,
I want filtrer les sessions caisse par Site, Poste et Opérateur et exporter les données,
So que l'analyse des sessions soit possible comme dans la 1.4.4.

**Contexte :**
Dans le gestionnaire de sessions caisse, les listes déroulantes Site / Poste / Opérateur sont grisées (non cliquables). L'export global type Excel multi-onglets (détail par catégories/sous-catégories) de la 1.4.4 est absent ; seul un export par session individuelle (CSV) est disponible.

**Acceptance Criteria:**

**Given** l'admin est sur le gestionnaire de sessions caisse
**When** il interagit avec les filtres
**Then** les listes déroulantes Site, Poste, Opérateur sont utilisables (non grisées) et filtrent effectivement la liste
**And** un export global (CSV a minima, Excel multi-onglets si scope 1.4.4 confirmé par l'artefact 18-4) est disponible ou documenté comme évolution backlog

**Critère de validation terrain :**
« Strophe peut filtrer les sessions par Site / Poste / Opérateur et télécharger un export des données. »

**Dépendances :** Aucune.

---

### Backlog P3 — Hors Epic 19

Les items suivants sont documentés ici pour traçabilité. Aucune story n'est créée dans cet epic. Ils seront priorisés dans un epic futur.

| Item | Détail |
|------|--------|
| Admin paramètres | Tout en stub (session, email, alertes). |
| Permissions / ACL | Pas de vraie gestion (modifier = nom + description). |
| Audit log | Format technique IAM illisible pour un opérateur. |
| Logs email | Pas d'écran dédié, config email incomplète. |
| Quick analysis | Aucune statistique disponible. |
| Mot de passe oublié | Absent de la page login. |
| Logo | Poubelle au lieu des trois flèches de recyclage (parité visuelle 1.4.4). |
| Caisse — ID poste | Affichage UUID complexe sous le nom du poste — à simplifier. |
| BDD — import dump 1.4.4 | Import d'un dump prod 1.4.4 dans la nouvelle base échoue (schéma divergent). Nécessite un adaptateur/traducteur de tables. Critique avant déploiement v1.0.0. |
| Vie associative | Placeholder prévu (Brief, PRD FR21). Pas un bug — à dérouler dans un epic dédié post-MVP. |

