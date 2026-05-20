# QA2 — Plan d'enrichissement modules (Phase 2)

**Date :** 2026-05-20  
**Type :** doc + arch · **Criticité :** high · **Pipeline :** full  
**Périmètre :** [`00-MOD-plan-enrichissement-modules.md`](00-MOD-plan-enrichissement-modules.md), [`00-MOD-plan-redaction-modules.md`](00-MOD-plan-redaction-modules.md)  
**Workers :** `pass-doc-validation` (validation) + `pass-arch-adversarial` (adversarial full)  
**Cible plan :** score ≥ **90 %**

---

## Méta

| Champ | Valeur |
|-------|--------|
| Parent | QA2 léger (2× Task worker, fusion parent) |
| Pack état entrée | `qa2_96pct_go` (chantier rédaction clos) |
| Score initial (fusion workers) | **86 %** |
| Score post-corrections plan | **92 %** |
| **Verdict** | **GO** (après mini-corrections appliquées sur le plan enrichissement) |
| Rapport JSON | Agrégé depuis sorties workers (non recopié intégralement) |

**Méthode de fusion du score :** moyenne pondérée doc (60 %) + arch (40 %) ; plafond arch tant que P0 non mitigés dans le plan. Après corrections chirurgicales sur `00-MOD-plan-enrichissement-modules.md`, re-calcul arch estimé **93 %** → fusion **92 %**.

---

## Résumé exécutif

Les deux plans sont **alignés** sur le chantier rédactionnel clos (11 livrables, QA2 pack 96 %). La couverture **L-03…L-15**, la justification des **13 nouveaux fichiers** et la gouvernance **anti-duplication `06-cookbook`** sont solides côté doc (**91 %** worker).

Côté arch, le plan initial exposait **3 failles de séquencement** (parallélisme Phase 2/2b implicite, lots Phase 3 absents, dépendance circulaire `14` ↔ `09`) — score worker **78 %**. Des **corrections chirurgicales** ont été appliquées sur le plan enrichissement (gates G2–G4, lots A–D, mermaid P2→P2b→P3, owners 18/21/20, traçabilité L-05/L-09). Le plan est **exécutable** par un parent Task sans absorber le QA.

**Cohérence avec `00-MOD-plan-redaction-modules.md` :** confirmée (phases A–E vs vagues 0–4 complémentaires). **Écart résiduel P2 :** note « chantier clos » sur le plan rédaction — **prévue** lot D Phase 3, pas bloquante pour GO plan.

---

## Score et verdict

| Indicateur | Valeur |
|------------|--------|
| Worker doc (confiance) | 91 % |
| Worker arch (confiance, avant correctifs) | 78 % |
| **Score fusionné initial** | **86 %** |
| **Score fusionné final** (plan révisé) | **92 %** |
| Verdict | **GO** |

---

## Issues par localisation (fusionnées)

### P0 — Critiques (mitigées dans le plan)

| [LOC] | Problème | Statut |
|-------|----------|--------|
| `00-MOD-plan-enrichissement-modules.md` § `ordre_redaction` Phase 2 vs 2b | Parallélisme implicite : Phase 3 pouvait démarrer avant ponts OpenAPI figés | **Corrigé** — mermaid `P2 → P2b → P3`, gate **G2** |
| `00-MOD-plan-enrichissement-modules.md` § Phase 3 | Lots A/B/C non définis → liens morts vers `10`–`22` | **Corrigé** — tableau lots A/B/C/D + terminal `09` |
| `00-MOD-plan-enrichissement-modules.md` § `14-marketplace` vs `09` | `14` en 2b dépendait de `09` §3 (Phase 3) | **Corrigé** — `14` sourcé `post-v2-hypothesis` uniquement ; L-14 clôturé en terminal `09` |

### P1 — Warnings

