# Story 14.1 : Retrouver le shell et le choix de contexte admin observables dans Peintre_nano

Status: done

**Story key :** `14-1-retrouver-le-shell-et-le-choix-de-contexte-admin-observables-dans-peintre-nano`  
**Epic :** 14

## Livré (2026-04-12)

- **Backend** : `presentation_labels.context.active_site_display_name` alimenté depuis le nom du `Site` lié à `user.site_id` dans `recyclique/api/src/recyclic_api/services/context_envelope_service.py` ; test étendu `test_context_presentation_labels_nav_transverse_dashboard`.
- **Peintre** : composant `LiveAdminPerimeterStrip` (routes `/admin*`, auth live sans bac à sable) ; `TransverseHubLayout` variante `shellAdmin` (carte blanche / ombre proche du `MainContent` legacy) ; constante `CONTEXT_ACTIVE_SITE_DISPLAY_NAME_KEY` ; tests unitaires `live-admin-perimeter-strip-14-1.test.tsx`.
- **CREOS** : titre du slot hub `page-transverse-admin-placeholder.json` aligné sur l'intention « Tableau de bord d'administration ».
- **Nav présentation serveur** : `nav.transverse.admin.site` → « Site et périmètre » (déjà aligné côté fallbacks) ; `nav.transverse.admin.access` → « Accès et visibilité » dans `creos_nav_presentation_labels.py`.
- **Doc** : `peintre-nano/docs/03-contrats-creos-et-donnees.md` § shell admin Epic 14.1.
- **Matrice** : ligne `ui-pilote-14-01-admin-shell-perimetre` dans `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`.

## Preuves MCP (gap process)

Tentative `user-chrome-devtools` pendant l'orchestration : **échec** « browser already running » sur le profil MCP — à rejouer manuellement (legacy `http://localhost:4445/admin`, Peintre `http://localhost:4444/admin`, compte recette) pour passer la ligne matrice de `A valider` à `Valide` / `Ecart accepte` avec captures.

## Gaps résiduels nommés

- Menu **Mon profil** legacy (`/profil`) non couvert par le `NavigationManifest` servi.
- Lien **Tableau de bord** legacy `/` vs Peintre `/dashboard` (déjà § 11.2 doc 03).

## QA / review

- Gates : `npm run lint`, `npm run build` (peintre-nano) OK sur la session ; `pytest` ciblé context envelope OK. Suite `vitest run` complète : occasionnellement des échecs flaky sur d'autres fichiers en parallèle ; les tests touchés par 14.1 passent en cible.

## Dev Agent Record — fichiers touchés

- `recyclique/api/src/recyclic_api/services/context_envelope_service.py`
- `recyclique/api/tests/test_context_envelope.py`
- `recyclique/api/src/recyclic_api/services/creos_nav_presentation_labels.py`
- `peintre-nano/src/runtime/context-presentation-keys.ts`
- `peintre-nano/src/app/shell/LiveAdminPerimeterStrip.tsx` + `.module.css`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/templates/transverse/TransverseHubLayout.tsx` + `.module.css`
- `contracts/creos/manifests/page-transverse-admin-placeholder.json`
- `peintre-nano/tests/unit/live-admin-perimeter-strip-14-1.test.tsx`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` (assertions titre hub)
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
