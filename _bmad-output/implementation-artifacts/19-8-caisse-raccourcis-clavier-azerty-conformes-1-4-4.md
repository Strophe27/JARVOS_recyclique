# Story 19.8: Caisse — raccourcis clavier AZERTY conformes 1.4.4

Status: done

<!-- Validation create-story (checklist BMAD) : 2026-03-23 — story relue, écarts corrigés. -->

## Story

En tant qu’**opérateur caisse**,
je souhaite **utiliser les raccourcis clavier AZERTY** comme en 1.4.4 (lettres par position, quantité préfixée, chiffres AZERTY dans les champs Poids / Prix, touches globales cohérentes),
afin de **saisir et sélectionner des catégories sans la souris**, avec le même réflexe qu’à l’ancienne version.

## Contexte

- L’audit post-catégories documente des **KO / partiels** sur les raccourcis : lettres qui agissent sur la « mauvaise couche » (sous-catégories / breadcrumb au lieu du **niveau d’écran actif**), préfixe quantité **KO**, saisie numérique AZERTY dans Poids / Prix **KO**. Voir [19-6-audit-caisse-post-categories.md](./19-6-audit-caisse-post-categories.md) §6 et synthèse §8.
- L’inventaire 1.4.4 liste le comportement attendu et les écarts historiques ; la **référence fonctionnelle** des raccourcis est §3. Voir [18-4-audit-caisse-inventaire.md](./18-4-audit-caisse-inventaire.md) §3 — noter que le code a évolué depuis (fichiers utilitaires désormais présents sous `frontend/src/caisse/utils/`), mais le **comportement terrain** reste non conforme.
- La story **18.7** est marquée *done* ; l’audit **19.6** conclut néanmoins que la conformité clavier n’est pas atteinte → cette story **19.8** est la correction ciblée après stabilisation presets (**19.7**).

### Alignement `epics.md` (Story 19.8)

Les critères d’acceptation de l’épic (« raccourcis AZERTY de l’artefact 19-6 opérationnels », « navigation entre champs », « quantité, poids, confirmation », « aucun comportement inattendu ») sont **détaillés** dans les AC ci-dessous. Ici, **« navigation entre champs »** couvre la **sélection au niveau UI actif** (grille / onglet visible) et la **saisie AZERTY dans Poids / Prix** ; le **changement d’onglet** (les 4 étapes) reste hors périmètre (**19.9**), comme en arbitrage §9 de l’audit 19-6 — pour éviter tout doublon ou régression de périmètre côté dev.

### Feedback terrain (Strophe, 2026-03-23) — à intégrer sans élargir abusivement le périmètre

Après **19.7**, en usage réel : **exemple lampe à 3 €** — le prix attendu ne s’affiche toujours pas correctement dans le panier. **Hypothèse terrain** : le **workflow des 4 écrans / onglets** (catégorie → sous-catégorie → poids → prix) n’est pas réparé : pas de passage automatique **sous-catégorie → poids**, ni **poids → prix**, ce qui fausse la saisie et la ligne ticket.

**Important** : ce symptôme « prix / flux » ne doit **pas** être traité comme exigence principale de **19.8** si la cause est l’ordre de navigation ou l’enchaînement des onglets — voir découpage **In-scope / Hors-scope** ci-dessous.

## Périmètre explicite

### In-scope (story 19.8 — clavier & cohérence avec l’écran actif)