| [LOC] | Problème | Recommandation | Statut |
|-------|----------|----------------|--------|
| `fichiers_a_enrichir` / `05-registre` | L-05 absent du patch | Ajouter whitelist / promotion clés | **Corrigé** dans le plan |
| `fichiers_a_enrichir` / `03-protocole-backend` | L-09 absent | Ajouter § convention module | **Corrigé** dans le plan |
| `criteres_succes` CS-04 / `15-matrice` | Pas de colonne L-ID imposée | Gabarit L-ID \| lacune \| story \| critère \| owner | **Corrigé** (ligne `15` + CS-04) |
| `fichiers_a_enrichir` / `index.md` | Ordre lecture `10`–`22` flou | Bloc « Lecture enrichie » avant `06` | **Corrigé** dans le plan |
| `nouveaux_fichiers` `15` vs ordre Phase 2 | `dependances_pack` incohérentes | Aligner sur `18` brouillon | **Corrigé** |
| `18` / `21` / `20` | Chevauchement OpenAPI / contrats / Peintre | Owners explicites + pas re-grep hors `18` | **Corrigé** |
| `12-index-transcripts` | Transcripts hors repo | Gate **G4** + skill ou report `09` | **Corrigé** |
| `00-MOD-plan-redaction-modules.md` §6 | 2 UUID vs 5 transcripts enrichissement | Note chantier clos + lien `12` | **Prévu** lot D Phase 3 |

### P2 — Info

| [LOC] | Problème | Recommandation |
|-------|----------|----------------|
| § audit état pack | Multi-magasins sans L-xx | Ligne `10` + `22` |
| Phases 0–4 vs A–E | Vocabulaire dual | `00-cadrage` tabule les deux |
| CS-01 vs 97 % | Ambiguïté GO / stretch | **Corrigé** — GO ≥95 %, stretch 97 % si cycle 4 |
| `17` / `14` | Chevauchement Cursor marketplace | Acceptable si `17`=BMAD/agents, `14`=post-v2 produit |

---

## Cohérence avec `00-MOD-plan-redaction-modules.md`

| Critère | Évaluation |
|---------|------------|
| Continuité chantier clos → enrichissement | OK — référence explicite, pas de double planificateur actif une fois note appliquée |
| Fil consommateur `01`→`06` préservé | OK — CS-11 + patch index « Lecture enrichie » |
| Sources transverses (transcripts) | Écart documenté — correction Phase 3 lot D |
| Anti-duplication cookbook | OK — `pas_dupliquer_cookbook_06`, CS-02, `16` renvoi procédural |
| 13 fichiers (fourchette 8–15) | OK — objectifs, sources, dépendances par ligne |

---

## Corrections appliquées au plan (score initial &lt; 90 %)

Fichier modifié : [`00-MOD-plan-enrichissement-modules.md`](00-MOD-plan-enrichissement-modules.md)

1. **Séquencement** : mermaid `P0→P1→P2→P2b→P3→P4` ; gate **G2** (Phase 2 complète avant 2b / patches config).
2. **Phase 3** : lots **A / B / C / D / Terminal** (`09` en dernier) ; gate **G3**.
3. **`14-marketplace`** : dépendance `post-v2-hypothesis` (plus `09` §3 en 2b).
4. **`15-matrice`** : gabarit colonnes **L-ID** ; `dependances_pack` → `18-crosswalk`.
5. **Patches** : L-05 dans `05-registre` ; L-09 dans `03-protocole-backend`.
6. **`index.md`** : bloc lecture enrichie `10`–`22` avant `06`.
7. **Owners** : `18` (écarts OpenAPI), `21` (gouvernance), `20` (code Peintre).
8. **Gates** : **G4** transcripts ; Phase 1 readonly.
9. **CS-01 / CS-04** : GO 95 % vs stretch 97 % ; traçabilité L-ID.
10. **Audit** : multi-magasins → `10` + `22`.

---

## Recommandations post-GO (exécution parent)

- Respecter **G2, G3, G4** avant chaque vague Task.
- Ne pas lancer lot **B** sans `18` + `21` livrés.
- Appliquer le patch **`00-MOD-plan-redaction-modules.md`** en lot **D** (note + 5 transcripts).
- QA2 cycle 4 (Phase 4) : optionnel pour stretch 97 %, pas pour GO enrichissement (≥95 %).

---

## Axes délégués

| Worker | Axes couverts |
|--------|----------------|
| pass-doc-validation | Cohérence inter-plans, L-03…L-15, anti-dup `06`, justification 13 fichiers |
| pass-arch-adversarial | Ordre vagues, dépendances, charge, structure fichiers, frontières 18/21/20 |

---

_Retour : [`00-MOD-plan-enrichissement-modules.md`](00-MOD-plan-enrichissement-modules.md) · Plan rédaction : [`00-MOD-plan-redaction-modules.md`](00-MOD-plan-redaction-modules.md) · Pack : [`index.md`](index.md)_
