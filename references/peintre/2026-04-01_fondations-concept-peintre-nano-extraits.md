# Peintre — extraits opérationnels du concept architectural (nano)

**Date :** 2026-04-01  
**Mis à jour :** 2026-04-01 — QA : clarification **document fusionné** Phase 0 vs Phase 1+ (§5) ; pont **`cashflow`** / wizard-tabbed / sprint (§7) ; document vision §3.1 aligné.  
**Source canonique :** `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md` (concept validé backlog RecyClique V2, auteurs Strophe + co-architecte).  
**Rôle de ce fichier :** matière **extraite et restructurée** pour les sessions **cadrage / implémentation** dans `references/peintre/` — tables, conventions, phases, vocabulaire CREOS, sans remplacer le document vision (ni le PRD / l’architecture BMAD).

**Règle de divergence :** comme pour `2026-04-01_pipeline-presentation-workflow-invariants.md`, en cas d’écart avec **PRD** ou **architecture BMAD** actifs, **PRD / architecture font foi** ; mettre à jour cet extrait.

---

## 1. Lecture d’ensemble : complète, approfondit, formalise

Le concept vision **ne contredit pas** le pipeline consolidé : il **donne la grammaire** (Influx CREOS, `ModuleManifest`, slots, widgets, flows, shortcuts, `PageTemplate`, zone roles, meta-props) que les artefacts BMAD **projettent** en `NavigationManifest` / `PageManifest` et schémas `contracts/creos/`. Le pipeline document **formalise** le cycle **validé → rendu** et les invariants sécurité / contexte ; le concept vision **formalise** la forme des manifests et la trajectoire **Phase 0 → SDUI**.

---

## 2. Identité triple et échelles

**Peintre_nano fournit :** registre de modules, **slots** (points d’extension nommés), **catalogue de widgets** (type stable + `props_schema` sérialisable).

| Échelle | Rôle | Transport (concept vision) |
|--------|------|----------------------------|
| **Nano** | Composition déclarative + config humaine ; pas d’IA compositeur | CREOS **documentaire** (fichiers JSON) |
| **Mini** | Couche agent (Peintre_mini), gate sur actions sensibles | Bus CREOS Redis |
| **Macro** | Adaptation contextuelle riche, studio, LeFil | Bus CREOS RabbitMQ |

**Principe :** à l’échelle nano, le manifest UI est structurellement un message CREOS ; **seul le transport change**, pas la grammaire.

---

## 3. Influx CREOS et enveloppe `ModuleManifest`

Un fichier manifest module est un **Influx** avec les cinq dimensions ; l’**objet** porteur est typiquement `ModuleManifest` ; `rule` peut porter `ModulePermissions` ; `state` peut porter le statut du module (`ACTIVE`, etc.). Le détail JSON complet est dans le document vision §2.2.

**Champs utiles dans `object.data` (synthèse) :**

- `routes` — chemins + identifiant de page / composant côté shell  
- `slots` — contributions : `target`, `component`, `order`, `props_contract`, `breakpoints`, `placement` / `zone_role` optionnels  
- `widgets` — `type`, `component`, `meta_props`, `props_schema`  
- `actions` — `id`, `label`, `icon`, `target_slots`, champs optionnels (`permissions`, `confirmation`)  
- `shortcuts` — `key`, `action`, `scope`, `label`  
- `flows` — `FlowDefinition` (voir §7)

---

## 4. Vocabulaire CREOS (types Peintre) — rappel

**Objects (extraits) :** `ModuleManifest`, `SlotDefinition`, `WidgetDeclaration`, `LayoutComposition`, `PageTemplate`, `ZoneRole`, `ModuleAction`, `FlowDefinition`, `ShortcutBinding`.

**Commands (extraits) :** `ACTIVATE_MODULE`, `DEACTIVATE_MODULE`, `REGISTER_WIDGET`, `COMPOSE_LAYOUT` (futur mini), `NEXT_STEP`, `PREVIOUS_STEP`, `COMPLETE_FLOW`.

**Events (extraits) :** `ModuleActivatedEvent`, `ModuleDeactivatedEvent`, `SlotContentChangedEvent`, `StepNavigatedEvent`, `FlowCompletedEvent`.

