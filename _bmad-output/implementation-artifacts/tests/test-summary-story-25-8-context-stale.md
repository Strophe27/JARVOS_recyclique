# Tests — Story 25.8 (CONTEXT_STALE caisse / symétrie ventes)



## Objectif



Couverture des refus **409** avec `code` **`CONTEXT_STALE`** lorsque les en-têtes `X-Recyclique-Context-Site-Id` ou `X-Recyclique-Context-Cash-Session-Id` ne correspondent pas à l’enveloppe serveur (`build_context_envelope`), et alignement des assertions sur l’enveloppe **AR21** (`retryable`, `correlation_id`).

## Pytest vs Vitest vs e2e — périmètre de preuve

| Couche | Rôle | Fichiers / commandes typiques |
|--------|------|------------------------------|
| **Pytest** | Intégration API : garde serveur, codes **400** / **409**, enveloppe AR21 | `recyclique/api/tests/test_context_stale_story25_8.py`, `recyclique/api/tests/test_exceptional_refund_endpoint.py` (garde **25.8** sur `POST …/exceptional-refunds`) |
| **Vitest** | Unitaires navigateur **sans** Playwright : liaison d’en-têtes, fraîcheur locale d’enveloppe | `peintre-nano/tests/unit/context-binding-headers.test.ts`, `context-envelope-freshness.test.ts` |
| **e2e** (Playwright, etc.) | Parcours opérateur bout-en-bout | **Optionnel** pour l’AC 25.8 si pytest + Vitest sont verts ; utile pour **checklist terrain** (voir ci-dessous) |

### Checklist terrain (hors CI obligatoire)

- Après bascule site ou caisse dans l’UI : tenter une mutation sensible → refus explicite (**409** `CONTEXT_STALE` ou **400** validation) **ou** succès après refresh d’enveloppe ; pas de succès silencieux sur mauvais site/session.
- Vérifier le bandeau / alerte caisse (`RecycliqueClientErrorAlert`) sur code stable, pas une erreur générique seule.

## Definition of Done — client (Vitest)

Preuves unitaires Peintre_nano (depuis la racine du package `peintre-nano`) :

```powershell
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\peintre-nano"

pnpm exec vitest run tests/unit/context-envelope-freshness.test.ts tests/unit/context-binding-headers.test.ts
```

- `context-envelope-freshness` : blocage local si l’enveloppe affichée est périmée vs vérité attendue.
- `context-binding-headers` : en-têtes `X-Recyclique-Context-*` sans résidu lors de réutilisation ; support `Record` et `Headers` ; `clearRecycliqueContextBindingHeaders` pour reset explicite.

## Règle produit — GET sans 409 (Story 25.8)

Le contrôle **CONTEXT_STALE** (**409**) s’applique uniquement aux **mutations** qui invoquent la garde `enforce_optional_client_context_binding` / `enforce_optional_client_context_binding_from_claim` **avant** effet métier, **lorsque** le client envoie au moins un en-tête `X-Recyclique-Context-*` **et** que les valeurs sont des **UUID valides** alignés sur l’enveloppe serveur — sinon **400** `VALIDATION_ERROR` (en-tête mal formé ou `sub` JWT non-UUID avec en-têtes présents), pas **409**.

Les **GET** documentés sans cette garde (ex. `GET /v1/sales/{sale_id}`, `GET /v1/sales/held`) **ne** produisent **pas** de **409** `CONTEXT_STALE` : l’API ne traite pas ces lectures comme des mutations sous garde 25.8. **Ne pas** inférer depuis la story que tout GET « ignore » les en-têtes au sens réseau : le client Peintre **n’envoie pas** les en-têtes de liaison sur ces GET (mutations uniquement). Rafraîchir l’enveloppe (`POST …/context/refresh` ou flux équivalent) **avant** les écritures si l’UI était stale.



## Convention HTTP **409** (Story 25.8 vs autres)

- **409** avec `code` **`CONTEXT_STALE`** dans une `RecycliqueApiError` : **désalignement** entre les en-têtes optionnels `X-Recyclique-Context-*` (si le client les envoie) et l’enveloppe serveur courante — **pas** un conflit métier « ticket / session » au sens des autres routes.
- **Autres 409** sur les routes ventes / caisse : ex. **idempotence** (`IDEMPOTENCY_KEY_CONFLICT`), **reversal** / **correction sensible** (Epic **6.4** / **6.8**), etc. — codes machine distincts dans le même schéma d’enveloppe ; ne pas les confondre avec **CONTEXT_STALE** en lecture de logs ou de tests.

## Cartographie checklist 25.7 (§3) ↔ tests pytest (Story 25.8)

Source IDs : `_bmad-output/implementation-artifacts/25-8-refus-par-defaut-et-erreurs-explicites-apres-bascule-site-ou-caisse.md` (tableau « Cartographie checklist 25.7 ») et fichier de tests `recyclique/api/tests/test_context_stale_story25_8.py`.

