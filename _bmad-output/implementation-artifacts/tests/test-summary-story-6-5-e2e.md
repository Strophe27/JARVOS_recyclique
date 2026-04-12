# Synthèse automatisation des tests — Story 6.5 (encaissements spéciaux)

## Tests générés / étendus

### API (pytest)

- [x] `recyclique/api/tests/test_special_encaissement_story65_integration.py` — don 0 €, adhésion + `adherent_reference`, 403 sans `caisse.special_encaissement`, validations montants / items / don + référence.

### Tests E2E (Vitest + Testing Library + jsdom)

- [x] `peintre-nano/tests/e2e/cashflow-special-6-5.e2e.test.tsx`
  - **Workspace brownfield `/caisse`** : le wizard nominal est monté ; **« Don (sans article) »** et **« Adhésion / cotisation »** ouvrent les wizards dédiés **sans changement de route** (`pathname` reste `/caisse`).
  - **Permission `caisse.special_encaissement`** : sans cette clé, les entrées transverses `nav-entry-cashflow-special-don` / `nav-entry-cashflow-special-adhesion` sont absentes ; sous `/caisse`, panneau `cashflow-special-encaissements-panel-no-perm` et pas de bouton `cashflow-open-special-don`.
  - **POST mock don** : `POST /v1/sales/` avec `items: []`, `special_encaissement_kind: DON_SANS_ARTICLE`, `total_amount: 0`, `payment_method: cash`, `cash_session_id` session → écran `cashflow-special-don-wizard-success` + ID vente affiché.
  - **POST mock adhésion** : `special_encaissement_kind: ADHESION_ASSOCIATION`, `total_amount` > 0 (défaut UI 10 €), `adherent_reference` renseigné, `payment_method: cash` → succès.

### Tests unitaires / contrat

- [x] `peintre-nano/tests/unit/cashflow-special-gate-6-5.test.tsx` — garde enveloppe sur le widget don.
- [x] `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` — ids `cashflow-special-don` / `cashflow-special-adhesion`, filtrage permission, `resolvePageAccess` page don.

## Preuve UI (AC 5) — procédure reproductible

**Objectif** : deux parcours visibles depuis le **poste caisse** (pas de routes produit séparées type `/caisse/don-sans-article`), avec résultats attendus vérifiables.

| Étape | Action | Résultat attendu |
|--------|--------|------------------|
| 0 | Ouvrir l'app avec enveloppe démo (permissions `caisse.access` + `caisse.special_encaissement`, session caisse résolue — voir `createDefaultDemoEnvelope`) | Dashboard caisse + workspace vente |
| 1 | Aller sur `/caisse` | Boutons **Don (sans article)** et **Adhésion / cotisation** visibles dans le workspace (`data-testid` `cashflow-open-special-don` / `cashflow-open-special-adhesion`) |
| 2 | Don : ouvrir le wizard, laisser montant 0 (ou ≥ 0), enregistrer | Succès « Encaissement enregistré… », identifiant vente affiché ; côté API : vente sans lignes article, kind `DON_SANS_ARTICLE` |
| 3 | Adhésion : ouvrir le wizard, montant > 0, référence adhérent optionnelle, enregistrer | Même type de succès ; kind `ADHESION_ASSOCIATION` |
| 4 | Retirer `caisse.special_encaissement` de l'enveloppe | Pas d'accès aux boutons spéciaux sur `/caisse` ; message de restriction cohérent |

**URLs (environnement local)**

- **Politique sprint / preuve servie** : `http://127.0.0.1:4444` — utiliser le port effectivement exposé par la stack (Docker / preview) ; vérifier joignabilité HTTP 200 avant campagne.
- **Alternative Vite** : `http://127.0.0.1:5173` (`strictPort` dans `peintre-nano/vite.config.ts`) ou port indiqué par l'environnement.

**Captures optionnelles** : déposer sous `_bmad-output/implementation-artifacts/screenshots/caisse/` (convention `11-0__…`) le panneau encaissements spécifiques sur `/caisse` si la campagne visuelle est exigée telle quelle.

## Exécution ciblée E2E (Story 6.5)

Depuis `peintre-nano` :

```bash
npm run test -- tests/e2e/cashflow-special-6-5.e2e.test.tsx
```

## Prochaines étapes

- `pytest` sous `recyclique/api` ; `npm run test` sous `peintre-nano` (CI).
- Migration Alembic `e9a1_story_6_5_special_enc` sur les bases déployées.
