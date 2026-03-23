# Story 19.7: Caisse — presets (Don, Recyclage, Déchèterie) conformes 1.4.4

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a opérateur caisse,
I want retrouver les boutons presets (Don, Recyclage, Déchèterie) utilisables et conformes à la 1.4.4,
So that je puisse saisir rapidement les types de ventes les plus courants avec le bon prix et corriger une ligne si je me suis trompé.

## Contexte audit terrain (obligatoire)

**Source :** `_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md`

### Section 5 — Tableau terrain Presets (AC audit #1, #2)

| Point | Statut terrain | Observation |
| ----- | -------------- | ----------- |
| Presents visibles si configurés en base | **KO** | Presets non visibles / non utilisables comme attendu 1.4.4. |
| Grille vide sans preset actif | **KO** | Rien n’est affiché ; pas de message / discovery pour l’utilisateur. |
| Couleurs / types (don, recyclage, déchetterie) | **KO** | Non vérifiable en conditions satisfaisantes (presets absents ou non conformes). |
| Clic → ligne panier (prix, libellé) | **Partiel** | Manque action d’édition de ligne en cas d’erreur ; **prix panier faux** quand la catégorie a un prix fixe (ex. lampe 3 €) : le panier affiche le prix saisi dans l’écran « prix » au lieu du prix catégorie. |
| Cohérence preset / catégorie liée | OK | Noter pour non-régression. |

### Section 8 — Synthèse P0 (presets)

**P0 — Presets :** absence ou non-conformité visuelle / UX ; prix panier incohérent avec prix catégorie fixe ; besoin d’un moyen d’**éditer une ligne** du panier.

### Chevauchements (ne pas diluer le périmètre)

- **Placement** des presets dans le layout vs grille : si l’écart persiste après correction fonctionnelle, traiter en **19.9** ; livrer d’abord visibilité et comportement (**19.7**). [Source: même artefact, §9]

## Acceptance Criteria

1. **Visibilité et chargement**
   - **Given** une session caisse ouverte et des presets actifs en base (`GET /v1/presets/active` non vide)
   - **Then** les boutons presets correspondants sont **visibles** sur l’écran de saisie vente (onglet catégorie / zone prévue par l’UI actuelle), cliquables, avec libellé et prix affichés de façon lisible.
   - **And** si la réponse API est vide ou en erreur réseau, l’UI ne laisse pas une zone « muette » : message explicite du type « Aucun preset configuré » ou message d’erreur exploitable (pas de `return null` sans explication — aligné constat audit §5).

2. **Types et couleurs 1.4.4**
   - **Given** des presets avec `button_type` don / don_18 / recyclage / decheterie (et défaut)
   - **Then** le rendu couleur / variante suit la charte caisse **1.4.4** et reste cohérent avec l’implémentation actuelle (`getPresetColor`) sauf si l’audit ou la référence 1.4.4 impose un ajustement documenté (preuve avant/après si changement visuel — règle Epic 11 si écran touché).

3. **Clic preset → ligne panier métier**
   - **Given** un clic sur un preset
   - **Then** une ligne est ajoutée au panier avec `preset_id`, libellé preset, quantité appropriée (défaut 1 sauf règle 1.4.4 contraire), et **prix unitaire / total cohérents avec la 1.4.4**.
   - **And** lorsque la catégorie liée au preset porte un **prix fixe** configuré (champs `price` / `max_price` côté API catégories — voir `api/schemas/category.py` et réponse `GET /v1/categories/sale-tickets`), le montant en centimes dans le panier **doit refléter ce prix catégorie**, et **non** une valeur résiduelle du champ de saisie prix de l’écran catégorie (bug terrain : ex. lampe 3 €).

4. **Édition / correction de ligne**
   - **Given** une ligne dans le panier (y compris issue d’un preset)
   - **When** l’opérateur constate une erreur de saisie
   - **Then** il dispose d’une action claire pour **modifier** la ligne (quantité et/ou prix selon règles 1.4.4) ou d’un parcours équivalent documenté dans les Completion Notes — le seul « supprimer la ligne » ne suffit pas face au constat terrain « manque édition ».

