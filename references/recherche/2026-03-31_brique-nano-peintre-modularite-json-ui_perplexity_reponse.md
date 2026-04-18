# Brique nano de Peintre / RecyClique : choix de framework de modularité et JSON UI

## 1. Rappel du besoin architectural

L’objectif est de définir une première "brique nano" qui serve à la fois de socle de modularité pour RecyClique V2 et de substrat futur pour Peintre‑agent, capable à terme de composer l’interface via du JSON (widgets déclarés/instanciés par l’IA).

Les contraintes clés sont :
- Modules activables/désactivables dynamiquement ("pilets"/plugins).
- Slots/points d’extension dans le shell, avec contrat stable de données/événements.
- Manifest JSON décrivant les contributions d’un module (routes, vues, actions, permissions, slots).
- Évolutivité vers une UI pilotée par le serveur / l’agent (Server‑Driven UI, SDUI) sans tout réécrire.

Le conseil initial d’Opus se structure autour de Piral (micro‑frontends avec slots), DivKit (SDUI JSON) et Module Federation (plomberie bas niveau). L’objectif du présent travail est d’élargir ce panorama et de confirmer une recommandation de trajectoire.

## 2. Famille 1 : frameworks micro‑frontends à slots/plugins

### 2.1 Piral (référence mentale principale)

Piral propose un shell d’application (Piral instance) et des micro‑apps (pilets) qui s’enregistrent dynamiquement et peuvent contribuer à des "extension slots" dans le layout. Chaque pilet embarque sa propre UI/logic métier et est distribué via un feed, pouvant être activé/désactivé à chaud.[^1]

Points pertinents pour ton cas :
- Modèle shell + slots + pilets très proche de ta vision de modules RecyClique et de poignées d’extension.[^1]
- Gestion native de l’isolation, lazy‑loading, packaging et mise à jour de modules.
- Par contre, outillage relativement lourd (CLI, feed service, packaging dédié) dimensionné pour organisations avec dizaines de modules et équipes multiples.[^1]

Conclusion : excellent patron conceptuel, probablement sur‑dimensionné en phase nano, mais à garder comme cible possible de migration.

### 2.2 Frontend Plugin Framework d’Open edX

Open edX a développé un Frontend Plugin Framework (FPF) pour ses propres micro‑frontends React. L’idée :[^2]
- Le MFE hôte déclare des `PluginSlot` dans le code, chacun avec un contrat d’API (props, événements, dimensions).[^3][^4]
- La configuration (via fichier `env.config.js` et/ou API de config) associe des plugins concrets à ces slots sans forker le MFE.[^5][^3]
- Il existe une distinction entre plugins runtime (souvent via iframe) et build‑time (React components intégrés à la build, plus performants mais moins isolés).[^3]

Intérêt pour ton besoin :
- C’est exactement un système de slots + registre de plugins, avec contrat documenté par slot.[^3]
- Le mapping plugin→slot est purement déclaratif (configuration JSON/JS), ce qui colle bien avec l’idée que Peintre ou JARVOS manipulent des manifests.
- Le framework reste relativement léger : c’est du React + quelques helpers pour la déclaration/consommation de slots.

Limite : fortement couplé à l’écosystème Open edX, mais les idées sont très transférables à un design maison ; c’est plutôt une source d’inspiration concrète qu’un framework à adopter tel quel.

### 2.3 Autres briques micro‑frontends (single‑spa, Module Federation, etc.)

- `single-spa` et consorts fournissent surtout de la composition de micro‑frontends à l’échelle page/route (router orchestrant plusieurs apps) mais pas un système riche de slots internes avec contrat JSON.[^6]
- Module Federation (Webpack, ou équivalents Vite/Rspack) permet de partager des bundles de composants entre apps à runtime, mais reste de la plomberie bas niveau, sans registre de modules ni contrat UI.[^7]

Conclusion : ces briques restent utiles si tu veux un jour éclater RecyClique en plusieurs applications autonomes, mais elles ne t’apportent pas en tant que telles le contrat de modularité "à la Piral" que tu recherches.

