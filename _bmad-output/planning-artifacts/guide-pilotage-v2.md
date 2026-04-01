# Guide de pilotage — exécution v2

**Rôle** : document **opérationnel** pour Strophe et les agents (BMAD, PM, help). Il complète le PRD, les epics et l'architecture sans les remplacer : **source de vérité produit** = `prd.md` ; **grain fin des stories** = `implementation-artifacts/sprint-status.yaml` et fichiers story.

**Mise à jour** : cocher les cases **aux jalons** (fin d'une Convergence, clôture d'un epic majeur, gate bandeau), pas à chaque story. Si `epics.md` change (nombre ou titres d'epics), revenir aligner la section 3 de ce guide.

---

## 1. Quand charger ce document

- Pilotage **multi-chantiers** (Piste A Peintre / Piste B Recyclique).
- Agent **superviseur** ou reprise après plusieurs branches / fenêtres Cursor.
- Besoin de savoir **où ranger** un livrable (audit, schéma BDD, handoff, rapport de tests).
- Doute sur la **coexistence** de la séquence « idéale » PRD et du **parallèle** autorisé par les epics.

---

## 2. Les deux récits de rythme

| Récit | Source | Intention |
|-------|--------|-----------|
| **Préférence séquentielle** | Décision directrice v2, PRD §12 | Réduire le risque systémique : auditer données / API / Paheko, figer contrats, puis prouver le socle UI et le bandeau avant les gros flows. |
| **Exécution parallèle** | `epics.md` (Overview Piste A / B), `project-structure-boundaries.md` | Piste A peut avancer avec **mocks** ; Piste B produit OpenAPI, `ContextEnvelope`, sync — **Convergence 1** (types + hooks réels), **2** (bandeau live bout en bout), **3** (flows critiques + `data_contract`). |

**Règle d'or** : le parallèle est sain tant que la **Piste B** livre des morceaux de **contrat reviewables** qui **ancrent** la Piste A (pas de mocks qui dérivent sans OpenAPI / enveloppe de contexte).

**Question hebdo** : *Le rail B a-t-il produit cette semaine un artefact contractuel qui contraint ou valide ce que fait le rail A ?*

---

## 3. Jalons — cases à cocher

**Synchronisation avec `sprint-status.yaml` :** le détail **story par story** vit dans `implementation-artifacts/sprint-status.yaml`. Ci-dessous : **jalons** ; les cocher quand le critère est **objectivement** rempli (livrable reviewable ou gate franchi).

### Convergences

- [ ] **Convergence 1** — Types / client depuis OpenAPI + hooks réels (plus seulement mocks pour les slices concernés) ; `ContextEnvelope` aligné serveur / UI.
- [ ] **Convergence 2** — **Bandeau live** : chaîne complète backend → contrat → manifest CREOS → registre Peintre → slot → rendu → fallback (gate décision directrice).
- [ ] **Convergence 3** — Flows **cashflow** et **réception** avec données réelles, `data_contract` / `DATA_STALE` ou équivalents ou règles PRD §10.

### Epics 1 à 10 (titres de référence — alignés sur `epics.md`)

- [ ] **Epic 1** — Prérequis structurants, modèle multi-contextes, gouvernance OpenAPI/CREOS (jalon FR73 / schémas minimaux selon epics).
- [ ] **Epic 2** — Socle backend brownfield v2 (auth, contexte, permissions, persistance, signaux bandeau).
- [ ] **Epic 3** — Socle Peintre_nano (shell, slots, validation CREOS, mocks permis avant C1).
- [ ] **Epic 4** — Preuve chaîne modulaire **bandeau live**.
- [ ] **Epic 5** — Shell, dashboard, admin transverses dans Peintre.
- [ ] **Epic 6** — Caisse v2 exploitable.
- [ ] **Epic 7** — Réception v2 exploitable.
- [ ] **Epic 8** — Articulation comptable réelle Paheko.
- [ ] **Epic 9** — Modules complémentaires (éco-organismes, adhérents, HelloAsso, config admin simple).
- [ ] **Epic 10** — Industrialisation, CI, déployabilité, gates de sortie.

---

## 4. Cartographie documentaire — où ça vit

**Règle** : décrire ici les **emplacements canoniques**. Mettre à jour les **index** des dossiers `references/*` **uniquement** lorsque tu **ajoutes** un nouveau fichier dans ce dossier (convention projet — voir `references/INSTRUCTIONS-PROJET.md`).

| Type de livrable | Emplacement canonique | Index |
|------------------|----------------------|--------|
| Audits / journaux brownfield **1.4.4** | `references/consolidation-1.4.5/` | `references/consolidation-1.4.5/index.md` |
| Schémas / notes BDD (non sensibles) | `references/dumps/` (`schema-*.md`) | Résumé dans `references/index.md` |
| Décisions courtes, handoffs agents | `references/artefacts/` (`YYYY-MM-DD_NN_…`) | `references/artefacts/index.md` **obligatoire à chaque nouvel artefact** |
| Recherche externe | `references/recherche/` | `references/recherche/index.md` à l'ajout |
| Interop Paheko / éco-organismes | `references/migration-paeco/`, `references/paheko/` | Index de chaque dossier |
| PRD, archi, epics, readiness, **ce guide** | `_bmad-output/planning-artifacts/` | `_bmad-output/README.md` ; archi : `planning-artifacts/architecture/index.md` |
| Stories / sprint | `_bmad-output/implementation-artifacts/` | `sprint-status.yaml` |
| **Tests (code)** | `recyclique-1.4.4/`, futur `recyclique/`, `peintre-nano/` | — |
| **Rapports / stratégie de tests** (synthèse, pas le code) | Existant 1.4.4 : logique **consolidation** ; **v2 transversal** : fichiers datés dans `references/artefacts/` par défaut | **Dès le premier** rapport / stratégie test v2 : créer l'artefact **et** une entrée dans `references/artefacts/index.md` |

---

## 5. Frictions connues (rappel)

Garder en tête ; le détail produit est dans **PRD** et **epics** :

- Deux récits (séquentiel vs A/B) — ne pas ignorer l'un au profit de l'autre sans **gate** (bandeau).
- **Epic 1** très chargé : découper en livrables reviewables, éviter l'analyse infinie.
- **Gate bandeau** : ne pas élargir aux gros flows si la chaîne modulaire n'est pas prouvée.
- Discipline **OpenAPI unique** + **CREOS** dans `contracts/` — pas de double définition à la main.
- Intégrations **Paheko** / **HelloAsso** : découvertes réelles, **correct course** si l'API impose.
- **FR73** vs vélocité : fermer le **minimum** contractuel avant implémentation **large** des modules, pas la perfection absolue.

---

## 6. Prompt type — agent superviseur

Copier-coller et adapter l'epic / la branche en cours :

```text
Tu pilotes une session JARVOS Recyclique v2. Charge dans l'ordre :
1) _bmad-output/planning-artifacts/guide-pilotage-v2.md
2) references/ou-on-en-est.md
3) L'epic ou la story en cours (epics.md + sprint-status.yaml si besoin)

Règles :
- Respecter la règle d'or Piste A/B (contrat B qui ancère A).
- Ne pas déclarer un jalon coché sans livrable reviewable.
- En fin de session : mettre à jour references/ou-on-en-est.md (journal daté) ; mettre à jour les cases du guide seulement si un jalon a été franchi.
```

---

## 7. Correct course

Si un audit ou la réalité contredit le plan : arbitrer, documenter, ajuster le backlog — ne pas forcer le plan.

- Exemple de proposition documentée : [`sprint-change-proposal-2026-04-01.md`](sprint-change-proposal-2026-04-01.md)
- Workflow BMAD : skill **bmad-correct-course** ; alignement procédure habituelle du dépôt.

---

## Liens rapides

| Document | Chemin relatif (depuis ce fichier) |
|----------|-----------------------------------|
| PRD | `./prd.md` |
| Epics | `./epics.md` |
| Architecture (index) | `./architecture/index.md` |
| Sprint status | `../implementation-artifacts/sprint-status.yaml` |
| Décision directrice v2 | `../../references/vision-projet/2026-03-31_decision-directrice-v2.md` |
| Index references | `../../references/index.md` |
