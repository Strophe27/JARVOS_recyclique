# Peintre_nano : patterns déclaratifs pour workflows UI, navigation et raccourcis

## 1. Objectif et contraintes

Peintre_nano doit fournir un moteur déclaratif pour orchestrer des comportements UI transverses (workflows simples, navigation conditionnelle, sous‑écrans, raccourcis, transitions basées sur des validations), configurable via JSON/manifests et, plus tard, pilotable par agents.

Contraintes clés :
- Éviter un mini‑langage de script complexe.
- Rester sobre, robuste et maintenable dans un contexte d’application métier critique.
- S’intégrer à une UI modulaire (manifests, widgets, slots, permissions, contextes).
- Rester multi‑supports (grand écran, desktop, tablette, smartphone).
- Si possible, s’adosser à des concepts formels (state machines, statecharts, workflows déclaratifs, command maps, hotkeys, event‑driven UI).


## 2. Panorama des patterns pertinents

### 2.1 State machines / statecharts pour la logique de flux

Les **machines à états finis (FSM)** et surtout les **statecharts** (FSM hiérarchiques/étendus) sont un formalisme éprouvé pour modéliser des systèmes interactifs : un nombre fini d’états (modes, écrans, étapes), des événements (clics, validations, erreurs), des transitions explicites, et des actions associées.[^1][^2][^3]

La bibliothèque **XState** est aujourd’hui l’implémentation de référence dans l’écosystème JavaScript/TypeScript : elle permet de définir des states, des transitions, des actions et des guards de façon déclarative, dans le frontend ou le backend. Elle supporte les machines hiérarchiques, parallèles, l’historique, et fournit des outils de visualisation.[^2][^4][^5][^1]

Avantages :
- Modélisation explicite des flux : impossible de passer dans un état non prévu, ce qui réduit les bugs de navigation/logique.[^6][^3]
- Très adapté aux use cases cités : multi‑étapes (wizards), sous‑écrans, transitions conditionnelles, orchestrations d’actions, etc.[^3][^2]
- Forme naturelle pour un DSL JSON (XState a un format de machine JSON, même si on l’écrit souvent en code au quotidien).[^5][^1]

Limites :
- Courbe de prise en main pour l’équipe, surtout si on expose directement tous les concepts (hiérarchie, régions parallèles, etc.).[^7][^6]
- Risque de sur‑modélisation si on veut tout gérer par machine (y compris des interactions triviales qui se codent plus simplement en logique locale).

### 2.2 Routage déclaratif / navigation conditionnelle

Les frameworks web modernes (React Router, Angular Router, etc.) traitent la **navigation** comme une configuration de routes : segments d’URL mappés vers des vues/composants, avec éventuellement des guards pour l’accès conditionnel. Même si la navigation de Peintre_nano ne sera pas uniquement URL‑driven, ces patterns restent utiles :[^2]
- Des "routes internes" peuvent représenter des sous‑vues (onglets, panneaux) ou des étapes d’un wizard.
- Les conditions d’accès (permissions, pré‑requis de saisie) peuvent être modélisées comme des guards.

Avantages :
- Simple et familier : config de routes + guards.
- Se combine bien avec FSM/statecharts (machine qui orchestre les changements de route).

Limites :
- Un routeur seul ne suffit pas à exprimer des workflows plus riches (retours en arrière, boucles, parallélisme, etc.).

### 2.3 Command pattern et command map (pour hotkeys et actions rapides)

De nombreux environnements (VS Code, Sublime, outils no‑code) structurent les actions utilisateur autour d’un **catalogue de commandes** abstraites, mappées ensuite à des déclencheurs concrets : boutons, menu, shortcuts clavier.[^8][^9]

VS Code, par exemple, stocke les raccourcis personnalisés dans un `keybindings.json` qui mappe combinaisons de touches → `commandId` avec éventuellement des conditions de contexte. Le moteur interne résout ensuite `commandId` → implémentation.[^9][^8]