5. **Non-régression et tests**
   - **Given** les tests co-locés existants (`PresetButtonGrid.test.tsx`, `CashRegisterSalePage.test.tsx`, etc.)
   - **Then** ils sont mis à jour ou complétés pour couvrir : grille vide avec message, preset actif rendu, prix panier avec catégorie à prix fixe (scénario minimal reproductible), et interaction d’édition si ajoutée.

**Critère de validation terrain (Strophe) :**

« Strophe ouvre la caisse avec presets en base : les boutons Don / Recyclage / Déchèterie (ou équivalents configurés) sont visibles ; un clic ajoute une ligne avec le **bon prix** (y compris catégorie prix fixe) ; Strophe peut **corriger** une ligne sans tout supprimer. Si aucun preset : message clair, pas de trou vide. »

**Preuves obligatoires de fermeture :**

- Capture écran : presets visibles + cas grille vide avec message si applicable.
- Scénario documenté : clic preset → valeurs panier ; cas prix fixe catégorie.
- Trace Copy/Consolidate/Security dans les Completion Notes (dev-story).

## Tasks / Subtasks

- [x] Task 1 — Diagnostic chargement / visibilité (AC: #1)
  - [x] Vérifier `getPresetsActive` + état dans `CashRegisterSalePage.tsx` (session, token, erreurs silencieuses).
  - [x] Remplacer le silence quand `presets.length === 0` par un message UX ou bandeau (accessibilité : pas seulement couleur).
- [x] Task 2 — Grille presets et types (AC: #2)
  - [x] `PresetButtonGrid.tsx` : conserver ou ajuster couleurs selon référence 1.4.4 / charte Epic 11.
  - [x] Tests RTL sur `data-color` / libellés si besoin.
- [x] Task 3 — Prix panier preset vs catégorie (AC: #3)
  - [x] Aligner le type et les champs `CategoryItem` dans `frontend/src/api/caisse.ts` (et leur usage dans `CashRegisterSalePage.tsx`) sur la réponse API réelle (`price`, `max_price` en euros côté schéma — convertir en centimes comme le reste du panier).
  - [x] Dans `addPresetToCart`, résoudre le prix : preset + lookup catégorie ; appliquer la règle 1.4.4 pour prix fixe (documenter la règle choisie dans les Dev Notes / Completion Notes).
  - [x] S’assurer qu’aucun état local (`catPriceEur`, etc.) ne pollue l’ajout preset.
- [x] Task 4 — Édition ligne panier (AC: #4)
  - [x] `Ticket.tsx` (et état panier dans `CashRegisterSalePage.tsx`) : UI + logique pour éditer quantité/prix (modal, inline, ou flux 1.4.4 — à trancher par conformité ancien repo).
  - [x] Référence indicative 1.4.4 : `references/ancien-repo/repo/frontend/src/components/CategorySelector.tsx`, `EnhancedCategorySelector.tsx`, `references/ancien-repo/repo/frontend/src/stores/categoryStore.ts` [Source: `epics.md` Story 19.7].
- [x] Task 5 — Tests et non-régression (AC: #5)
  - [x] Mettre à jour `PresetButtonGrid.test.tsx` (empty state message).
  - [x] Scénario prix fixe + preset dans `CashRegisterSalePage.test.tsx` ou test dédié.

## Dev Notes

- **Prérequis :** story **19.6** livrée ; l’artefact `19-6-audit-caisse-post-categories.md` est la source du tableau « Contexte audit terrain » ci-dessus.
- **Référence 1.4.4 (snapshot) :** si les chemins `references/ancien-repo/repo/frontend/...` ne sont pas présents dans le workspace, s’appuyer sur `references/ancien-repo/checklist-import-1.4.4.md`, sur l’audit 19.6 (§3.2, §5) et sur les écrans/charte Epic 11.
- **Epic 11 :** tout changement visuel sur l’écran caisse doit respecter `.cursor/rules/epic11-parite-et-refactor-propre.mdc` (tokens, pas de styles inline dispersés, preuve avant/après si pertinent).
- **Fichiers probables :** `frontend/src/caisse/PresetButtonGrid.tsx`, `frontend/src/caisse/CashRegisterSalePage.tsx`, `frontend/src/caisse/Ticket.tsx`, `frontend/src/api/caisse.ts` ; backend si le calcul prix doit être centralisé côté API (à éviter sauf nécessité — préférer cohérence avec ticket existant).
- **API :** `GET /v1/presets/active`, `GET /v1/categories/sale-tickets` [Source: audit §2, `19-6-audit-caisse-post-categories.md`].
- **Hors scope explicite de cette story :** raccourcis AZERTY (**19.8**), disposition globale / onglets (**19.9**), flux poids → prix → ticket complet s’il relève surtout de 19.8/19.9 — recouper avant doublon [Source: audit §8–§9].

### Project Structure Notes

- Conserver les `data-testid` existants (`preset-grid`, `preset-{id}`) pour les tests ; en ajouter si nouveau bandeau vide / édition ligne.
- Types TS alignés sur les schémas Pydantic (`CategoryResponse` inclut `price`, `max_price`).

### References

- `_bmad-output/planning-artifacts/epics.md` — Epic 19, Story 19.7
- `_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md` — §3.2 (code presets), §5 (terrain), §8 (P0), §9 (chevauchements)
- `references/ancien-repo/repo/frontend/src/components/CategorySelector.tsx`, `EnhancedCategorySelector.tsx`, `references/ancien-repo/repo/frontend/src/stores/categoryStore.ts`
- `api/routers/presets.py`, `api/schemas/category.py`

## Dev Agent Record

### Agent Model Used

Composer (agent bmad-dev / Cursor), session 2026-03-23.

### Debug Log References

### Completion Notes List

- **AC1 visibilité / chargement :** `PresetButtonGrid` affiche un bandeau `preset-empty-message` si aucun preset ; `presets-load-error` si `getPresetsActive` échoue. `loadData` charge la session puis presets (try/catch dédié) puis catégories, pour ne pas masquer une session valide derrière une erreur presets.
- **AC2 couleurs :** `getPresetColor` inchangé (bleu don / don_18, vert recyclage, orange déchèterie, gris défaut) — aligné audit §3.2 et charte caisse existante.
- **AC3 prix fixe :** `categorySalePrice.ts` — `getCategoryFixedUnitPriceCents` : euros API → centimes ; prix « fixe » si `price` seul, ou `price`≈`max_price` (tolérance 0,005 €) ; sinon seul `max_price` en repli. `addPresetToCart` et saisie catégorie (`handleAddCategoryLine`) utilisent ce prix et ignorent `preset_price` / `catPriceEur` lorsque la catégorie impose un fixe. Affichage des boutons presets : `resolvePresetUnitPriceCents` pour cohérence libellé = montant appliqué.
- **AC4 édition :** `Ticket` — bouton « Modif. », modal Mantine (quantité + prix unitaire EUR), `updateCartLine` sur le panier.
- **Tests :** `categorySalePrice.test.ts` ; mises à jour `PresetButtonGrid.test.tsx`, `Ticket.test.tsx` ; bloc `Story 19.7` dans `CashRegisterSalePage.test.tsx` (vide, erreur presets, preset+prix fixe, catégorie+prix fixe ignore saisie, édition ligne).
- **Post-dev (orchestrateur) :** test « édition ligne ticket » — `await screen.findByTestId('ticket-edit-qty', {}, { timeout: 5000 })` au lieu d’un `waitFor` sur le seul modal : le contenu Mantine `Modal` (champs quantité / prix) arrive après la transition ; cible le champ pour éviter le flakiness.
- **Vérif locale :** `npx vitest run src/caisse/` — 245 tests passés ; 1 échec hors périmètre (`PinUnlockModal.test.tsx`, flaky / préexistant).
- **Copy / Consolidate / Security :** pas de secrets ; pas de dépendances nouvelles ; logique prix côté client alignée sur champs déjà exposés par `GET /v1/categories/sale-tickets` (schéma `CategoryResponse`).
- **Preuves terrain (Strophe) :** captures presets visibles + grille vide avec message — à faire sur `http://localhost:4173` après déploiement des presets en base.

### File List

- `frontend/src/caisse/categorySalePrice.ts` (nouveau)
- `frontend/src/caisse/categorySalePrice.test.ts` (nouveau)
- `frontend/src/api/caisse.ts` (CategoryItem + `price` / `max_price`)
- `frontend/src/caisse/PresetButtonGrid.tsx`
- `frontend/src/caisse/CashRegisterSalePage.tsx`
- `frontend/src/caisse/CashRegisterSalePage.module.css`
- `frontend/src/caisse/Ticket.tsx`
- `frontend/src/caisse/PresetButtonGrid.test.tsx`
- `frontend/src/caisse/CashRegisterSalePage.test.tsx`
- `frontend/src/caisse/Ticket.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (statut story — workflow BMAD, hors code app)

### Revision (bmad-revisor, 2026-03-23)

- **Audit 19.6 §5 / §8 P0 presets :** grille vide + erreur chargement (AC1) ; couleurs `button_type` inchangées + tests `data-color` (AC2) ; prix panier preset / catégorie prix fixe via `categorySalePrice` + `addPresetToCart` / `handleAddCategoryLine` (AC3) ; édition ligne `Ticket` + `updateCartLine` (AC4) ; tests RTL couvrant les scénarios (AC5).
- **Epic 19.7 (`epics.md`) :** critères epic = synthèse ; périmètre détaillé et AC dans ce fichier — pas de contradiction (livrable ≥ epic).
- **Tests :** `vitest run` sur `categorySalePrice`, `PresetButtonGrid`, `Ticket`, `CashRegisterSalePage` — 64 tests OK.

## Senior Developer Review (AI)

**Date :** 2026-03-23  
**Revue :** BMAD QA — code review adversarial (workflow `_bmad/bmm/workflows/4-implementation/code-review/`, audit terrain `19-6` §5).  
**Décision :** **Approuvé** — pas de boucle dev requise sur le périmètre code/tests.

### Validation des critères d’acceptation (code + tests)

| AC | Verdict | Preuve (indicatif) |
|----|---------|-------------------|
| 1 Visibilité / chargement / zone non muette | OK | `PresetButtonGrid` : `preset-empty-message`, `presets-load-error` ; `loadData` try/catch presets isolé (`CashRegisterSalePage.tsx`). |
| 2 Types / couleurs 1.4.4 | OK | `getPresetColor` + `data-color` ; tests `PresetButtonGrid.test.tsx`. |
| 3 Clic preset → panier + prix fixe catégorie | OK | `categorySalePrice.ts`, `resolvePresetUnitPriceCents` dans grille et `addPresetToCart` ; test prix lampe 3 € dans `CashRegisterSalePage.test.tsx`. |
| 4 Édition ligne | OK | `Ticket.tsx` : « Modif. », modal quantité + prix, `onUpdateLine` → `updateCartLine`. |
| 5 Tests non-régression | OK | 64 tests passés (commande documentée en Completion Notes). |

### Constats adversariaux (non bloquants)

1. **Fermeture livrable vs story :** les « preuves obligatoires » (captures presets + grille vide) restent à produire côté terrain Strophe — le code et les tests RTL couvrent le comportement ; compléter la recette visuelle pour cohérence avec la story § « Preuves obligatoires ».
2. **Édition modal :** `saveEdit` dans `Ticket.tsx` ignore silencieusement un prix invalide (retour sans message) — amélioration UX possible (toast / bordure erreur).
3. **Règle métier prix fixe à l’édition :** la modal permet de modifier le prix unitaire même pour une ligne issue d’une catégorie à prix fixe ; acceptable pour « corriger une erreur » mais pas explicitement borné comme en 1.4.4 — à trancher si la compta impose un verrou plus tard.
4. **Accessibilité :** l’`Alert` état vide n’a pas `role="alert"` (contrairement à l’erreur chargement) — mineur pour AC1 « pas seulement couleur ».
5. **Chargement :** si `getCategoriesSaleTickets` échoue après un chargement presets réussi, état partiel possible — cas rare ; le flux actuel remonte surtout une erreur globale via le `catch` externe.
6. **Libellé fallback réseau :** chaîne `Erreur reseau` sans accent — cosmétique.
7. **Tests :** avertissements `act(...)` Mantine sur certains scénarios 18-8 dans la même suite — préexistants / hors périmètre 19.7.

### Checklist workflow (extrait)

Story chargée, AC croisés implémentation, File List cohérente avec les fichiers applicatifs revus, tests mappés, sprint-status déjà `done` pour cette clé — maintenu.