## 3. Famille 2 : Server‑Driven UI (SDUI) et UI envoyée en JSON

### 3.1 DivKit (Yandex)

DivKit est un framework SDUI open source où le serveur envoie un JSON décrivant les écrans et composants, que le client (iOS/Android/Web) rend via une bibliothèque de widgets DivKit.[^1]
- Le JSON décrit une arborescence de blocs (texte, images, listes, boutons, etc.), avec mise en page et style.[^1]
- Il existe des "json‑builders" côté serveur (TypeScript, Kotlin, Python…) pour générer ce JSON.[^1]
- On peut commencer avec du JSON embarqué côté client avant de passer à un vrai serveur SDUI, ce qui permet une progression douce.[^1]

C’est très cohérent avec la vision "Peintre‑agent décrit l’écran en JSON, le client le rend".

### 3.2 Autres approches SDUI / UI‑over‑API

Plusieurs articles et frameworks décrivent le même pattern :
- SDUI → serveur envoyant un JSON décrivant la structure, les composants, le style, et la logique de l’écran, le client agissant comme renderer.[^8][^9]
- Builder.io illustre ce modèle en envoyant un JSON de page sur une API, rendu côté client par un composant React générique (`<BuilderComponent content={builderJSON} ... />`).[^10]
- De nombreux exemples en React ou React Native montrent comment, à partir d’un JSON décrivant un arbre de composants (type, props, children), on peut rendre dynamiquement un écran complet.[^11]

Implications pour Peintre :
- Le "langage" JSON de Peintre doit ressembler à un DSL décrivant des conteneurs, widgets, props, events, layout, et contraintes.
- Le client RecyClique n’aurait plus que deux responsabilités : exposer la palette de widgets (librairie de composants), et interpréter le JSON pour instancier/binder ces widgets.

### 3.3 Lien entre modularité et SDUI

Le contrat de modularité (slots, modules, manifests) et le JSON SDUI ne sont pas antagonistes :
- Les modules peuvent déclarer des widgets/sections qu’ils exposent comme "primitives" dans le vocabulaire JSON de Peintre.
- Le shell peut définir des slots structurels (ex : `header`, `sidebar`, `main`, `toolbar`), et le JSON de Peintre décrit comment les remplir.

En pratique, il est pertinent de stabiliser d’abord le contrat de modularité (famille 1) puis d’y brancher un moteur JSON/SDUI (famille 2) qui exploite ce contrat comme palette et topologie.

## 4. Famille 3 : frameworks JSON‑driven centrés formulaire/CRUD

Il existe des librairies orientées "générer de l’UI à partir de JSON Schema" plutôt que d’architecture applicative :
- `react-jsonschema-form` et variantes génèrent des formulaires React à partir d’un JSON Schema, avec un système de widgets et de templates.[^12]
- D’autres bibliothèques de JSON‑based dynamic UI en React/React Native suivent le même principe : une fonction `renderComponent(element)` qui mappe `type` + `props` + `children` vers des composants React.[^11]

Points utiles :
- Bon terrain d’inspiration pour définir un JSON de widget suffisamment expressif, avec mapping type→composant et props paramétrables.[^12][^11]
- Alignement naturel avec la vision "Peintre définit ses propres widgets" en exposant un catalogue de types et des métadonnées.

Limites :
- Ces outils adressent surtout le niveau "formulaire/écran isolé", pas la modularité globale (shell, modules, permissions, routing, etc.).

## 5. Synthèse des options de trajectoire

### 5.1 Axes de choix

Les principales dimensions à arbitrer pour ta brique nano :
- Poids de l’infrastructure : outillage/CI/CD/fonctionnement au jour 1.
- Degré d’opinion du framework : liberté pour faire du Jarvos/Peintre "organique".
- Continuité RecyClique ↔ Peintre : éviter un refactoring massif pour passer au SDUI.
- Simplicité cognitive pour l’équipe (toi + Cursor) sur les six prochains mois.

### 5.2 Stratégies possibles (résumé)

