# Porte d’entrée documentaire — agent BMAD vierge (brainstorming ou analyse)

**Usage :** coller ce bloc (ou joindre ces chemins) en début de session pour un agent **sans contexte**, afin d’éviter de charger tout `references/` tout en couvrant **état actuel**, **réservoir d’idées** et **recherches**.

**Règle d’or :** ne pas charger `references/` en entier — suivre l’ordre ; approfondir par index et par besoin.

---

## 1. État du projet et BMAD (obligatoire, court)

| Priorité | Fichier | Rôle |
|----------|---------|------|
| 1 | `references/index.md` | Carte des dossiers + ligne directrice post-pivot (évolution `recyclique-1.4.4`). |
| 2 | `references/ou-on-en-est.md` | Dernières décisions, bascule BMAD, raccourci chemins archivés. |
| 3 | `_bmad-output/README.md` | Où sont les sorties BMAD **actives** (vides) vs **archive** (ancien PRD/epics). |

---

## 2. Code et chantier récent (fortement recommandé)

| Fichier | Rôle |
|---------|------|
| `references/artefacts/2026-03-31_01_handoff-nettoyage-stabilisation-recyclique-1.4.4.md` | Ce qui a été stabilisé sur `recyclique-1.4.4`, limites, suites logiques. |
| `references/consolidation-1.4.5/index.md` | Puis, si besoin technique : synthèse / backlog dans le même dossier. |

**Code vivant :** racine applicative `recyclique-1.4.4/` (ne pas confondre avec `references/ancien-repo/repo/` qui sert surtout à l’analyse référentielle / clone optionnel).

---

## 3. Cartographie de `references/` (une fois par « grosse » session)

| Fichier | Rôle |
|---------|------|
| `references/artefacts/2026-03-31_02_audit-references-00-synthese-globale.md` | Vue transversale : zones, tensions narratives, idées fondamentales vs complémentaires. |
| `references/artefacts/2026-03-31_03_audit-references-01-zones-principales.md` | Détail artefacts, recherche, consolidation, migration-paeco. |
| `references/artefacts/2026-03-31_04_audit-references-02-ancien-vision-paheko-tri-racine.md` | Ancien-repo, vision, paheko, tri temporaire, Kanban, etc. |

---

## 4. Idées, TODO, backlog « hors epics »

| Fichier | Rôle |
|---------|------|
| `references/idees-kanban/index.md` | Vue des idées par stade (charger les **fiches** ciblées si une idée précise est au centre du brainstorm). |
| `references/todo.md` | To-do de réflexion / agrégation hors flux BMAD. |

**Kanban :** toute **modification** de fiches ou de l’index du Kanban → skill **idees-kanban** (ne pas éditer `idees-kanban/index.md` à la main).

---

## 5. Recherches et décisions (selon le sujet)

| Fichier | Rôle |
|---------|------|
| `references/recherche/index.md` | Liste des recherches Perplexity + **rapports BMAD** (ex. Peintre / extension points). |
| `references/recherche/2026-02-25_affichage-dynamique-peintre-extension-points_bmad_recherche.md` | **Important** si le sujet touche UI dynamique, layout, JARVOS Mini / Peintre, FR26. |
| `references/recherche/contexte-pour-recherche-externe.md` | Pour **nouvelles** recherches externes — **à mettre à jour** si la phase projet a changé (le fichier peut être partiellement obsolète). |

**Paheko / éco-organismes / matrice caisse :** `references/migration-paeco/index.md` et `references/migration-paeco/audits/index.md`.

**Vision long terme :** `references/vision-projet/index.md`.

**Design modules (TOML, EventBus, slots) :** `references/artefacts/2026-02-24_07_design-systeme-modules.md`.

---

## 6. Ce qu’il ne faut pas prendre pour la « vérité courante » sans lecture critique

- Ancien **PRD / epics / architecture** : uniquement sous `_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/` — utile comme **matière**, pas comme plan d’exécution actuel.  
- `references/ancien-repo/` : analyse **référentielle** 1.4.4 ; peut encore parler de « nouveau backend » — croiser avec `ou-on-en-est.md` et la ligne directrice incrémentale.  
- `references/temporaire-pour-tri/` : non canonique tant que non ventilé.

---

## 7. Prompt court à coller pour l’agent

```
Tu travailles sur JARVOS Recyclique. Base code : recyclique-1.4.4 (stabilisé).
Charge d’abord : references/index.md, references/ou-on-en-est.md, _bmad-output/README.md.
Puis references/artefacts/2026-03-31_01_handoff-nettoyage-stabilisation-recyclique-1.4.4.md et la synthèse d’audit references/artefacts/2026-03-31_02_audit-references-00-synthese-globale.md.
Pour les idées : references/idees-kanban/index.md et references/todo.md.
N’utilise pas l’ancien PRD archivé comme plan obligatoire ; cite-le seulement si pertinent.
Langue : français. STT : extrapoler les fautes de transcription (Recyclique, Paheko).
```

---

*Créé le 2026-03-31 ; compléter au fil des nouveaux artefacts majeurs.*