Avantages :
- Découplage entre "quoi" (commandes métier, ex. `adherent.save`, `ticket.validate`) et "comment" (clic, touche, palette de commande, gesture mobile).[^8][^9]
- JSON très léger possible : chaque raccourci est une simple entrée de table.
- Très adapté à un futur pilotage agent : l’agent demande "exécute `ticket.validate`" au lieu de simuler un clic.

Limites :
- Nécessite une discipline pour maintenir un catalogue de commandes stable.
- Les commandes doivent rester **pures côté API** : input clair, output/effets documentés.

### 2.4 UI événementielle (event‑driven UI)

Dans les architectures Redux/RxJS et plus généralement event‑driven, la UI émet des **événements** (actions), et des reducers/effets/observers réagissent en mettant à jour l’état ou en déclenchant d’autres actions. Appliqué à Peintre_nano :[^3][^2]
- Chaque widget émet des événements métier (`FORM.SUBMITTED`, `ITEM.SELECTED`, etc.).
- Un "orchestrateur" (machine à états ou moteur de règles simple) écoute ces événements et décide des transitions (changer de vue, ouvrir un panneau, déclencher une commande).

Avantages :
- Très compatible avec un écosystème modulaire : les modules se branchent sur un bus d’événements plutôt que se coupler en dur.[^10][^11]
- Permet facilement des comportements transverses (logs, métriques, analytics).

Limites :
- Si mal structuré, risque d’"event spaghetti" (trop d’événements implicites, difficile à suivre).
- D’où l’intérêt de coupler ça à un modèle plus formel (FSM/statecharts) plutôt qu’à de simples `switch/case` dispersés.[^6]

### 2.5 Workflows JSON déclaratifs

Dans d’autres domaines (automatisation sécurité, RPA, robots web), on trouve des **workflows déclaratifs en JSON** : une suite d’étapes, chacune décrivant une action, une source de données, des transitions conditionnelles.[^12][^13]
- Exemple : BrowseJSON définit des workflows de navigation web par une liste d’étapes (ouvrir URL, cliquer sélecteur, remplir champ, etc.) entièrement en JSON.[^13]
- Les plateformes d’automatisation no‑code décrivent aussi leurs workflows dans des formats JSON internes avec conditions et actions.[^12]

Avantages :
- Prouve qu’on peut exprimer des workflows utiles sans langage de script Turing‑complet.
- JSON lisible et modifiable par des outils/agents.

Limites :
- Très vite, ces formats réinventent un mini‑langage (loops, conditions, expressions) difficile à maîtriser.
- Nécessité de restreindre volontairement la puissance expressive pour éviter la dérive.


## 3. Bibliothèques / frameworks proches de ce besoin

### 3.1 XState / Stately

**XState** (et sa plateforme associée Stately) fournit des machines à états et statecharts pour JS/TS, adaptées aussi bien au frontend qu’au backend.[^4][^1][^5][^2]
- Permet de modéliser les UI comme des machines : états (vues/étapes), événements (clics, validations), transitions, actions.[^1][^2]
- Gère les actions d’entrée/sortie d’état, les guards, l’invocation de services async.[^4][^3]

Avantages :
- Mûr, bien documenté, adopté en production, visualisable (diagrammes interactifs).[^7][^1][^3]
- Export/import en JSON (machines sérialisables), ce qui colle à l’idée de manifests.[^5][^1]

Inconvénients :
- Le modèle complet peut être overkill pour des micro‑workflows très simples.
- L’API code‑first est parfois plus naturelle que le JSON brut ; il faut donc prévoir sa propre surcouche DSL si on veut éditer côté manifest.

### 3.2 Command palette / keybinding JSON (VS Code & co)

VS Code illustre bien le pattern "command map" + `keybindings.json` :
- **Command palette** : un catalogue de commandes abstraites, invocables via un searchbar.[^9]
- **Keybindings** : un fichier JSON utilisateur qui mappe des combinaisons de touches à ces commandes, avec conditions de contexte.[^8][^9]

Avantages :
- Format JSON minimaliste, facile à éditer/merge/versionner.[^8]
- Très parlant pour l’utilisateur avancé et pour des agents : on manipule `commandId` et `when` au lieu d’éléments DOM.

Inconvénients :
- Ne couvre pas la notion de workflow multi‑étapes en soi : c’est un mapping déclencheur → commande.