**States (extraits) :** `ACTIVE`, `INACTIVE`, `ERROR`, `STEP:{step_id}`.

**Rules (extraits) :** `ModulePermissions`, `SlotConstraints`.

Tables complètes : document vision §2.3.

---

## 5. Mapping avec les artefacts BMAD (projection)

| Concept vision (JARVOS) | Où ça vit côté repo / BMAD |
|-------------------------|----------------------------|
| Arborescence, routes, visibilité | `NavigationManifest` (+ OpenAPI / permissions autoritatives) |
| Composition page, template, zones, widgets | `PageManifest` + registre / schémas CREOS |
| Contexte actif (site, caisse, session…) | `ContextEnvelope` |
| Document fusionné layout + arbre widgets + flows | **Phase 1+** (admin / LLM / runtime) : **un** document **validé** tel que décrit au §3 du fichier pipeline. **Phase 0** : pas de graphe de composition JSON **piloté à chaud** — l’équivalent est la résolution **build** (`PageManifest`, manifests, registre, imports TS) jusqu’au rendu, avec les **mêmes** schémas / vocabulaire en **CI** quand ils existent. |
| Personnalisation locale non métier | `UserRuntimePrefs` |

Le **pipeline** impose validation / allowlist / draft sandbox dès qu’il y a **JSON dynamique** de composition ; la **Phase 0** du concept (fichiers statiques, imports TS) est **compatible** (voir §6).

---

## 6. Phases SDUI (concept) ↔ pipeline « document validé »

| Phase (concept vision) | Contenu | Lien avec `pipeline-presentation-workflow-invariants.md` |
|------------------------|---------|----------------------------------------------------------|
| **0** | Manifests **statiques** ; slots remplis par **code / imports TS** ; **pas** de JSON dynamique de composition pour l’ossature | Les **mêmes** schémas et invariants s’appliquent au **contenu statique** (validation build, vocabulaire fermé) ; le cycle **draft → validé → rendu** du §3 pipeline concerne surtout **admin / LLM / runtime** à partir de **Phase 1+** |
| **1** | Mini-DSL JSON (ex. dashboard admin configurable) | **Document validé** + `LayoutRenderer` / `WidgetTreeRenderer` — aligné §3.0–3.1 pipeline |
| **2** | JSON généré par agent (Peintre_mini), même renderer | Source change ; **gate** actions / confirmations (Capitaine_Balance) |
| **3** | SDUI avancé (ex. DivKit mobile) | Vocabulaire widgets réutilisé ; renderer additionnel possible |

**Formulation courte :** Phase 0 = **pas de pilotage à chaud** du graphe UI par JSON externe ; Phase 1+ = le **pipeline unique** du document pipeline **s’active pleinement** pour toute composition dynamique.

---

## 7. Flows : types, CREOS, périmètre Phase 0

**Mapping concept flow → dimensions CREOS** (vision §3.1) :

| Concept | Dimension CREOS |
|---------|-----------------|
| Step courant | **State** |
| `NEXT_STEP` / `PREVIOUS_STEP` | **Command** |
| Transition | **Event** (ex. `StepNavigatedEvent`) |
| Définition JSON du flow | **Object** (`FlowDefinition`) |
| Gardes | **Rule** |

**Types de flows prévus :**

| Type | Usage | Phase 0 (vision) |
|------|--------|------------------|
| `wizard` | Séquence linéaire | **Implémenté** |
| `tabbed` | Onglets | **Implémenté** |
| `cashflow` | Caisse, raccourcis clavier | **Priorité métier** V2 (épiques caisse / réception) ; voir **pont** ci-dessous |
| `decision` | Branchements | Phase 2–3 |

**Caisse (`cashflow`) et « seuls wizard / tabbed en Phase 0 » (vision) :** pas de contradiction avec les **jalons sprint** (pipeline §12) si l’on tranche **explicitement** en story ou **ADR courte** : **(a)** parcours caisse / réception modélisé d’abord comme `wizard` ou `tabbed` + raccourcis / `FlowRenderer` (même `FlowDefinition`, comportement clavier riche) ; **(b)** ou extension **précoce** du runtime pour `type: "cashflow"` comme variante dédiée (toujours **un** pipeline de validation et de commandes). Les deux options restent conformes au principe **un seul** chemin de rendu (pas de second pipeline ad hoc).

