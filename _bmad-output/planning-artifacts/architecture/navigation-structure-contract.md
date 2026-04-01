# Navigation & Structure Contract

## Purpose

Ce document compagnon precise la forme minimale du contrat de structure informationnelle commanditaire entre `recyclique` et `Peintre_nano`.

Il complete l'architecture principale sans la remplacer :
- l'architecture fixe les decisions, frontieres et hierarchie de verite ;
- ce document fixe le profil minimal des artefacts a implementer dans la Story 0 et les premiers slices verticaux.

Dans l'esprit JARVOS, on distingue ici :
- le cadre produit et metier porte par le commanditaire ;
- la grammaire declarative `CREOS` ;
- le moteur d'affichage `Peintre_nano`.

## JARVOS / CREOS Principles

- `recyclique` reste auteur metier de la structure informationnelle.
- `Peintre_nano` reste moteur d'affichage / telecran agnostique.
- `CREOS` decrit la composition declarative, pas une seconde verite metier.
- le contexte actif et les permissions restent autoritatifs cote backend.
- les preferences runtime utilisateur ne deviennent jamais une source de verite metier.
- toute resolution runtime doit etre explicable, deterministe et rejetable en cas d'incoherence.

## Truth Hierarchy

La hierarchie de verite est la suivante :

1. `OpenAPI`
   - schemas canoniques des donnees, actions, permissions, etats metier et du `ContextEnvelope`
2. `ContextEnvelope`
   - instance runtime du contexte actif de l'operateur et contraintes d'affichage
3. `NavigationManifest`
   - structure informationnelle, arborescence, navigation, raccourcis structurels
4. `PageManifest`
   - composition declarative d'un ecran
5. `UserRuntimePrefs`
   - personnalisation locale non metier

## Minimal Artifacts

### `NavigationManifest`

**Role**
- porter l'arborescence des routes, la navigation et les raccourcis structurels d'une application commanditaire.

**Authoritative owner**
- application commanditaire, ici `recyclique`.

**Canonical location**
- `contracts/creos/manifests/`

**Consumed by**
- `Peintre_nano`

**Must define**
- les routes disponibles ;
- leur organisation ;
- leur visibilite declarative ;
- leur ordre ;
- leur relation avec les pages.

**Must not define**
- une permission calculée seule ;
- une verite metier ;
- une logique d'autorisation remplaçant le backend.

**Note**
- les cles de permissions peuvent apparaitre de facon declarative pour le filtrage UI ;
- leur calcul autoritatif reste toujours cote backend via `ContextEnvelope`.
- `permission_any` signifie : au moins une permission presente dans `ContextEnvelope.permission_keys`.
- `contexts_all` signifie : tous les marqueurs de contexte requis sont presents dans l'instance de `ContextEnvelope`.
- `contexts_any` signifie : au moins un marqueur de contexte requis est present dans l'instance de `ContextEnvelope`.
- la correspondance entre marqueurs declaratifs (`site`, `poste`, `session`, etc.) et champs techniques de l'enveloppe (`site_id`, `workstation_id`, `cash_session_id`, etc.) est definie par le contrat backend `OpenAPI`.

### `PageManifest`

**Role**
- decrire la composition declarative d'une route ou page : template, zones, widgets, actions declaratives, flows simples.

**Authoritative owner**
- application commanditaire, ici `recyclique`.

**Canonical location**
- `contracts/creos/manifests/`

**Consumed by**
- `Peintre_nano`

**Must define**
- quelle page est associee a quelle route ;
- quel template est utilise ;
- quelles zones sont remplies ;
- quels widgets sont presents ;
- quels flows simples et actions declaratives sont exposes.

**Must not define**
- une logique metier imperative locale ;
- une navigation non declaree dans `NavigationManifest`.

### `ContextEnvelope`

**Role**
- porter le contexte actif necessaire a la resolution d'affichage : site, caisse, session, poste, role, groupe, permissions, etats utiles.

**Authoritative owner**
- backend `recyclique`.

**Canonical schema**
- `OpenAPI`

**Consumed by**
- `Peintre_nano`

**Must define**
- contexte operateur actif ;
- permissions calculees ;
- etats de contexte utiles au rendu ;
- marqueurs de contexte indispensables aux flows critiques.

**Must not define**
- une preference d'affichage purement locale ;
- une structure de navigation autonome.

### `UserRuntimePrefs`

**Role**
- porter la personnalisation locale non metier du rendu et de l'experience utilisateur.

**Authoritative owner**
- `Peintre_nano`, dans des limites strictement runtime.

**Canonical location**
- runtime frontend `peintre-nano/`

**Persistence rule**
- local par defaut ;
- si une persistence backend est necessaire, elle doit passer par un endpoint explicite dedie, hors `CREOS`, hors verite metier, hors calcul de permissions/navigation.

**May define**
- densite ;
- etat replie/deplie d'un panneau ;
- raccourcis personnels ;
- etat d'onboarding ;
- preferences secondaires de presentation.

**Must not define**
- permissions ;
- visibilite metier ;
- arborescence ;
- routes ;
- pages metier.

