---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - references/artefacts/2026-02-24_06_brainstorm-migration-paheko.md
  - references/ou-on-en-est.md
  - references/versioning.md
  - references/artefacts/2026-02-25_06_point-global-avant-prd.md
  - references/artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md
  - references/artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md
  - references/artefacts/2026-02-24_07_design-systeme-modules.md
date: 2026-02-25
author: Strophe
---

# Product Brief: JARVOS_recyclique

## Executive Summary

JARVOS Recyclique est la refonte complète du logiciel RecyClique (actuellement en production en v1.4.4). On conserve la même structure globale (front-end terrain, back-end métier) en déportant une partie du back-end vers Paheko : compta, gestion des utilisateurs et, à terme, la vie associative. L'objectif est de remplacer un jour la version en prod par une solution à l'usage équivalent (ou enrichi), sans perturber les utilisateurs actuels (La Clique), tout en ouvrant la voie à d'autres ressourceries. Les priorités sont une base de code propre et sécurisée, l'évolution modulaire et les déclarations aux éco-organismes. Dans une version future, l'intégration de JARVOS Nano puis JARVOS Mini apportera la surcouche cognitive (IA, RAG, documents, etc.) au sein de l'écosystème JARVOS.

---

## Core Vision

### Problem Statement

La version actuelle RecyClique (1.4.4) en production cumule une dette technique et des risques de sécurité importants ; en parallèle, Paheko et RecyClique constituent deux mondes séparés — compta et vie associative d'un côté, caisse et flux matière de l'autre — sans intégration réelle. Il manque une plateforme unifiée, maintenable et sécurisée qui garde l'usage actuel tout en déléguant à Paheko la compta, les utilisateurs et la vie asso, et qui permette les déclarations éco-organismes et des évolutions par modules, avec une trajectoire vers une surcouche cognitive (JARVOS Nano/Mini).

### Problem Impact

- Risques pour La Clique (seuls utilisateurs actuels) et blocage pour ouvrir à d'autres ressourceries.
- Deux mondes séparés : saisies et processus non alignés, compta saisie à part, pas de sync caisse–compta.
- Impossible d'avancer sereinement sur les décla éco-organismes et sur des évolutions métier sans refondre la base ; pas de place pour une surcouche IA/RAG sans architecture modulaire.

### Why Existing Solutions Fall Short

- **RecyClique 1.4.4** : dette technique importante et risques de sécurité (code fragile, non modulaire, failles supposées) ; pas conçu pour déléguer la compta et les utilisateurs à un moteur externe.
- **Paheko et RecyClique sont deux mondes séparés** : compta et vie asso d'un côté, caisse et flux matière de l'autre ; pas de sync native, double saisie ou processus découplés.
- **Paheko seul** : ne couvre pas la caisse terrain, les dépôts et les flux matière ; ne remplace pas RecyClique.
- **Garder l'existant sans refonte** : perpétue la dette, les risques sécurité et le cloisonnement entre les deux systèmes.

### Proposed Solution

Refonte complète (v0.1.0 → v1.0.0) avec **double back-end** : RecyClique (FastAPI) pour les flux terrain (caisse, réception, dépôts, catégories EEE) et Paheko pour la compta, les utilisateurs et la vie associative. Même expérience utilisateur (ou meilleure), pas de rupture pour la prod ; sync caisse → Paheko (push par ticket, Redis Streams, plugin PHP). Architecture modulaire (TOML, ModuleBase, EventBus Redis Streams, slots React) et règles d'import du code 1.4.4 (copy, consolidate, security) pour un code propre et sécurisé. **Vision ultérieure** : intégration JARVOS Nano puis JARVOS Mini — surcouche cognitive (IA, RAG, documents) au sein de l'écosystème JARVOS.

### Key Differentiators

- **Continuité d'usage** : remplacement progressif de la prod sans perturber La Clique ni les futurs utilisateurs.
- **Paheko au cœur** : compta, utilisateurs et vie asso centralisés dans un moteur éprouvé, tout en gardant RecyClique comme interface terrain et source de vérité pour la matière et les décla.
- **Évolution modulaire** : socle conçu pour ajouter des modules (décla éco-organismes, store, etc.) sans tout casser.
- **Sécurité et maintenabilité** : refonte avec checklist d'import et architecture claire, pour sortir des trous de la 1.4.4.
- **Trajectoire JARVOS Nano/Mini** : base prête pour la surcouche cognitive (IA, RAG, documents) dans les versions futures.

---

## Target Users

### Primary Users

- **Opérateurs terrain (caisse et réception)** — Responsables et bénévoles à la caisse et au dépôt / réception des objets. Besoin principal : saisie fluide, éventuellement offline, sync automatique vers la compta sans double saisie. Ce sont les utilisateurs les plus fréquents au quotidien.
- **Bénévoles et responsables (vie associative)** — Gestion du calendrier, des événements et des activités (v0.1 = placeholders ; à dérouler dans les versions suivantes). Besoin : un seul lieu pour planifier et suivre la vie de la ressourcerie.
- **Responsables compta, admin et communication** — Ceux qui font la compta, l'administration et la communication. Besoin : tout au même endroit (RecyClique pour les vues et workflows compta, Paheko en backend), moins de bascule entre outils, déclarations éco-organismes intégrées.

