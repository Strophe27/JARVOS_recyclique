# Peintre_nano — Moteur de composition d'interface

**Statut** : Concept architectural validé — à intégrer au backlog RecyClique V2  
**Date** : 2026-03-31  
**Auteurs** : Strophe (architecte), Claude Opus (co-architecte)  
**Sources** : Session brainstorming RecyClique V2, recherche Perplexity Pro (frameworks SDUI/micro-frontends + grilles/templates/UI auto-optimisable), documentation JARVOS existante  
**Références** : peintre-mini-grammaire-visuelle.md, cartouches-metiers-applicatives.md, contrat-influx-cinq-champs-creos.md, 03_Modules_Operationnels.md §4

---

## 1. Identité et position

### 1.1 Qu'est-ce que Peintre_nano ?

Peintre_nano est le **moteur de composition d'interface côté client** de l'écosystème JARVOS. Il fournit trois choses : un **registre de modules** qui savent déclarer leurs contributions UI, un **système de slots** (points d'extension nommés dans le shell applicatif), et un **catalogue de widgets** avec contrat de props sérialisable.

**Ce que Peintre_nano est :** le chevalet, la palette et les poignées. Un framework de composition d'interface piloté par des manifests déclaratifs et de la configuration humaine (admin).

**Ce que Peintre_nano n'est pas :** l'agent IA qui compose dynamiquement les écrans — c'est Peintre_mini. Le rendu final à l'écran — c'est la responsabilité de l'adaptateur de canal (React pour le web, composants natifs pour mobile, etc.).

### 1.2 Position dans l'écosystème JARVOS

Peintre_nano est le **premier module opérationnel nano hors du tétraèdre fondamental** (Ganglion + Think + Aethermind + Atelier). Il est transverse : toute application JARVOS qui a une interface utilisateur consomme Peintre_nano.

| Échelle | Rôle de Peintre | Transport |
|---------|-----------------|-----------|
| **Nano** | Composition d'interface par manifests déclaratifs + configuration admin. Slots, widgets, registre. Pas d'IA. | CREOS documentaire (fichiers JSON) |
| **Mini** | Ajout de la couche agent : Peintre_mini génère des WidgetJarvos (JSON S-DUI) qui alimentent les slots de Peintre_nano. Gate Capitaine_Balance sur les boutons d'action. Mode Pro (badges RBAC). | Bus CREOS Redis |
| **Macro** | Peintre complet : adaptation contextuelle (device, humeur, chronobiologie), bibliothèque LeFil, studio de création. | Bus CREOS RabbitMQ |

### 1.3 Relation avec les applications consommatrices

```
┌─────────────────────────────────────────────────┐
│  Application métier (ex: RecyClique API)        │
│  → Source de vérité métier                      │
│  → Déclare ses modules via manifests CREOS      │
│  → Projette ses contributions UI dans…          │
├─────────────────────────────────────────────────┤
│  Peintre_nano (moteur de composition)           │
│  → Registre central des modules                 │
│  → Système de slots nommés                      │
│  → Catalogue de widgets typés                   │
│  → Feature toggles (activation/désactivation)   │
├─────────────────────────────────────────────────┤
│  Adaptateur de canal (React, mobile, etc.)      │
│  → Rend les widgets en composants natifs        │
│  → Gère le responsive / multi-device            │
│  → Templates de layout (desktop, mobile, etc.)  │
└─────────────────────────────────────────────────┘
```

**Principe fondamental :** l'application métier ne connaît pas le rendu. Peintre_nano ne connaît pas le métier. L'adaptateur ne connaît pas l'orchestration. Chaque couche a un contrat clair avec la suivante.

---

## 2. Contrat CREOS documentaire

### 2.1 Pourquoi CREOS pour les manifests UI ?

Le manifest d'un module UI est structurellement un message CREOS : il porte les cinq dimensions (Command, Rule, Event, Object, State). À l'échelle nano, le transport est le fichier JSON (pas de bus). À l'échelle mini, ces mêmes structures transitent sur le bus Redis sans transformation. **Seul le transport change, pas la grammaire.**

### 2.2 Structure du manifest de module (Object CREOS)

Chaque module qui contribue à l'interface déclare un manifest. Ce manifest est un **Influx CREOS documentaire** stocké dans un fichier JSON :

```json
{
  "command": null,
  "rule": {
    "type": "ModulePermissions",
    "data": {
      "requires": ["members.read", "members.edit"],
      "rbac_context": "recyclique.membership"
    }
  },
  "event": null,
  "object": {
    "type": "ModuleManifest",
    "id": "recyclique.membership",
    "data": {
      "version": "0.1.0",
      "name": "Gestion des adhérents",
      "routes": [
        { "path": "/members", "component": "MembersPage" },
        { "path": "/members/:id", "component": "MemberDetailPage" }
      ],
      "slots": [
        {
          "target": "shell.nav.sidebar",
          "component": "MembersNavItem",
          "order": 20,
          "props_contract": { "active_route": "string" },
          "breakpoints": {
            "mobile": { "target": "shell.nav.bottom", "order": 30 }
          }
        },
        {
          "target": "shell.dashboard.cards",
          "component": "MembersCountCard",
          "order": 10,
          "placement": { "col_span": 4, "row_span": 1, "zone_role": "secondary-hotspot" },
          "props_contract": { "period": "string" },
          "breakpoints": {
            "mobile": { "placement": { "col_span": "full" } }
          }
        }
      ],
      "widgets": [
        {
          "type": "member.summary.card",
          "component": "MemberSummaryCard",
          "meta_props": {
            "default_span": { "col": 4, "row": 1 },
            "prominence": "normal",
            "density": "medium",
            "min_span": { "col": 2 },
            "max_span": { "col": 6 },
            "variants": ["compact", "regular", "expanded"],
            "default_variant": "regular"
          },
          "props_schema": {
            "type": "object",
            "properties": {
              "member_id": { "type": "string" },
              "show_photo": { "type": "boolean", "default": true }
            },
            "required": ["member_id"]
          }
        },
        {
          "type": "member.cotisation.badge",
          "component": "CotisationBadge",
          "meta_props": {
            "default_span": { "col": 2, "row": 1 },
            "prominence": "secondary",
            "density": "low"
          },
          "props_schema": {
            "type": "object",
            "properties": {
              "member_id": { "type": "string" },
              "display_mode": { "type": "string", "enum": ["icon", "full", "minimal"] }
            }
          }
        }
      ],
      "actions": [
        {
          "id": "members.create",
          "label": "Nouvel adhérent",
          "icon": "user-plus",
          "target_slots": ["shell.toolbar.actions", "members.page.header"]
        }
      ],
      "shortcuts": [
        {
          "key": "F3",
          "action": "members.create",
          "scope": "global",
          "label": "Nouvel adhérent"
        },
        {
          "key": "Ctrl+F",
          "action": "members.search.focus",
          "scope": "members.page",
          "label": "Rechercher un adhérent"
        }
      ],
      "flows": [
        {
          "id": "members.inscription",
          "name": "Inscription adhérent",
          "type": "wizard",
          "steps": [
            { "id": "identity", "view": "MemberIdentityForm", "label": "Identité" },
            { "id": "contact", "view": "MemberContactForm", "label": "Contact" },
            { "id": "cotisation", "view": "MemberCotisationForm", "label": "Cotisation" },
            { "id": "confirm", "view": "MemberConfirmSummary", "label": "Confirmation" }
          ],
          "transitions": [
            { "from": "identity", "to": "contact", "command": "NEXT_STEP" },
            { "from": "contact", "to": "cotisation", "command": "NEXT_STEP" },
            { "from": "cotisation", "to": "confirm", "command": "NEXT_STEP" },
            { "from": "confirm", "to": null, "command": "COMPLETE_FLOW", "event": "MemberInscriptionCompletedEvent" }
          ],
          "initial_step": "identity"
        }
      ]
    },
    "metadata": {
      "created_at": "2026-03-31T00:00:00Z",
      "created_by": "strophe",
      "schema_version": "1.0"
    }
  },
  "state": {
    "status": "ACTIVE"
  }
}
```

### 2.3 Vocabulaire CREOS pour Peintre_nano

Les types introduits par Peintre_nano dans le registre vocabulaire CREOS :

**Objects :**

| Type | Description |
|------|-------------|
| `ModuleManifest` | Déclaration complète d'un module UI (routes, slots, widgets, actions) |
| `SlotDefinition` | Déclaration d'un point d'extension dans le shell |
| `WidgetDeclaration` | Déclaration d'un widget avec son type stable, ses meta_props et son props_schema |
| `LayoutComposition` | Arbre de widgets décrivant la composition d'une zone (futur : JSON Peintre) |
| `PageTemplate` | Gabarit sémantique de page (dashboard, liste, fiche, wizard, landing) avec grille et zones |
| `ZoneRole` | Rôle sémantique d'une zone dans un template (primary-hotspot, scan-column, etc.) |
| `ModuleAction` | Action métier exposée par un module (bouton, commande), avec label, icône et slots cibles |
| `FlowDefinition` | Workflow déclaratif (wizard, parcours caisse, séquence de saisie) — state machine en JSON |
| `ShortcutBinding` | Liaison raccourci clavier → action, avec scope (global, page, composant) |

**Commands :**

| Type | Description |
|------|-------------|
| `ACTIVATE_MODULE` | Activer un module (feature toggle) |
| `DEACTIVATE_MODULE` | Désactiver un module |
| `REGISTER_WIDGET` | Enregistrer un nouveau widget dans le catalogue |
| `COMPOSE_LAYOUT` | (Futur Peintre_mini) Demander la composition d'une zone |
| `NEXT_STEP` | Avancer au step suivant dans un flow |
| `PREVIOUS_STEP` | Revenir au step précédent dans un flow |
| `COMPLETE_FLOW` | Terminer un flow (déclenche l'événement de complétion) |

**Events :**

| Type | Description |
|------|-------------|
| `ModuleActivatedEvent` | Un module a été activé |
| `ModuleDeactivatedEvent` | Un module a été désactivé |
| `SlotContentChangedEvent` | Le contenu d'un slot a changé |
| `StepNavigatedEvent` | Transition effectuée dans un flow |
| `FlowCompletedEvent` | Un flow a atteint son état terminal |

**States :**

| Valeur | Description |
|--------|-------------|
| `ACTIVE` | Module actif, ses contributions sont rendues |
| `INACTIVE` | Module désactivé, ses contributions sont masquées |
| `ERROR` | Module en erreur de chargement |
| `STEP:{step_id}` | État courant d'un flow (le step actif) |

**Rules :**

| Type | Description |
|------|-------------|
| `ModulePermissions` | Permissions requises pour accéder au module |
| `SlotConstraints` | Contraintes sur ce qu'un slot accepte (types de widgets, nombre max, etc.) |

---

## 3. Architecture technique

### 3.1 Les trois composants de Peintre_nano

#### ModuleRegistry (registre central)

Responsabilités :
- Charger les manifests de modules (fichiers JSON au démarrage, puis potentiellement feed distant).
- Maintenir la liste des modules actifs/inactifs (feature toggles).
- Exposer une API de lookup : quels modules contribuent à quel slot, quels widgets sont disponibles.
- Valider les manifests contre le schéma CREOS (JSON Schema).

Interface conceptuelle :
```typescript
interface ModuleRegistry {
  loadManifest(manifest: ModuleManifest): void;
  activateModule(moduleId: string): void;
  deactivateModule(moduleId: string): void;
  getSlotContributions(slotName: string): SlotContribution[];
  getWidget(widgetType: string): WidgetDefinition | null;
  getActiveModules(): ModuleManifest[];
  isModuleActive(moduleId: string): boolean;
}
```

#### Slot (composant de rendu)

Un composant générique qui rend dynamiquement les contributions des modules actifs pour un point d'extension donné. Inspiré du `PluginSlot` d'Open edX Frontend Plugin Framework.

Usage dans le shell :
```tsx
{/* Le shell déclare ses points d'extension */}
<Slot name="shell.nav.sidebar" context={{ activeRoute: currentRoute }} />
<Slot name="shell.toolbar.actions" context={{ currentPage }} />
<Slot name="shell.dashboard.cards" context={{ period: "month" }} />

{/* Fallback si aucun module ne contribue */}
<Slot name="shell.main.content" fallback={<EmptyState />} />
```

Contrat du composant Slot :
- `name` : identifiant unique du slot, convention dot-notation (ex: `shell.nav.sidebar`).
- `context` : props de contexte transmises à toutes les contributions.
- `fallback` : composant optionnel rendu si aucune contribution n'est active.
- Le Slot interroge le ModuleRegistry pour obtenir les contributions triées par `order`, filtrées par modules actifs et permissions de l'utilisateur courant.

#### WidgetCatalog (catalogue de widgets)

Sous-ensemble du registre dédié aux widgets :
- Chaque widget a un `type` stable (identifiant canonique, ex: `member.summary.card`).
- Chaque widget a un `props_schema` (JSON Schema) décrivant ses props.
- Le catalogue permet le lookup par type et la validation des props.

**C'est ce catalogue qui sera exposé à Peintre_mini** quand l'agent IA composera des écrans : il raisonnera sur les types disponibles et leurs schémas de props pour construire des arbres de WidgetJarvos.

#### Actions (commandes exposées par les modules)

Une **action** est une commande métier qu'un module expose à l'interface : un bouton "Nouvel adhérent", un raccourci "Lancer l'inventaire", etc. Elle se distingue d'une slot contribution et d'un widget :

- Une **slot contribution** est un composant visuel placé dans un slot précis (ex: un item de menu dans la sidebar). Elle a un seul emplacement.
- Un **widget** est un composant réutilisable avec un type stable et un props_schema. Il peut être instancié par du code, par un manifest, ou par Peintre_mini via JSON.
- Une **action** est un déclencheur (bouton, lien, raccourci clavier) qui peut apparaître dans **plusieurs slots simultanément** (toolbar, header de page, menu contextuel). Elle porte un `id` stable, un `label`, une `icon`, et une liste de `target_slots`.

```json
{
  "id": "members.create",
  "label": "Nouvel adhérent",
  "icon": "user-plus",
  "target_slots": ["shell.toolbar.actions", "members.page.header"],
  "permissions": ["members.edit"],
  "confirmation": false
}
```

Le champ `confirmation` (Phase 0 : optionnel, défaut `false`) prépare l'intégration avec Capitaine_Balance : en Phase Mini, les actions marquées `confirmation: true` ou détectées comme sensibles par la gate `can_use_tool` afficheront une étape de confirmation explicite avant exécution — pas de bouton "Supprimer" direct sans validation.

Le ModuleRegistry collecte toutes les actions des modules actifs et les distribue dans les slots déclarés comme cibles. Un slot de type "actions" (ex: `shell.toolbar.actions`) rend les actions sous forme de boutons, filtrés par les permissions de l'utilisateur courant.

#### Shortcuts (raccourcis clavier déclaratifs)

Un module peut déclarer des **raccourcis clavier** liés à ses actions. Chaque raccourci a une touche, une action cible, un scope (global ou limité à un écran/composant), et un label pour l'affichage dans l'aide contextuelle.

```json
{
  "key": "F2",
  "action": "cashdesk.search.product",
  "scope": "cashdesk.page",
  "label": "Recherche produit"
}
```

Le scope contrôle quand le raccourci est actif : `global` signifie partout dans l'application, un scope de page (ex: `cashdesk.page`) signifie uniquement quand cette page est affichée. Le shell gère un registre de raccourcis actifs et résout les conflits par priorité de scope (page > global).

En Phase 0 : les raccourcis sont implémentés dans le shell via un gestionnaire d'événements clavier qui lit les déclarations du manifest. En Phase 2 : les raccourcis pourront être reconfigurés par l'admin et, plus tard, suggérés par Peintre_mini en fonction des habitudes de l'utilisateur.

#### Flows (workflows déclaratifs)

Un **flow** est une séquence d'étapes (écrans, formulaires, panneaux) avec des transitions entre elles. C'est une **state machine légère** décrite en JSON dans le manifest. Le mapping CREOS est direct :

| Concept flow | Dimension CREOS | Exemple |
|-------------|----------------|---------|
| Un step (étape) | **State** | `"identity"`, `"contact"`, `"cotisation"` |
| Passer au step suivant | **Command** | `NEXT_STEP`, `PREVIOUS_STEP` |
| La transition effectuée | **Event** | `StepNavigatedEvent` |
| Le flow complet | **Object** (FlowDefinition) | Le JSON dans le manifest |
| Les conditions de garde | **Rule** | `"guard": "identity_form_valid"` |

Types de flows prévus :

| Type | Description | Exemple RecyClique |
|------|-------------|-------------------|
| `wizard` | Séquence linéaire d'étapes avec validation | Inscription adhérent |
| `tabbed` | Ensemble de vues accessibles par tabs/onglets | Fiche adhérent (identité, cotisations, historique) |
| `cashflow` | Parcours optimisé caisse avec raccourcis clavier | Passage en caisse (scan → prix → paiement → ticket) |
| `decision` | Arbre de décision avec branchements conditionnels | Tri d'un objet entrant (catégorisation → orientation) |

En Phase 0 : seuls les types `wizard` et `tabbed` sont implémentés. Les flows sont rendus par un composant `<FlowRenderer>` qui lit la FlowDefinition et gère l'état courant (step actif, historique de navigation, validation). Le flow `cashflow` est la priorité terrain pour RecyClique V2 — son parcours clavier (scan → Tab → prix → Entrée → paiement) doit être fluide sans souris.

**Alignement implémentation (éviter l'ambiguïté « Phase 0 » vs priorité caisse) :** tant que le discriminant JSON `type: "cashflow"` n'est pas pris en charge comme tel par le runtime, le parcours caisse / réception peut être décrit avec la **même** `FlowDefinition` en `wizard` ou `tabbed`, enrichi de raccourcis et de conventions clavier. L'introduction explicite du type `cashflow` dans le schéma (même pipeline, pas de second moteur) est une **décision de livraison** à tracer (story ou ADR courte) — en parallèle des jalons sprint / epics qui portent sur le **comportement** du parcours, pas sur l'étiquette de type seule.

En Phase 2-3 : les flows sont composables par un éditeur nodal (type React Flow) qui produit du JSON FlowDefinition. L'agent Peintre_mini pourra aussi générer des flows adaptatifs (onboarding personnalisé, parcours guidés contextuels). Les statecharts (XState) deviennent un backend possible pour les flows complexes avec états parallèles et guards sophistiqués.

**Principe architectural :** l'éditeur nodal (futur) ne contient pas de logique — il produit et modifie des FlowDefinitions JSON. Le runtime exécute ces FlowDefinitions. La séparation éditeur/runtime est non négociable, exactement comme la séparation Peintre-agent (compositeur) / Peintre-nano (moteur).

### 3.2 Substrat de layout et préparation au futur

Cette section décrit les fondations à poser dès Phase 0 pour que l'architecture reste compatible avec la vision long terme (grilles auto-optimisables, patterns de lecture, IA compositrice). **Rien de ce qui suit n'est à implémenter maintenant** — mais les choix structurants doivent être faits pour ne pas avoir à tout refactorer.

#### CSS Grid comme moteur de layout obligatoire

Le shell et les templates de page doivent être construits sur **CSS Grid** (pas Flexbox seul). CSS Grid est le standard natif pour les layouts 2D complexes en 2025-2026, et c'est la brique sur laquelle le futur du layout web se construit (subgrid, container queries, tooling Figma aligné). C'est le substrat technique que Peintre_mini/macro pilotera via JSON.

Tailwind CSS, s'il est utilisé, n'est **pas une alternative** à CSS Grid — c'est une couche d'écriture par-dessus (classes utilitaires `grid`, `grid-cols-12`, `gap-4` qui pilotent les propriétés CSS Grid). Le choix Tailwind vs CSS natif est une décision d'implémentation, pas d'architecture.

Décision de Phase 0 : le shell RecyClique V2 utilise CSS Grid pour la structure globale (zones nommées). Flexbox reste autorisé à l'intérieur des widgets pour leur layout interne. Le choix du framework CSS (Tailwind, CSS Modules, etc.) est indépendant de cette décision.

#### Meta-props standard des widgets

Chaque widget, en plus de ses `props_schema` métier, expose des **meta-props** qui décrivent son comportement dans la grille :

| Meta-prop | Type | Description | Usage Phase 0 | Usage futur |
|-----------|------|-------------|---------------|-------------|
| `default_span` | `{col, row}` | Taille par défaut en colonnes/lignes de grille | Utilisé par le shell pour le placement | Peintre ajuste dynamiquement |
| `min_span` / `max_span` | `{col}` | Limites de redimensionnement | Documentation | Contrainte pour l'optimiseur |
| `prominence` | `"high"/"normal"/"secondary"` | Importance visuelle relative | Classe CSS appliquée | L'agent optimise le placement |
| `density` | `"low"/"medium"/"high"` | Densité d'information souhaitée | Choix de variante d'affichage | Auto-adaptation contextuelle |
| `variants` | `["compact","regular","expanded"]` | Modes d'affichage du widget selon l'espace disponible | Le shell utilise `regular` par défaut | Container queries + agent IA |

En Phase 0, les meta-props sont lues par le shell pour appliquer des classes CSS et déterminer la taille par défaut dans la grille. En Phase 2-3, l'agent Peintre les utilise comme leviers d'optimisation.

#### Zone roles (rôles sémantiques de zones)

Les slots physiques (ex: `shell.dashboard.cards`) sont des emplacements concrets dans un template de page. Les **zone roles** sont des rôles sémantiques abstraits liés aux patterns de lecture (F-pattern, Z-pattern) :

| Zone role | Description | Mapping F-pattern | Mapping Z-pattern |
|-----------|-------------|-------------------|-------------------|
| `primary-hotspot` | Zone de plus haute attention visuelle | Bande supérieure, colonne gauche | Diagonale héroïque, coin sup-gauche |
| `secondary-hotspot` | Deuxième niveau d'attention | Deuxième ligne horizontale | Coin sup-droit, coin inf-droit |
| `scan-column` | Zone de scanning vertical | Colonne gauche sous le fold | Colonne gauche |
| `footer-band` | Zone de fermeture / CTA final | Bas de page | Ligne inférieure |
| `content-flow` | Zone de contenu principal séquentiel | Zone centrale | Zone centrale |

En Phase 0 : les zone roles sont des **annotations optionnelles** dans les slot contributions (`"zone_role": "secondary-hotspot"`). Le shell les ignore — elles servent uniquement de documentation et de préparation. En Phase 2-3 : Peintre_mini utilise les zone roles pour placer intelligemment les widgets selon le pattern de lecture choisi, sans manipuler de coordonnées physiques.

#### Templates de page sémantiques

Un template de page est un Object CREOS de type `PageTemplate`. Il définit trois choses : un type sémantique, une grille CSS Grid, et un mapping zone roles → slots physiques. Le PageTemplate est un Object au sein d'un Influx (comme le ModuleManifest), pas un Influx autonome — il est référencé par l'application shell, pas émis sur un bus.

```json
{
  "type": "PageTemplate",
  "id": "template.dashboard",
  "data": {
    "semantic_type": "dashboard",
    "reading_pattern": "F",
    "grid": {
      "desktop": {
        "columns": 12,
        "gutters": "16px",
        "areas": [
          "topbar topbar topbar topbar topbar topbar topbar topbar topbar topbar topbar topbar",
          "sidebar main main main main main main main main main main main",
          "sidebar cards cards cards cards cards cards cards cards cards cards cards"
        ]
      },
      "mobile": {
        "columns": 4,
        "gutters": "8px",
        "areas": [
          "topbar topbar topbar topbar",
          "main main main main",
          "cards cards cards cards",
          "bottomnav bottomnav bottomnav bottomnav"
        ]
      }
    },
    "zone_mapping": {
      "primary-hotspot": "topbar",
      "content-flow": "main",
      "secondary-hotspot": "cards",
      "scan-column": "sidebar"
    },
    "slots_activated": [
      "shell.nav.topbar", "shell.nav.sidebar", "shell.dashboard.cards",
      "shell.main.content", "shell.nav.bottom"
    ]
  }
}
```

En Phase 0 : seuls 2-3 templates sont implémentés (`desktop-admin`, `mobile-field`), avec la grille CSS Grid codée en dur. Le JSON ci-dessus est la cible de Phase 1-2. L'important est que le code du shell soit structuré autour de CSS Grid areas dès le départ.

#### Préparation aux métriques d'interaction

Pour que Peintre_mini puisse un jour optimiser les layouts (A/B testing, bandits, RL), il faut que les widgets puissent remonter des métriques d'interaction. En Phase 0, cela se limite à une convention :

Chaque widget reçoit un callback optionnel `onInteraction` dans ses props de contexte. En Phase 0, ce callback ne fait rien (noop). En Phase 2, il alimente un collecteur de métriques.

```typescript
// Convention de callback — à prévoir dans le Slot, même si noop en Phase 0
interface SlotContext {
  // ... props de contexte existantes
  variant?: "compact" | "regular" | "expanded";  // variante active, déterminée par le Slot selon l'espace disponible
  onInteraction?: (event: { widget_type: string; action: string; metadata?: Record<string, any> }) => void;
}
```

Types d'interactions prévues (pour documentation, pas d'implémentation Phase 0) : `view` (le widget est visible), `click` (action utilisateur), `task_complete` (tâche accomplie), `dismiss` (widget fermé/ignoré).

#### Widget variants (modes d'affichage adaptatifs)

Un widget peut s'afficher différemment selon l'espace disponible dans son conteneur. Plutôt que de coder des media queries par widget, on déclare des **variants** dans le manifest :

```json
{
  "type": "member.summary.card",
  "meta_props": {
    "variants": ["compact", "regular", "expanded"],
    "default_variant": "regular"
  }
}
```

En Phase 0 : chaque widget implémente au minimum la variante `regular`. Les variantes `compact` et `expanded` sont optionnelles — leur absence est gérée gracieusement (fallback sur `regular`). La variante active est passée comme prop par le Slot. Le champ `variants` dans les meta_props est lui-même optionnel : un widget qui ne déclare pas de variants est toujours rendu en mode `regular`.

En Phase 2-3 : les variants seront pilotées automatiquement par des CSS container queries — le widget s'auto-adapte en fonction de la taille de sa zone, pas du viewport. L'agent Peintre pourra aussi forcer une variante via le JSON de composition.

#### Séparation stricte layout global / layout interne widget

Principe architectural non négociable :

- **Layout global** (structure de page, zones, colonnes, placement des widgets) : piloté par CSS Grid, défini par le template de page, manipulé par le DSL Peintre. Le widget ne décide pas où il est placé.
- **Layout interne widget** (arrangement des éléments à l'intérieur du widget) : libre choix du développeur du widget (Flexbox, CSS Grid local, ou autre). Le widget ne connaît pas la grille de page.

Cette séparation est ce qui permettra plus tard d'introduire subgrid (les widgets pourront s'aligner sur la grille parente sans la connaître explicitement) et les container queries (les widgets s'adapteront à leur conteneur, pas au viewport).

#### Indépendance du DSL vis-à-vis de l'implémentation CSS

Le DSL de Peintre (manifests, meta-props, PageTemplates) parle en **concepts abstraits** : colonnes, spans, zones nommées, prominence, density, variants. Il ne parle jamais en classes CSS, ni en propriétés CSS directes.

L'implémentation CSS sous-jacente (CSS natif, Tailwind, CSS Modules, CSS-in-JS) est une **peau interchangeable**. Le renderer traduit les concepts abstraits en implémentation concrète. Tailwind fournit des classes utilitaires (`grid`, `grid-cols-12`, `gap-4`) qui pilotent CSS Grid — il ne remplace pas Grid, il change juste la manière de l'écrire.

Conséquence : le choix Tailwind vs CSS natif (décision P1) n'impacte pas l'architecture du DSL. Le DSL reste le même quel que soit le backend CSS.

#### Évolutions CSS anticipées (pas d'implémentation, pas de blocage)

Deux évolutions CSS majeures sont en cours de déploiement dans les navigateurs (2025-2026). Peintre_nano ne les utilise pas en Phase 0, mais l'architecture ne doit pas les bloquer :

**Container queries** : permettent à un composant d'adapter son layout en fonction de la taille de son conteneur (pas du viewport). C'est le support technique naturel des widget variants. L'architecture est prête si : les variants existent dans le manifest, la séparation global/interne est respectée, et les widgets ne dépendent pas de media queries globales pour leur layout interne.

**Subgrid** : permet aux enfants d'un grid de réutiliser la grille du parent, assurant un alignement cohérent à travers les niveaux d'imbrication. L'architecture est prête si : la grille de page est un objet explicite et partageable (PageTemplate), et les widgets ne redéfinissent pas leurs propres colonnes quand ils veulent s'aligner sur la structure globale.

### 3.3 Convention de nommage

**Slots** : `{scope}.{zone}.{position}` — ex: `shell.nav.sidebar`, `shell.dashboard.cards`, `members.page.header`, `cashdesk.receipt.footer`.

**Widgets** : `{domaine}.{entité}.{variante}` — ex: `member.summary.card`, `inventory.item.row`, `cashdesk.ticket.line`, `stats.chart.bar`.

**Modules** : `{application}.{domaine}` — ex: `recyclique.membership`, `recyclique.cashdesk`, `recyclique.inventory`, `foxaprod.projects`.

### 3.4 Slots structurants du shell (à définir par application)

Pour RecyClique V2, les slots structurants identifiés (premier jet, à affiner avec BMAD) :

| Slot | Description | Contexte transmis |
|------|-------------|-------------------|
| `shell.nav.sidebar` | Items de navigation latérale | `active_route`, `user_role` |
| `shell.nav.topbar` | Actions/infos dans la barre supérieure | `user`, `site_id` |
| `shell.nav.bottom` | Navigation inférieure (mobile) | `active_route`, `user_role` |
| `shell.toolbar.actions` | Boutons d'action contextuels | `current_page`, `selection` |
| `shell.dashboard.cards` | Cartes du tableau de bord | `period`, `site_id` |
| `shell.dashboard.charts` | Graphiques du tableau de bord | `period`, `site_id` |
| `shell.main.content` | Zone de contenu principal (routing) | `route_params` |
| `shell.footer.status` | Indicateurs de statut (sync, etc.) | `sync_state` |
| `shell.bandeau.live` | Bandeau d'affichage temps réel | `display_mode` |
| `shell.superadmin.modules` | Panel de gestion des modules | `admin_context` |

Chaque application (RecyClique, FoxaProd, future cartouche Odoo) définit ses propres slots structurants. Certains slots sont **communs** à toutes les applications JARVOS (shell.nav.*, shell.toolbar.*) — c'est le vocabulaire partagé de Peintre.

---

## 4. Cross-compatibilité et cartouches

### 4.1 Principe de projection universelle

Toute cartouche métier (au sens JARVOS) qui possède une interface utilisateur projette ses contributions UI via des manifests Peintre_nano. Le mécanisme est identique qu'il s'agisse de RecyClique, d'un client Odoo, de FoxaProd, ou de toute future application.

```
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│ Cartouche         │    │ Cartouche         │    │ Cartouche         │
│ RecyClique        │    │ Odoo CRM          │    │ FoxaProd          │
│ (adhérents, cais- │    │ (contacts, factu- │    │ (projets, plan-   │
│  se, inventaire)  │    │  ration, devis)   │    │  ning, médias)    │
├───────────────────┤    ├───────────────────┤    ├───────────────────┤
│ Manifests CREOS   │    │ Manifests CREOS   │    │ Manifests CREOS   │
│ (slots, widgets,  │    │ (slots, widgets,  │    │ (slots, widgets,  │
│  routes, actions)  │    │  routes, actions)  │    │  routes, actions)  │
└────────┬──────────┘    └────────┬──────────┘    └────────┬──────────┘
         │                        │                        │
         └────────────┬───────────┴────────────┬───────────┘
                      │                        │
              ┌───────▼────────┐       ┌───────▼────────┐
              │ Peintre_nano   │       │ Peintre_nano   │
              │ (instance web) │       │ (instance mob) │
              ├────────────────┤       ├────────────────┤
              │ Template :     │       │ Template :     │
              │ desktop-admin  │       │ mobile-field   │
              └────────────────┘       └────────────────┘
```

### 4.2 Templates de layout

Peintre_nano n'impose pas un layout unique. Il fournit des **templates de layout sémantiques** (type `PageTemplate`, voir §3.2) qui définissent quels slots structurants existent, comment ils sont disposés sur la grille CSS Grid, et quel pattern de lecture ils suivent :

| Template | Type sémantique | Pattern | Grille desktop | Usage |
|----------|----------------|---------|----------------|-------|
| `desktop-admin` | `backoffice` | F | sidebar + topbar + main + toolbar | Classique back-office |
| `desktop-dashboard` | `dashboard` | F | topbar + grille de cards/charts | Monitoring, stats |
| `mobile-field` | `mobile` | Z | bottom nav + main + FAB | Terrain, bénévoles |
| `tablet-pos` | `pos` | grid | grille produits + ticket | Caisse tactile |
| `display-public` | `display` | Z | bandeau plein écran | Affichage magasin |

Chaque template active un sous-ensemble de slots structurants et définit un mapping zone roles → emplacements physiques (voir §3.2). Un même module peut contribuer à des slots de plusieurs templates — le filtrage se fait au rendu selon le template actif et les breakpoints déclarés dans le manifest.

### 4.3 Convergence avec le manifest de cartouche JARVOS

Le manifest Peintre_nano (contributions UI) et le manifest de cartouche JARVOS (graphes, skills, mémoire, modems) sont **complémentaires, pas concurrents**. À terme, ils pourraient fusionner dans un manifest unifié :

```yaml
# cartouche.yaml (futur unifié)
id: recyclique-membership
version: 0.1.0

# Section cognitive (JARVOS)
graphs:
  - id: adherent-workflow
    entry: graphs/adherent_workflow.py
skills_dir: skills/
memory:
  aethermind_namespace: recyclique_adherents

# Section interface (Peintre_nano)
ui:
  routes:
    - path: /members
      component: MembersPage
  slots:
    - target: shell.nav.sidebar
      component: MembersNavItem
      order: 20
  widgets:
    - type: member.summary.card
      component: MemberSummaryCard
      props_schema: { ... }
  shortcuts:
    - key: F3
      action: members.create
      scope: global
  flows:
    - id: members.inscription
      type: wizard
      steps: [...]
```

En Phase 1 (RecyClique V2), seule la section `ui` existe. La section cognitive viendra quand Nano sera branché.

---

## 5. Préparation à Peintre_mini (la couche IA)

### 5.1 Les poignées pour l'agent

Tout le travail de Peintre_nano pose les **handles** (poignées) que Peintre_mini manipulera :

- **WidgetCatalog** : l'agent connaît les types de widgets disponibles et leurs props_schema. Il peut raisonner : "pour afficher un résumé d'adhérent, j'utilise `member.summary.card` avec `compact: true`."
- **Slots nommés** : l'agent sait dans quels emplacements il peut placer du contenu. Il peut composer : "dans `shell.dashboard.cards`, je place trois widgets."
- **FlowDefinitions** : l'agent peut composer des parcours adaptatifs (onboarding personnalisé, workflows guidés) en générant des FlowDefinitions JSON avec steps, transitions et guards.
- **LayoutComposition (futur)** : un arbre JSON de widgets que l'agent génère et que le renderer Peintre_nano interprète.

### 5.2 Trajectoire JSON / SDUI

La progression vers le SDUI se fait par étapes, sans rupture :

**Phase 0 (RecyClique V2)** : les manifests sont des fichiers statiques. Les slots sont remplis par du code TypeScript qui importe les composants. Pas de JSON dynamique.

**Phase 1 (stabilisation)** : introduction d'un mini-DSL JSON interne pour décrire la composition de certaines zones (ex: un dashboard configurable par l'admin). Le renderer construit l'arbre de widgets à partir de ce JSON.

```json
{
  "type": "layout.grid",
  "props": { "columns": 3 },
  "children": [
    { "type": "member.summary.card", "props": { "member_id": "current", "compact": true } },
    { "type": "stats.chart.bar", "props": { "metric": "collections", "period": "month" } },
    { "type": "inventory.item.card", "props": { "category": "highlighted" } }
  ]
}
```

**Phase 2 (Peintre_mini)** : l'agent IA génère ce même JSON via le bus CREOS. Le renderer est identique — seule la source du JSON change (humain → agent).

**Phase 3 (SDUI avancé)** : intégration possible de DivKit pour le rendu cross-platform (mobile natif), en réutilisant le même vocabulaire de widgets.

### 5.3 Compatibilité ascendante Piral

Si l'écosystème de modules grandit au point de justifier un framework industriel, la migration vers Piral reste possible :

- Les manifests Peintre_nano s'alignent avec les concepts Piral (pilets avec routes, extensions de layout).
- Le composant `Slot` a le même rôle que les extension slots Piral.
- Le `ModuleRegistry` peut être réimplémenté avec le feed service Piral sans changer l'API consommée par les modules.

Pour préserver cette option : ne pas coupler les slots à des détails d'implémentation React spécifiques, et isoler le micro-framework derrière une interface claire.

---

## 6. Roadmap d'implémentation

### Phase 0 — Prototype interne (semaines 1-2)

**Livrables :**
- Package `peintre-nano` avec : `ModuleRegistry`, composant `<Slot>`, composant `<FlowRenderer>`, gestionnaire de raccourcis clavier, types TypeScript pour les manifests.
- 2-3 manifests RecyClique simples (adhérents, inventaire, caisse) pour validation du modèle.
- Shell RecyClique V2 minimal avec les slots structurants branchés.
- Au moins un flow fonctionnel (parcours caisse ou inscription adhérent).

**Critère de validation :** un module peut être activé/désactivé via config et ses contributions apparaissent/disparaissent des slots sans toucher au code du shell.

### Phase 1 — Stabilisation du contrat (semaines 3-5)

**Livrables :**
- JSON Schema formel du manifest (validable automatiquement).
- Documentation des 8-12 slots structurants de RecyClique avec contrats de props/événements.
- Vocabulaire de widgets initial (10-15 types) avec props_schema.
- Panel super-admin pour activer/désactiver les modules et visualiser les slots.

**Critère de validation :** un nouveau module optionnel RecyClique (ex: module vente boutique) peut être ajouté en écrivant uniquement un manifest + ses composants React, sans modifier le shell.

### Phase 2 — Premiers usages JSON-driven (après V2 stable)

**Livrables :**
- Mini-DSL JSON pour la composition de dashboards configurables par l'admin.
- Renderer générique qui construit l'arbre de widgets depuis le JSON.
- Premier test d'un JSON de layout externe.
- Prototype d'éditeur nodal (React Flow) pour la composition visuelle de flows (wizard, parcours).
- Évaluation de XState comme backend pour les flows complexes (états parallèles, guards, historique).

### Phase 3 — Ouverture à Peintre_mini / SDUI (Horizon 2)

**Livrables :**
- API/bus CREOS permettant à un agent de proposer des JSON de layout.
- Gate Capitaine_Balance sur les boutons d'action générés par l'agent.
- Expérimentation DivKit pour sous-ensemble mobile.

---

## 7. Décisions ouvertes

| # | Sujet | Options | Recommandation | Quand |
|---|-------|---------|---------------|-------|
| P1 | Framework CSS de base pour les widgets | Tailwind, CSS Modules, CSS-in-JS | À décider avec Yo selon stack RecyClique V2 | Phase 0 |
| P2 | Stockage de la config admin (modules actifs, surcharges) | Fichier JSON, table PostgreSQL, env vars | PostgreSQL (déjà en stack RecyClique) | Phase 0 |
| P3 | Granularité des slots : combien est trop ? | 8-12 pour V2, itérer | Commencer conservateur, ajouter selon besoin | Phase 1 |
| P4 | Isolation des modules : lazy loading ou bundle commun ? | Lazy load par module, bundle monolithique | Bundle commun en Phase 0, lazy load en Phase 1 | Phase 1 |
| P5 | Convention de versioning des manifests | SemVer, date-based | SemVer (aligné cartouches JARVOS) | Phase 0 |
| P6 | Partage de widgets entre applications | Package npm partagé, registre centralisé | Package partagé quand 2ème app existe, pas avant | Phase 2+ |
| P7 | Fusion manifest cartouche + manifest Peintre | Deux fichiers séparés, un fichier unifié | Séparés en Phase 0-1, fusion évaluée en Phase 2 | Phase 2 |
| P8 | Nombre de colonnes de la grille de base | 12 (Material), 16 (plus granulaire), variable | 12 colonnes (standard industrie, compatible Material) | Phase 0 |
| P9 | Format des zone roles : annotation ou structure | Annotation optionnelle dans le manifest, structure formelle | Annotation optionnelle en Phase 0 (pas de coût, prépare le futur) | Phase 0 |
| P10 | Collecte de métriques d'interaction | Callback noop, event bus, analytics externe | Callback noop en Phase 0, décision architecture en Phase 2 | Phase 2 |
| P11 | Implémentation des widget variants | Props passées par le Slot, container queries, classe CSS | Props en Phase 0 (simple), container queries en Phase 2 | Phase 0 → 2 |
| P12 | Gestion d'état des flows | useState local, Zustand, XState | useState local en Phase 0, évaluer XState en Phase 2 si flows complexes | Phase 0 → 2 |
| P13 | Résolution des conflits de raccourcis clavier | Premier déclaré gagne, priorité par scope, configurable admin | Priorité par scope (page > global) en Phase 0 | Phase 0 |

---

## 8. Références et inspirations

### Frameworks étudiés

| Framework | Rôle | Usage |
|-----------|------|-------|
| **Piral** (MIT) | Micro-frontends avec app-shell + pilets + extension slots | **Patron conceptuel** — modèle mental, pas adopté directement |
| **Open edX FPF** | Frontend Plugin Framework avec PluginSlot + config déclarative | **Inspiration technique** — implémentation concrète des slots |
| **DivKit** (Apache 2.0, Yandex) | Framework SDUI cross-platform, JSON → UI | **Cible Phase 3** — renderer SDUI possible pour mobile |
| **Module Federation** (Webpack/Vite) | Partage de bundles à runtime entre applications | **Outil optionnel** — plomberie bas niveau si besoin de split apps |
| **CSS Grid** (natif web) | Moteur de layout 2D avec zones nommées et breakpoints | **Substrat obligatoire** — le shell doit être construit dessus |
| **Material Design Grid** | Système de colonnes/gouttières/marges responsive | **Inspiration** — modèle de breakpoints et de grille |
| **React Flow** (MIT) | Bibliothèque de graphes interactifs avec nœuds personnalisés | **Cible Phase 2** — éditeur nodal pour composer flows et layouts visuellement |
| **XState/Stately** (MIT) | Moteur de statecharts avec visualiseur intégré | **Option Phase 2** — backend pour flows complexes (états parallèles, guards) |

### Recherche UX/cognitive (Perplexity Pro)

- F-pattern et Z-pattern de lecture (Nielsen Norman Group, eye-tracking) — base scientifique pour les zone roles
- Hiérarchie visuelle et hotspots d'attention — fondement du concept de `prominence`
- UI adaptatives par A/B testing, bandits, RL — trajectoire d'optimisation pour Phase 3
- Deep learning pour génération de layouts personnalisés — vision long terme Peintre_macro

### Évolutions CSS anticipées (Perplexity Pro)

- **CSS Grid** : standard natif 2D, renforcé en continu (subgrid, nouvelles fonctions de sizing) — moteur de layout obligatoire
- **Container queries** : composants auto-adaptatifs selon leur conteneur — support naturel des widget variants (Phase 2)
- **Subgrid** : alignement des enfants sur la grille parente — compositions complexes sans duplication de grille (Phase 2-3)
- **Tailwind CSS** : couche utilitaire par-dessus CSS Grid, pas une alternative conceptuelle — choix de peau, pas d'architecture

### Documents JARVOS connexes

- `peintre-mini-grammaire-visuelle.md` — Concept de la grammaire visuelle (WidgetJarvos, S-DUI)
- `contrat-influx-cinq-champs-creos.md` — Structure des cinq champs CREOS (référence pour les manifests)
- `cartouches-metiers-applicatives.md` — Manifest de cartouche (convergence avec manifest Peintre)
- `registre-vocabulaire-creos.md` — Registre vocabulaire (les types de widgets y seront ajoutés)
- `VISION-ET-ATTENTES-PEINTRE-MINI.md` — Vision de Peintre_mini (objectifs fonctionnels, régulation)
- `le-port-gateway.md` — Le Port comme adaptateur de canal (en aval de Peintre)

---

*Document concept JARVOS — Peintre_nano — 2026-03-31*
*Première brique opérationnelle nano hors du tétraèdre fondamental.*
