# Blueprint - layout, workflow, ecrans

**Date :** 2026-03-26
**Session :** cadrage architecture frontend configurable pour Recyclique
**Statut :** proposition cible courte, orientee BMAD

---

## Decision retenue

Pour Recyclique, la combinaison la plus realiste est :

- **Workflow explicite** : machine d'etats pour les parcours clavier caisse et reception.
- **Configuration d'ecran legere** : schemas TypeScript/JSON pour decrire panneaux, raccourcis, variantes desktop/tablette.
- **Layout configurable cible** : docking seulement la ou ca apporte un vrai gain, d'abord sur les postes desktop de reception.
- **Handles + pilotage machine** : le layout modulable garde des **handles** UI (resize, split, drag de panneaux la ou c'est permis) **et** des **branchements** pour piloter le meme etat via **API**, **CLI** ou contrat stable, pour qu'un **agent specialise** (ou JARVOS amont) puisse appliquer une config sans simuler des clics.
- **Conservation du socle existant** : Mantine, Zustand, React Router, responsive/kiosk mode.
- **Evolution JARVOS** : preparer les **points d'accroche** vers **JARVOS Nano** et **Peintre** comme organe d'affichage (alignement FR26, LayoutConfigService / VisualProvider).

---

## Critique de la piste

Ce qu'il faut **eviter** :

- Transformer tout le frontend en mini-framework no-code trop tot.
- Introduire un layout dockable partout alors que le besoin fort est surtout sur la reception desktop.
- Laisser la logique de workflow continuer a grossir dans les composants JSX et les `useEffect`.
- Donner sur tablette une liberte totale de reorganisation qui degrade l'ergonomie terrain.

Conclusion : la priorite n'est **pas** le docking. La priorite est de **sortir la logique de workflow** des composants, puis d'ajouter une couche de configuration d'ecran simple, puis seulement d'etendre le layout desktop si necessaire.

---

## Reco technique

### 1. Workflow

- Introduire une machine d'etats explicite pour `SaleWizard`.
- Appliquer ensuite le meme principe a `Reception/TicketForm`.
- Garder les handlers clavier, mais les faire piloter une machine au lieu de transitions dispersees.

### 2. Config d'ecran

Creer une definition d'ecran legere, versionnee, en TypeScript d'abord :

```ts
type ScreenDefinition = {
  id: 'cash-sale' | 'reception-ticket';
  deviceModes: ('desktop' | 'tablet' | 'kiosk')[];
  panels: Array<{
    id: string;
    kind: 'categories' | 'workflow' | 'ticket' | 'keypad' | 'controls' | 'summary';
    defaultVisible: boolean;
    defaultSize?: number;
    dockable?: boolean;
  }>;
  workflowMachine: string;
  shortcutProfile: string;
};
```

### 3. Layout

- **Court terme** : garder `react-resizable-panels` pour les ecrans simples et la reception actuelle.
- **Moyen terme** : evaluer `FlexLayout` seulement pour les postes desktop qui ont un vrai besoin de docking/reorganisation.
- **Tablette** : variante guidee, peu configurable, gros points de contact.

### 4. Handles UI et pilotage externe (API / CLI / agent)

- **Handles** : toute zone redimensionnable ou deplacable doit avoir un controle visible et utilisable au clavier/souris/tactile la ou le mode le permet (eviter le layout "fantome" sans affordance).
- **API** : exposer des operations sur le **meme modele** que la config d'ecran (lire layout courant, appliquer un preset, montrer/cacher un panneau, tailles fractionnaires). Auth + RBAC obligatoires ; en **mode caisse verrouille**, desactiver ou restreindre les commandes qui cassent le poste.
- **CLI** : memes operations pour dev, scripts, tests d'integration, agents en CI (pas un second systeme de verite).
- **Agent specialise** : le contrat (JSON / OpenAPI minimal plus tard) est la frontiere : l'agent envoie des **intentions** ("appliquer preset reception-large", "focus panneau ticket") ; le **shell Recyclique** valide et applique (pas d'execution arbitraire de JS distant).

### 5. Branchements JARVOS Nano et Peintre

- **Peintre** : positionne comme **organe d'affichage** — Recyclique rend selon un flux de config / theme / zones ; la source peut rester locale puis etre **remplacee ou enrichie** par un service JARVOS (Nano) quand il existera.
- **Nano** : peut produire des propositions de layout ou de densite d'UI ; elles passent par le **meme contrat** que l'API/CLI (pas de contournement ad hoc).
- **Alignement doc existante** : FR26, stubs **LayoutConfigService** et **VisualProvider**, recherche `_bmad-output/planning-artifacts/research/technical-affichage-dynamique-peintre-extension-points-research-2026-02-25.md`. Le blueprint ci-dessus complete ces stubs avec la dimension **handles + pilotage machine**.

---

## Meilleur emplacement dans le repo

### Maintenant

Le bon emplacement pour cette note est :

- `references/artefacts/2026-03-26_01_blueprint-layout-workflow-ecrans.md`

Raison :

- artefact de cadrage/handoff
- chargeable par BMAD via `references/`
- pas encore une story d'implementation

### Ensuite dans le flux BMAD

Le contenu stabilise devra remonter dans :

- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`

Puis etre declenche en stories dans :

- `_bmad-output/implementation-artifacts/`

---

## Ou ca ira dans le code plus tard

Quand BMAD ouvrira les stories d'implementation frontend, la cible la plus propre est :

- `frontend/src/core/workflows/`
- `frontend/src/core/screens/`
- `frontend/src/core/layout/`
- `frontend/src/caisse/`
- `frontend/src/reception/`

En brownfield `recyclique-1.4.4`, l'equivalent pratique sera d'abord :

- workflow caisse autour de `frontend/src/components/business/SaleWizard.tsx`
- workflow reception autour de `frontend/src/pages/Reception/TicketForm.tsx`

---

## Decoupage BMAD recommande

### Epic 8

- Ajouter un cadrage plus explicite sur `screen definitions`, `LayoutConfigService` et variantes d'ecran.

### Nouvelles stories naturelles

1. Extraire une machine d'etats pour le workflow caisse.
2. Definir un contrat `ScreenDefinition` pour caisse/reception.
3. Brancher la variante `desktop/tablet/kiosk` sur ce contrat.
4. Evaluer ou non un layout dockable desktop pour reception.
5. Spec minimale API (et option CLI) pour layout / presets, alignee sur le contrat `ScreenDefinition`, avec garde-fous mode caisse.
6. Raccorder progressivement **LayoutConfigService** / **VisualProvider** pour une future alimentation Peintre / JARVOS Nano.

---

## Regle simple

**D'abord workflow. Ensuite config. Ensuite layout avancé.**

Si on inverse cet ordre, on risque de construire une belle coquille vide.