**Qui tire le plus de valeur** : La Clique au quotidien aujourd'hui ; les futures ressourceries qui adopteront la plateforme de la même façon.

### Secondary Users

- **Admin technique / déploiement** — Configuration, maintenance, déploiement (ex. Strophe aujourd'hui). Accès Paheko super-admin si besoin ; objectif à terme = tout pilotable depuis RecyClique.
- **Éco-organismes** — En lecture ou export des données déclaratives (versions ultérieures, module décla).

### User Journey

- **Découverte** : utilisateurs actuels = déjà sur RecyClique 1.4.4 et Paheko ; futures ressourceries = proposition via le réseau / La Clique.
- **Onboarding** : migration sans rupture pour La Clique (même usage ou enrichi) ; pour une nouvelle ressourcerie = mise en place instance + formation caisse / compta / admin.
- **Usage au quotidien** : caisse et réception dans RecyClique (terrain) ; compta, utilisateurs, vie asso via Paheko (et bientôt vues compta dans RecyClique) ; décla éco-organismes dans RecyClique.
- **Moment de valeur** : plus de double saisie caisse–compta, une seule base utilisateurs et compta, outils pérennes et sécurisés.
- **Long terme** : routine ressourcerie (terrain + admin + compta + communication) dans un écosystème unifié ; évolution modulaire et, plus tard, surcouche JARVOS Nano/Mini.

---

## Success Metrics

**Succès utilisateurs** : plus de double saisie caisse–compta ; clôtures de caisse sans erreur ; déclarations éco-organismes produites dans l'outil ; interface simple et facile ; gains de temps importants et moins d'erreurs. Ce qui fait dire « ça valait le coup » : gain de temps, moins d'erreurs, interface simple, énormément de gains de temps.

### Business Objectives

- Livraison **au plus tôt possible** (autant que possible).
- **Première version livrée en production** = **v1.0.0** (remplacement de la prod actuelle). Les versions v0.1.0 à v0.5.0 sont des jalons de développement, pas des livraisons prod.

### Key Performance Indicators

- **Adoption** : une deuxième ressourcerie utilise la plateforme en production (indicateur de valeur et de réplicabilité).
- **Utilisateurs** : clôtures caisse sans erreur, sync caisse–compta opérationnelle, décla éco-organismes réalisées via RecyClique.
- **Projet** : atteinte des jalons v0.x selon le versioning, puis mise en prod v1.0.0 chez La Clique sans perturbation des usages.

---

## MVP Scope

**Objectif MVP** : **v1.0.0 en prod chez La Clique sans rupture** — caisse qui tourne, clôture sans double saisie, tout ce qui doit être saisi l'est, sync caisse → Paheko opérationnelle. Pour le porteur du projet : **nouvelle architecture modulaire** en place (double back-end, TOML, ModuleBase, EventBus Redis Streams, slots React, monorepo), base propre et sécurisée.

### Core Features (MVP = v1.0.0)

- Socle Docker Paheko + API FastAPI (v0.1.0).
- Vertical slice caisse/ventes fonctionnel, sync vers Paheko (v0.2.0).
- Réception fonctionnelle (v0.3.0).
- Auth + users + admin (v0.4.0).
- Éco-organismes : périmètre minimal pour v1.0 si nécessaire, sinon report (v0.5.0).
- Déploiement en prod chez La Clique, stable, **sans rupture** pour les usages actuels (v1.0.0).
- **Architecture modulaire** : design respecté dès les jalons (modules, EventBus, slots), pas seulement en fin de chaîne.

### Design / UX (v1.0)

Pour la v1.0, **conservation des mêmes écrans** que RecyClique 1.4.4 : pas de refonte UX à ce stade. **Copie du code d'origine** pour les mises en page et les écrans (copy + consolidate + security, comme pour tout import depuis 1.4.4 — voir `references/ancien-repo/checklist-import-1.4.4.md`). Refactoring éventuel des écrans plus tard, dans le cadre modulaire. À préciser dans le PRD et à rappeler en phase Create UX Design si un workflow est lancé.

### Out of Scope for MVP (v1.0.0)

- **Déclarations éco-organismes complètes** (module décla pleinement déroulé) → versions ultérieures.
- **Calendrier / événements / activités** (vie asso) → placeholders en v1.0, à dérouler après.
- **JARVOS Nano / JARVOS Mini** (surcouche cognitive, IA, RAG) → vision post-MVP.
- **SSO** (authentification unifiée Paheko ↔ RecyClique) → reporté (v0.2+ à documenter dans le PRD).
- **Deuxième ressourcerie en production** → indicateur de succès post-MVP, pas dans le périmètre de livraison v1.0.

### MVP Success Criteria

- La Clique utilise v1.0.0 en production sans rupture des usages.
- Clôtures de caisse sans erreur, plus de double saisie caisse–compta.
- Sync caisse → Paheko opérationnelle (push par ticket, Redis Streams, plugin PHP).
- Nouvelle architecture modulaire en place et documentée (PRD / référentiel).

### Future Vision

- **Plusieurs ressourceries** en production (adoption par une 2e puis d'autres).
- **Module décla éco-organismes** complet (déclarations, exports, multi-éco-organismes).
- **Vie associative complète** (calendrier, événements, activités).
- **Surcouche IA** : intégration JARVOS Nano puis JARVOS Mini (IA, RAG, documents).