### 3.3 Workflows JSON (BrowseJSON, plateformes d’automatisation)

Des initiatives comme **BrowseJSON** proposent des formats pour décrire des scénarios de navigation web (ouvrir URL, cliquer, saisir) entièrement en JSON.[^13]
- Chaque étape est un objet avec un type (`goto`, `click`, `input`…), une cible (sélecteur, URL) et éventuellement des conditions.

Avantages :
- Montre des patterns de structuration d’étapes, de conditions, de variables, sans généraliser en langage complet.[^12][^13]

Inconvénients :
- Souvent spécifiques à un domaine (web scraping, automatisation sécurité) ; il faut les adapter aux besoins UI métiers.


## 4. Avantages / inconvénients par grande approche

| Approche | Avantages | Inconvénients |
| --- | --- | --- |
| Statecharts (XState) | Modèle formel, robuste, visualisable, empêche les états impossibles, excellent pour multi‑étapes et navigation conditionnelle.[^1][^2][^6] | Courbe d’apprentissage, risque de sur‑modéliser, JSON brut un peu verbeux. |
| Routage déclaratif | Simple, familier, bon pour navigation de base, bien intégré aux frameworks UI.[^2] | Ne suffit pas seul pour exprimer des workflows riches, peu adapté aux micro‑interactions. |
| Command map + keybindings | Séparation claire commandes / triggers, JSON simple (id + combinaison de touches + condition).[^8][^9] | Ne gère pas la séquence de plusieurs étapes, seulement l’invocation de commandes isolées. |
| Event‑driven UI | Découplage modules, facile de brancher logs et métriques, extensible.[^10][^11] | Peut devenir du "event spaghetti" sans structure de plus haut niveau. |
| Workflows JSON maison | Grande flexibilité, lisible, compatible agents.[^12][^13] | Très grande tentation de réinventer un langage de script, difficile à faire simple et complet. |


## 5. Ce qui colle le mieux à un moteur déclaratif modulaire type Peintre_nano

Pour Peintre_nano, le besoin est moins "gros moteur de BPM" que **moteur d’orchestration de micro‑workflows UI** : transitions entre vues/étapes, ouverture/fermeture de panneaux, déclenchement de commandes, en réaction à des événements et sous permissions.

Le combo le plus cohérent est :
- Un **noyau event‑driven** (flux d’événements UI métier) auquel les widgets se connectent.
- Une **couche de statecharts légère** qui décrit les modes/étapes principaux (ex. wizard, formulaire multi‑onglets) et orchestre les transitions entre "vues" et "sous‑écrans".[^2][^3][^7]
- Un **catalogue de commandes** (command map) + un fichier de **keybindings JSON** pour les raccourcis et actions rapides.[^9][^8]

Ainsi :
- Les manifests de modules décrivent les **états / sous‑vues** disponibles et les **commandes** qu’ils exposent.
- Le moteur de Peintre_nano interprète des définitions JSON très limitées de workflows (transition de statechart + déclenchement de commande), sans se transformer en langage de script.


## 6. Recommandation pragmatique pour V1 / V2

### 6.1 V1 : micro‑workflow minimal, sans complexité

Objectifs V1 :
- Gérer : transitions "si saisie X validée → aller à telle vue/étape", ouverture d’onglets/panneaux, raccourcis simples.
- Éviter au maximum les boucles, parallélismes, conditions complexes.

Proposition V1 :
1. **Command map simple**
   - Définir un catalogue `commands` global (ou par module) : `id`, `description`, `permissions` requises.
   - Ajouter un fichier JSON `keybindings` par workspace/install, inspiré de VS Code :

```json
{
  "keybindings": [
    { "key": "Ctrl+S", "command": "form.save", "when": "context.formDirty" },
    { "key": "Ctrl+Enter", "command": "form.submit", "when": "context.formValid" },
    { "key": "Alt+1", "command": "tabs.goTo" }
  ]
}
```