| Option | Description | Avantages | Inconvénients |
| --- | --- | --- | --- |
| A | Adopter Piral dès maintenant | Slots, pilets, feed, outillage complet prêts à l’emploi[^1] | Courbe d’apprentissage, surdimensionné pour phase nano |
| B | Cloner le modèle FPF/Open edX (slots + config) | Design éprouvé de `PluginSlot` + contrat documenté, config déclarative pour brancher des plugins[^2][^3] | Nécessite implémentation maison, documentation stricte des contrats |
| C | Construire une mini‑infra maison inspirée de Piral + FPF | Contrôle maximal, complexité maîtrisée, alignement parfait avec JARVOS/Peintre | Un peu de plomberie à coder (registre, resolver, lifecycle) |
| D | Partir directement SDUI (DivKit/équivalent) | Très proche de la vision Peintre JSON, forte dynamique UI côté serveur[^1] | Trop tôt pour RecyClique V2, complexité de schéma JSON et moteur de rendu |

Option C est dans l’esprit de la recommandation d’Opus (s’inspirer de Piral sans l’adopter), enrichie par les patterns concrets du Frontend Plugin Framework.

## 6. Recommandation détaillée pour la "brique nano"

### 6.1 Principe directeur

Construire un **micro‑framework maison de modularité** :
- Inspiré de Piral pour le modèle shell + modules + slots.
- Inspiré de FPF/Open edX pour la concrétisation technique des `PluginSlot` et de la configuration déclarative.[^2][^3]
- Conçu dès le départ pour que, plus tard, un moteur JSON (DivKit‑like ou custom) puisse remplir ces slots, en plus de simples composants déclarés en code.

### 6.2 Contrat de module (manifest JSON)

Définir pour chaque module RecyClique un manifest JSON/YAML, proche de ton idée de cartouche JARVOS, par exemple :

```json
{
  "id": "recyclicque.membership",
  "version": "0.1.0",
  "routes": [
    { "path": "/members", "component": "MembersPage" }
  ],
  "slots": [
    {
      "target": "app.nav.sidebar",
      "component": "MembersNavItem",
      "order": 20
    }
  ],
  "widgets": [
    {
      "type": "member.summary.card",
      "component": "MemberSummaryCard",
      "propsSchema": { /* JSON Schema des props */ }
    }
  ],
  "permissions": ["members.read", "members.edit"]
}
```

Éléments importants :
- `slots.target` référence un slot nommé, défini par le shell (par ex. `app.nav.sidebar`, `app.main.toolbar`, `dashboard.leftColumn`).
- `widgets` expose une palette de types que Peintre pourra plus tard utiliser dans son JSON (ex : `member.summary.card`).
- Un `propsSchema` optionnel (type JSON Schema) prépare le terrain à la génération d’UI dynamique, auto‑formulaires, etc., à la manière de `react-jsonschema-form`.[^12]

### 6.3 Registre central et chargement des modules

Mettre en place dans le shell :
- Un **registre de modules** qui lit tous les manifests (fichiers statiques au départ, puis potentiellement feed distant).
- Une **API interne** du type :`registerModule(manifest, runtime)` où `runtime` fournit les composants React réels (`MembersPage`, `MembersNavItem`, etc.).
- Un mécanisme de **feature toggle** permettant d’activer/désactiver un module via config (fichier, env var, ou plus tard UI d’admin).

Ce registre est la pièce qui te permet :
- D’exposer plus tard le contenu des manifests à Peintre/JARVOS (lecture/écriture).
- De brancher une alimentation externe : JSON produit par un agent, GitOps, etc.

### 6.4 Système de slots minimaliste

Au niveau du shell, définir un composant générique `Slot` très inspiré de `PluginSlot` d’Open edX :

```tsx
<Slot name="app.nav.sidebar" context={...} />
```

Le contrat :
- Chaque slot a un **nom unique** (`name`) et un **contrat de props/événements** documenté (ex : reçoit un `user`, peut déclencher `onNavigate(path)`).[^3]
- Le registre sait quelles contributions de modules ciblent ce slot (`slots.target`) et dans quel ordre.
- `Slot` récupère dynamiquement les composants à rendre, leur passe les props de contexte, et gère éventuellement le fallback (si aucun plugin n’est présent).