**Principe non négociable :** un futur éditeur nodal **ne contient pas** la logique runtime — il produit / modifie des `FlowDefinition` JSON ; le runtime les exécute (même séparation qu’agent vs moteur).

---

## 8. Actions, slots, widgets — distinction

- **Contribution slot :** un composant **à un** emplacement (`target`).  
- **Widget :** type stable + `props_schema` ; instanciable code, manifest, ou futur JSON agent.  
- **Action :** déclencheur (`id`) pouvant apparaître dans **plusieurs** `target_slots` ; filtrage permissions côté runtime.

Champ **`confirmation`** (optionnel, défaut `false`) : prépare la gate sensible (mini).

---

## 9. Raccourcis

Déclaration : `key`, `action`, `scope` (`global`, ou scope page ex. `members.page`), `label`.  
**Résolution conflit (vision + décision P13) :** priorité par **scope** (page > global). Phase 2 : reconfig admin / suggestions agent.

---

## 10. Meta-props widgets (grille / agent futur)

| Meta-prop | Rôle |
|-----------|------|
| `default_span` | `{ col, row }` taille par défaut grille |
| `min_span` / `max_span` | Limites (documentation → contraintes optimiseur) |
| `prominence` | `high` / `normal` / `secondary` |
| `density` | `low` / `medium` / `high` |
| `variants` | ex. `compact`, `regular`, `expanded` |
| `default_variant` | défaut `regular` si variants |

Phase 0 : classes / placement par défaut ; Phase 2–3 : agent + container queries.

---

## 11. Zone roles (sémantique)

| Zone role | Rôle |
|-----------|------|
| `primary-hotspot` | Attention maximale |
| `secondary-hotspot` | Deuxième niveau |
| `scan-column` | Scan vertical |
| `footer-band` | Fermeture / CTA |
| `content-flow` | Contenu principal séquentiel |

Phase 0 : **annotation optionnelle** (ex. dans `placement`) ; le shell peut ignorer — documentation + préparation Peintre_mini.

---

## 12. `PageTemplate` (objet CREOS)

Définit : `semantic_type`, `reading_pattern` (F/Z), `grid` (desktop/mobile, `areas`, colonnes, gutters), `zone_mapping` (role → nom de zone grille), `slots_activated`.  
Exemple JSON complet : vision §3.2. Phase 0 : 2–3 templates codés (ex. `desktop-admin`, `mobile-field`) ; JSON cible Phase 1–2.

---

## 13. `SlotContext` et `onInteraction` (convention)

Le **Slot** peut transmettre : `variant` active, et `onInteraction?: (event: { widget_type, action, metadata? }) => void`.  
Phase 0 : **noop** acceptable ; types d’interactions documentés : `view`, `click`, `task_complete`, `dismiss`.

---

## 14. Conventions de nommage

| Élément | Pattern | Exemples |
|---------|-----------|----------|
| Slots | `{scope}.{zone}.{position}` | `shell.nav.sidebar`, `members.page.header` |
| Widgets | `{domaine}.{entité}.{variante}` | `member.summary.card` |
| Modules | `{application}.{domaine}` | `recyclique.membership` |

---

## 15. Slots structurants RecyClique V2 (premier jet vision)

| Slot | Contexte typique |
|------|------------------|
| `shell.nav.sidebar` | `active_route`, `user_role` |
| `shell.nav.topbar` | `user`, `site_id` |
| `shell.nav.bottom` | `active_route`, `user_role` |
| `shell.toolbar.actions` | `current_page`, `selection` |
| `shell.dashboard.cards` | `period`, `site_id` |
| `shell.dashboard.charts` | `period`, `site_id` |
| `shell.main.content` | `route_params` |
| `shell.footer.status` | `sync_state` |
| `shell.bandeau.live` | `display_mode` |
| `shell.superadmin.modules` | `admin_context` |