| ID checklist 25.7 | Fonction(s) de test `test_context_stale_story25_8.py` | Commentaire |
|-------------------|------------------------------------------------------|-------------|
| `CTX-SWITCH-3-1-INVALIDATE-OR-RECALC-BEFORE-BIZ` | Toutes les fonctions `test_*_409_context_stale_*` **+** garde **400** (`test_*_400_*`) **(8 tests)** | Garde avant effet métier sur chaque route exercée ; **400** pour en-tête non-UUID ou `sub` non-UUID avec en-têtes. |
| `CTX-SWITCH-3-1-NO-STALE-CLIENT-EXPLICIT-ERRORS` | Les 6 tests **409** | Réponse **409** + `code` **`CONTEXT_STALE`** + corps AR21 (`retryable`, `correlation_id`). |
| `CTX-SWITCH-3-2-OPERATOR-PIN-CANON-PRD-11-2` | `test_patch_sale_corrections_409_context_stale_when_site_header_mismatches_envelope` | Route sensible avec **X-Step-Up-Pin** (refus avant service si site désaligné). Les autres tests illustrent le refus sans enjeu PIN sur la même convention **409**. |
| `CTX-SWITCH-3-2-KIOSQUE-POSTE-STEPUP-ADR-25-2` | — | Hors preuve automatisée de **ce** fichier (matrice **25.14** / ADR **25-2**). |
| `CTX-SWITCH-3-2-REVALIDATION-DEFAULT-DENY` | Idem (6 tests **409**) | Refus tant que les en-têtes ne reflètent pas l’enveloppe serveur courante. |

## Granularité des scénarios sensibles site / session



| Test | Granularité |

|------|-------------|

| `test_patch_sale_corrections_409_context_stale_when_site_header_mismatches_envelope` | **Site** — en-tête site ≠ enveloppe (super-admin + step-up) |

| `test_put_cash_session_step_409_context_stale_when_site_header_mismatches_envelope` | **Site** — en-tête site ≠ enveloppe (mutation `PUT …/step`) |

| `test_put_cash_session_step_409_context_stale_when_cash_session_header_mismatches_envelope` | **Session caisse** — en-tête session ≠ session ouverte réelle |

| `test_put_sale_note_409_context_stale_when_site_header_mismatches_envelope` | **Site** — PUT note admin |

| `test_patch_sale_item_notes_409_context_stale_when_site_header_mismatches_envelope` | **Site** — PATCH ligne (`notes`, sans `/weight`) ; garde **25.8** avant effet métier |

| `test_patch_sale_item_weight_409_context_stale_when_site_header_mismatches_envelope` | **Site** — PATCH poids ligne (admin) |



## Liste des tests pytest (story 25.8, un test par ligne)



- `test_patch_sale_corrections_409_context_stale_when_site_header_mismatches_envelope` — `PATCH /v1/sales/{sale_id}/corrections` : 409 `CONTEXT_STALE` si `X-Recyclique-Context-Site-Id` désaligné ; corps AR21 (`retryable`, `correlation_id`).

- `test_put_cash_session_step_409_context_stale_when_site_header_mismatches_envelope` — `PUT /v1/cash-sessions/{session_id}/step` : 409 si site désaligné.

- `test_put_cash_session_step_409_context_stale_when_cash_session_header_mismatches_envelope` — `PUT …/step` : 409 si en-tête session caisse désaligné.

- `test_put_sale_note_409_context_stale_when_site_header_mismatches_envelope` — `PUT /v1/sales/{sale_id}` (note admin) : 409 si site désaligné.

- `test_patch_sale_item_notes_409_context_stale_when_site_header_mismatches_envelope` — `PATCH /v1/sales/{sale_id}/items/{item_id}` (champ `notes`) : 409 **CONTEXT_STALE** si site désaligné (route protégée par la même garde que les autres mutations ventes).

- `test_patch_sale_item_weight_409_context_stale_when_site_header_mismatches_envelope` — `PATCH /v1/sales/{sale_id}/items/{item_id}/weight` : 409 si site désaligné.

- `test_put_cash_session_step_400_when_site_header_not_valid_uuid` — `PUT …/step` : **400** `VALIDATION_ERROR` si `X-Recyclique-Context-Site-Id` présent mais non UUID (pas **409**).

- `test_post_hold_400_when_context_header_present_but_jwt_sub_not_uuid` — `POST /v1/sales/hold` : **400** si en-tête de contexte présent et `sub` JWT non-UUID.

- `test_exceptional_refund_400_when_site_context_header_not_valid_uuid` — `POST /v1/cash-sessions/{id}/exceptional-refunds` : **400** `VALIDATION_ERROR` si `X-Recyclique-Context-Site-Id` présent mais non-UUID.

- `test_exceptional_refund_409_context_stale_when_site_header_mismatches_envelope` — même route : **409** `CONTEXT_STALE` si en-tête site désaligné sur l’enveloppe (`_enforce_cash_context_binding`).



