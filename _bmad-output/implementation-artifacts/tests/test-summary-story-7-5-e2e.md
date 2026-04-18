# Synthèse tests automatisés — Story 7.5 (QA generate e2e)

Date : 2026-04-09

## Tests concernés

### Unit / intégration jsdom (`reception-defensive-7-5.test.tsx`)

- DATA_STALE : bannière, `data-widget-data-state`, fermeture ticket désactivée.
- Mutation échouée (open poste) : alerte AR21, `correlation_id`, absence de libellé de succès.
- Export CSV : corps 200 sans `download_url` → erreur explicite, pas d'`window.open`.
- Lecture liste : `retryable: true` → message de nouvel essai possible.

### E2E Vitest (`reception-nominal-7-1.e2e.test.tsx`)

- Parcours nominal + refus 403 ouverture poste (régression API).
- **Ajout 7.5** : DATA_STALE via `reception-trigger-stale` dans le flux `App` + `/reception` (bannière, attribut widget, bouton fermer ticket désactivé).

## Commande de vérification

```bash
cd peintre-nano && npm run test -- tests/unit/reception-defensive-7-5.test.tsx tests/e2e/reception-nominal-7-1.e2e.test.tsx
```

## Checklist skill `bmad-qa-generate-e2e-tests`

- Cadre Vitest + Testing Library aligné au dépôt.
- Chemins heureux + erreurs critiques (403, stale, export ambigu, retryable).
- Résumé de trace pour le Story Runner.
