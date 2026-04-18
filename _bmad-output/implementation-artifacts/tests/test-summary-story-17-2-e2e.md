# Résumé QA — tests automatisés (Story 17.2)

**Story :** `17-2-porter-cash-registers-et-sites-sur-une-meme-ossature-admin-stable`  
**Date (session) :** 2026-04-12  
**Skill :** `bmad-qa-generate-e2e-tests`

## Tests générés / étendus

### Tests API

- Non applicable (rail U, pas d’endpoints canon Registers/Sites dans l’OpenAPI servi ; pas de binding inventé).

### Tests E2E (Vitest + Testing Library, `jsdom`)

- [x] `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` — parcours admin **cash-registers** et **sites** (story 17.2) : routes, nav, `TransverseHubLayout` `family=admin`, placeholders, **renfort QA** : texte visible référençant `recyclique-api.yaml` (gap contractuel). Le bandeau `LiveAdminPerimeterStrip` dépend de `VITE_LIVE_AUTH` (`liveAuthPresentationMode`) — non asserté en e2e bac à sable ; couvert par `tests/unit/live-admin-perimeter-strip-14-1.test.tsx`.
- [x] `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` — contrat CREOS bundle : entrées nav, `page_key` `transverse-admin-*`, slots, `resolvePageAccess` sans `transverse.admin.view`.

## Couverture (par rapport aux AC testables en UI)

| Zone | Couverture |
|------|------------|
| Routes `/admin/cash-registers`, `/admin/sites` | Oui (clic + URL profonde) |
| Libellés nav (« Caisses enregistrées », « Sites (legacy) ») | Oui (bloc Story 5.4) |
| Shell admin (`transverse-page-shell` `data-transverse-family=admin`) | Oui |
| `LiveAdminPerimeterStrip` (Epic 14.1 / AC 4) | Composant : tests unitaires 14.1 ; rendu e2e servi uniquement si `VITE_LIVE_AUTH=true` |
| Placeholder honnête / gap OpenAPI (texte YAML + Epic 16) | Oui |
| Guards (`transverse.admin.view`, masquage nav) | Oui (contract + e2e masquage) |

## Gates exécutés (brief Story Runner)

- `npm run lint` (`peintre-nano`) — OK (2026-04-12, spawn QA)
- `npm run build` — OK
- `npm run test` — OK (410 tests)

## Prochaines étapes

- Enchaîner **bmad-code-review** côté parent si prévu par la chaîne BMAD.
- Après fermeture **Epic 16** (G-OA-02), enrichir avec tests `data_contract` / intégration réseau mockée.
