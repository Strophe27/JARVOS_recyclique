---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete, step-e-01-discovery, step-e-02-review, step-e-03-edit]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-JARVOS_recyclique-2026-02-25.md
  - _bmad-output/planning-artifacts/research/technical-affichage-dynamique-peintre-extension-points-research-2026-02-25.md
  - references/index.md
  - references/ou-on-en-est.md
  - references/versioning.md
  - references/artefacts/2026-02-24_06_brainstorm-migration-paheko.md
  - references/artefacts/2026-02-24_07_design-systeme-modules.md
  - references/artefacts/2026-02-25_06_point-global-avant-prd.md
  - references/artefacts/2026-02-25_07_decisions-push-redis-source-eee.md
  - references/artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md
  - references/migration-paeco/audits/matrice-correspondance-caisse-poids.md
  - references/artefacts/2026-02-26_01_analyse-separation-frontend-backend-recyclic.md
  - references/artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md
workflowType: 'prd'
briefCount: 1
researchCount: 1
brainstormingCount: 1
projectDocsCount: 8
classification:
  projectType: web_app_fullstack_api
  domain: ressourcerie_economie_circulaire
  complexity: high
  projectContext: brownfield
bmadTrack: enterprise
date: 2026-02-26
author: Strophe
lastEdited: '2026-02-26'
editHistory:
  - date: '2026-02-26'
    changes: Intégration décision un container RecyClique (front + middleware), préconisations migration v1 (artefact 2026-02-26_01). Sections mises à jour : Project Classification, Technical Success, Implementation Considerations, nouvelle sous-section Déploiement et préconisations, FR18, Références.
  - date: '2026-02-26'
    changes: Track BMAD Enterprise. Frontmatter bmadTrack; sections Modèle de déploiement / tenancy, Rôles et permissions (matrice RBAC), Compliance (track Enterprise) avec référence NFR-S.
  - date: '2026-02-26'
    changes: Post-validation (rapport 2026-02-26). NFR-P2 borné à 10 s ; FR13b précision périmètre module correspondance (figé quand BDD/instance dev stabilisées) ; nouvelle section Traçabilité FR → Parcours (tableau annexe).
  - date: '2026-02-26'
    changes: Ajout FR27 — Gestion documentaire RecyClique (statutaire, com, prise de notes, stockage K-Drive ou volume dédié, évolution JARVOS Nano/Mini pour recherche et édition intelligentes).
---

# Product Requirements Document - JARVOS_recyclique

**Author:** Strophe
**Date:** 2026-02-26

## Executive Summary

JARVOS Recyclique est la refonte complète de RecyClique (v1.4.4) au service des ressourceries. L'objectif est une plateforme unifiée où **RecyClique est l'interface principale** : caisse, réception, compta, utilisateurs, adhésions, vie associative. **Dans l'idéal, aucun utilisateur n'ouvre Paheko** : Paheko (compta, utilisateurs, adhésions, plugins) et, plus tard, JARVOS Nano puis Mini (surcouche cognitive) sont des moteurs derrière RecyClique. Le problème adressé : double saisie caisse–compta, dette technique et risques de la 1.4.4, absence d'intégration réelle entre RecyClique et Paheko. Utilisateurs cibles : opérateurs terrain (caisse, réception), responsables compta/admin, bénévoles ; La Clique en premier, puis d'autres ressourceries.

### What Makes This Special

- **Interface unique** : tout se fait depuis RecyClique, y compris toute la compta (sync automatique caisse, scan factures, notes de frais, bilan, rapprochement) via le front-end et des workflows RecyClique ; Paheko reste le backend, jamais ouvert au quotidien.
- **Double écosystème** : plugins Paheko et modules RecyClique (TOML, ModuleBase, EventBus Redis Streams, slots) se combinent ; les frameworks permettront d'activer de nouvelles fonctionnalités en assemblant les deux plateformes.
- **Continuité d'usage** : remplacement de la prod sans rupture pour La Clique ; sync caisse → compta par push par ticket, file Redis Streams, clôture avec contrôle et syncAccounting.
- **Évolutivité** : socle modulaire prêt pour les décla éco-organismes, des modules optionnels et, à terme, un modèle **open core** (options commercialisables, projet open source).

## Project Classification

- **Type** : application web full-stack (SPA/PWA RecyClique + API FastAPI + Paheko).
- **Domaine** : gestion ressourcerie / économie circulaire.
- **Complexité** : élevée (double backend, flux financiers, conformité éco-organismes, brownfield).
- **Contexte** : brownfield (refonte RecyClique 1.4.4, même usage, nouvelle architecture).
- **Déploiement RecyClique** : un seul container (front + middleware) ; build React servi en statics par FastAPI, routes API dans le même processus ; Paheko en service séparé. Pas de séparation front/back en déploiement côté RecyClique.

