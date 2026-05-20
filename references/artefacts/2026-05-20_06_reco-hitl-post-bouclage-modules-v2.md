# Recommandation HITL post-bouclage — modules v2

**Date :** 2026-05-20  
**Verdict :** **GO architecture** + **HITL Strophe complet** (cloture bouclage modules v2)

**Suite normative :** revues architecte `03` (GO sous reserves) + `04` (GO final) ; execution selon ordre P0 ci-dessous.

---

## QCM post-bouclage (8 reponses — toutes **A**)

| # | Question | Reponse | Decision retenue |
|---|----------|---------|------------------|
| 1 | ADR-007 reconciliation v0.1 / v2 | **A** | **Accept** — statut **Accepted** ; promotion BMAD apres validation (pas de re-debat v0.1) |
| 2 | Ordre d'execution chantier technique | **A** | **T-MOD-2** (ADR) → **T-MOD-3** (fusion OpenAPI) → **T-MOD-1** (convention back) → Story **9.6** ; Epic 10 parallele, non bloquant 1er module |
| 3 | **F1** — `module-config` post-fusion T-MOD-3 : API publique ou interne ? | **A** | **Interne** jusqu'a Story 9.6 (tag / stabilite contrat avant exposition multi-apps JARVOS) |
| 4 | **F3** — granularite package backend | **A** | **Strict** : **1 `module_key` = 1 package** (`recyclic_api/modules/<module_key_snake>/`) |
| 5 | **F2** — prefix `/v1` vs `/v2` pour nouveau module | **A** | Suit la **maturite du domaine hote** (pas de `/v2` par defaut systematique) |
| 6 | Promotion documentation BMAD (`_bmad-output/.../architecture/`) | **A** | **Apres** ADR-007 **Accepted** (evite double recit pendant Proposed) |
| 7 | Lancement **2e module** metier | **A** | **Apres T-MOD-3** (fusion `openapi-module-config.yaml` dans `recyclique-api.yaml` + codegen) |
| 8 | Ordre de chargement agents / sessions impl | **A** | **`05`** (loup de mer) → **`04`** (bouclage) → **`06-MOD`** (cookbook) |

---

## Rappels lot 1 (HITL 2026-05-20 — deja figes, ne pas rouvrir)

| Sujet | Tranche |
|--------|--------|
| Activation par site | **`module_key` JSON** fait foi (DEC-03) |
| Marketplace post-v2 | **Non** maintenant |
| Couche plateforme modules | **Non** v2 — registre + recette + contrats |
| Comptage pieces/billets (T-MET-1) | **Reporte** (hors bouclage architecture) |
| Centre de gravite | **CREOS** + chaine contrats (OpenAPI ↔ manifests) |

---

## Section F architecte — tranche HITL (questions 04 §F)

| ID | Question (resume) | Tranche Strophe |
|----|-------------------|-----------------|
| **F1** | Statut API `module-config` apres fusion | **Interne** jusqu'a 9.6 |
| **F2** | `/v1` vs `/v2` pour modules neufs | **Maturite domaine hote** |
| **F3** | Regroupement packages par domaine | **1 key = 1 package** (strict) |

---

## ADR-007 — tableau replacements (court)

| v0.1 | v2 retenu | Verdict |
|------|-----------|---------|
| `module.toml` | Manifests **CREOS** (`contracts/creos/manifests/`) | **Remplace** (UI) |
| `ModuleBase` + loader TOML | FastAPI par package + registre + flags `module_key` | **Remplace** |
| `config.toml` `[modules]` | JSON serveur ADR-001 + Story **9.6** | **Remplace** |
| Redis `EventBus` generique | Outbox Paheko, jobs nommes | Principe conserve, **impl. remplacee** |
| `ModuleSlot` monorepo | Peintre_nano + CREOS + `data_contract` | **Remplace** (mecanisme) |
| Marketplace / tiers | Hypothese post-v2 | **Reporte** |

Detail : [`07-MOD-adr-reconciliation-v01-v02.md`](../protocole-modules-recyclique/07-MOD-adr-reconciliation-v01-v02.md).