2. **Transitions UI déclaratives simples**
   - Au niveau manifest de vue/formulaire, prévoir une section `transitions` qui mappe :
     - un **événement** (`SUBMIT_SUCCESS`, `FIELD_VALID`, `CANCEL_CLICKED`),
     - une **condition** de base (permission, état contextuel),
     - une **action** de navigation (changer de vue, ouvrir panneau, exécuter commande).

Exemple :

```json
{
  "id": "adherentForm",
  "transitions": [
    {
      "on": "SUBMIT_SUCCESS",
      "targetView": "adherentDetail",
      "actions": ["notify.success"]
    },
    {
      "on": "CANCEL",
      "targetView": "adherentList"
    }
  ]
}
```

3. **Sous‑écrans / tabs déclarés comme sous‑états simples**
   - Pour les onglets/panneaux, un modèle très léger :

```json
{
  "tabs": [
    { "id": "identity", "title": "Identité" },
    { "id": "adhesions", "title": "Adhésions" }
  ],
  "initialTab": "identity"
}
```

Le moteur gère `tabs.goTo[id]` comme commande.

Cette V1 peut être implémentée **sans XState complet** : un simple reducer de transitions suffit (état = vue courante / tab courant, événements = actions UI). Mais il est judicieux de caler le design sur la sémantique "statechart" pour pouvoir brancher XState plus tard si besoin.

### 6.2 V2 : introduction contrôlée de statecharts

Pour V2, une fois les besoins stabilisés :
- Introduire un **moteur de statecharts** (XState ou équivalent) derrière le DSL existant.
- Autoriser une structure de statechart plus riche au niveau d’un module (ex. wizard de 5 étapes avec retours arrière, gestion d’erreurs, etc.).[^1][^3][^2]

Le DSL JSON côté manifest pourrait ressembler à une version ultra‑restreinte de XState :

```json
{
  "machine": {
    "id": "adherentWizard",
    "initial": "edit",
    "states": {
      "edit": {
        "on": {
          "NEXT": { "target": "review", "cond": "formValid" }
        }
      },
      "review": {
        "on": {
          "BACK": { "target": "edit" },
          "CONFIRM": { "target": "done", "actions": ["adherent.save"] }
        }
      },
      "done": { "type": "final" }
    }
  }
}
```

Le moteur :
- Interprète ce JSON via XState (ou équivalent) côté runtime.
- Connecte les événements UI (`clickNext`, `submit`, etc.) aux événements de la machine (`NEXT`, `CONFIRM`).
- Déclenche les commandes et changements de vue selon l’état courant.


## 7. Pièges à éviter

1. **DSL trop puissant → mini langage de script**
   - Ne pas introduire de if/else imbriqués, de boucles arbitraires, d’expressions libres dans le JSON.
   - Encapsuler les conditions dans un petit set de *guards* nommés (`formValid`, `userHasPermission`, etc.) implémentés en code, pas dans le manifest.

2. **Éparpillement des événements**
   - Documenter une **taxonomie d’événements** (noms standardisés), au lieu de laisser chaque module inventer les siens.
   - Centraliser l’orchestration des transitions dans le moteur, éviter la logique de navigation dans chaque widget.

3. **Couplage fort UI ↔ logique métier**
   - Les commandes doivent être côté "logique métier" (domain/services) et les workflows/déclencheurs dans Peintre_nano.
   - Ne pas mélanger "ce que fait la commande" avec "où/ quand elle est appelée".

4. **Exposer XState brut aux manifests**
   - Même si XState est puissant, exposer toute son API textuellement dans des manifests JSON risque de les rendre illisibles.
   - Mieux : définir un **sous‑ensemble de features** (states, `on`, `target`, quelques `actions`, quelques `cond` nommées) et faire la translation vers XState en interne.


## 8. Exemple de DSL léger pour Peintre_nano

Voici un schéma JSON synthétique qui combine : 
- commandes, 
- keybindings, 
- transitions de vue, 
- sous‑écrans.