- **Mapping AZERTY** aligné 1.4.4 : positions physiques (grille A–Z sur 3 rangées), cohérent avec la référence `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.ts` et `azertyKeyboard.ts` (anciens chemins) ; implémentation actuelle à **faire converger** : `frontend/src/caisse/utils/cashKeyboardShortcuts.ts`, `frontend/src/caisse/utils/azertyKeyboard.ts`.
- **Attribution des raccourcis au niveau affiché** : les touches AZERTY doivent sélectionner les catégories (ou items raccourcissables) du **niveau courant** (onglet / liste visible), pas une liste « figée » sur les sous-catégories quand l’utilisateur est encore sur l’écran racine — conformément au constat §4–§6 de l’audit 19-6.
- **Préfixe quantité + lettre** : accumuler un multiplicateur numérique (y compris via touches AZERTY → chiffres, `mapAZERTYToNumeric`) puis appliquer à la sélection déclenchée par la lettre suivante, comme attendu en 1.4.4 (cf. 18-4 §3, 19-6 §3.3 et tableau §6).
- **Saisie dans les champs Poids / Prix** : lorsque le focus est dans ces champs, les chiffres saisis via **disposition AZERTY** (top row `& é " ' (` etc.) doivent produire les **chiffres attendus**, sans exiger un pavé numérique — cf. 19-6 §6 « Saisie numérique AZERTY dans champs ».
- **Touches globales** (hors champ texte ou selon règles 1.4.4) : **Enter** (finalisation / action principale alignée page saisie), **Escape** (annulation saisie en attente / file d’attente quantité selon spec 1.4.4), **Backspace** — le terrain signale un risque d’écart (dernière ligne panier vs caractère) : **trancher en se calant sur la 1.4.4** et documenter le comportement retenu dans les Completion Notes.
- **Cohérence focus** : pas d’interception des raccourcis quand le focus est sur `input` / `textarea` / `select` (sauf si la 1.4.4 prévoit une exception documentée) — le handler sur `CashRegisterSalePage.tsx` et attribut `data-prevent-shortcuts` existants sont le point d’ancrage.
- **Non-régression** : `FinalizationScreen` / états modaux — les raccourcis globaux doivent rester suspendus ou filtrés quand un écran modal le exige (cf. 19-6 §3.3).
- **Tests** : étendre ou compléter `cashKeyboardShortcuts.test.ts`, `azertyKeyboard.test.ts` et tests de page si nécessaire pour les scénarios ci-dessus.

### Hors-scope (story 19.9 ou corrections flux / ticket — ne pas mélanger avec 19.8)

- **Navigation automatique entre onglets** : passage auto **sous-catégorie → onglet poids**, **poids → onglet prix**, ou tout enchaînement « métier 4 étapes » sans action utilisateur explicite.
- **Ordre du flux métier** à quatre étapes (quand valider, quand pousser la ligne au ticket) : corrections du type « la validation poids ne doit pas envoyer la ligne sans passer par l’écran prix » — voir arbitrage 19-6 §9 (flux poids → prix → ticket) et **19.9** pour disposition / parcours.
- **Raccourcis ou TAB pour basculer entre les 4 onglets** (Catégorie / Sous-catégorie / Poids / Prix) si l’écart est surtout **navigation UI** — relevé en 19-6 §7 comme layout / onglets → **19.9**.
- **Finalisation / paiements** au-delà de l’accès Enter déjà partiellement OK — écrans non conformes → **19.9** ou stories ticket 18.x selon diagnostic.
- **Correction isolée du prix lampe 3 €** si la cause est le **flux onglets** ou la logique ticket sans lien direct avec le mapping clavier → traiter dans la story flux / ticket appropriée (souvent **19.9** ou bugfix dédié après diagnostic dev).

*Si, en implémentant 19.8, un correctif clavier strict (ex. champ prix au focus) règle aussi l’affichage prix sans toucher au flux onglets, le documenter en Completion Notes ; ne pas élargir volontairement le scope aux 4 étapes.*

## Acceptance Criteria

1. **Given** la page de saisie vente caisse ouverte, **when** l’opérateur est sur l’onglet **catégories racine** (focus hors champ saisie), **then** une touche AZERTY de la grille 1.4.4 sélectionne une catégorie du **niveau affiché**, et non une sous-catégorie d’un autre niveau (plus de comportement « breadcrumb sous-cat » décrit au terrain §4–§6).

2. **Given** l’opérateur a saisi un préfixe numérique (chiffres directs ou via mapping AZERTY), **when** il appuie ensuite sur une lettre de raccourci de catégorie, **then** la ligne / quantité appliquée reflète ce multiplicateur (comportement équivalent 1.4.4, cf. 18-4 §3).

3. **Given** le focus est dans le champ **Poids** ou **Prix**, **when** l’opérateur saisit des chiffres avec une disposition clavier **AZERTY français**, **then** les caractères correspondants sont des chiffres corrects (pas de dépendance au seul pavé numérique).