## Commandes (machine locale, Windows PowerShell)



Répertoire : `recyclique\api`.



```powershell

Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api"

python -m pytest tests/test_context_stale_story25_8.py -v --tb=short

```

Garde **25.8** sur remboursement exceptionnel (fichier dédié Story **24.5**, étendu **25.8**) :

```powershell

python -m pytest tests/test_exceptional_refund_endpoint.py -v --tb=short

```



Contrôle non-régression suite « step » :



```powershell

python -m pytest tests/test_context_stale_story25_8.py tests/test_cash_session_step_update_arch03.py -q --tb=line

```



Contrats OpenAPI (dépôt racine) :



```powershell

Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\contracts\openapi"

pnpm run generate

```



## Routes non couvertes exhaustivement par pytest 25.8 — tableau honnête

L’**AC 25.8** exige refus explicite sur les mutations sensibles **protégées au code** ; la **preuve pytest** de ce fichier est un **échantillon** (léger, répétable). Une **matrice exhaustive « une assertion par route / variante »** est du **backlog de supervision / qualité** — **Story 25.10** (*Supervision — causes racines mapping versus builder versus outbox*, slug YAML `25-10-supervision-causes-racines-mapping-versus-builder-versus-outbox`) — **sans diluer** les AC 25.8 : 25.8 reste « socle refus + erreurs + échantillon pytest » ; 25.10 peut porter campagnes étendues et corrélation d’échecs.

| Route / famille | Garde 25.8 au backend | Ligne dédiée dans `test_context_stale_story25_8.py` |
|-----------------|------------------------|-----------------------------------------------------|
| `PUT …/cash-sessions/{id}/step`, `PATCH …/corrections`, `PUT …/sales/{id}`, `PATCH …/items/…`, `PATCH …/weight` | Oui | **Oui** (6 scénarios **409**) |
| `POST …/sales/hold`, `POST …/sales/`, `POST …/reversals`, finalize-held, abandon-held | Oui | Non (comportement + OpenAPI ; pas 100+ tests nouveaux dans 25.8) |
| `POST …/cash-sessions/{id}/disbursements`, `POST …/internal-transfers`, autres caisse | Oui (cash_sessions) | Non (même principe ; preuve caisse partielle via `…/step`) |
| **400** validation en-tête / `sub` | Oui | **Oui** (2 tests **400**) |

## Hors périmètre 25.8 — alignement doc / tests ciblés (Story 25.10 pour extension)

Les routes ci-dessous documentent un **409** **Story 25.8** / **`CONTEXT_STALE`** (ou partagent la même garde) dans `contracts/openapi/recyclique-api.yaml` ; elles ne sont **pas** toutes dupliquées par une ligne dédiée dans `test_context_stale_story25_8.py`. Extension pytest éventuelle : tracer en **AC Story 25.10** plutôt qu’exploser le périmètre 25.8.

- `POST /v1/cash-sessions/{session_id}/disbursements` — **400**/**403** documentés avec schéma `RecycliqueApiError` (alignement **409**).
- `POST /v1/cash-sessions/{session_id}/internal-transfers`
- Mutations ventes listées en story (hold, `POST /v1/sales/`, `POST /v1/sales/reversals`, finalize-held, abandon-held) : garde backend + OpenAPI ; scénarios dédiés hors fichier **25.8** (section « honnêteté » de l’artefact story).

## Fichiers



- `recyclique/api/tests/test_context_stale_story25_8.py`

- `recyclique/api/tests/test_exceptional_refund_endpoint.py`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py` (garde contexte PUT note / PATCH poids / PATCH item)

- `contracts/openapi/recyclique-api.yaml` (GET vente sans 409 ; `PUT` note admin ; `PATCH …/items/{item_id}` + `PATCH` poids ligne + **409** `CONTEXT_STALE` ; ordre 409 vs 404 sur `PUT …/step`)

- `recyclique/api/tests/test_b52_p4_update_sale_item.py` — **skip** si `TEST_DATABASE_URL` ne pointe pas vers **PostgreSQL** (`pytest.mark.skipif`) : la CI ou la machine locale sans PG ne exécute pas cette suite ; ce n’est **pas** un échec du gate **25.8** tant que le skip est attendu (schéma complet requis).



## Résultat



**Dernière exécution documentée (gate post-P2 story 25-8)** — 2026-04-20 : `python -m pytest tests/test_context_stale_story25_8.py -q --tb=line`, `python -m pytest tests/test_exceptional_refund_endpoint.py -v --tb=short`, `pnpm exec vitest run` (peintre-nano, 742 tests) et `pnpm run generate` sous `contracts/openapi` **PASS** (sortie 0) sur l’environnement du Story Runner. Pour reproduire ailleurs : mêmes commandes ci-dessus depuis les répertoires indiqués ; en CI, vérifier que le job définit une base PG si l’on inclut `test_b52_p4_update_sale_item.py` dans le peloton.


