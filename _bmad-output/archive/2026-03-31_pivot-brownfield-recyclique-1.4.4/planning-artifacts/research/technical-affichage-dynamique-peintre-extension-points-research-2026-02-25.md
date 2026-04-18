---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Affichage dynamique, écrans configurables (v2+) et extension point Peintre (JARVOS Mini)'
research_goals: "Définir où et comment placer des stubs / extension points dans le code v1.0 pour une future refonte d'affichage (écrans configurables par utilisateur ou par rôle) et l'intégration du service Peintre (JARVOS Mini, génération dynamique de visuels) ; pas d'implémentation maintenant, réserver la place en mode stub/mock."
user_name: 'Strophe'
date: '2026-02-25'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-02-25
**Author:** Strophe
**Research Type:** technical

---

## Research Overview

Cette recherche technique porte sur les **extension points et stubs** permettant de réserver la place, dès la v1.0, pour une **refonte d'affichage dynamique** (écrans configurables par utilisateur, v2+) et pour l'**intégration du service Peintre** (JARVOS Mini, génération dynamique de visuels). Objectif : identifier où et comment placer des interfaces, des implémentations mock et un enregistrement au bootstrap, sans implémenter les fonctionnalités tout de suite. La recherche couvre le technology stack (React-Grid-Layout, slots, extension points type Backstage), les patterns d'intégration (API préférences, Gateway pour Peintre), l'architecture (extension points, couches remplaçables, emplacements des stubs) et la roadmap d'implémentation (v1.0 vs v2+). Les recommandations concrètes (fichiers, bootstrap, risques) sont synthétisées dans la section **Technical Research Recommendations** et dans le **Research Synthesis** en fin de document.

---

## Technical Research Scope Confirmation

**Research Topic:** Affichage dynamique, écrans configurables (v2+) et extension point Peintre (JARVOS Mini)
**Research Goals:** Définir où et comment placer des stubs / extension points dans le code v1.0 pour une future refonte d'affichage (écrans configurables par utilisateur ou par rôle) et l'intégration du service Peintre (JARVOS Mini, génération dynamique de visuels) ; pas d'implémentation maintenant, réserver la place en mode stub/mock.

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-02-25

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technology Stack Analysis

### Langages et runtime

Le projet RecyClique repose déjà sur **TypeScript** et **React** (Vite). Pour l'affichage dynamique et les extension points, pas de changement de langage : on reste sur ce stack. Les patterns (slots, layout configurable, abstraction d'API) sont bien couverts en React/TS.

_Source : stack actuel documenté (Brief, design modules 07)._

### Frameworks et bibliothèques (layout et écrans configurables)

**React-Grid-Layout** est la solution la plus utilisée pour des tableaux de bord configurables en React : widgets déplaçables et redimensionnables, breakpoints responsives, layouts par breakpoint. La persistance des préférences peut passer par **localStorage** (`onLayoutChange` → sauvegarde), ou par un backend (compte utilisateur Paheko/RecyClique) pour du « par utilisateur ». À introduire en v2+, pas en v1.0.

**Slots React** : le design modules (artefact 07) prévoit déjà des **slots** (`ModuleSlot`, injection de contenu par nom). Ce pattern sert de base pour des zones remplaçables plus tard par du contenu dynamique ou par des visuels fournis par un service externe (Peintre). À réutiliser et pas à remplacer.