```json
{
  "commands": [
    { "id": "adherent.save", "description": "Enregistrer l'adhérent" },
    { "id": "adherent.nextTab", "description": "Passer à l'onglet suivant" }
  ],
  "keybindings": [
    { "key": "Ctrl+S", "command": "adherent.save", "when": "context.formDirty" },
    { "key": "Ctrl+Tab", "command": "adherent.nextTab" }
  ],
  "views": [
    {
      "id": "adherentForm",
      "tabs": [
        { "id": "identity", "title": "Identité" },
        { "id": "adhesions", "title": "Adhésions" }
      ],
      "initialTab": "identity",
      "transitions": [
        {
          "on": "SUBMIT_SUCCESS",
          "targetView": "adherentDetail",
          "actions": ["notify.success"]
        },
        {
          "on": "CANCEL",
          "targetView": "adherentList"
        }
      ]
    }
  ]
}
```

Ce DSL reste **très loin d’un langage de script** :
- pas de logique conditionnelle libre, seulement des événements nommés et des cibles.
- les conditions complexes sont encapsulées dans des guards en code.
- le moteur Peintre_nano reste le seul endroit où la "logique" vit réellement ; le JSON ne fait que décrire les intentions.

Cela donne un socle propre pour V1/V2 :
- assez déclaratif pour être pilotable plus tard par des agents,
- assez simple pour être maintenable à la main,
- compatible avec ton architecture modulaire (manifests, widgets, slots, permissions, contextes),
- et facilement extensible vers des statecharts plus riches si les besoins de workflows UI se complexifient.[^3][^13][^1][^2]

---

## References

1. [GitHub - statelyai/xstate: State machines, statecharts, and actors for ...](https://github.com/statelyai/xstate) - XState provides a powerful and flexible way to manage application and workflow state by allowing dev...

2. [XState - React Common Tools and Practices](https://react-community-tools-practices-cheatsheet.netlify.app/state-management/xstate) - XState is primarily used for expressing complex logic, and has many use-cases: Expressing status, su...

3. [My love letter to XState and statecharts - Tim Deschryver](https://timdeschryver.dev/blog/my-love-letter-to-xstate-and-statecharts) - XState is a library for creating, interpreting, and executing statecharts. Statecharts are a formali...

4. [Building Back-End State Machines with XState - Musadiq Peerzada](https://musadiqpeerzada.com/blog/building-back-end-state-machines-with-xstate) - With XState, you can declaratively define your states, specify the transitions triggered by events, ...

5. [Stately & XState docs](https://stately.ai/docs) - XState is a best-in-class open source library for orchestrating and managing complex application log...

6. [The case for statechart and xstate -- why it matters and how we can ...](https://dev.to/coodoo/the-case-for-statechart-and-xstate-why-it-matters-and-how-we-can-benefit-from-it-51fj) - fsm eliminates weird bugs and prevent wrong application states from happening because it won't let t...

7. [My experience with using state machines (xstate) in production](https://www.reddit.com/r/reactjs/comments/ilfi4c/my_experience_with_using_state_machines_xstate_in/) - XState encourages the use of an Actor-model-like approach, where there can be many hierarchical stat...

8. [Alias keybindings in command palette · Issue #92233 - GitHub](https://github.com/microsoft/vscode/issues/92233) - You can access user shortcuts in the command palette by typing "Keyboard Shortcuts": The actual pers...

9. [Course part 3 | Command Palette And Keyboard Shortcuts - YouTube](https://www.youtube.com/watch?v=T38I8vXTg7c) - Visual Studio Code | Course part 3 | Command Palette And Keyboard Shortcuts. 122 views · 2 years ago...

10. [Domain events: Design and implementation - .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation) - Domain events help you to express, explicitly, the domain rules, based in the ubiquitous language pr...

11. [Domain Event - Martin Fowler](https://martinfowler.com/eaaDev/DomainEvent.html) - The essence of a Domain Event is that you use it to capture things that can trigger a change to the ...

12. [JSON Basics: Building Blocks for Workflow Automation (Tutorial) - Torq](https://torq.io/blog/json-basics-building-blocks-for-workflow-automation/) - How are automated workflows built? Read this post to understand how JSON sets the foundation for sec...

13. [Understanding BrowseJSON Workflows | Autopilot Browser Blog](https://autopilotbrowser.com/blog/understanding-browsejson-workflows) - Understanding BrowseJSON Workflows. BrowseJSON is a declarative, JSON-based format for defining web ...