Ce pattern a été validé dans FPF : le MFE documente ses slots, les plugins s’y connectent via configuration, et le contrat API devient le point de vérité de la compatibilité.[^2][^3]

### 6.5 Préparation explicite à la phase JSON / Peintre

Pour ouvrir la voie à l’IA qui définit ses widgets, plusieurs décisions à prendre dès maintenant :

1. **Vocabulaire canonique de widgets**
   - Chaque widget exporté par un module a un `type` stable (ex : `inventory.item.card`, `cashdesk.ticket.line`).
   - Ce `type` deviendra la clé que Peintre utilisera dans ses JSON pour instancier le widget.

2. **Contrat de props sérialisable**
   - Les props d’un widget doivent être décrites par un schéma sérialisable (JSON Schema ou équivalent), pour que Peintre puisse raisonner dessus et générer des valeurs.
   - C’est très proche de ce que font les frameworks JSON‑driven de formulaire : map `type` + `props` vers un composant concret.[^11][^12]

3. **Abstraction de rendering**
   - Introduire tôt une petite couche qui reçoit un "arbre de widgets" (structure JSON interne) et le rend en React.
   - Aujourd’hui, cet arbre peut être construit en mémoire par du code TypeScript.
   - Demain, il pourra être injecté par un JSON externe (Peintre ou service SDUI façon DivKit).[^1]

4. **Stratégie d’embarquement DivKit‑like (optionnelle)**
   - À moyen terme, il est possible d’intégrer DivKit côté mobile pour les parties de l’app qui se prêtent le mieux au SDUI (ex : pages de contenu marketing, écrans de configuration, etc.).[^1]
   - Le même contrat de widgets/slots pourra être exposé côté web via ton renderer React.

### 6.6 Technologies concrètes suggérées

- **Front‑end** : React + TypeScript, avec un routeur (React Router) et éventuellement un bundler supportant Module Federation pour des scénarios plus avancés.
- **Micro‑framework maison** :
  - Un petit package `@jarvos/modularity` qui fournit :
    - `ModuleRegistry` (chargement de manifests, activation, lookup de contributions).
    - `Slot` (composant React pour rendre les contributions).
    - Quelques types TypeScript pour les manifests, widgets, slots.
- **Config** : manifest JSON ou YAML par module, plus un fichier de configuration globale listant les modules actifs.

C’est un effort raisonnable en "mode nano" et largement inférieur à l’adoption complète de Piral, tout en restant conceptuellement aligné avec lui.

## 7. Comment garder la porte ouverte vers Piral / DivKit

### 7.1 Compatibilité ascendante avec Piral

Pour rester migrable vers Piral si un jour l’écosystème de modules devient massif :
- Aligner la structuration de manifest avec les concepts Piral (pilets avec routes, menus, extensions de layout).[^1]
- Éviter d’introduire des notions impossibles à représenter dans Piral (par exemple, coupler tes slots à des détails d’implémentation trop spécifiques).
- Isoler ton micro‑framework `@jarvos/modularity` derrière une interface claire, de sorte qu’une future bascule puisse réimplémenter cette interface avec Piral en interne.

### 7.2 Compatibilité avec DivKit / SDUI

Pour préparer un futur moteur SDUI à la DivKit :
- Documenter et stabiliser un **DSL JSON de widgets** (types, props, layout minimal) utilisable indépendamment du code RecyClique.[^9][^1]
- Veiller à ce que les widgets exposés par les modules puissent être adressés par ce DSL (identifiants stables, contrat de props).
- Tester tôt des mini‑POC où un petit JSON externe décrit une section de l’écran rendue via un renderer générique, en reprenant les patterns montrés dans les exemples de JSON‑based dynamic UI React/React Native.[^10][^11]

## 8. Roadmap proposée (niveau stratégique)

1. **Phase 0 – Prototype interne slots + manifests**
   - Implémenter `ModuleRegistry` + `Slot` + 2‑3 manifests simples (inventaire, adhérents, caisse).
   - Brancher ces modules dans un shell RecyClique V2 minimal.

