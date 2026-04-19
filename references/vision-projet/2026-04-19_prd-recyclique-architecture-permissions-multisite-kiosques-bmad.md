# Product Requirements Document (PRD) : Recyclique
**Version :** 2.0 (BMAD-Ready / Post-QA Avancée)
**Thème :** Refonte Multi-Sites, Kiosques PWA & Permissions

## 1. Executive Summary & Vision
Recyclique évolue vers une architecture multi-tenant (Sites) et Offline-First (Kiosques PWA). L'objectif est de garantir la traçabilité comptable automatique (Paheko), de sécuriser l'usage multi-bénévoles via code PIN, et d'assurer une résilience totale aux coupures réseau.

## 2. Core Architectural Rules (Non-Functional Requirements)
Ces règles sont immuables et priment sur toute feature métier :
1. **UTC Strict :** Tout horodatage en BDD et IndexedDB est en UTC. Le fuseau horaire n'est appliqué qu'au rendu UI.
2. **Immuabilité Comptable :** Une session clôturée ne peut jamais être modifiée. Toute correction génère une nouvelle écriture de régularisation (audit-trail).
3. **No Auto-Close :** La caisse ne se clôture **jamais** automatiquement (risque d'écart fictif). À l'expiration de la tolérance, elle s'**Auto-Suspend** (verrouillage) dans l'attente d'un comptage manuel Admin.
4. **RGPD Offline :** La base adhérents n'est **jamais** synchronisée en clair hors-ligne. L'identification offline se fait uniquement par scan de carte membre (code-barre/QR).
5. **Asynchronisme Paheko :** Toute écriture vers Paheko (création projet, écriture comptable) passe par une file d'attente résiliente (Redis).

**Alignement brownfield (canon PRD BMAD) :** le dépôt actuel implémente déjà une **outbox transactionnelle en base** pour les écritures Paheko. La formulation **Redis** ci-dessus reste la **cible produit / vision** (worker, retries, observabilité) ; la convergence **Redis (transport)** ↔ **outbox SQL (vérité)** est tracée dans `_bmad-output/planning-artifacts/prd.md` (gouvernance file / outbox) et doit faire l’objet d’**ADR** avant chantier lourd.

---

## 3. Modèle de Données & Hiérarchie

*   **Sites :** `FIXE`, `NOMADE` ou `EXTERNE`. Lié 1:1 à un Projet Analytique Paheko (immuable après 1ère vente).
*   **Kiosques :** Entité matérielle (`CAISSE`, `RECEPTION`, `MIXTE`, `ADMIN`). Authentifiée par Token chiffré.
*   **Utilisateurs :** Rôle global (SuperAdmin, Admin, Bénévole). Auth web par mot de passe, Auth Kiosque par PIN (4-8 chiffres).
*   **Catégories/Tarifs :** Arbre hérité (Global > Site > Kiosque). Prix global avec surcharge optionnelle par Site.

---

## 4. Epics, Stories & Acceptance Criteria (AC)

**Numérotation :** les **EPIC 1 à 4** ci-dessous sont la **numérotation vision** de ce document. Elles ne correspondent **pas** aux identifiants `epic-NN` du fichier `_bmad-output/planning-artifacts/epics.md` (ex. Epic 25 Kiosque PWA) ; le pont est assuré par le PRD canon et les artefacts de pilotage (readiness, sprint-change).

### EPIC 1 : Infrastructure Kiosque & PWA (Offline-First)
**Objectif :** Déployer les postes de travail de manière sécurisée et résiliente.

*   **Story 1.1 : Enregistrement Device & Token**
    *   *En tant qu'* Admin, *je veux* enregistrer un nouvel appareil pour qu'il devienne un Kiosque dédié.
    *   *AC 1 :* L'URL générée installe une PWA spécifique au poste (nom, icône personnalisée).
    *   *AC 2 :* Le Token Kiosque est stocké dans IndexedDB et chiffré.
    *   *AC 3 :* Une connexion simultanée du même Token sur deux IP différentes révoque l'accès.

*   **Story 1.2 : Synchronisation Delta & Mode Offline**
    *   *En tant que* Kiosque, *je veux* synchroniser les données sans surcharger le serveur, et continuer à fonctionner sans réseau.
    *   *AC 1 :* Au démarrage (Cold Start), le Kiosque demande uniquement les données depuis son `last_updated_timestamp`.
    *   *AC 2 :* Hors-ligne, les ventes s'empilent dans une file d'attente locale (IndexedDB).
    *   *AC 3 :* À la reconnexion, l'ordre chronologique des transactions offline est respecté. En cas de conflit (objet unique vendu 2 fois), la transaction la plus ancienne gagne, la 2ème génère un ticket `CONFLIT_STOCK` pour l'Admin.

*   **Story 1.3 : Périphériques Matériels (Hardware)**
    *   *En tant qu'* Opérateur, *je veux* utiliser mon scanner et mon imprimante facilement.
    *   *AC 1 :* Les scans de code-barres sont captés via Keyboard Emulation (focus automatique sur les champs).
    *   *AC 2 :* Les tickets utilisent l'API Print native du navigateur pour les imprimantes thermiques compatibles.

### EPIC 2 : Identity, PIN & Bénévolat
**Objectif :** Gérer les rotations rapides sur le terrain sans compromettre la sécurité ou le temps bénévole.

*   **Story 2.1 : Auth PIN et Session Swap ("Passer la main")**
    *   *En tant que* Bénévole, *je veux* me connecter rapidement et céder ma place sans fermer la caisse.
    *   *AC 1 :* Le PIN est vérifié localement via un hash salé par le `kiosk_secret_key`.
    *   *AC 2 :* 3 erreurs de PIN bloquent l'ID pendant 30s (Soft-lock). 5 erreurs demandent le code Admin.
    *   *AC 3 :* "Passer la main" avec un panier plein propose : Transférer, Suspendre, Annuler.

*   **Story 2.2 : Découplage Présence / Caisse (Bénévolat)**
    *   *En tant que* Trésorier, *je veux* que le temps bénévole soit compté précisément pour les comptes 864/875 de Paheko.
    *   *AC 1 :* Le "Session Swap" (quitter la caisse) ne stoppe pas le chronomètre de temps bénévole, sauf si l'utilisateur clique sur "Fin de présence".

*   **Story 2.3 : Mode Superviseur (Escalade)**
    *   *En tant qu'* Admin, *je veux* surpasser les droits sur un kiosque pour un dépannage local.
    *   *AC 1 :* Saisie du mot de passe web complet OU scan d'un QR à usage unique (TTL 5 min).
    *   *AC 2 :* Bandeau rouge persistant. Droits étendus (modification stock, régularisation, voir autres sites).

### EPIC 3 : Analytique Multi-Sites (Paheko)
**Objectif :** Garantir que 100% des opérations financières tombent dans les bons projets comptables.

*   **Story 3.1 : Création Site et File Paheko**
    *   *En tant que* SuperAdmin, *je veux* créer un site (Fixe ou Nomade) pour segmenter mon activité.
    *   *AC 1 :* La création d'un site déclenche un job Redis pour créer le projet Paheko.
    *   *AC 2 :* Le `parent_id` d'un site nomade devient grisé/immuable après la première vente.

*   **Story 3.2 : Catégories Multi-Niveaux**
    *   *En tant qu'* Admin Site, *je veux* masquer certaines catégories globales qui ne concernent pas mon site.
    *   *AC 1 :* L'héritage est descendant : si une catégorie est masquée au niveau Site, elle disparaît de tous ses Kiosques.

### EPIC 4 : Notifications & Garde-fous Horaires
**Objectif :** Prévenir les erreurs de fin de journée et informer proactivement.

*   **Story 4.1 : Plages Horaires & Auto-Suspend**
    *   *En tant que* Manager, *je veux* bloquer les opérations en dehors des horaires de mon site.
    *   *AC 1 :* Le système calcule : `Fin de plage + Tolérance`. Passé ce délai, la caisse s'Auto-Suspend (lecture seule, impossibilité de vendre).
    *   *AC 2 :* Seul un Admin peut rouvrir/clôturer une caisse auto-suspendue.

*   **Story 4.2 : Module Canaux et Fallback**
    *   *En tant que* SuperAdmin, *je veux* configurer l'acheminement des alertes critiques (Telegram, Email, Push PWA).
    *   *AC 1 :* Si une alerte critique (ex: "Écart de caisse") est configurée sur Push PWA mais que le client iOS ne le supporte pas, le système fallback sur Telegram ou Email.
