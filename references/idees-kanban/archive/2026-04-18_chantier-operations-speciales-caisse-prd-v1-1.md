# Chantier opérations spéciales caisse — PRD v1.1 + exécution BMAD

---

## 2026-04-19 — Intégrée (Epic 24 livré sur branche)

**Statut :** le découpage BMAD et l’implémentation **Epic 24** sont réalisés sur la branche Git **`epic/24-operations-speciales-orchestration`** (stories `24-1` … `24-10` en **done** dans `sprint-status.yaml`, `epic-24` **done**). Le pack source `references/operations-speciales-recyclique/` reste la référence produit.

**Suite hors Kanban :** validation utilisateur, tests / CI, décision de **merge** vers `master` (non effectué au 2026-04-19).

**Fiche Kanban :** passage à **archive** — la trace d’intention initiale (2026-04-18) est conservée ci-dessous.

---

## 2026-04-18 — Strophe + agent

Lancer le **chantier complet** décrit par le pack produit **opérations spéciales** (parcours caisse non standard, tags métier, matière, Paheko), puis enchaîner le **chemin BMAD habituel** jusqu’à des stories implémentables et livrées.

**Intention :** a-faire

### Pack source (même dossier)

| Rôle | Fichier |
|------|---------|
| **PRD v1.1** (vérité produit) | `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` |
| **Prompt ultra opérationnel** (mission agent : audit repo, priorités P0–P3, garde-fous) | `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md` |

Vue dossier : **`references/operations-speciales-recyclique/index.md`**.

### Chemin BMAD suggéré (classique)

1. **Alignement produit / architecture** si besoin : skill ou agent **architecte** (`bmad-agent-architect`) ou lecture **architecture** existante pour ne pas diverger du brownfield.
2. **Découpage** : **`bmad-create-epics-and-stories`** ou équivalent pour dériver epics/stories depuis le PRD + l’audit décrit dans le prompt (priorités P0 → P3 du prompt).
3. **Stories détaillées** : **`bmad-create-story`** pour les grosses slices ; rattachement dans **`_bmad-output/planning-artifacts/epics.md`** et **`sprint-status.yaml`** selon votre usage actuel.
4. **Implémentation** : **`bmad-dev-story`** / **`bmad-story-runner`** story par story (gates tests ciblés, CREOS Peintre si UI, OpenAPI si API).
5. **Clôture** : QA (**`bmad-agent-qa`**, **`bmad-code-review`**), puis rétrospective epic si volumineux (**`bmad-retrospective`**).

Le prompt liste explicitement les livrables intermédiaires (tables d’écart PRD vs repo, permissions, etc.) : les traiter **avant** ou **pendant** la création formelle des stories pour éviter les doublons.

### Croisements utiles

- PRD / compta caisse déjà présent : `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md`
- Pilotage global : `_bmad-output/planning-artifacts/guide-pilotage-v2.md`
