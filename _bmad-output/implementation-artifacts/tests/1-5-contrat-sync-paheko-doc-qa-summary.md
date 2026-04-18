# Synthèse QA — story 1.5 (contrat minimal sync / réconciliation Paheko)

**story_key :** `1-5-definir-le-contrat-minimal-de-synchronisation-et-reconciliation-avec-paheko`  
**Date (run QA) :** 2026-04-02  
**Skill :** `bmad-qa-generate-e2e-tests`  
**Verdict automatisé pour le parent :** **PASS**

---

## Contexte

- **Livrable principal :** artefact [`references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`](../../../references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md) (documentation normative, **sans** implémentation outbox / workers).
- **Tests API applicatifs et E2E produit :** **N/A doc-only** — aucune feature UI ni endpoint métier exécutable livré par la story (voir Dev Notes story : tests auto non obligatoires pour la partie purement documentaire).
- **Gates parent :** `gates_skipped_with_hitl: true` — qualité documentaire : **relecture HITL** (grille §10 de l'artefact) + **traçabilité AC → sections** ; complément : **tests Vitest** sur le fichier pivot (présence des sections et termes contractuels).

---

## Équivalence checklist skill (`checklist.md`)

| Critère skill | Statut | Justification |
|---------------|--------|----------------|
| Tests API générés (si applicable) | **N/A** | Pas de service HTTP métier dans le périmètre 1.5. |
| Tests E2E générés (si UI) | **N/A** | Aucune UI. |
| Framework / happy path / erreurs | **OK** | Vitest + lecture fichier markdown canonique (`peintre-nano/tests/contract/contrat-sync-paheko-1-5-artefact.test.ts`). |
| Tous les tests automatisés passent | **OK** | `npm run test` dans `peintre-nano/` (suite existante + test 1.5). |
| Synthèse créée | **OK** | Ce fichier + entrée dans `test-summary.md`. |

---

## Critères d'acceptation story ↔ artefact (revue statique)

| Bloc AC (story 1.5) | Vérification (artefact) | Résultat |
|---------------------|-------------------------|----------|
| Cycle de vie, outbox, idempotence, corrélation (AR11, AR17, AR24) | §2, §3, §4 ; table AC → sections | **OK** |
| Acceptation locale, blocage sélectif, résolution manuelle, audit minimal | §5, §6 | **OK** |
| Contrat stable Epics 6–7–8, FR23–FR25, FR39 | §2, §5, §7, §8 | **OK** |
| Traçabilité AC → sections + HITL | En-tête + §10 | **OK** |
| Paheko : pas d'invention ; hypothèses / gaps → 1.6 | §9 | **OK** |

---

## Checks reproductibles (hors suite E2E lourde)

### Automatisés (Vitest)

| Fichier | Rôle |
|---------|------|
| `peintre-nano/tests/contract/contrat-sync-paheko-1-5-artefact.test.ts` | Vérifie présence traçabilité AC, §2 cycle de vie, outbox, `X-Correlation-ID`, `correlation_id`, états FR24, AR39, FR23/FR25, renvoi 1.6, audit + HITL §10. |

**Commande :** `npm run test` (répertoire `peintre-nano/`).

### Manuel / CI future (OpenAPI)

L'artefact exige que l'enveloppe d'erreur JSON (lorsqu'exposée en HTTP) inclue notamment `correlation_id` (**§4.2**), alignée avec la gouvernance 1.4. Le fichier `contracts/openapi/recyclique-api.yaml` est encore un **draft minimal** (ping gouvernance) **sans** schémas `components` d'erreur : **ne pas** faire échouer la story 1.5 sur l'absence de `correlation_id` dans le YAML tant que les schémas HTTP ne sont pas livrés (évite faux positif doc-only).

Quand les schémas d'erreur seront ajoutés, check optionnel :

```bash
rg -n "correlation_id|X-Correlation-ID" contracts/openapi/recyclique-api.yaml
```

**Attendu actuel (2026-04-02) :** aucune occurrence dans le YAML — **acceptable** pour 1.5 ; l'artefact reste la norme sémantique jusqu'à évolution OpenAPI.

---

## Fichiers créés / touchés par ce run QA

- `_bmad-output/implementation-artifacts/tests/1-5-contrat-sync-paheko-doc-qa-summary.md` (ce fichier)
- `_bmad-output/implementation-artifacts/tests/test-summary.md` (entrée story 1.5)
- `peintre-nano/tests/contract/contrat-sync-paheko-1-5-artefact.test.ts`
- `peintre-nano/tests/contract/README.md` (mention story 1.5)

---

## Retry DS / échec HITL (si **FAIL** ultérieur)

- **Causes typiques :** trou dans la table AC → sections ; sections §2–§7 incomplètes ; contradiction avec artefact 1.4 / AR39.
- **Action :** corriger l'artefact sous `references/artefacts/`, ajuster les assertions du test si le pivot est renommé ou scindé, relancer `npm run test` dans `peintre-nano/`.