## Minimal Field Set

### `NavigationManifest`

```yaml
kind: NavigationManifest
version: 1
app_key: recyclique
manifest_id: recyclique-main-nav
nodes:
  - route_key: dashboard
    path: /dashboard
    page_key: dashboard-page
    label: Tableau de bord
    nav_region: primary
    order: 10
    visibility:
      permission_any:
        - dashboard.view
      contexts_any:
        - site
  - route_key: cashflow
    path: /cashflow
    page_key: cashflow-page
    label: Caisse
    nav_region: primary
    order: 20
    visibility:
      permission_any:
        - cashflow.view
      contexts_all:
        - site
        - poste
shortcuts:
  - shortcut_key: goto-cashflow
    label: Aller a la caisse
    route_key: cashflow
    keybinding: F2
```

### `PageManifest`

```yaml
kind: PageManifest
version: 1
page_key: dashboard-page
route_key: dashboard
template_key: shell-dashboard
slots:
  - slot_key: header
    widgets:
      - widget_key: bandeau-live
        widget_type: live-banner
        props:
          title: Etat terrain
          show_sync_state: true
  - slot_key: main
    widgets:
      - widget_key: dashboard-summary
        widget_type: summary-cards
actions:
  - action_key: refresh-banner
    action_type: command
flows:
  - flow_key: banner-focus-cycle
    flow_type: local-focus
fallback:
  mode: visible-error
```

```yaml
kind: PageManifest
version: 1
page_key: cashflow-page
route_key: cashflow
template_key: shell-cashflow
slots:
  - slot_key: main
    widgets:
      - widget_key: cashflow-main
        widget_type: cashflow-console
fallback:
  mode: visible-error
```

### `ContextEnvelope`

```yaml
context_id: ctx-2026-04-01-001
user_id: usr-001
site_id: site-rennes
cash_register_id: cr-01
cash_session_id: cs-2026-04-01-am
workstation_id: poste-accueil
role_keys:
  - operateur-caisse
group_keys:
  - ressourcerie-rennes
permission_keys:
  - dashboard.view
  - cashflow.view
  - cashflow.open-session
ui_flags:
  - bandeau-live-enabled
sync_state:
  state: stable
```

Note :
- `ui_flags` sont des garde-fous d'affichage fournis par le backend autoritatif ;
- ils ne remplacent ni les permissions, ni les manifests, ni les preferences runtime utilisateur.

### `UserRuntimePrefs`

```yaml
local_profile_id: local-usr-001
density: compact
nav_collapsed: false
shortcut_overrides:
  goto-cashflow: F6
onboarding:
  bandeau-live-dismissed: false
presentation:
  highlight_sync_state: true
```

## Runtime Interpretation Rules

`Peintre_nano` doit appliquer les regles suivantes :

- ne jamais creer une route metier absente du `NavigationManifest` ;
- ne jamais afficher une entree interdite par le `ContextEnvelope` ou les permissions backend ;
- ne jamais rendre une page metier sans `PageManifest` associe ;
- traiter l'affichage effectif comme l'intersection :
  - contrat commanditaire
  - contexte actif serveur
  - preferences runtime locales non metier
- refuser par defaut toute collision de `route_key`, `path`, `page_key` ou `shortcut_key` non arbitree explicitement ;
- l'arbitrage des collisions releve du commanditaire et de la validation CI ; a defaut d'arbitrage explicite, le rejet est dur avant activation ;
- journaliser tout rejet de manifest, collision ou incoherence de contexte ;
- laisser le commanditaire maitre du sens metier, et garder a `Peintre_nano` seulement la resolution runtime, le layout et l'experience.

## Validation Rules

Avant activation, il faut verifier au minimum :

- schema valide pour chaque artefact ;
- `route_key` unique ;
- `page_key` unique ;
- `path` unique ;
- chaque `node.page_key` resolu par un `PageManifest` ;
- chaque `shortcut.route_key` resolu par un noeud de navigation ;
- chaque widget connu du registre `Peintre_nano` ;
- aucune permission declaree dans un manifest hors de l'ensemble des cles documentees par le backend via `OpenAPI` ;
- `UserRuntimePrefs` incapable d'ajouter une route, une page ou une permission.

## Bandeau Live Minimal Slice

Le premier slice `bandeau live` doit prouver :

- chargement d'un `NavigationManifest` minimal ;
- chargement d'un `PageManifest` minimal ;
- chargement d'un `ContextEnvelope` reel ;
- prise en compte de `UserRuntimePrefs` sans effet sur la structure metier ;
- rendu correct d'un bandeau live dans un template racine ;
- source de donnees live attestee via contrat backend explicite ;
- rejet visible et trace en cas de contrat invalide.

## Implementation Notes

- Les schemas formels viendront ensuite sous `contracts/creos/schemas/` et `OpenAPI`.
- Ce document n'est pas le schema canonique final ; il fixe le profil minimal a implementer.
- Toute evolution doit rester compatible avec l'esprit JARVOS :
  - structure explicite ;
  - contexte autoritatif serveur ;
  - composition declarative ;
  - zero magie metier cachee dans le moteur.
