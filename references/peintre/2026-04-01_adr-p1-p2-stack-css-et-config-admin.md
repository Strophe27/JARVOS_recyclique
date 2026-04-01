# ADR — Fermeture P1 (stack CSS / styling) et P2 (stockage config admin)

**Date :** 2026-04-01  
**Statut :** **ACCEPTÉE** — décision finale  
**Auteurs :** Strophe (architecte), Claude Opus (co-architecte)  
**Contexte :** Décision ouverte P1 (`peintre-nano-concept-architectural.md` §7) et P2 (idem) — bloquantes pour démarrer Phase 0  
**Sources de la décision :**  
- Recherche Perplexity Pro : `references/recherche/2026-03-31_peintre-nano-p1-stack-css-styling_perplexity_reponse.md`  
- Concept architectural : `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md`  
- Pipeline invariants : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md`  
- Décision directrice v2 : `references/vision-projet/2026-03-31_decision-directrice-v2.md`  
- Session co-architecte Claude Opus 2026-04-01

---

## P1 — Stack CSS / styling pour Peintre_nano

### Décision

**CSS Modules + design tokens (CSS variables) + Mantine v8 comme bibliothèque de composants.**

Pas de Tailwind. Pas d'Emotion / styled-components. Pas de fichier utilitaires global.

### Formulation exacte

> Adopter **CSS Modules** pour le scoping de **tous** les composants (shell + widgets). Définir les **design tokens** en **CSS variables** dans un fichier `tokens.css` unique, source de vérité visuelle du projet. Utiliser **Mantine v8** comme bibliothèque de composants riches (tables, modales, forms, datepickers), consommée par le catalogue Peintre au même titre que les widgets maison — mais **sans** dépendre de Mantine pour le cœur de la composition. Aucun CSS-in-JS runtime. Aucun framework utility-first. Aucun fichier utilitaires global.

### Implications concrètes

#### Shell & layout global

- Grille globale CSS Grid + zones nommées dans des fichiers `.module.css` ou `.css` dédiés au shell.
- Tokens de design (couleurs, spacing, radius, typo) exposés en CSS variables dans `tokens.css`.
- Le `LayoutRenderer` traduit le DSL sémantique (template, colonnes, spans, zones, densité, proéminence) vers CSS Grid **en consommant les tokens** — pas de valeurs en dur.

#### Widgets Peintre_nano

- Chaque type de widget = un composant React + un fichier `.module.css`.
- Le `.module.css` ne contient **que** le layout interne et les états visuels du widget.
- Aucune logique de placement sur la page (réservée au grid global via le DSL).
- Spacing, couleurs, radius : toujours via `var(--token-name)`, jamais de valeurs magiques.

#### Mantine v8

- Consommé comme **bibliothèque de composants** pour accélérer le recodage des écrans classiques (inputs complexes, modales, tables, datepickers).
- Vu par le `ModuleRegistry` / catalogue comme une **source de widgets intégrables** — au même niveau que les widgets maison.
- Le DSL Peintre ne parle **jamais** Mantine (pas de `MantineProvider` dans les manifests, pas de `sx` ou `styles` API dans les props CREOS).
- Theming Mantine aligné sur les mêmes design tokens (`tokens.css`) pour cohérence visuelle.

#### Ce qui est interdit

| Interdit | Motif |
|----------|-------|
| Tailwind CSS (framework complet) | Couplage classes ↔ JSX, tentation de couler des classes dans le JSON DSL, paradigme incompatible avec CSS Modules scopé |
| Emotion / styled-components | Runtime overhead inutile, Mantine elle-même les déconseille pour les nouveaux projets, incompatible trajectoire SSR/RSC |
| Fichier `utilities.css` global | Grandit silencieusement, recrée un mini-Tailwind non documenté, vit en dehors du scoping CSS Modules, dette rampante |
| Valeurs CSS en dur dans les composants | Casse le theming, empêche le pilotage futur par Peintre_mini (density, prominence) |

### Alternatives évaluées et rejetées

| Alternative | Motif du rejet |
|-------------|----------------|
| **Tailwind comme socle** | Couplage fort au framework ; le DSL deviendrait dépendant de classes Tailwind ; migration brownfield lourde (deux paradigmes en parallèle) ; la petite équipe devrait maîtriser deux mondes. Bon pour le prototypage rapide, mauvais pour un moteur SDUI dont le JSON doit rester abstrait. |
| **CSS-in-JS runtime (Emotion, styled)** | Overhead runtime injustifié ; Mantine v8 elle-même migre vers CSS Modules ; complexité SSR/RSC croissante ; API `sx`/`styled` difficilement sérialisable en JSON pour la trajectoire SDUI. |
| **Mantine-only (tout dans Mantine)** | Mantine couvre les composants, pas la composition. Le shell, les slots, le registre, le FlowRenderer ont besoin de styles propres découplés de toute bibliothèque tierce. Enfermer Peintre_nano dans Mantine bloquerait l'évolutivité et la fractalité nano → mini → macro. |
| **Tailwind ciblé (Plan B Perplexity)** | Évalué sérieusement. Le garde-fou "DSL indépendant de Tailwind" est faisable mais exige une discipline permanente. Pour une petite équipe sans revue de code systématique, le risque de fuite de classes Tailwind dans les manifests ou props est réel. CSS Modules + tokens offrent le même résultat sans ce risque. |
| **Fichier utilitaires global** | Évalué comme compromis de confort (20-30 classes `gap-4`, `flex-row`, `p-2`). Rejeté : grandit inévitablement, vit hors scoping, recrée la dette qu'on veut éviter. Les design tokens **sont** les utilitaires — `gap: var(--space-4)` remplace `className="gap-4"` avec trois caractères de plus et zéro dette. |

### Trajectoire SDUI / agent

Ce choix **facilite** la trajectoire Peintre_mini / macro :

- Le JSON DSL décrit `type`, `props`, `span`, `density`, `prominence` — jamais de classes CSS.
- Le composant React sait se styler via son `.module.css` + tokens.
- L'agent (Peintre_mini) n'a jamais besoin de connaître le CSS.
- Les tokens exposent des paramètres exploitables pour l'optimisation future (A/B, bandits, RL sur les paramètres du DSL, pas sur le CSS brut).
- Le passage de `density: "compact"` à un changement de tokens injectés est naturel, sans refactoring.

---

## P2 — Stockage de la configuration admin (modules actifs, surcharges)

### Décision

**PostgreSQL** (déjà en stack RecyClique).

### Formulation exacte

> La configuration admin (modules actifs/inactifs, ordre de blocs, variantes simples, feature toggles) est stockée en **PostgreSQL**, dans une table dédiée avec structure `key/value` typée ou modèle simple adapté. Pas de fichier JSON sur disque en production. Pas de variables d'environnement pour de la config dynamique. Les valeurs par défaut restent dans les manifests CREOS (fichiers build) ; la table PostgreSQL ne porte que les **surcharges** admin.

### Motif

- PostgreSQL est déjà en stack, pas de dépendance nouvelle.
- Permet le multi-sites / multi-caisses sans fichiers partagés.
- Traçabilité (auteur, date, motif) exigée par la Décision Directrice — une table SQL le supporte naturellement.
- Cohérent avec le modèle "manifests build = source primaire, surcharges runtime = fusionnées avec précédence" du pipeline §10.

---

## Impact sur les documents existants

Cette ADR **ne modifie aucun document existant**. Les documents datés du 31 mars et 1er avril mentionnent P1 et P2 comme "ouvertes" — cette ADR les ferme. La chaîne de traçabilité est :

```
concept §7 (P1, P2 ouvertes)
  → recherche Perplexity (analyse)
    → session co-architecte 2026-04-01 (décision)
      → cette ADR (fermeture formelle)
