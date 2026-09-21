---
workflow: bmad-correct-course
date: 2026-09-21
project: JARVOS_recyclique
approval: hitl
approved_by: jarvos.01 (D1 — levée partielle L0–L2 ; délégation évidence process 2026-09-21)
scope_classification: moderate
supersedes_process_rule: sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md (gel exécution — règle process uniquement, fichier historique inchangé)
proposition_store: correct-course-v2 (QA3 PASS 96)
---

# Sprint Change Proposal — recadrage plancher Option C (L0 / L1 / L2)

**Date :** 2026-09-21  
**Statut :** **Approuvé pour pilotage** (D1 tranchée — levée partielle du gel avril 2026).  
**Ne remplace pas :** [`sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`](./sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md) (historique gel Epic 25 / socle vision) — ce fichier **2026-09-21** fixe la **règle de process** courante après exécution **Option C** (mai 2026).

---

## 1. Synthèse / déclencheur

**Constat :** après le gel d’avril 2026, le dépôt a livré le **plancher Option C** (story **9.6**, **9.10**, epics **25–26** **done** au YAML `last_updated` racine **2026-05-30**) sans amendement formel du gel. Les agents qui lisent le PRD (encart gel) ou le guide pilotage (**2026-04-23**) entrent en contradiction avec `sprint-status.yaml`.

**Décision :** **levée partielle** du gel d’exécution BMAD ; remplacement de la règle « hors stories 25-* » par **trois niveaux L0 / L1 / L2**. **Aucun rollback** des statuts **done** ni du code livré.

---

## 2. Règle de process (remplace le gel 2026-04-19 pour `bmad-dev-story`)

### Niveau L0 — Socle / plancher (couches A + B + C minimal)

**Autorisé** sans décision PO supplémentaire :

- Maintenance et correctifs sur le **plancher** déjà livré (Peintre 3–7, 11, 13–15 ; Paheko 8, 22–23, 25 ; infra **9.6** ; liaison clôture **9.10**).
- **EC prod (9.10)** : retour métier compta (ex. courrier Corinne/Caro) = **gate terrain / reprise L0** si écarts — **n’annule pas** le `done` YAML ni la livraison technique v1 ; ajustements = maintenance ou stories ciblées.
- Préparation et exécution **C2b** terrain (gate tag **`v2.0.0`** / **G-plancher** — **interdit** de taguer avant C2b validé).
- Epic **10** (gates ship : **10.1–10.8**) en **L0** si PO valide la priorité ship.
- Correctifs parité **13.8** ou maintenance L0 si PO ouvre la story.

### Niveau L1 — Modules métier (couche D)

- **Une story module D à la fois** après journal PO + `bmad-create-story` dédiée.
- **Pas de parallélisme** entre modules **D** (éco-org **9.1**, adhérents **9.3**, HelloAsso **9.4–9.5**, **9.8**, etc.).
- **`bmad-dev-story`** sur périmètre **D** : **après D1**, **après** priorité ship Epic **10.1–10.3** (L0), **et** module tranché (**D2/D7**).
- **`bmad-create-story` / `bmad-dev-story`** : périmètre **L0** = stories plancher / Epic 10 gates / maintenance ; **L1** = fichier story module **D** dédié après journal PO ; **L2** = pas de dev prod (spikes ADR seulement).

### Niveau L2 — Vision long terme (couche F)

- PWA Epic **27**, P3–P13 Peintre, T-PEINT-1, marketplace : **spikes / ADR uniquement** ; pas de `bmad-dev-story` prod sans readiness explicite.

### Lecture des epics 25–26 **done**

Interprétation **process** : clôture du fil « socle alignement + qualité API » du sprint-change **2026-04-19**, **pas** autorisation implicite de tout le backlog.

---

## 3. Livrables post-gel reconnus (fait historique — pas de retcon YAML)

| Élément | Statut documenté |
|---------|------------------|
| Story **9.6** (config admin modules) | **done** |
| Story **9.10** (liaison Paheko clôture caisse v1) | **done** |
| Epics **25**, **26** | **done** |
| Option C / plancher | Journal [`references/ou-on-en-est.md`](../../references/ou-on-en-est.md) (2026-05-26) |

Le fichier **`sprint-status.yaml`** reste la **preuve historique** des statuts ; la levée partielle ne modifie **pas** les clés `development_status` **done**.

---

## 4. Gates release (inchangées par D1 seul)

| Gate | Définition |
|------|------------|
| **G-plancher** | Release **2.0.x** + **C2b** terrain → tag **`v2.0.0`** autorisé **uniquement** après C2b (Coordinateur + PO). |
| **G-vendable** | **PRD §13.2** inchangé comme objectif **ultérieur** (couches **A–D** complètes, dont modules métier **D**). |

**Interdit :** annoncer **v2 vendable** ou tag **`v2.0.0`** sans **C2b** ; lancer **C2b** dans cette délégation.

---

## 5. Ordre de chargement agent (post-D1)

1. `_bmad-output/implementation-artifacts/sprint-status.yaml` (`last_updated` **racine** + `development_status`)
2. `references/ou-on-en-est.md`
3. `_bmad-output/planning-artifacts/prd.md` (encart **Pilotage BMAD (levée partielle gel — L0/L1/L2)**)
4. `_bmad-output/planning-artifacts/guide-pilotage-v2.md` (epics **9–10** : recroiser YAML, pas guide seul)
5. `epics.md` + fichier story si besoin

---

## 6. Décisions HITL ouvertes (hors D1)

| ID | Sujet | Statut | Tranche / note |
|----|--------|--------|----------------|
| **D1** | Gel → L0/L1/L2 | **Tranché** 2026-09-21 | Publication process |
| **D2/D7** | Priorité **modules D** post-C2b | Ouvert | **Après** Epic **10.1–10.3** ; PO tranche **un** module **D** avant `bmad-create-story` |
| **D3** | HelloAsso / PRD §7.1 | Ouvert — **parking PO** | Pas de dev large ; **9.4/9.5** = doc ; cible **G-vendable** §13.2, pas plancher **L0** |
| **D4–D10** | Voir proposition store §5 | Ouvert | Grille SoT agents (ne pas confondre D9/D10 inventaire vision) |

**Livrables doc alignés sur D1 (checklist)** : PRD §12.1 pont L0/L1/L2 ; PRD §7.1 plancher vs **D** ; PRD §13 **G-plancher** ; `guide-pilotage-v2.md` ordre §5 ; ce journal [`references/ou-on-en-est.md`](../../references/ou-on-en-est.md).

**Epic 9 — classement indicatif L0 vs L1** (YAML fait foi) : **L0** — **9.6**, **9.10** (`done`) ; maintenance / correctifs liaison = **L0**. **L1** — **9.1–9.3**, **9.7+**, modules métier **D** (dont **9.8** etc.) : **une story à la fois** après **D2/D7** et tranche **10.1–10.3**.

**Miroir décisions store** : la proposition Correct Course V2 (**proposition_store: correct-course-v2**) reste la grille HITL détaillée ; les chemins canoniques de publication restent `_bmad-output/planning-artifacts/` et `references/ou-on-en-est.md` — pas de second dépôt inventé pour D1.

---

## 7. Références

| Document | Chemin |
|----------|--------|
| Gel historique (non amendé) | `./sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` |
| PRD canonique | `./prd.md` |
| Pilotage | `./guide-pilotage-v2.md` |
| État sprint | `../implementation-artifacts/sprint-status.yaml` |
| Versioning / Option C | `../../references/versioning.md`, `../../references/ou-on-en-est.md` |

---

*Publication worker évidence process — 2026-09-21.*