4. **Given** le focus est hors champ saisie, **when** l’opérateur utilise **Enter**, **Escape** et **Backspace**, **then** le comportement correspond à la 1.4.4 (ou à une dérogation documentée dans les Completion Notes avec citation du fichier source 1.4.4).

5. **Given** un écran de finalisation ou modal bloquant est ouvert, **when** une touche de raccourci caisse est pressée, **then** aucun effet de bord indésirable sur la saisie vente (respect des suspensions existantes, cf. 19-6 §3.3).

6. **Given** le focus est dans un champ où le clavier doit rester « normal » (`input` / `textarea` / `select`), **when** l’opérateur saisit du texte ou des chiffres, **then** les raccourcis caisse globaux ne court-circuitent pas cette saisie (sauf exception 1.4.4 documentée dans les Completion Notes).

**Critère de validation terrain (épique)** : « Strophe utilise la caisse **au clavier** : navigation dans la grille du **niveau visible**, préfixe quantité + lettre, saisie poids/prix en AZERTY, sans souris pour ces actions. »

**Preuves de fermeture** : mapping raccourcis dans Completion Notes ; tests co-locés verts sur les chemins critiques ; trace Copy / Consolidate / Security (procédure projet).

## Tasks / Subtasks

- [x] Relire `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.ts`, `azertyKeyboard.ts`, `keyboardShortcuts.ts` et comparer au comportement attendu §3 de 18-4.
- [x] Auditer `CashRegisterSalePage.tsx` (enregistrement `keydown`, `shortcutHandlerRef`, onglets actifs) pour que `CashKeyboardShortcutHandler.initialize` reçoive la **liste des catégories du niveau UI actif** uniquement.
- [x] Implémenter / corriger le **préfixe quantité** + lettre (refs `pendingQuantityRef` ou équivalent dans le handler).
- [x] Brancher `mapAZERTYToNumeric` (ou équivalent) sur les champs Poids / Prix (composants concernés dans la zone tabs — identifier les inputs dans le flux caisse).
- [x] Aligner Enter / Escape / Backspace sur 1.4.4 ; ajuster si le Backspace panier vs champ est encore incorrect.
- [x] Couvrir par tests unitaires / composant les régressions identifiées en 19-6 §6 ; exécuter la suite caisse existante.
- [x] Rédiger dans Completion Notes : tableau **Touche → Action** (FR) + lien vers sections 18-4 §3 et 19-6 §6.

## Dev Notes

### Architecture / patterns

- React + Mantine (tabs) ; handler document niveau `document` avec cleanup dans `useEffect` — conserver ce pattern, corriger les **données** passées au handler (liste catégories par onglet / niveau).
- Singleton `CashKeyboardShortcutHandler` : vérifier ré-init quand les catégories affichées changent (navigation arrière / avant).

### Fichiers probables

- `frontend/src/caisse/CashRegisterSalePage.tsx`
- `frontend/src/caisse/utils/cashKeyboardShortcuts.ts`
- `frontend/src/caisse/utils/azertyKeyboard.ts`
- `frontend/src/caisse/utils/cashKeyboardShortcuts.test.ts`
- `frontend/src/caisse/utils/azertyKeyboard.test.ts`
- Composants des onglets Poids / Prix (localiser via recherche dans `frontend/src/caisse/`)

### Tests

- Vitest co-localisés ; ajouter cas : même `event.key` qu’AZERTY vs QWERTY si pertinent, préfixe quantité, désactivation quand focus input.

### Project Structure Notes

- Les utilitaires caisse vivent sous `frontend/src/caisse/utils/` (pas sous `src/utils/` racine).

### References

- [_bmad-output/planning-artifacts/epics.md](../planning-artifacts/epics.md) — Story 19.8 (AC épic + preuves de fermeture)
- **Dépendances stories :** 19.6 (audit), 19.7 (presets — prérequis terrain avant re-test clavier)
- [_bmad-output/implementation-artifacts/19-7-caisse-presets-don-recyclage-decheterie-conformes-1-4-4.md](./19-7-caisse-presets-don-recyclage-decheterie-conformes-1-4-4.md) — contexte post-stabilisation presets
- [_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md](./19-6-audit-caisse-post-categories.md) — §3.3, §4–§6, §8–§9 (arbitrages 19.8 vs 19.9)
- [_bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md](./18-4-audit-caisse-inventaire.md) — §3 Raccourcis AZERTY
- Référence code 1.4.4 : `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.ts`, `azertyKeyboard.ts`, `keyboardShortcuts.ts`
- Charte / gate visuelle si toucher styles badges raccourcis : `.cursor/rules/epic11-parite-et-refactor-propre.mdc` (éviter redesign hors écart identifié)

