# Story 24.2 : Hub « opérations spéciales » caisse et navigation vers parcours

Status: done

**Story key :** `24-2-hub-operations-speciales-caisse-et-navigation-vers-parcours`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-2-hub-operations-speciales-caisse-et-navigation-vers-parcours.md`

## Contexte produit

Après le paquet d’audit P0 (story **24.1**), l’équipe dispose des matrices PRD ↔ dépôt et du plan de tests ciblant les stories **24.2–24.5**. Il manque encore un **point d’entrée unique et manifesté** pour les opérations non nominales : le PRD §20.1 exige un hub listant **Annuler**, **Rembourser**, **Décaisser**, **Mouvement interne**, **Échanger** — sans que les caissières aient à connaître des URLs « tribales ».

Cette story est **UI + navigation CREOS** dans `peintre-nano/` (package npm `peintre-nano`, pas un module `Peintre_nano` séparé) : elle **agrège** les parcours existants ou à venir et respecte les **permissions** déjà portées par le backend et les manifests.

## Story (BDD)

As a **caissière**,  
I want **un point d’entrée unique et découvrable pour les opérations non nominales**,  
So that **annulation, remboursement et autres flux expert ne soient pas cachés derrière une connaissance implicite des routes**.

## Acceptance criteria

1. **Catalogue PRD** — *Given* le PRD §20.1 (hub), §9 « Matrice fonctionnelle centrale » (familles d’opérations) et §10.1–10.2 (annulation vs remboursement standard) ; *When* le hub est affiché pour un utilisateur autorisé ; *Then* le catalogue exposé est **aligné** sur le PRD : au minimum les entrées **Annuler**, **Rembourser**, **Décaisser**, **Mouvement interne**, **Échanger**, avec libellés cohérents et distinction explicite **annulation ≠ remboursement** lorsque le PRD l’exige (pas de fusion ambiguë des deux concepts dans une seule carte « remboursement » si le métier les sépare).
2. **Navigation manifestée** — *Given* les patterns CREOS existants (`page_key`, `NavigationEntry`, widgets enregistrés) ; *When* une entrée du hub cible un parcours déjà livré (ex. remboursement standard `/caisse/remboursement`) ; *Then* la navigation utilise les **mêmes garde-fous** que le reste de la caisse (manifests sous `contracts/creos/manifests/`, enregistrement bundle `runtime-demo-manifest.ts` si applicable, copie `public/manifests/` tenue alignée selon les commentaires du fichier).
3. **Permissions** — *Given* les permissions `caisse.*` et règles du paquet 24.1 (matrice permissions / preuves) ; *When* l’utilisateur n’a pas le droit d’accéder à une opération ; *Then* la carte ou l’entrée correspondante est **masquée** ou **désactivée avec explication** (pas d’URL contournant le contrôle — aligné `resolvePageAccess` / enveloppe auth).
4. **Parcours P1 non livrés** — *Given* les stories **24.6–24.8** (échange, décaissement, mouvement interne) peuvent être encore en backlog côté métier ; *When* le hub est livré en P0 ; *Then* chaque entrée PRD a un **état explicite** : soit navigation vers un parcours implémenté, soit **placeholder** ou section « à venir » **sans** promettre une implémentation factice — la traçabilité vers les stories suivantes reste claire dans les Dev Notes / lien matrice 24.1.
5. **Découvrabilité** — *When* l’utilisateur a `caisse.access` (ou équivalent virtual/deferred selon contexte) ; *Then* le hub est **joignable** depuis la zone caisse (ex. lien ou entrée de navigation secondaire depuis le shell caisse ou la nav latérale), et l’`id` / `route_key` / `path` sont **stables** et documentés pour les tests.

## Définition of Done

- [x] Page CREOS dédiée (`page_key` nouveau) + widget hub (ou composition de slots) enregistré dans le registre des widgets caisse.
- [x] `navigation.json` **et** `navigation-transverse-served.json` (bundle servi) mis à jour de concert ; validation manifestes (`validate-bundle-rules`, allowlist widget types) sans régression.
- [x] Libellés i18n (`label_key` navigation + textes UI) en français, alignés `communication_language` projet.
- [x] Au moins un test automatisé ciblant l’accès ou le rendu du hub (vitest unit sur résolution d’accès / présence des entrées, ou e2e léger si le projet a déjà un pattern caisse).
- [x] Aucune régression sur `/caisse`, `/caisse/remboursement`, `/caisse/cloture` (parcours Epic 6 / 13 déjà livrés) — non régression vérifiée par exécution ciblée vitest (contract + unit) ; gate complet npm au Story Runner.

## Tasks / Subtasks

- [x] Cartographier les routes et `page_key` existants (remboursement, clôture, vente nominale, éventuelles surfaces admin liées `caisse.sale_correct`) — croiser `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md`.
- [x] Définir le `path` du hub (ex. `/caisse/operations-speciales` — à figer dans les manifests) et le `page_key` (ex. `cashflow-special-ops-hub`).
- [x] Créer `contracts/creos/manifests/page-*.json` + entrée `NavigationEntry` (id, `route_key`, `shortcut_id`, `label_key`, `visibility` / `required_permission_keys` cohérents avec les autres entrées caisse).
- [x] Implémenter le widget hub : grille de cartes ou liste, une carte par famille PRD ; liens internes (`Link` / router) vers les routes manifestées ; états désactivés + texte pour P1 non implémenté.
- [x] Enregistrer le widget dans `register-cashflow-widgets.ts` (ou fichier registre existant), ajouter le type à l’allowlist si nécessaire.
- [x] Mettre à jour `runtime-demo-manifest.ts` (imports JSON page + navigation) et **dupliquer** les changements vers `peintre-nano/public/manifests/` si la discipline du repo l’exige pour fetch manuel.
- [x] Ajouter / étendre les tests (cf. DoD) ; documenter les `data-testid` pour le peloton QA Epic 24.

## Dev Notes — Périmètre et garde-fous

### Périmètre story 24.2

- **Inclus :** hub catalogue + navigation CREOS + respect permissions + distinction annulation / remboursement au niveau **produit/UI** (libellés et entrées séparées si requis par le PRD).
- **Hors périmètre (stories suivantes) :** visibilité fine sync Paheko par opération (**24.3**), parcours expert N-1 (**24.4**), remboursement sans ticket (**24.5**), implémentations métier P1 échange / décaissement / mouvement interne (**24.6–24.8**) — le hub peut pointer vers des placeholders tant que l’état est honnête.

### Points d’ancrage code / manifests (non exhaustif)

| Zone | Chemins indicatifs |
|------|-------------------|
| Navigation servie + bundle démo | `contracts/creos/manifests/navigation-transverse-served.json`, `peintre-nano/src/app/demo/runtime-demo-manifest.ts` |
| Navigation publique (copie) | `peintre-nano/public/manifests/navigation.json` |
| Page remboursement (référence pattern) | `contracts/creos/manifests/page-cashflow-refund.json`, widget `CashflowRefundWizard` |
| Registre widgets caisse | `peintre-nano/src/registry/register-cashflow-widgets.ts` |
| Résolution accès page | `peintre-nano/src/...` (`resolvePageAccess`, tests `resolve-page-access.test.ts`) |
| Validation bundles | `peintre-nano/src/validation/validate-bundle-rules.ts`, `defaultAllowedWidgetTypeSet` |

### Intelligence story 24.1 (reprise)

- Le paquet d’audit note l’**absence** d’entrée « hub opérations spéciales » dans `navigation.json` au moment de la livraison 24.1 — cette story **ferme** ce gap.
- Réutiliser la **chaîne canonique** Paheko (pas de second rail) pour tout ce qui toucherait plus tard le backend ; ici, rester strictement sur **routing + UI shell**.

### Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story 24.2).
- PRD §20.1 — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md`.
- Paquet audit P0 — `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md`.
- ADR opérations spéciales — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md`.
- Readiness — `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`.

## QA Gate (story — avant review)

| # | Vérification |
|---|----------------|
| Q1 | Chaque AC de la story 24.2 dans `epics.md` est couvert par une tâche ou une section ci-dessus. |
| Q2 | Les `path` / `page_key` ajoutés sont présents dans les deux fichiers navigation (servi + public) et dans le bundle runtime. |
| Q3 | Un utilisateur sans `caisse.refund` ne peut pas lancer le parcours remboursement depuis le hub (même comportement qu’en navigation directe). |
| Q4 | Les entrées P1 non implémentées sont explicitement étiquetées (pas de navigation vers un écran vide sans message). |

---

## Dev Agent Record

### Agent Model Used

Task — bmad-create-story (CS create), 2026-04-18  
Task — bmad-dev-story (DS), 2026-04-18

### Debug Log References

N/A — création de story uniquement.

### Implementation Plan (DS)

- `page_key` **`cashflow-special-ops-hub`**, route **`/caisse/operations-speciales`**, entrée nav **`cashflow-special-ops-hub`** (`navigation-transverse-served.json` + copie `public/manifests/navigation.json`).
- Widget **`cashflow-special-ops-hub`** : cinq cartes PRD ; remboursement via `spaNavigateTo('/caisse/remboursement')` si `caisse.refund` ; annulation/correction orientée journal sessions admin si `transverse.admin.view` ; P1 (24.6–24.8) en « À venir » explicite.
- Découvrabilité : boutons **Opérations spéciales** sur le dashboard brownfield (hub caisse compact et vue étendue) + entrée latérale manifestée.
- Toolbar live : surbrillance caisse comme remboursement/clôture (`toolbar-selection-for-live-path.ts`).

### Completion Notes List

- Hub livré avec manifests CREOS, bundle `runtimeServedManifestLoadResult`, i18n `nav.cashflow.specialOpsHub`, tests vitest (hub + `resolvePageAccess` + contract nav + registre widget).

### Change Log

- 2026-04-18 — DS : hub opérations spéciales caisse (page + nav + widget + tests + lien depuis zone caisse).

### File List

- `contracts/creos/manifests/page-cashflow-special-ops-hub.json`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts`
- `peintre-nano/src/runtime/toolbar-selection-for-live-path.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/unit/cashflow-special-ops-hub-24-2.test.tsx`
- `peintre-nano/tests/unit/resolve-page-access.test.ts`
- `peintre-nano/tests/unit/widget-registry.test.ts`
- `_bmad-output/implementation-artifacts/24-2-hub-operations-speciales-caisse-et-navigation-vers-parcours.md` (ce fichier)

### Identifiants stables (QA / tests)

| Élément | Valeur |
|--------|--------|
| `page_key` | `cashflow-special-ops-hub` |
| `id` / `route_key` nav | `cashflow-special-ops-hub` |
| `path` | `/caisse/operations-speciales` |
| `shortcut_id` | `go-cashflow-special-ops-hub` |
| `label_key` | `nav.cashflow.specialOpsHub` |
| Widget type | `cashflow-special-ops-hub` |
| `data-testid` racine hub | `cashflow-special-ops-hub` |
| Cartes | `cashflow-special-ops-card-annuler`, `…-rembourser`, `…-decaisser`, `…-mouvement-interne`, `…-echanger` |
| Lien depuis hub caisse | `caisse-open-special-ops-hub` |