```

Les artefacts BMAD (architecture, epics, stories) doivent **intégrer** ces choix quand ils sont créés ou mis à jour — pas besoin de retoucher les documents de cadrage amont.

---

## Statut des autres décisions ouvertes

| # | Sujet | Statut |
|---|-------|--------|
| **P1** | Framework CSS widgets | **FERMÉE** (cette ADR) |
| **P2** | Stockage config admin | **FERMÉE** (cette ADR) |
| P3 | Granularité des slots | Ouverte — trancher en Phase 0 sprint |
| P4 | Lazy load vs bundle | Ouverte — trancher en Phase 0 sprint |
| P5 | Versioning manifests | Ouverte — Phase 1 |
| P6 | Partage widgets inter-apps | Ouverte — Phase 2+ |
| P7 | Fusion manifest cartouche + UI | Ouverte — Phase 2+ |
| P8 | Colonnes grille (ex. 12) | Ouverte — Phase 0 sprint |
| P9 | Forme zone roles | Ouverte — Phase 1 |
| P10 | Métriques d'interaction | Ouverte — Phase 2+ |
| P11 | Variants (props vs container queries) | Ouverte — Phase 2 |
| P12 | État flows (local vs XState) | Ouverte — Phase 0-1 |
| P13 | Conflits raccourcis | Ouverte — Phase 0 sprint |

---

*ADR Peintre_nano — P1 + P2 — 2026-04-01*  
*Emplacement recommandé : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`*
