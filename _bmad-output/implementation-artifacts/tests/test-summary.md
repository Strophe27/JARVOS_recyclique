# Synthèse — tests automatisés (QA E2E)

**Story 1.1 (doc-only, Piste B) :** pas de tests packagés ; synthèse QA équivalente → [`1-1-surface-travail-v2-doc-qa-summary.md`](./1-1-surface-travail-v2-doc-qa-summary.md) (**PASS** 2026-04-02, skill `bmad-qa-generate-e2e-tests`).

**Story 1.2 (doc-only, audit brownfield) :** pas de tests API/E2E applicables ; synthèse QA documentaire → [`1-2-audit-brownfield-doc-qa-summary.md`](./1-2-audit-brownfield-doc-qa-summary.md) (**PASS** 2026-04-02, `gates_skipped_with_hitl: true` ; preuve = checklist revue + grille AC ↔ sections du rapport).

**Stories documentées :** 3.1–3.3 (shell, manifests, widgets), 3.4 (auth / enveloppe), 3.5 (`UserRuntimePrefs`), **3.6** (fallbacks / rejets runtime visibles, `reportRuntimeFallback`, `data-runtime-*`), **3.7** (page démo runtime composé, `RuntimeDemoApp`, pipeline manifest + registre + enveloppe).  
**Dernier passage QA e2e :** story **3.7** — 2026-04-02.  
**Package :** `peintre-nano/`  
**Commande de vérification :** `npm run test` (racine du package)

## Tests générés ou étendus

### Tests API

- Non applicable (pas d’API HTTP dédiée dans le périmètre actuel).

### Tests E2E (Vitest + Testing Library + jsdom)

| Fichier | Rôle |
|--------|------|
| `peintre-nano/tests/e2e/app-shell.e2e.test.tsx` | Story 3.1 : shell, zones, titre. |
| `peintre-nano/tests/e2e/manifest-bundle.e2e.test.tsx` | Stories 3.2 / **3.6** : lot valide ; rejets **blocked** (collision `route_key`, `NAV_PAGE_LINK_UNRESOLVED`, `UNKNOWN_WIDGET_TYPE` dans l’allowlist bundle) → `ManifestErrorBanner`, `data-runtime-severity="blocked"`, espion `reportRuntimeFallback` (`state: manifest_bundle_invalid`). |
| `peintre-nano/tests/e2e/widget-declarative-rendering.e2e.test.tsx` | Stories 3.3 / **3.6** : widgets démo ; slot non mappé ; **widget inconnu au rendu** → `widget-resolve-error`, `data-runtime-severity="degraded"`, espion `reportRuntimeFallback` (`state: widget_resolve_failed`). |
| `peintre-nano/tests/e2e/auth-context-envelope.e2e.test.tsx` | Stories 3.4 / **3.6** : nominal + blocages ; contexte périmé → `reportRuntimeFallback` + `data-runtime-severity` sur `page-access-blocked`. |
| `peintre-nano/tests/e2e/user-runtime-prefs.e2e.test.tsx` | Story 3.5 : densité UI sans révéler la nav admin. |
| `peintre-nano/tests/e2e/runtime-demo-compose.e2e.test.tsx` | Story **3.7** : chemin nominal (`runtime-demo-root`, widget manifest) ; fallback widget non enregistré (`widget-resolve-error`, `reportRuntimeFallback`) ; fallback garde page (`page-access-blocked`, `reportRuntimeFallback`). |

### Tests unitaires (story 3.6)

| Fichier | Rôle |
|--------|------|
| `peintre-nano/tests/unit/runtime-rejection-reporting.test.tsx` | `loadManifestBundle` rejeté, widget inconnu (`PageRenderer`), `PageAccessBlocked` → UI + `reportRuntimeFallback`. |

## Couverture (indicatif)

- **Rejets manifest (bundle) :** e2e + unitaires — visibilité UI, sévérité **blocked**, reporting structuré.
- **Widget inconnu (zone dégradée) :** e2e + unitaires — **degraded**, pas d’écran vide sans signal.
- **Accès page / enveloppe :** e2e auth + unitaires `resolve-page-access`, etc.
- **Auth / ContextEnvelope :** chemins nominal et refus (voir tableau ci-dessus).
- **Démo runtime composé (3.7) :** e2e dédié — bac à sable + deux fallbacks visibles avec espion `reportRuntimeFallback` (aligné AC story).

## Résultat d’exécution

- `npm run test` dans `peintre-nano/` : **succès** — **74 tests**, **19 fichiers** — passage sous-agent Task `bmad-qa-generate-e2e-tests` story **3.7** (2026-04-02).

## Suite possible

- Brancher CI sur `peintre-nano` si ce n’est pas déjà fait.
- Playwright / navigateur réel : hors périmètre actuel (jsdom + Testing Library).
