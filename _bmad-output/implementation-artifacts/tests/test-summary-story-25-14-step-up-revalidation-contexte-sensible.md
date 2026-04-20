# Synthèse QA — Story 25.14 (step-up / revalidation après changement de contexte sensible)

**story_key :** `25-14-step-up-et-revalidation-apres-changement-de-contexte-sensible`  
**Date (run QA) :** 2026-04-20  
**Verdict :** **PASS**  
**qa_loop :** inchangé (aligné story 25.13 : `0` / **max_qa_loop :** `3`)

### Réexécution — `bmad-qa-generate-e2e-tests` (Task Story Runner)

- **Date :** 2026-04-20  
- **Résultat :** `5 passed`, code de sortie 0, Python 3.13.5, pytest 7.4.3.  
- **Framework détecté :** pytest + `TestClient` (FastAPI) ; pas de dépendance Playwright / Cypress dans le périmètre gate story.  
- **Checklist skill :** tests API ✓ ; E2E navigateur **NA** (matrice : « E2E navigateur optionnel hors gate story ») ; happy path + erreurs critiques ✓.

### Commande

```powershell
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api"
python -m pytest tests/test_story_25_14_step_up_revalidation_apres_changement_contexte_sensible.py -v --tb=short
```

---

## Contexte

- **Matrice :** [`_bmad-output/implementation-artifacts/2026-04-20-matrice-step-up-revalidation-contexte-sensible-25-14.md`](../../2026-04-20-matrice-step-up-revalidation-contexte-sensible-25-14.md)  
- **Pytest :** [`recyclique/api/tests/test_story_25_14_step_up_revalidation_apres_changement_contexte_sensible.py`](../../../recyclique/api/tests/test_story_25_14_step_up_revalidation_apres_changement_contexte_sensible.py)  
- **Story 25.8 (stale générique) :** [`recyclique/api/tests/test_context_stale_story25_8.py`](../../../recyclique/api/tests/test_context_stale_story25_8.py)

---

## Matrice × tests (couverture)

| Ligne matrice | Preuve pytest |
|---------------|---------------|
| Contexte aligné, mutation sensible **sans** `X-Step-Up-Pin` → **403** `STEP_UP_PIN_REQUIRED` | `test_matrice_ligne_contexte_aligne_sans_pin_refus_403_default_deny` |
| En-têtes **site** désalignés, PIN présent → **409** `CONTEXT_STALE` (avant step-up) | `test_matrice_ligne_contexte_stale_avant_step_up_409_malgre_pin` |
| En-têtes **session caisse** désalignés, PIN présent → **409** `CONTEXT_STALE` | `test_matrice_ligne_session_caisse_stale_avant_step_up_409_malgre_pin` *(complété cette passe)* |
| Séquence « deux onglets » : stale puis requête fraîche sans PIN → **403** | `test_sequence_deux_onglets_stale_puis_frais_sans_pin_encore_403` |
| Aligné + PIN + logs `operator_user_id` / `proof=server_operator_pin` (25.13) | `test_logs_step_up_correlation_25_13_operator_and_proof` |

---

## Gaps résiduels (non bloquants)

- **E2E navigateur :** non exigé par la matrice pour le gate story ; le comportement est contrat HTTP + en-têtes.  
- **Autres routes sensibles du tableau** (clôture session, décaissements step-up, virements internes, `PATCH` corrections vente super-admin) : même ordre `_enforce_cash_context_binding` → `verify_step_up_pin_header` dans `cash_sessions.py` / ventes ; pas de duplication paramétrique par verb dans ce fichier — confiance **code review** + **25.8** pour `CONTEXT_STALE` transverse. Un renforcement futur possible : un test paramétré minimal sur une 2ᵉ route si le risque de régression d’ordre de garde augmente.

---

## E2E (Playwright / UI)

**NA** — couverture acceptable via tests API conformément au workflow skill et à la matrice (scénarios séquentiels pytest).