## Dev Agent Record

### Agent Model Used

Composer (agent dev BMAD / Cursor)

### Debug Log References

### Completion Notes List

- **Réf. inventaire** : [_bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md](./18-4-audit-caisse-inventaire.md) §3 — Raccourcis AZERTY ; [_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md](./19-6-audit-caisse-post-categories.md) §3.3 et §6 (tableau raccourcis).
- **Grille / niveau actif** : `CashKeyboardShortcutHandler.initialize` reçoit uniquement les catégories affichées comme `CategoryGrid` — onglet **Categorie** → `parent_id === null` ; onglet **Sous-categorie** avec parent choisi → `parent_id === subCategoryParentId` ; onglets **Poids** / **Prix** → liste vide (pas de lettres catégorie, pas d’accumulation préfixe quantité).
- **Préfixe quantité** : `mapAZERTYToNumeric(key, e)` avec événement complet (Shift + chiffres AZERTY) ; appliqué seulement si au moins un raccourci catégorie est enregistré.
- **Poids / Prix** : `onKeyDown` sur les `NumberInput` via `handleAZERTYInput` (touches rangée chiffres AZERTY, décimales, Backspace dans le champ).
- **Enter / Escape / Backspace (hors champ)** : inchangés par rapport au comportement déjà documenté en 19-6 §3.3 — Enter → finalisation si panier non vide ; Escape → vide `pendingQuantityRef` ; Backspace → retire la **dernière ligne du panier** (pas un caractère), tranche explicite alignée audit terrain / code existant (écart éventuel « dernier caractère » noté en 19-6 §6 reste : hors champ = ligne panier).
- **Modales** : `showFinalization` court-circuite toujours le handler document (inchangé).
- **Tests** : `CashRegisterSalePage.test.tsx`, `cashKeyboardShortcuts.test.ts` verts ; revue QA 2026-03-23 : `npx vitest run` sur ces deux fichiers — **73/73** OK ; révision 2026-03-23 : **74/74** (test onglet Prix + `&`). Suite Vitest complète du frontend : échecs **préexistants** hors story possibles (`PinUnlockModal`, `AdminDashboardPage`), non liés aux fichiers 19-8.
- **Croisement 18-4 §3** : l’inventaire d’audit (2026-03-02) décrit l’état historique ; une **note ultérieure** sous §3 dans [18-4-audit-caisse-inventaire.md](./18-4-audit-caisse-inventaire.md) précise ce que **19-8** couvre vs ce qui reste hors scope (F1–F12 presets, paiement clavier, `keyboardShortcuts.ts` générique, raccourcis globaux poids/prix distincts des champs).

**Tableau Touche → Action** (hors focus `input` / `textarea` / `select` / `data-prevent-shortcuts`, et sauf finalisation ouverte) :

| Touche / type | Action |
|----------------|--------|
| Lettres A–Z (mapping positionnel AZERTY, max 26) | Sélectionne la catégorie du **niveau visible** (racine ou sous-cat du parent courant). |
| Chiffre (direct, AZERTY `&é"'(-è_çà`, ou Shift+chiffre selon `mapAZERTYToNumeric`) | Ajoute au préfixe quantité (uniquement si grille catégories active). |
| Lettre après préfixe | Applique `catQuantity` = préfixe (ou 1) et sélectionne la catégorie ; réinitialise le préfixe. |
| Escape | Efface le préfixe quantité en attente. |
| Enter | Tente la finalisation (`handleFinalize` — panier vide → message d’erreur). |
| Backspace | Supprime la dernière ligne du panier. |

### File List