## Modèle de déploiement / tenancy

- **Une instance par ressourcerie** : chaque ressourcerie déploie sa propre instance (RecyClique + Paheko). Pas de multi-tenant ; aucune instance partagée entre plusieurs organisations.
- **Multi-utilisateur** : plusieurs rôles coexistent sur la même instance (opérateur caisse, opérateur réception, responsable compta/admin, admin technique, bénévole). Voir section Rôles et permissions (matrice RBAC).

## Success Criteria

### User Success

- **Opérateurs terrain** : clôturer une session de caisse sans double saisie ; réception (postes, tickets, lignes) fluide ; sync automatique vers la compta sans action manuelle.
- **Responsables compta/admin** : en v1, administration de la compta possible via l'interface Paheko en attendant les interfaces RecyClique ; à terme, ne plus ouvrir Paheko (bilan, rapprochement, scan factures, notes de frais depuis RecyClique).
- **Bénévoles / vie asso** : accéder aux fonctions nécessaires depuis RecyClique ; en v1.0, placeholders acceptables.
- **Moment de valeur** : « plus de double saisie caisse–compta », « tout au même endroit », « ça valait le coup » (gain de temps, moins d'erreurs).

### Business Success

- **v1.0.0 livrée en production** chez La Clique, stable, **sans rupture** des usages actuels.
- **Adoption** : une **deuxième ressourcerie** utilise la plateforme en prod (réplicabilité).
- **Indicateurs** : sync caisse → Paheko opérationnelle ; déclarations éco-organismes réalisées via RecyClique (périmètre v1.0 si inclus, sinon post-MVP).

### Technical Success

- **Architecture modulaire** en place et documentée : TOML, ModuleBase, EventBus Redis Streams, slots React, monorepo.
- **RecyClique** : un seul container (front + middleware) ; Paheko en service séparé. Pas de séparation front/back en déploiement côté RecyClique.
- **Résilience** : push par ticket, file Redis Streams, retry sans perte si Paheko indisponible.
- **Qualité** : import 1.4.4 selon checklist (copy + consolidate + security) ; base propre et sécurisée.

### Measurable Outcomes

- Clôtures de caisse sans erreur (contrôle totaux + syncAccounting).
- Zéro double saisie caisse–compta pour les flux couverts par le push.
- v1.0.0 déployée en prod chez La Clique avec usages actuels conservés.
- (Post-MVP) Au moins une deuxième ressourcerie en production.

## Product Scope

### MVP – Minimum Viable Product (v1.0.0)

- **Périmètre v1** : mêmes fonctionnalités que RecyClique 1.4.4 **plus** la synchronisation caisse ↔ Paheko (push par ticket, Redis Streams, plugin PHP, clôture + syncAccounting).
- **Compta en v1** : tant que les interfaces compta ne sont pas dans RecyClique, l'administration de la compta peut se faire **via l'interface Paheko** ; cette répartition pourra évoluer au fil du développement.
- **Roadmap v0.1.0 → v1.0.0** : premier découpage (socle, caisse, réception, auth/users/admin, éco-organismes, prod) ; à **revoir** avec la technique actuelle (ex. backend RecyClique existant). Développement **couche par couche** jusqu'à v1, en un même long run.
- **Structure de livraison** : les versions (v0.1, v0.2, …) sont des **grandes étapes** ; chacune peut contenir **plusieurs epics** et **nombreuses stories** ; stories complexes à **sous-découper** ; identifier le **parallélisable**.
- **UX v1** : mêmes écrans que 1.4.4 (copy + consolidate + security), pas de refonte UX pour la v1. Référence : `_bmad-output/planning-artifacts/ux-design-specification.md`.
- **Hors périmètre v1** : fonctionnalités Paheko non couvertes en RecyClique 1.4.4 (ardoises, porte-monnaie membre, code-barres produit, produits liés, gestion stock, reçu PDF, etc.) — à ignorer en v1 ou à traiter en v0.2+ selon priorisation. **Réception hors ligne** (saisie différée, template CSV, etc.) : module complémentaire à développer après v1, pas dans le scope initial. Source : `references/migration-paeco/audits/matrice-correspondance-caisse-poids.md` section 4.

### Growth Features (Post-MVP)

- Interfaces compta complètes dans RecyClique (scan factures, notes de frais, bilan, rapprochement) — plus besoin d'ouvrir Paheko pour la compta.
- Module déclarations éco-organismes complet ; vie associative au-delà des placeholders.
- Deuxième (et plus) ressourceries en production.
- Éventuellement : outils de développement (ex. spawn d'agents automatiques) — à cadrer plus tard.

### Vision (Future)

- Plusieurs ressourceries ; open core ; JARVOS Nano/Mini ; combinaison plugins Paheko + modules RecyClique.

## User Journeys

### 1. Opérateur terrain (caisse) — Parcours principal

**Contexte multi-sites / multi-caisses** : Plusieurs lieux et plusieurs caisses sont supportés. Chaque poste (caisse) est démarré avec un compte administrateur (ou équivalent). En **mode caisse**, l'écran est verrouillé sur le menu caisse uniquement — aucun autre menu n'est accessible. À la fermeture de session, un **code PIN** est requis pour déverrouiller ; chaque personne habilitée à la caisse dispose de **son propre PIN** qui déverrouille la session (pattern POS courant). Le détail (workflow exact, gestion des habilitations) pourra être affiné en brainstorming technique ou en spec dédiée.

**Ouverture** : L'opérateur ouvre RecyClique, démarre sa session de caisse (fond de caisse). Il enregistre les ventes (lignes, catégories, poids éventuels, paiements multi-moyens) comme en 1.4.4.

**Montée** : Chaque ticket est poussé en arrière-plan vers Paheko ; il ne fait aucune saisie compta. En fin de journée il lance la clôture : comptage physique, saisie des totaux, éventuel écart.

**Point critique** : La clôture déclenche le contrôle côté Paheko et la sync comptable. Plus de double saisie : ce qu'il a encaissé est déjà en compta.

**Résolution** : Session clôturée sans erreur ; il quitte l'écran. La compta est à jour sans qu'il ouvre Paheko.

*Exigences révélées* : multi-sites / multi-caisses ; démarrage poste (compte admin ou équivalent) ; mode caisse = UI verrouillée (menu caisse uniquement) ; déverrouillage par PIN (un PIN par opérateur habilité) ; ouverture/fermeture session caisse ; saisie ventes (lignes, catégories, poids, paiements) ; push par ticket ; clôture avec contrôle et syncAccounting.

### 2. Opérateur réception — Parcours principal

**Ouverture** : Il ouvre un poste de réception dans RecyClique, crée des tickets de dépôt, saisit les lignes (poids, catégorie, destination).

**Montée** : Les données restent dans RecyClique (source de vérité matière/poids). Aucune sync manuelle vers Paheko ; pas d'étape compta pour lui.

**Point critique** : Réception enregistrée et traçable ; les flux matière sont disponibles pour les déclarations éco-organismes (RecyClique).

**Résolution** : Réception terminée ; exports ou stats possibles depuis RecyClique. En v1 il n'ouvre pas Paheko.

*Exigences révélées* : postes de réception, tickets dépôt, lignes (poids, catégorie), pas de sync manuelle, source de vérité RecyClique.

### 3. Responsable compta / admin — v1 (transition) puis post-MVP

**Ouverture (v1)** : Il doit faire la compta (bilan, rapprochement, factures, notes de frais). En v1 les interfaces compta ne sont pas encore dans RecyClique.

**Montée** : Il ouvre **Paheko** pour administrer la compta. Les écritures caisse sont déjà là (push + syncAccounting) ; il complète le reste (saisie manuelle, scan, notes de frais) dans l'interface Paheko.

**Point critique** : La caisse est déjà synchronisée ; il ne ressaisit pas les ventes. Son travail se limite au reste de la compta.

**Résolution (v1)** : Compta à jour via Paheko. **Plus tard** : mêmes actions depuis RecyClique (scan, notes de frais, bilan, rapprochement), sans ouvrir Paheko.

*Exigences révélées* : en v1 accès admin Paheko pour compta ; post-MVP interfaces compta dans RecyClique, workflows prêts à l'emploi.

### 4. Admin technique / déploiement

**Ouverture** : Il configure l'instance (RecyClique + Paheko), déploie, assure la maintenance. Accès super-admin Paheko si besoin.

**Montée** : Configuration Docker/Compose, paramétrage du plugin RecyClique (secret, endpoint), surveillance des workers Redis Streams et des clôtures.

**Point critique** : Une clôture échoue (Paheko down) ; les tickets restent dans la file Redis ; après retour de Paheko, retry sans perte.

**Résolution** : Instance stable ; objectif à terme : tout pilotable depuis RecyClique, moins de recours direct à l'admin Paheko.

*Exigences révélées* : déploiement monorepo, config plugin (sécurité endpoint), résilience file push, monitoring, accès Paheko super-admin pour dépannage.

### 5. Bénévole / vie associative (v1 placeholder)

**Ouverture** : Il consulte le calendrier ou les activités. En v1 ce sont des placeholders dans RecyClique.

**Montée** : Accès à des écrans « vie asso » minimalistes ; le cœur (calendrier, événements) sera déroulé après v1.

**Point critique** : Un seul point d'entrée (RecyClique) ; pas d'obligation d'ouvrir Paheko pour la vie asso courante.

**Résolution** : Placeholders acceptables en v1 ; parcours complet (calendrier, événements, activités) en growth.

*Exigences révélées* : placeholders vie asso en v1, évolution post-MVP.

### Journey Requirements Summary

| Capacité | Source(s) |
|----------|-----------|
| Caisse : multi-sites, multi-caisses ; mode verrouillé ; PIN par opérateur ; session, ventes, clôture, push, syncAccounting | J1 |
| Réception : postes, tickets, lignes, source de vérité matière | J2 |
| Compta : en v1 via Paheko ; plus tard via RecyClique | J3 |
| Déploiement, config plugin, résilience, monitoring | J4 |
| Vie asso : placeholders v1, parcours complets post-MVP | J5 |
| Aucun utilisateur métier n'a besoin d'ouvrir Paheko pour le flux quotidien (sauf admin compta en v1) | J1–J5 |

*Note* : Le détail du workflow POS (multi-sites, multi-caisses, habilitations, PIN) pourra faire l'objet d'un brainstorming technique ou d'une spec dédiée pour affiner les exigences.

## Rôles et permissions (matrice RBAC)

| Rôle | Caisse (session, ventes, clôture) | Réception (postes, tickets, lignes) | Compta (v1 via Paheko) | Admin technique / déploiement | Vie asso |
|------|-----------------------------------|-------------------------------------|-------------------------|-------------------------------|----------|
| Opérateur caisse | Oui (mode verrouillé, PIN propre) | Non | Non | Non | Non |
| Opérateur réception | Non | Oui | Non | Non | Non |
| Responsable compta / admin | Déverrouillage / accès selon config | Selon config | Oui (v1 via Paheko) | Accès admin Paheko si besoin | Selon config |
| Admin technique | Non (config seulement) | Non | Non | Oui (Docker, plugin, monitoring) | Non |
| Bénévole | Non | Non | Non | Non | Oui (placeholders v1) |

*Source* : parcours J1–J5, FR4, FR5, FR14, FR15, FR16. Démarrer un poste (caisse ou réception) nécessite un compte administrateur (ou équivalent) ; le mode caisse est verrouillé sur le menu caisse seul, déverrouillage par PIN par opérateur habilité.

## Domain-Specific Requirements

### Compliance (track Enterprise)

Ce projet suit le **track BMAD Enterprise** : la couverture Security et DevOps est assurée dans le PRD et sera détaillée dans le document d'architecture (catégories Authentication & Security, Infrastructure & Deployment). Les exigences ci-dessous regroupent conformité réglementaire, sécurité (voir aussi NFR-S1 à NFR-S4 en section Non-Functional Requirements) et traçabilité.

### Compliance & réglementation

- **Déclarations éco-organismes (REP)** : RecyClique est source des données déclaratives (poids, flux, catégories, périodes) ; module décla dans RecyClique, aligné aux exigences des éco-organismes (ex. Ecologic) ; traçabilité et export pour les déclarations officielles.
- **Comptabilité** : écritures et clôtures conformes aux attentes Paheko (comptes, exercices, config) ; pas de règle métier compta inventée côté RecyClique ; sync à la clôture (syncAccounting) comme référence.
- **Données personnelles (RGPD)** : gestion des utilisateurs et adhésions via Paheko ; droits d'accès, consentement et durée de conservation à respecter dans le périmètre association/adhérents.

### Contraintes techniques

- **Sécurité** : authentification (compte admin pour démarrage poste, PIN par opérateur habilité) ; canal push RecyClique → Paheko sécurisé (secret partagé + HTTPS) ; pas de secrets en clair dans les requêtes ; secrets en env / secrets manager.
- **Traçabilité / audit** : traçabilité des sessions caisse, des push et des clôtures ; file Redis Streams réutilisable pour audit et replay si besoin.
- **Résilience** : push par ticket, file Redis Streams, retry sans perte si Paheko indisponible ; pas de perte de données de vente.
- **Multi-sites / multi-caisses** : isolation logique par lieu et par caisse ; mapping site/emplacement RecyClique ↔ Paheko (config ou à la volée) pour les écritures compta.
- **Unité de poids** : réception RecyClique en kg (source de vérité) ; caisse Paheko en g (`plugin_pos_tabs_items.weight`) ; conversion au push si nécessaire (kg → g). Convention à figer en implémentation.
- **Optionnel Saisie au poids Paheko** : le plugin peut optionnellement écrire dans `module_data_saisie_poids` après push caisse pour traçabilité / stats locales ; pas d'obligation (décision session 08).

### Intégrations

- **Paheko** : compta (plugin caisse, syncAccounting), utilisateurs, adhésions, vie asso ; API et plugin PHP custom (endpoint sécurisé) ; config Paheko (comptes, moyens de paiement, exercice) comme référence.
- **Redis** : EventBus (Redis Streams) pour les événements métier ; file de push caisse → Paheko (même stack).
- **Compatibilité** : respect des workflows et paramétrages Paheko pour ne pas casser les écritures ni les habitudes compta.

### Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Perte de données de vente lors du push | File Redis Streams, pas d'ACK tant que Paheko n'a pas confirmé ; retry et surveillance. |
| Écart caisse / compta (totaux, centimes) | Contrôle à la clôture (totaux RecyClique vs Paheko) ; convention centimes ; validation BDD. |
| Non-conformité déclarations éco-organismes | RecyClique = source de vérité ; module décla dédié ; exports et traçabilité documentés. |
| Accès non autorisé à une caisse | Mode caisse verrouillé (menu caisse seul) ; déverrouillage par PIN par opérateur habilité. |
| Fuite de secret (endpoint plugin) | Secret partagé en env ; HTTPS ; pas de secret en clair dans les requêtes. |

**Politique fichiers** : Frontière RecyClique ↔ Paheko pour documents, scan factures, upload — chantier ouvert (artefact 2026-02-25_02), hors périmètre v1 ; à trancher en versions futures.

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Absence de concurrence directe** : Les plateformes existantes sont soit anciennes (Windows, orientées legacy), soit récentes mais centrées sur le shop. Aucune n'offre la combinaison **caisse + réception + compta + vie associative + pilotage** dans une interface unique avec double moteur (RecyClique terrain + Paheko association).
- **Périmètre intégré** : Gestion simultanée de la compta, de toutes les activités de la vie associative et de tout ce qui sert à organiser la ressourcerie, depuis une seule interface (RecyClique), sans ouvrir Paheko au quotidien.
- **Surcouche cognitive (JARVOS Nano puis Mini)** : Pilotage plus efficace, meilleure utilisation de la communication et de la rédaction ; moteur de site internet Paheko activable pour rendre les contenus dynamiques (flux sortants, compta ouverte, etc.). Combinaison inédite par rapport aux plateformes existantes.
- **Double écosystème** : Plugins Paheko et modules RecyClique qui fonctionnent ensemble pour activer de nouvelles fonctionnalités ; trajectoire open core.

### Market Context & Competitive Landscape

- **Concurrents** : Une plateforme ancienne sous Windows ; une plateforme récente axée shop. Aucune ne couvre compta + vie asso + organisation + terrain caisse/réception de façon unifiée.
- **Positionnement** : Plateforme ressourcerie unifiée (terrain + compta + vie asso + site dynamique + surcouche cognitive à venir).

### Validation Approach

- **v1.0** : Livraison en prod chez La Clique sans rupture ; sync caisse–compta opérationnelle ; adoption par une deuxième ressourcerie comme indicateur de valeur.
- **Post-MVP** : Interfaces compta dans RecyClique, module décla, vie asso complète ; puis intégration JARVOS Nano/Mini et site dynamique Paheko.

### Risk Mitigation

- **Innovation non adoptée** : Livrer d'abord la parité 1.4.4 + sync (v1.0) pour prouver la valeur sans dépendre des briques les plus novatrices.
- **Surcouche cognitive retardée** : Architecture modulaire et extension points (ex. recherche technique Peintre/layout) déjà prévus en v1 ; branchement Nano/Mini possible plus tard sans refonte.

## Web Application & API Specific Requirements

### Project-Type Overview

Application web en SPA/PWA (RecyClique, React-Vite-TS) avec API FastAPI et backend Paheko (PHP). Interface unique pour le terrain ; double back-end (RecyClique + Paheko).

### Technical Architecture Considerations

- **SPA / PWA** : SPA ; PWA pour usage terrain (offline possible).
- **Temps réel** : sync caisse → Paheko asynchrone (push, Redis Streams) ; pas de WebSocket requis en v1.
- **API** : REST FastAPI (caisse, réception, sessions, auth) ; JSON ; auth JWT v0.1, SSO v0.2+.

### Navigateurs et devices

- **Navigateurs** : Chrome, Firefox, Safari, Edge (versions récentes) ; contexte principal = postes fixes et tablettes (caisse, réception).
- **Responsive** : écrans caisse et réception utilisables sur tablette ; v1 = mêmes écrans que 1.4.4 (copy + consolidate + security).

### Performance

- Enregistrement d'une vente : temps de réponse acceptable (cible < 2 s).
- Clôture : pas de blocage long ; push et syncAccounting en arrière-plan.

### SEO

- Secondaire en v1 (outil interne) ; moteur site Paheko pour communication publique post-MVP.

### Accessibilité

- Bonnes pratiques de base (contraste, navigation clavier) ; renforcement post-MVP si besoin.

### Implementation Considerations

- **Monorepo ; Docker Compose** : RecyClique en un seul container (front + middleware : build React servi par FastAPI + routes API), Paheko, PostgreSQL, Redis. Séparation **logique** dans le code : dossiers `frontend/` et `api/` (ou `backend/`), contrat API clair ; une seule image Docker « recyclic ». Surcouche cognitive (JARVOS Nano/Mini) : routes et logique dans le même FastAPI (même container).
- **Auth** : compte admin pour démarrage poste ; PIN par opérateur (mode caisse).
- **API** : JSON ; montants en centimes ; poids en kg (réception) / conversion vers Paheko (g si besoin).

### Déploiement RecyClique et préconisations migration v1

RecyClique est déployé en **un seul container** (front + middleware). Paheko reste un service séparé. Dans le code : séparation logique nette (`frontend/`, `api/`), contrat API clair ; pas de duplication de cette frontière en déploiement.

**Préconisations migration v1** (refonte 1.4.4, stack cible) :

| Sujet | Préconisation |
|--------|----------------|
| **Containers** | Un seul container RecyClique (front + middleware), Paheko à part. |
| **Front ↔ serveur en v1** | Garder **SPA + API REST** ; pas de bascule SSR/full-page pour v1. |
| **Forme de l'API** | REST structuré, contrat et types partagés (monorepo), routes par module. |
| **Événements** | EventBus / Redis Streams côté serveur uniquement ; le front passe par l'API. |
| **Import 1.4.4** | Checklist copy + consolidate + security ; séparation logique front/back dans le code. |
| **Surcouche cognitive** | Routes et logique dans le même FastAPI (même container). |
| **À éviter en v1** | GraphQL, mélange SSR + SPA, deuxième stack de rendu. |

## Project Scoping & Phased Development

Cette section détaille la stratégie MVP et le découpage en phases, en cohérence avec le Product Scope ci-dessus.

### MVP Strategy & Philosophy

- **Approche MVP** : MVP de parité + valeur — même usage que RecyClique 1.4.4 **plus** sync caisse ↔ Paheko (plus de double saisie). Objectif : « utile dès le premier jour » pour La Clique, sans rupture.
- **Ressources** : Développement solo (Strophe) ; roadmap en grandes étapes (v0.1 → v1.0) avec epics et stories sous-découpées ; parallélisation identifiée où possible.

### MVP Feature Set (Phase 1)

- **Parcours couverts** : Opérateur caisse (multi-sites, multi-caisses, mode verrouillé, PIN) ; opérateur réception ; admin compta via Paheko (v1) ; admin technique / déploiement ; placeholders vie asso.
- **Capacités indispensables** : Socle Docker (Frontend, Backend, Paheko, PostgreSQL, Redis) ; caisse (sessions, ventes, clôture, push par ticket, Redis Streams, plugin PHP) ; réception (postes, tickets, lignes) ; auth (compte admin + PIN par opérateur) ; architecture modulaire (TOML, ModuleBase, EventBus, slots) en place.

### Post-MVP Features

- **Phase 2 (croissance)** : Interfaces compta dans RecyClique (scan factures, notes de frais, bilan, rapprochement) ; module décla éco-organismes complet ; vie associative (calendrier, événements, activités) ; adoption par une 2e ressourcerie.
- **Phase 3 (expansion)** : Open core ; JARVOS Nano puis Mini (surcouche cognitive) ; site dynamique Paheko ; combinaison plugins Paheko + modules RecyClique pour nouvelles fonctionnalités.

### Risk Mitigation Strategy

- **Technique** : Développement couche par couche ; roadmap v0.x à revoir avec la technique actuelle ; résilience push (Redis Streams, retry) ; checklist import 1.4.4.
- **Marché** : v1 prouve la valeur (parité + sync) avant les briques les plus innovantes ; 2e ressourcerie comme validation.
- **Ressources** : Découpage en epics/stories fines ; priorisation stricte MVP ; possibilité de report éco-organismes en v1 si nécessaire.

## Functional Requirements

### Caisse / POS

- **FR1** : Un opérateur habilité peut démarrer une session de caisse (avec fond de caisse) sur un poste donné.
- **FR2** : Un opérateur habilité peut enregistrer des ventes (lignes, catégories, quantités, prix, poids éventuels, paiements multi-moyens) pendant la session.
- **FR3** : Un opérateur habilité peut clôturer la session de caisse (comptage physique, totaux, écart éventuel) et déclencher le contrôle et la sync comptable.
- **FR4** : Le système peut restreindre l'accès au menu caisse uniquement lorsque le poste est en mode caisse (écran verrouillé sur la caisse).
- **FR5** : Une personne habilitée peut déverrouiller la session (ou quitter le mode caisse) en saisissant son code PIN.
- **FR6** : Le système peut gérer plusieurs lieux et plusieurs caisses (multi-sites, multi-caisses).
- **FR7** : Le système peut pousser chaque ticket de vente vers Paheko (push par ticket, file résiliente) sans double saisie compta.
- **FR7b** : Le système peut permettre la saisie caisse hors ligne (buffer local) et synchroniser les tickets vers Paheko au retour en ligne (file Redis Streams côté backend).

### Réception / flux matière

- **FR8** : Un opérateur peut ouvrir un poste de réception et créer des tickets de dépôt.
- **FR9** : Un opérateur peut saisir des lignes de réception (poids, catégorie, destination) sur un ticket.
- **FR10** : Le système conserve la réception comme source de vérité matière/poids (aucune sync manuelle obligatoire vers Paheko).

### Compta & synchronisation

- **FR11** : Le système peut synchroniser les données caisse (sessions, tickets, lignes, paiements) vers Paheko à la clôture (contrôle totaux, syncAccounting). Une **session** désigne une **session de caisse** (ouverture avec fond de caisse → clôture avec comptage) ; une session RecyClique = une session Paheko **par caisse** (en multi-caisses, chaque caisse a sa propre session). L'ouverture côté RecyClique crée la session Paheko correspondante via le plugin.
- **FR12** : Un responsable compta peut administrer la compta via l'interface Paheko (v1) en attendant les interfaces RecyClique.
- **FR13** : (Post-MVP) Un responsable compta peut effectuer les opérations compta (bilan, rapprochement, scan factures, notes de frais) depuis RecyClique.

### Correspondance / mapping RecyClique ↔ Paheko

- **FR13b** : Le système peut gérer un mapping prédéfini entre RecyClique et Paheko (moyens de paiement, catégories caisse, sites/emplacements, etc.) pour la v1 ; tout est configurable à l'avance même si certains éléments ne sont pas encore utilisés ou mappés. Le détail des champs et règles (module correspondance) s'appuie sur la recherche déjà réalisée (matrice, grille confrontation, dumps BDD) et sera affiné après confrontation BDD + instance dev + analyste. Le périmètre exact sera figé lorsque la BDD et l'instance dev sont stabilisées.
- **Presets / boutons rapides (Don, Recyclage, Déchèterie, etc.)** : selon les cas, correspondance vers catégories Paheko ou conservation dans RecyClique uniquement (flux non éco) ; l'étude (éco vs non-éco, règles de mapping) reste à faire et sera documentée (matrice ou spec dédiée).

### Utilisateurs & authentification

- **FR14** : Un administrateur peut démarrer un poste (caisse ou réception) avec un compte administrateur (ou équivalent).
- **FR15** : Le système peut associer un code PIN à chaque personne habilitée à la caisse pour le déverrouillage de session.
- **FR16** : (v0.1) Le système peut authentifier les utilisateurs terrain via JWT (FastAPI) et les utilisateurs admin via Paheko (auth séparée).
- **FR17** : (v0.2+) Le système peut offrir un SSO entre RecyClique et Paheko (à documenter).

### Administration & déploiement

- **FR18** : Un admin technique peut déployer et configurer l'instance (RecyClique en un container : front + middleware, Paheko, PostgreSQL, Redis) via Docker Compose.
- **FR19** : Un admin technique peut configurer le canal push RecyClique → Paheko (endpoint, secret, résilience).
- **FR20** : Le système peut conserver les tickets non poussés en file (Redis Streams) et les repousser après indisponibilité de Paheko (retry sans perte).

### Vie associative (v1 placeholders)

- **FR21** : Un utilisateur peut accéder à des écrans ou placeholders « vie associative » depuis RecyClique (calendrier, activités à dérouler post-MVP).

### Données déclaratives & éco-organismes

- **FR22** : Le système peut produire et conserver les données déclaratives (poids, flux, catégories, périodes) dans RecyClique pour les déclarations éco-organismes.
- **FR23** : (Post-MVP) Le système peut exposer un module décla éco-organismes (exports, multi-éco-organismes) depuis RecyClique.

### Architecture modulaire

- **FR24** : Le système peut charger et activer des modules RecyClique via configuration (TOML, ModuleBase, EventBus Redis Streams, slots React).
- **FR25** : Le système peut faire coexister des plugins Paheko et des modules RecyClique pour activer de nouvelles fonctionnalités (combinaison des deux écosystèmes).
- **FR26** : Le système peut exposer des points d'extension (interfaces type LayoutConfigService, VisualProvider) avec implémentations stub en v1, pour brancher ultérieurement affichage dynamique et service Peintre (JARVOS Mini) ; détail dans la recherche technique `_bmad-output/planning-artifacts/research/technical-affichage-dynamique-peintre-extension-points-research-2026-02-25.md`.

### Gestion documentaire RecyClique

- **FR27** : (Post-MVP) Le système peut gérer un fonds documentaire RecyClique (statutaire, communication interne et externe, documentation de la ressourcerie, prise de notes — idées, transcriptions de réunions, etc.) distinct de la gestion documentaire compta/factures Paheko. Le stockage peut s'appuyer sur un drive externe (ex. K-Drive) ou sur un espace de fichiers dédié (ex. volume dédié dans l'instance). L'évolution vers JARVOS Nano puis Mini permettra la recherche intelligente, l'édition intelligente et l'assistance à la rédaction. Périmètre détaillé et frontière avec Paheko à préciser (voir politique fichiers, artefact 2026-02-25_02).

## Non-Functional Requirements

### Performance

- **NFR-P1** : L'enregistrement d'une vente (saisie + envoi) se termine en moins de 2 secondes dans des conditions normales.
- **NFR-P2** : La clôture de session ne bloque pas l'opérateur plus de 10 secondes ; le push et la sync comptable peuvent s'achever en arrière-plan.

### Security

- **NFR-S1** : Les échanges RecyClique ↔ Paheko (push) passent par HTTPS avec un secret partagé (header ou paramètre) ; aucun secret en clair dans les requêtes.
- **NFR-S2** : Les secrets (endpoint plugin, credentials) sont gérés via variables d'environnement ou secrets manager, pas en dur dans le code.
- **NFR-S3** : Accès caisse restreint par mode verrouillé (menu caisse seul) et déverrouillage par PIN par opérateur habilité.
- **NFR-S4** : Données personnelles (utilisateurs, adhésions) conformes au RGPD dans le périmètre géré par Paheko/RecyClique.

### Integration & Reliability

- **NFR-I1** : La file de push (Redis Streams) garantit qu'aucun ticket n'est perdu en cas d'indisponibilité temporaire de Paheko ; retry jusqu'à succès (ou traitement manuel documenté).
- **NFR-I2** : Les écritures compta (syncAccounting) respectent la configuration Paheko (comptes, exercice, moyens de paiement) ; la config Paheko est la référence.

### Accessibility

- **NFR-A1** : Bonnes pratiques d'accessibilité de base (contraste, navigation clavier) pour les écrans caisse et réception ; renforcement possible post-MVP.

*Scalability* : Non détaillée en v1 (une instance par ressourcerie ; 2e ressourcerie = objectif de validation).

## Traçabilité FR → Parcours

| Parcours | FR couverts |
|----------|-------------|
| J1 (Opérateur caisse) | FR1–FR7, FR11, FR14, FR15, FR18–FR20 |
| J2 (Réception) | FR8–FR10 |
| J3 (Compta / admin) | FR11–FR13, FR16, FR17 |
| J4 (Admin technique) | FR18–FR20 |
| J5 (Vie asso) | FR21 |
| Domaine / scope | FR13b, FR22–FR27 |

*Source :* tableau Journey Requirements Summary, matrice RBAC, Product Scope.

## Références projet

- **Versioning** : `references/versioning.md` (v0.1.0 → v1.0.0).
- **Matrice correspondance caisse/poids** : `references/migration-paeco/audits/matrice-correspondance-caisse-poids.md`.
- **Grille confrontation** : `references/artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md`.
- **Checklist import 1.4.4** : `references/ancien-repo/checklist-import-1.4.4.md` (copy, consolidate, security à chaque pioche).
- **Vision module décla éco-organismes** : `references/vision-projet/vision-module-decla-eco-organismes.md`.
- **Extension points / Peintre (recherche)** : `_bmad-output/planning-artifacts/research/technical-affichage-dynamique-peintre-extension-points-research-2026-02-25.md`.
- **Décision déploiement RecyClique + préconisations migration v1** : `references/artefacts/2026-02-26_01_analyse-separation-frontend-backend-recyclic.md`.
- **Track BMAD Enterprise (multi-utilisateur, une instance par ressourcerie)** : `references/artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md`.
- **Spécification UX v1 (stratégie, périmètre écrans, extension points)** : `_bmad-output/planning-artifacts/ux-design-specification.md`.