2. **Phase 1 – Stabilisation du contrat de modularité**
   - Formaliser le schéma de manifest (en JSON Schema).
   - Documenter 5–10 slots structurants de l’app et leurs contrats de props/événements (documentation développeur, à la manière FPF).[^2][^3]
   - Introduire la notion de `widgets` déclarés par module avec un `type` stable.

3. **Phase 2 – Premiers usages "JSON‑driven"**
   - Ajouter un mini‑DSL JSON interne pour décrire la composition de certaines zones (par ex. un dashboard) avec des widgets existants.
   - Construire l’arbre de widgets à partir de ce JSON et le rendre via le renderer générique.

4. **Phase 3 – Ouverture à Peintre‑agent / SDUI externe**
   - Exposer une API (ou bus interne) permettant à un agent de proposer des JSON de layout.
   - Expérimenter DivKit côté mobile pour un sous‑ensemble de l’app, en réutilisant le même vocabulaire JSON autant que possible.[^1]

Cette trajectoire respecte le réalisme de la V2 de RecyClique (complexité contenue), tout en posant dès maintenant les abstractions nécessaires pour que Peintre puisse, à terme, "peindre" l’interface via du JSON sans renverser l’architecture.

---

## References

1. [DivKit is an open source Server-Driven UI (SDUI ... - GitHub](https://github.com/divkit/divkit) - DivKit is an open source Server-Driven UI (SDUI) framework. It allows you to roll out server-sourced...

2. [openedx/frontend-plugin-framework - GitHub](https://github.com/openedx/frontend-plugin-framework) - A Direct plugin allows for a component in the Host MFE -- or a React dependency -- to be made into a...

3. [Micro-frontend plugins: current state and upcoming efforts](https://discuss.openedx.org/t/micro-frontend-plugins-current-state-and-upcoming-efforts/9992) - Broadly, the intention is that micro-frontends can define areas of the page that can accept a plugin...

4. [3. Plugin Slot Naming and Life Cycle - GitHub](https://github.com/openedx/frontend-plugin-framework/blob/master/docs/decisions/0003-slot-naming-and-life-cycle.rst) - Context. The Frontend Plugin Framework introduced the concept of plugin slots as a way to customize ...

5. [Introducing: Frontend Plugin Framework library - Announcements](https://discuss.openedx.org/t/introducing-frontend-plugin-framework-library/12662) - FPF lets you insert plugins into your Micro-frontend application ... plugin-framework, and the slots...

6. [Micro Frontends - Martin Fowler](https://martinfowler.com/articles/micro-frontends.html) - An architectural style where independently deliverable frontend applications are composed into a gre...

7. [Creating Micro Frontends with React - NamasteDev Blogs](https://namastedev.com/blog/creating-micro-frontends-with-react-6/) - Setting Up a Micro Frontend Architecture. We'll set up a simple micro frontend architecture using Re...

8. [Server Driven UI - DEV Community](https://dev.to/nishant_keshav/server-driven-ui-3l0p) - Server-driven UI (SDUI) is an emerging technique used by companies like Airbnb and Lyft that leverag...

9. [Server-Driven UI: Agile Interfaces Without App Releases - DZone](https://dzone.com/articles/server-driven-ui-agile-interfaces-without-app-releases) - Server-driven UI lets apps update screens instantly via the server, not app stores. Future AI could ...

10. [Sending UI over APIs - Builder.io](https://www.builder.io/blog/ui-over-apis) - Server-driven UIs represent a new approach to UI development. They offer a dynamic and flexible way ...

11. [Building a JSON-Based Dynamic UI in React Native - LinkedIn](https://www.linkedin.com/pulse/building-json-based-dynamic-ui-react-native-vthink-technologies-sml7f) - JSON-based dynamic UI allows developers to define the app's interface using JSON files, enabling rea...

12. [naveego/react-jsonschema-form-semantic - GitHub](https://github.com/naveego/react-jsonschema-form-semantic) - react-jsonschema-form is meant to automatically generate a React form based on a JSON Schema. It is ...