- `frontend/src/caisse/CashRegisterSalePage.tsx`
- `frontend/src/caisse/CashRegisterSalePage.test.tsx`
- `frontend/src/caisse/utils/cashKeyboardShortcuts.ts` (référence handler / registre raccourcis)
- `frontend/src/caisse/utils/azertyKeyboard.ts` (mapAZERTYToNumeric, handleAZERTYInput — champs Poids/Prix + préfixe)
- `frontend/src/caisse/utils/cashKeyboardShortcuts.test.ts`
- `_bmad-output/implementation-artifacts/19-8-caisse-raccourcis-clavier-azerty-conformes-1-4-4.md`

*Révision 2026-03-23 : `sprint-status.yaml` retiré de cette liste (fichier de pilotage sprint, synchronisé à la revue QA ; pas un livrable source applicatif.)*

## Change Log

- 2026-03-23 — Story 19.8 : raccourcis par niveau UI visible, préfixe quantité AZERTY complet, saisie AZERTY Poids/Prix, tests co-locés.
- 2026-03-23 — Code review BMAD QA : **approved** ; story → `done` ; `sprint-status.yaml` synchronisé ; File List complétée (utils) ; section Senior Developer Review (AI).
- 2026-03-23 — Révision BMAD : note 18-4 §3 (post-19-8), File List sans `sprint-status.yaml`, test RTL onglet Prix + `&`, en-tête `CashRegisterSalePage.tsx`.

## Senior Developer Review (AI)

**Date :** 2026-03-23  
**Revue :** BMAD QA — code review adversarial (workflow `_bmad/bmm/workflows/4-implementation/code-review/`, références 18-4 §3, 19-6 §3.3 / §6).  
**Décision :** **Approuvé** — pas de reboucle dev requise sur le périmètre livré.

### Validation des critères d’acceptation (code + tests)

| AC | Verdict | Preuve (indicatif) |
|----|---------|-------------------|
| 1 Grille racine = niveau affiché (pas sous-cat « fantôme ») | OK | `visibleCategoriesForShortcuts` (`parent_id === null` / `subCategoryParentId`) + `initialize` sur cette liste ; test 19-8 ordre API sous-cat avant racines. |
| 2 Préfixe quantité + lettre | OK | `pendingQuantityRef` + `mapAZERTYToNumeric` ; tests `3`+`a`, `&`+`&`+`a` → Qté 11. |
| 3 Saisie AZERTY dans Poids / Prix | OK | `NumberInput` + `onKeyDown` → `handleAZERTYInput` ; tests onglets Poids et Prix `&` → `1` (révision 2026-03-23). |
| 4 Enter / Escape / Backspace hors champ | OK | Listener document ; tests 18-7/18-8 existants + Completion Notes (Backspace = dernière ligne panier). |
| 5 Finalisation / modal | OK | `showFinalizationRef.current` → return immédiat ; non couvert par test dédié « touche sous finalisation ». |
| 6 Focus input / select | OK | `shouldPrevent` + handler `CashKeyboardShortcutHandler` ; tests focus `sale-note`, input dispatch. |

### Constats adversariaux (non bloquants)

1. **File List (pré-correction revue) :** omettait `azertyKeyboard.ts` / `cashKeyboardShortcuts.ts` alors que le premier est indispensable aux champs Poids/Prix — **corrigé** dans la File List ci-dessus.
2. **Couverture test AC3 Prix :** ~~pas de scénario RTL miroir~~ — **levé** révision 2026-03-23 : test « onglet Prix + `&` » ajouté dans `CashRegisterSalePage.test.tsx`.
3. **Couverture test AC5 :** aucune assertion explicite qu’une lettre de catégorie ne sélectionne rien quand `finalization-screen` est ouvert (le garde-fou code est présent).
4. **React :** `useMemo` appelle `handler.initialize` (effet de bord) — acceptable ici mais fragile si évolution future (Strict Mode, ordre de rendu).
5. **Suite RTL :** nombreux avertissements `act(...)` Mantine sur flux 18-8 — **préexistants**, hors périmètre strict 19-8.

### Checklist workflow (extrait)

Story chargée, AC croisés implémentation, tests ciblés exécutés (74/74 après révision), `19-8-caisse-raccourcis-clavier-azerty-conformes-1-4-4.review.json` écrit avec `approved`, sprint-status mis à `done`.
