# Synthèse QA — Story 25.12 (audit AR12 / Redis auxiliaire — chemin async Paheko)

**story_key :** `25-12-audit-code-ar12-redis-auxiliaire-async-paheko`  
**Date (run QA) :** 2026-04-20  
**Verdict :** **PASS**  
**qa_loop :** 0 / **max_qa_loop :** 3  

---

## Contexte

- **Story (fichier) :** [`_bmad-output/implementation-artifacts/25-12-audit-code-ar12-redis-auxiliaire-async-paheko.md`](../25-12-audit-code-ar12-redis-auxiliaire-async-paheko.md)
- **Rapport d’audit (DS) :** [`_bmad-output/implementation-artifacts/2026-04-20-audit-ar12-redis-auxiliaire-chemin-async-paheko-story-25-12.md`](../2026-04-20-audit-ar12-redis-auxiliaire-chemin-async-paheko-story-25-12.md)
- **Garde-fou pytest :** [`recyclique/api/tests/test_story_25_12_ar12_paheko_async_path_no_redis.py`](../../../recyclique/api/tests/test_story_25_12_ar12_paheko_async_path_no_redis.py) (racine repo relative : `recyclique/api/tests/...`)
- **Périmètre :** livrable **documentaire** (audit allowed/forbidden + pointeurs + issues) **et** **un** test d’intégration **orienté runtime** au sens AC (au-delà du seul grep manuel) — **pas** de parcours UI ni de navigation navigateur.

---

## Tests API / E2E (skill bmad-qa-generate-e2e-tests)

| Type | Statut | Motif |
|------|--------|--------|
| **Tests API / backend (pytest)** | **Couvert** | Fichier unique : garde-fou statique sur les sources du périmètre « async Paheko » qualifié (`_REL_PATHS` × interdits `get_redis` / import `redis`). |
| **E2E navigateur (Playwright / Cypress / etc.)** | **NA** | La story n’introduit pas de flux produit ni d’écran à valider ; l’AC « runtime » est satisfaite par **pytest API** + audit Markdown, pas par un e2e UI. |

**Framework détecté :** pytest (`recyclique/api/pytest.ini`), aligné avec le reste du backend.

---

## Critères d’acceptation (story / epics §25.12) ↔ preuves

| AC (résumé) | Où c’est couvert | Résultat |
|-------------|------------------|----------|
| **Given** — ADR **25-3** acceptée et **AR12** (pas de vérité durable concurrente Redis pour la compta Paheko) | Rapport d’audit (cadrage ADR / AR12 / chaîne canonique) ; pytest renforce l’**alignement code** sur le périmètre async Paheko listé | **OK** |
| **Then** — rapport : touchpoints Redis **allowed / forbidden**, issues pour écarts | Fichier `2026-04-20-audit-ar12-redis-auxiliaire-chemin-async-paheko-story-25-12.md` (inventaire + classification) | **OK** |
| **And** (DoD) — au moins **une** reco **runtime** (test, canary, probe) **au-delà du grep** | Story + rapport référencent le **pytest ciblé** ; exécution ci-dessous en preuve | **OK** |
| **And** — pas de **big bang** hybride de la chaîne async sans nouvel ADR | Section **hors scope** / traçabilité dans le rapport d’audit | **OK** |

### Mapping AC → asserts pytest (`test_story_25_12_ar12_paheko_async_path_no_redis.py`)

| Élément story / AC | Assert ou mécanisme | Détail |
|--------------------|---------------------|--------|
| Périmètre **modules async Paheko** qualifiés | Paramètre `rel` ∈ `_REL_PATHS` (17 modules, dont `services/scheduler_service.py` pour `run_paheko_outbox_task`) | Un cas de test par module listé. |
| Fichiers présents dans le repo | `assert path.is_file()` | Évite un faux vert si un fichier est renommé / supprimé. |
| **Pas** de touchpoint Redis interdit sur ce chemin (cohérent AR12 / ADR 25-3 pour l’axe audité) | Pour chaque `sub` dans `_FORBIDDEN` : `assert sub not in text` | Interdits : `get_redis`, `from recyclic_api.core.redis`, `import redis`. |

**Note :** les AC sur le **contenu rédactionnel** du rapport (tableau complet, issues numérotées, etc.) relèvent de la **revue documentaire** ; le pytest **automate** une condition **nécessaire** sur le sous-ensemble de fichiers listés (non-régression absence d’import Redis sur ce tronçon).

---

## Exécution (preuve)

| Commande | Résultat |
|----------|----------|
| `python -m pytest tests/test_story_25_12_ar12_paheko_async_path_no_redis.py -v` (cwd : `recyclique/api`) | **17 passed** (2026-04-20, post-CR1 : `scheduler_service.py` dans `_REL_PATHS`) |

**Commande de revalidation :**

```bash
cd recyclique/api
python -m pytest tests/test_story_25_12_ar12_paheko_async_path_no_redis.py -v
```

---

## Checklist skill (`checklist.md`) — story doc + pytest

| Rubrique | Statut |
|----------|--------|
| Tests API / backend (si applicable) | **OK** — pytest garde-fou |
| Tests E2E UI (si UI) | **NA** |
| Tous les tests exécutés passent | **OK** — 17/17 (post-CR1) |
| Synthèse créée | **OK** — ce fichier |
| Couverture | **Partielle par design** : doc = vérité pour inventaire / issues ; pytest = verrou **mécanique** sur la liste `_REL_PATHS` |

---

## Couverture (résumé type workflow)

### Tests API (pytest)

- [x] `recyclique/api/tests/test_story_25_12_ar12_paheko_async_path_no_redis.py` — absence de motifs Redis interdits sur 17 fichiers du périmètre async Paheko qualifié (incl. `services/scheduler_service.py`)

### Tests E2E (Playwright / UI)

- (aucun — **non requis** pour cette story documentaire + garde-fou backend)

## Prochaines étapes

- Garder ce pytest dans la CI sur les changements touchant `paheko_outbox*` / `admin_paheko_outbox` / mapping Paheko listés.
- Réviser `_REL_PATHS` si le périmètre « async Paheko » évolue (nouveaux modules).

---

## Fichiers de traçabilité

- Story : `_bmad-output/implementation-artifacts/25-12-audit-code-ar12-redis-auxiliaire-async-paheko.md`
- Rapport d’audit : `_bmad-output/implementation-artifacts/2026-04-20-audit-ar12-redis-auxiliaire-chemin-async-paheko-story-25-12.md`
- Pytest : `recyclique/api/tests/test_story_25_12_ar12_paheko_async_path_no_redis.py`
- Synthèse QA : `_bmad-output/implementation-artifacts/tests/test-summary-story-25-12-doc-qa.md` (ce fichier)