À affiner avec BMAD / contrat navigation ; aligner avec epic bandeau / super-admin.

---

## 16. Templates de layout sémantiques (vision §4.2)

| Id concept | Type sémantique | Pattern | Usage |
|------------|-----------------|---------|--------|
| `desktop-admin` | `backoffice` | F | Back-office classique |
| `desktop-dashboard` | `dashboard` | F | Stats / cartes |
| `mobile-field` | `mobile` | Z | Terrain |
| `tablet-pos` | `pos` | grille | Caisse tactile |
| `display-public` | `display` | Z | Affichage magasin |

---

## 17. Layout global vs interne widget ; DSL vs CSS

- **Global :** CSS Grid (zones, template), DSL / `PageTemplate` — le widget ne choisit pas sa place sur la page.  
- **Interne widget :** Flex / grid local libre.  
- **DSL :** parle en **concepts** (colonnes, spans, zones, prominence, density, variants) — **pas** en classes CSS brutes ; la peau (Tailwind, modules, etc.) est interchangeable.

**Anticipations sans obligation Phase 0 :** container queries, subgrid — l’architecture ne doit pas les bloquer (conditions rappelées dans le document vision).

---

## 18. Cross-compatibilité cartouches

Toute cartouche avec UI projette via **les mêmes** manifests Peintre ; templates différents (web vs mobile).  
**Fusion future** possible manifest cartouche cognitif + section `ui` (YAML) — vision §4.3 ; Phase 1 RecyClique : section `ui` seule d’abord.

---

## 19. Poignées Peintre_mini (handles)

- `WidgetCatalog` + `props_schema`  
- Slots nommés  
- `FlowDefinitions`  
- Futur `LayoutComposition` (arbre JSON widgets)

---

## 20. Piral (compatibilité ascendante)

Concepts alignés pilets / extension slots ; `Slot` ≈ extension slot Piral ; `ModuleRegistry` pourrait s’appuyer sur un feed Piral **sans changer l’API module** si les slots restent découplés du détail React.

---

## 21. Roadmap implémentation (condensé vision §6)

- **Phase 0 :** package `peintre-nano`, `ModuleRegistry`, `<Slot>`, `<FlowRenderer>`, raccourcis, types TS ; 2–3 manifests RecyClique ; shell minimal ; au moins un flow (caisse ou inscription).  
- **Phase 1 :** JSON Schema manifest ; doc slots ; vocabulaire widgets initial ; panel super-admin modules.  
- **Phase 2 :** mini-DSL dashboard, renderer générique JSON, prototype éditeur nodal, évaluation XState.  
- **Phase 3 :** bus / API agent, gate, expérimentation DivKit.

Calendrier **semaines** du document vision = indicatif ; **exécution** : `sprint-status.yaml` + epics.

---

## 22. Décisions ouvertes P1–P13 (checklist)

Référence rapide — détail options / recommandations : vision §7.

| # | Sujet |
|---|--------|
| P1 | Framework CSS widgets |
| P2 | Stockage config admin |
| P3 | Granularité des slots |
| P4 | Lazy load vs bundle |
| P5 | Versioning manifests |
| P6 | Partage widgets inter-apps |
| P7 | Fusion manifest cartouche + UI |
| P8 | Colonnes grille (ex. 12) |
| P9 | Forme zone roles |
| P10 | Métriques d’interaction |
| P11 | Variants (props vs container queries) |
| P12 | État flows (local vs XState) |
| P13 | Conflits raccourcis |

---

## 23. Frameworks étudiés (rappel)

Piral (patron), Open edX FPF (slots), DivKit (Phase 3 SDUI), Module Federation (option), CSS Grid (substrat), Material grid (inspiration), React Flow (éditeur nodal cible), XState (option flows complexes). Détail : vision §8.

---

## 24. Références croisées

- **Concept complet :** `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md`  
- **Pipeline + invariants :** `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md`  
- **PRD / architecture / sprint :** mêmes entrées que le fichier pipeline §14

---

*Extrait opérationnel pour le dossier peintre — 2026-04-01.*