---

## Ordre d'execution P0 → P1

| Rang | ID | Action | Bloque 2e module ? |
|------|-----|--------|---------------------|
| **P0** | T-MOD-2 | ADR-007 → **Accepted** + promotion BMAD architecture | Oui |
| **P0** | T-MOD-3 | Fusion `openapi-module-config.yaml` → `contracts/openapi/recyclique-api.yaml` + `npm run generate` | Oui |
| **P1** | T-MOD-1 | Valider / coller convention `03-MOD` §6 C.4 (B.1 bouclage) | Oui |
| **P1** | T-MOD-5 | Registre `module_key` : promouvoir cles actives + schemas JSON | Partiel |
| **P1** | T-MOD-4 | Story 9.6 : panneau admin, merge JSON+PG, deprecie toggle | Non (toggle couvre v1) |
| **P2** | T-PEINT-1 | Gardien du seuil — reporte (DEC-16) | Non |
| — | T-MET-1 | Comptage / wizard / Paheko — **reporte** | Non |

**CREOS au centre :** aucun rang n'introduit de mecanisme hors manifests / OpenAPI reviewables.

---

## Cross-references

| Type | Fichier | Role |
|------|---------|------|
| Artefact | [03 — revue 1](2026-05-20_03_reponse-architecte-branchements-modules-v2.md) | GO sous reserves, matrice G, top P0 |
| Artefact | [04 — bouclage](2026-05-20_04_reponse-architecte-bouclage-modules-v2.md) | GO final, B.1/B.2, DEC-03, priorisation D |
| Artefact | [05 — loup de mer](2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md) | **Primordial** execution / agents |
| Protocole | [06-MOD-cookbook](../protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md) | Recette phases 0→8, gates G0→G8 |
| Protocole | [07-MOD-adr](../protocole-modules-recyclique/07-MOD-adr-reconciliation-v01-v02.md) | ADR-007 reconciliation v0.1↔v2 |
| Dossier archi | [07-ARCH-todos](../dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md) | TODO T-MOD-*, HITL, prompts 08/09 |

---

## Note agents

Charger **[05 notes loup de mer](2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md) en premier** (primordial) : pieges terrain, heuristiques, sequence chantier. Puis **04** (normatif bouclage), puis **06-MOD** (cookbook). En cas de conflit : pack `protocole-modules-recyclique/` + `03`/`04` > notes `05` > chat.

---

## Execution post-reco (2026-05-20)

| Etape | Statut |
|-------|--------|
| ADR-007 Accepted + BMAD | **Fait** |
| Promotion doc B.1/B.2/C dans pack MOD | **Fait** |
| Fusion OpenAPI T-MOD-3 + codegen | **Fait** |
| Handler `GET/PATCH module-config` + migration `site_module_configs` | **Fait** — 5 tests pytest OK |
| Story seed **9.6** | **Fait** — `_bmad-output/implementation-artifacts/9-6-config-admin-simple-modules.md` |
| Transcript cartographie `c8a645ab` | **Integre** dans `12-MOD-index-transcripts-modularite.md` |

**Prochain :** dev-story **9.6** (Peintre `/admin/modules` + merge PG) ; lier bandeau live a `module-config` ; schemas autres cles (T-MOD-5).

---

## QA2 global chantier (2026-05-20)

| Champ | Valeur |
|-------|--------|
| Rapport | [`qa2-rapport-global-chantier-modules-2026-05-20.md`](../protocole-modules-recyclique/qa2-rapport-global-chantier-modules-2026-05-20.md) |
| Passes | 7 (doc x2, arch x2, prd, code x2) + boucle ameliorative C1-C5 |
| Gate | >= 95 % documentaire avant dev-story 9.6 |
| Reserves P1 | 404 membership, If-Match, tests PATCH, seed 9.6 AC — owner story 9.6 / hotfix API |

Decisions HITL **figees** : ne pas rouvrir ADR-007, DEC-03, marketplace, 2e module comptage.

---

_Retour : [index artefacts](index.md) · [07-ARCH todos](../dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md)_