_Popular Libraries: react-grid-layout (npm), Recharts pour contenu de widgets ; pattern Compound Components + Context pour slots._  
_Source : [React-Grid-Layout](https://www.npmjs.com/package/react-grid-layout), [RGL LocalStorage example](https://react-grid-layout.github.io/react-grid-layout/examples/8-localstorage-responsive.html), [Slot-based APIs in React](https://forem.com/talissoncosta/slot-based-apis-in-react-designing-flexible-and-composable-components-7pj)._

### Extension points et architecture « plugin »

**Extension points** : des systèmes comme **Backstage** formalisent des points d'extension frontend (`createFrontendPlugin`, `createApiRef`, `createApiFactory`) pour que des modules enregistrent des implémentations (ou des mocks) sans couplage fort. Pour RecyClique, l'idée est la même : définir des **interfaces** (ex. `VisualProvider`, `LayoutConfigService`) et les implémenter en **stub/mock** en v1.0, puis en vraie implémentation (Peintre, config par utilisateur) plus tard.

**Stub / mock pour service futur** : une couche d'abstraction (interface + factory) permet de brancher soit une implémentation **mock** (données en dur ou MSW/Mirage), soit le vrai service Peintre quand il sera disponible. Aucun changement de contrat côté composants qui consomment le service.

_Source : [Backstage Frontend Plugins](https://backstage.io/docs/next/frontend-system/architecture/plugins), [Backstage Extension Points](https://backstage.io/docs/next/backend-system/architecture/extension-points), [MSW](https://mswjs.io/docs/http), [Mirage JS](https://miragejs.com/)._

### Persistance des préférences (écran / layout)

- **v1.0** : pas de persistance de layout configurable (écrans fixes, copie 1.4.4).
- **v2+** : deux options vérifiées par la recherche — **localStorage** (rapide, par appareil) ou **backend** (compte utilisateur Paheko/RecyClique, préférences par utilisateur). Le backend permet « même préférences sur tous les postes » et s'aligne avec la gestion utilisateurs Paheko.

_Source : [RGL Example 8 - LocalStorage](https://react-grid-layout.github.io/react-grid-layout/examples/8-localstorage-responsive.html)._

### Intégration d'un service « visuels dynamiques » (Peintre)

Pour **Peintre (JARVOS Mini)** plus tard : définir une **interface** côté front (ex. `getVisual(context)` → URL ou blob), une **implémentation mock** qui retourne un placeholder ou une image statique, et une **implémentation réelle** qui appelle le service Peintre. Les composants qui affichent des visuels appellent uniquement l'interface ; le branchement mock vs réel se fait au bootstrap (factory / DI). Aucune dépendance directe au service Peintre dans le code métier.

_Source : pratiques courantes (Backstage createApiRef, MSW/Mirage pour mocks), aligné avec le design modules existant._

### Synthèse et confiance

| Domaine | Recommandation | Niveau de confiance |
|--------|----------------|---------------------|
| Layout configurable (v2+) | React-Grid-Layout (ou équivalent) + persistance localStorage ou backend | Élevé (sources récentes, usage répandu) |
| Slots / placeholders | Conserver et étendre le pattern ModuleSlot (déjà prévu) | Élevé (déjà dans le design) |
| Extension points / stubs | Interfaces + factory + implémentation mock ; inspirer Backstage/createApiRef | Élevé |
| Service Peintre | Interface + mock impl en v1.0 ; brancher Peintre en v2+ | Élevé (pattern standard) |

_Technology adoption trends : layout configurable et extension points sont des patterns matures en React ; l'abstraction par interface + mock pour un service futur est une pratique standard._

---

## Integration Patterns Analysis

### API design (préférences utilisateur et layout)

Pour une **API de préférences** (layout, configuration d'écran par utilisateur en v2+), une approche **REST resource-oriented** convient : ressource du type `GET/PUT /api/users/me/preferences` ou `.../layout` avec un corps JSON décrivant la grille (positions, tailles, widgets). Des implémentations existantes (ex. **Grafana User Preferences API**) exposent des endpoints HTTP pour thème, layout et configuration. Côté RecyClique : soit un endpoint FastAPI qui persiste en BDD ou délègue à Paheko (profil utilisateur), soit lecture/écriture directe dans un store utilisateur Paheko si l'API le permet.

_Standards : Google API Design Guide (ressources, méthodes standard, versioning)._  
_Source : [Grafana Preferences API](https://grafana.com/docs/grafana/next/developers/http_api/preferences/), [Google Cloud API Design Guide](https://docs.cloud.google.com/apis/design)._

### Contrat d'API et abstraction service externe (Peintre)

Pour le **service Peintre** (JARVOS Mini) appelé depuis le front : définir un **contrat** (interface) côté client — ex. `getVisual(context: VisualContext): Promise<VisualResult>` — et une **implémentation Gateway** qui encapsule l'appel au service externe. En v1.0, la Gateway est un **stub** (réponses en dur ou mock) ; plus tard, la même interface est implémentée par un client HTTP vers Peintre. Le code front ne dépend que de l'interface, pas du service réel. Les tests peuvent utiliser Pact ou un mock (MSW) pour valider le contrat.

_Source : [Gateway pattern (Fowler)](https://martinfowler.com/articles/gateway-pattern.html), [AWS – Service contracts per API](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_service_architecture_api_contracts.html), [Pact contract testing](https://docs.pact.io/)._

### Protocoles et formats

- **Transport** : HTTPS entre front RecyClique et FastAPI ; entre RecyClique et Peintre (v2+) : HTTPS, éventuellement avec authentification (JWT ou clé API).
- **Formats** : **JSON** pour les préférences de layout (structure type React-Grid-Layout : `{ layout: [...], breakpoints: {...} }`) et pour les réponses du service visuel (URL d'image, blob, ou métadonnées).
- **Préférences thème/affichage** : possibilité de s'aligner sur les **Client Hints** (ex. `Sec-CH-Prefers-Color-Scheme`) pour éviter un flash de thème incorrect au premier chargement ; optionnel en v2+.

_Source : [User Preference Media Features (W3C)](https://wicg.github.io/user-preference-media-features-headers/)._

### Interopérabilité et sécurité

- **Front RecyClique ↔ Backend** : déjà en place (FastAPI). Les préférences layout en v2+ s'ajoutent comme un sous-ensemble de l'API existante (ressource dédiée ou champs dans le profil utilisateur).
- **Front ↔ Peintre** : pas d'appel direct en v1.0 ; en v2+, soit le front appelle Peintre via une **BFF** FastAPI (FastAPI proxy vers Peintre), soit le front appelle Peintre avec un token délégué — à trancher selon la sécurité et l'architecture JARVOS Mini.
- **Sécurité** : authentification utilisateur (JWT / session) pour lire/écrire les préférences ; pour Peintre, authentification du service (API key ou OAuth2) à définir avec JARVOS Mini.

_Source : [Backends For Frontends (Sam Newman)](https://samnewman.io/patterns/architectural/bff/)._

---

## Architectural Patterns and Design

### Patterns système : extension points et couches remplaçables

L'architecture doit **séparer le contrat** (interface) **des implémentations** (stub en v1.0, réel en v2+). Pattern classique : **Extension Point** = contrat que le cœur de l'app consomme ; **Extension** = implémentation qui respecte ce contrat. L'injection se fait au **bootstrap** (ou au montage de l'app) : on enregistre soit une implémentation mock, soit la vraie (Peintre, service de préférences). Ainsi, les composants qui affichent des visuels ou qui lisent la config layout ne dépendent que de l'interface, pas du service concret.

_Source : [LoopBack Extension points](https://loopback.io/doc/en/lb4/Extension-point-and-extensions.html), [Spring Bean extension points](https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html)._

### Principes de conception : où placer les stubs

- **Couche « service »** : définir des interfaces (ex. `LayoutConfigService`, `VisualProvider`) dans un module core ou `shared/`, et les implémentations (stub, mock, Peintre) dans des modules dédiés ou des fichiers `*.stub.ts` / `*.peintre.ts`.
- **Bootstrap / initialisation** : au démarrage de l'app React (fichier `main.tsx` ou module d'init), enregistrer les implémentations dans un **Context** ou une **factory** (pattern Backstage `createApiFactory`). En dev ou v1.0 : enregistrer le stub ; en v2+ ou si config activée : enregistrer le client Peintre.
- **Pas de dépendance directe** : les écrans et composants importent uniquement l'interface ou un hook du type `useLayoutConfig()` / `useVisual()`, qui lit l'implémentation depuis le Context. Aucun `import` vers le module Peintre ou le stub dans les composants métier.

_Source : [Backstage Extension Blueprints](https://backstage.io/docs/frontend-system/architecture/extension-blueprints), [Dependency injection in React](https://codedrivendevelopment.com/posts/dependency-injection-in-react)._

### Scalabilité et maintenabilité

- **Layout configurable (v2+)** : la persistance des préférences (localStorage ou API) reste légère ; pas d'impact sur la scalabilité serveur si l'API préférences est un simple CRUD par utilisateur.
- **Service Peintre** : en appelant Peintre via une BFF FastAPI, on centralise le cache, les timeouts et la gestion d'erreurs ; le front reste simple et Peintre peut évoluer sans changer le contrat client.
- **Évolutivité** : ajouter une nouvelle source de visuels (autre service que Peintre) = nouvelle implémentation de l'interface `VisualProvider`, enregistrée au bootstrap, sans toucher aux écrans.

### Intégration et communication

- **Front ↔ backend RecyClique** : inchangé (FastAPI). Les préférences layout s'ajoutent comme une ressource de plus.
- **Front ↔ Peintre** : soit **direct** (front appelle Peintre avec token), soit **via BFF** (FastAPI proxy). La BFF simplifie la sécurité et le cache ; le front, lui, ne connaît que l'interface `VisualProvider`, donc le choix BFF vs direct est transparent pour les composants.
- **Communication inter-composants** : les slots (ModuleSlot) et le Context (layout, thème, visuels) suffisent ; pas besoin d'event bus côté front pour ce périmètre.

### Sécurité et données

- **Préférences** : stockage par utilisateur authentifié ; ne pas exposer les préférences d'un utilisateur à un autre (ressource `/users/me/preferences`).
- **Peintre** : ne pas exposer de clé API ou de token côté client si l'appel passe par la BFF ; en appel direct, utiliser un token à courte durée ou délégué (OAuth2 / JARVOS).
- **Données layout** : le JSON de layout (positions, widgets) n'est pas sensible ; le contenu affiché dans les widgets (données métier) reste protégé par les APIs existantes.

### Synthèse : emplacements recommandés pour les stubs (v1.0)

| Élément | Où le placer | Format v1.0 |
|--------|---------------|-------------|
| Interface `LayoutConfigService` | `core/layout` ou `shared/services` | Interface TS + implémentation stub qui retourne un layout fixe (ou lit un JSON par défaut) |
| Interface `VisualProvider` | `core/visual` ou `shared/services` | Interface TS + implémentation stub qui retourne une image/URL placeholder |
| Enregistrement (stub vs réel) | Bootstrap (ex. `main.tsx` ou `AppProviders`) | Context Provider ou factory qui injecte le stub selon env / config |
| Slots pour contenu dynamique | Déjà prévus (ModuleSlot) | Réutiliser ; les composants qui rendent dans un slot peuvent appeler `useVisual()` pour le contenu futur |
| API préférences (v2+) | FastAPI : route `/api/users/me/preferences` | Non implémentée en v1.0 ; possible de définir le contrat (schéma JSON) et une route stub qui renvoie 501 ou un layout par défaut |

_Source : synthèse des sections précédentes et [AppDirect Extensions Architecture](https://developer.appdirect.com/user-guides/extensions/reference/architecture)._

---

## Implementation Approaches and Technology Adoption

### Stratégie d'adoption : stub d'abord, puis service réel

Une approche **stub-first** permet de développer et tester sans dépendre du service externe (Peintre), puis de remplacer progressivement le stub par l'implémentation réelle (pattern proche du **Strangler Fig** en migration). Les composants consomment toujours la même interface ; seul le branchement au bootstrap change (stub vs client Peintre). Les stubs doivent respecter le **contrat** (même signature, sémantique proche) pour éviter des écarts lors du basculement.

_Source : [Service Stub (Fowler)](https://martinfowler.com/eaaCatalog/serviceStub.html), [Strangler Fig Pattern](https://www.baeldung.com/cs/microservices-strangler-pattern), [Stub external services in tests](https://blog.allegro.tech/2026/02/how-to-stub-external-services.html)._

### Workflows de développement et outillage

- **v1.0** : ajouter les interfaces et les stubs dans le même repo (monorepo actuel) ; pas de nouveau pipeline. Les tests unitaires et d'intégration peuvent s'appuyer sur le stub (pas d'appel réseau).
- **Tests** : valider le comportement des composants qui utilisent `useLayoutConfig()` / `useVisual()` avec le stub ; plus tard, tests de contrat (Pact ou MSW) entre front et Peintre si l'API est exposée.
- **Déploiement** : inchangé ; le stub est livré avec l'app jusqu'à activation du service réel (config ou feature flag).

### Roadmap d'implémentation recommandée

| Phase | Action | Livrable |
|-------|--------|----------|
| **v1.0 (dès le socle front)** | Définir `LayoutConfigService` et `VisualProvider` (interfaces TS) dans `core/` ou `shared/services`. | Fichiers d'interface + JSDoc ou commentaire « v2+ : implémentation réelle ». |
| **v1.0** | Implémenter stubs (layout fixe ou par défaut ; visuel placeholder). Enregistrer les stubs au bootstrap (Context ou factory). | Composants peuvent appeler `useLayoutConfig()` / `useVisual()` sans erreur. |
| **v1.0** | Réutiliser les slots existants (ModuleSlot) là où un visuel dynamique pourra être injecté plus tard ; pas de changement de structure des écrans. | Pas de régression ; emplacements prêts pour v2. |
| **v2+** | Implémenter l'API préférences (backend) et le client `LayoutConfigService` réel ; remplacer le stub au bootstrap par la vraie implémentation. | Layout configurable par utilisateur. |
| **v2+** | Implémenter le client Peintre (ou BFF proxy) ; remplacer le stub `VisualProvider` au bootstrap. | Visuels générés par Peintre (JARVOS Mini). |

### Recommandations techniques (synthèse)

- **Interfaces** : `core/layout/types.ts` (ou équivalent) pour `LayoutConfigService` ; `core/visual/types.ts` pour `VisualProvider`. Exporter les types depuis un barrel `core/services` ou `shared/services`.
- **Stubs** : `core/layout/layout-config.stub.ts`, `core/visual/visual-provider.stub.ts` (ou sous-dossier `__stubs__` selon conventions du projet). Ne pas mélanger stub et code métier dans le même fichier.
- **Bootstrap** : dans le module d'init React (ex. `AppProviders.tsx` ou `main.tsx`), créer le Context ou la factory et y enregistrer les stubs ; prévoir une config (env ou feature flag) pour basculer sur les implémentations réelles en v2+.
- **Documentation** : indiquer dans le Brief ou le PRD que les emplacements pour layout dynamique et Peintre sont réservés (stubs en v1.0) ; référencer ce rapport de recherche technique pour les détails.

### Risques et atténuation

- **Risque** : stub trop éloigné du comportement réel de Peintre → surprises au basculement. **Atténuation** : définir le contrat (paramètres, format de réponse) dès que Peintre a une spec ou une maquette d'API ; faire valider le stub contre ce contrat.
- **Risque** : oublier de brancher le service réel en v2+. **Atténuation** : centraliser l'enregistrement au bootstrap et documenter la checklist « activer Peintre » (config, déploiement, tests).

---

## Executive Summary

Cette recherche technique définit **où et comment réserver la place**, dans le code v1.0 de JARVOS Recyclique, pour une **affichage dynamique** (écrans configurables par utilisateur ou par rôle, v2+) et pour l'**intégration du service Peintre** (JARVOS Mini, génération dynamique de visuels), **sans implémenter ces fonctionnalités tout de suite**. Les conclusions sont les suivantes : (1) définir deux **interfaces** — `LayoutConfigService` et `VisualProvider` — dans un module core ou shared ; (2) fournir des **implémentations stub** (layout fixe, visuel placeholder) et les **enregistrer au bootstrap** (Context ou factory React) ; (3) réutiliser les **slots** existants (ModuleSlot) pour les zones à contenu dynamique futur ; (4) en v2+, brancher les vraies implémentations (API préférences, client Peintre) sans changer les composants métier. La stratégie stub-first et les emplacements recommandés (fichiers, bootstrap, risques) sont détaillés dans les sections Technology Stack, Integration Patterns, Architectural Patterns et Implementation de ce document.

**Recommandations principales :** introduire les interfaces et stubs dès le socle front v1.0 ; centraliser l'enregistrement au bootstrap ; documenter la décision dans le Brief/PRD et référencer ce rapport pour les détails techniques.

---

## Table des matières

1. Technical Research Scope Confirmation  
2. Technology Stack Analysis  
3. Integration Patterns Analysis  
4. Architectural Patterns and Design  
5. Implementation Approaches and Technology Adoption  
6. Executive Summary (ci-dessus)  
7. Research Synthesis et conclusion (ci-dessous)

---

## Research Synthesis et conclusion

### Synthèse des résultats

- **Stack et patterns** : React-Grid-Layout (v2+), slots (ModuleSlot conservés), extension points type Backstage (interfaces + factory), persistance préférences (localStorage ou API).
- **Intégration** : API préférences type REST (ex. Grafana) ; Gateway pour Peintre (interface + stub puis client réel) ; JSON pour layout et réponses visuelles.
- **Architecture** : séparation contrat / implémentation ; bootstrap pour enregistrer stub ou réel ; pas de dépendance directe des écrans vers Peintre ou le stub.
- **Implémentation** : roadmap v1.0 (interfaces + stubs + bootstrap) puis v2+ (API préférences, client Peintre) ; risques limités par un contrat clair et une checklist d'activation.

### Impact pour le projet

Le Brief et le PRD peuvent s'appuyer sur ce rapport pour **figer les emplacements** (core/layout, core/visual, bootstrap) et la **stratégie stub-first**, sans décrire toute la refonte UI ni l'API Peintre. Les développeurs peuvent ajouter les interfaces et stubs dès la mise en place du front v1.0.

### Prochaines étapes recommandées

1. **PRD** : mentionner les extension points layout et visuel (stubs en v1.0) et référencer ce rapport.  
2. **Socle front v1.0** : créer les interfaces et stubs, les enregistrer au bootstrap.  
3. **Quand Peintre (JARVOS Mini) est prêt** : définir le contrat d'API, implémenter le client (ou BFF), remplacer le stub au bootstrap et documenter la checklist « activer Peintre ».

---

**Date de finalisation de la recherche :** 2026-02-25  
**Vérification des sources :** faits techniques croisés avec des sources web (React-Grid-Layout, Backstage, Fowler, LoopBack, Grafana, MSW, etc.).  

*Ce document sert de référence technique pour les décisions d'architecture et d'implémentation liées à l'affichage dynamique et à l'intégration Peintre dans JARVOS Recyclique.*
