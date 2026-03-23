# Story 19.6: Caisse — audit de conformite 1.4.4 post-categories (terrain)

Status: done

<!-- Story BMAD (contexte dev / facilitation). Livrable terrain distinct : voir section « Fichier livrable audit ». -->

**2026-03-23 (terrain) :** Strophe a rempli les tableaux §4–§7, §1 (date), et la synthèse §8 + chevauchements §9 ont été consolidés dans le livrable. Le **critère Epic « Strophe a complété le parcours et produit l’artefact »** est **satisfait** pour cadrer **19.7–19.9**.

## Story

As a equipe dev,
I want un audit terrain cible de la caisse avec categories fonctionnelles,
so that les stories de correction 19.7–19.9 aient une cible precise et verifiee.

## Contexte

Les stories 18.5–18.7 ont ete marquees done / approved, mais l’audit terrain 2026-03-16 constate que la caisse reste non conforme a la 1.4.4 (presets peu ou pas visibles, raccourcis AZERTY absents ou partiels, disposition differente). Tant que les categories n’etaient pas fiables (import incomplet), cet audit etait peu significatif. **Apres 19.1 (import categories corrige) et le flux admin / reception stabilise**, l’audit doit etre refait **sur le terrain** (parcours reel avec donnees coherentes).

Cette story est **majoritairement manuelle** : elle ne vise pas une grosse livraison de code, mais la **production d’un artefact structure** qui sert de contrat d’entree pour 19.7, 19.8 et 19.9.

**Regle Epic 19** : pas d’enchainement automatique des stories ; Strophe valide apres chaque livraison. Ici, la **livraison dev** = gabarit + audit documentaire code dans le livrable ; la **livraison complete** (AC terrain) = meme fichier une fois les tableaux §4–§8 et la synthese §8 remplis par Strophe.

## Acceptance Criteria

1. **Given** la caisse ouverte avec des categories disponibles (19.1 valide — import racines + sous-categories OK)
   **When** Strophe parcourt la caisse (selection categorie / sous-categorie, ajout d’article au panier, onglets, presets si visibles, raccourcis clavier, layout global)
   **Then** un artefact liste **pour chaque point verifie** : statut (**OK** / **KO** / **Partiel**), comportement attendu (1.4.4, resume), comportement observe (terrain), ecart residuel a corriger (formulation actionnable pour 19.7–19.9)

2. **Given** l’artefact d’audit
   **When** un dev lit les sections « presets », « raccourcis AZERTY », « disposition / layout »
   **Then** il peut deriver sans ambiguite quelles corrections appartiennent a 19.7 vs 19.8 vs 19.9 (ou noter les chevauchements explicitement)

## Critere de validation terrain

« Strophe a complete le parcours caisse avec categories et produit l’artefact d’audit. »

## Preuves obligatoires de fermeture

- **Preuve livraison dev (satisfaite)** : fichier `_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md` avec la structure minimale (metadonnees, preconditions, themes en tableaux, synthese et chevauchements), sections terrain **gabarit** pretes (placeholders explicites), plus **audit documentaire** code (§3) separe du terrain.
- **Preuve fermeture Epic / AC terrain (2026-03-23)** : themes renseignes en **OK / KO / Partiel** dans §4–§7 ; rattachements **19.7** / **19.8** / **19.9** ; date §1 ; synthese §8 et chevauchements §9 remplis. Les stories **19.7–19.9** peuvent s’appuyer sur cet audit terrain.
- Le **Dev Agent Record** renvoie le chemin du livrable ; la **date audit terrain** est dans le livrable §1 une fois Strophe a jour.

## Fichier livrable audit (obligatoire — reference epics)

Creer ou mettre a jour le fichier :

`_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md`

Ce fichier est **distinct** du present fichier story BMAD. Les stories 19.7–19.9 s’y referent explicitement dans `epics.md`. Le contenu doit au minimum reprendre la structure proposee ci-dessous (remplir apres le passage terrain).

### Structure recommandee pour `19-6-audit-caisse-post-categories.md`

1. Metadonnees (date, environnement : dev Docker / machine Strophe, build ou commit si connu)
2. Preconditions (19.1 valide, session caisse ouverte, URL utilisee)
3. Tableau ou sections par theme, chaque ligne / sous-section avec colonnes ou puces :
   - **Point teste**
   - **Statut** (OK / KO / Partiel)
   - **Attendu 1.4.4** (court)
   - **Observe**
   - **Ecart / story cible** (19.7 / 19.8 / 19.9 / autre)
4. Synthese : liste priorisee des KO et Partiels pour alimenter le backlog des trois stories suivantes

## Tasks / Subtasks

- [x] Task 1 — Preconditions (AC: #1)
  - [x] Confirmer 19.1 done : categories + sous-categories visibles en caisse (`GET` categories vente OK)
  - [x] Parcours documente pour le terrain : `http://localhost:4173` → dashboard caisse → `/cash-register/sale`
  - [x] Strophe : ouvrir une **session caisse reelle** avant de remplir §2 (cases a cocher) et §4–§7

- [x] Task 2 — Grille categories & sous-categories
  - [x] Gabarit §4 + fil conducteur dans `19-6-audit-caisse-post-categories.md`
  - [x] Parcours terrain Strophe : onglet categories, parent / enfant, ajout ligne ; remplir §4 (AC #1)

- [x] Task 3 — Presets (Don, Recyclage, Decheterie, etc.)
  - [x] Gabarit §5 + lien story **19.7** dans l’artefact
  - [x] Parcours terrain Strophe : presence, clic, UX ; remplir §5 (AC #1, #2)

- [x] Task 4 — Raccourcis clavier AZERTY
  - [x] Gabarit §6 + croisement inventaire **18-4** (consignes) ; audit documentaire §3.3 dans l’artefact
  - [x] Parcours terrain Strophe : touches reelles vs 1.4.4 ; remplir §6 (AC #1, #2)

- [x] Task 5 — Layout & disposition
  - [x] Gabarit §7 + reference charte Epic 11 dans l’artefact
  - [x] Parcours terrain Strophe : comparer zones a la 1.4.4 ; remplir §7 (AC #1, #2)

- [x] Task 6 — Finalisation livrable (partie dev)
  - [x] Rediger / consolider `19-6-audit-caisse-post-categories.md` (structure, §3 code, instructions §10)
  - [x] Mettre a jour la presente story : Dev Agent Record, lien vers artefact
  - [x] Strophe : remplir §1 (date), §8 (synthese KO/Partiels), §9 si chevauchements ; critere terrain valide (2026-03-23)

## Dev Notes

### URLs dev (rappel)

- Frontend : `http://localhost:4173`
- API : `http://localhost:9010`
- Parcours typique : `/caisse` ou dashboard → ouverture session → `/cash-register/sale`

### Fichiers code utiles pour croiser audit documentaire / terrain

- Page saisie vente : `frontend/src/caisse/CashRegisterSalePage.tsx` (grille, presets, raccourcis, ticket)
- Grille categories : `frontend/src/caisse/CategoryGrid.tsx`
- Presets UI : `frontend/src/caisse/PresetButtonGrid.tsx`
- Raccourcis : `frontend/src/caisse/utils/cashKeyboardShortcuts.ts`, `frontend/src/caisse/utils/azertyKeyboard.ts`
- Header / KPI : `frontend/src/caisse/CaisseHeader.tsx`, `frontend/src/caisse/CaisseStatsBar.tsx`
- API caisse : `frontend/src/api/caisse.ts` (`getCategoriesSaleTickets`, `getPresetsActive`, etc.)

### References documentaires (ne pas se substituer au terrain)

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 19, Story 19.6, ordre 19.6 → 19.7–19.9]
- [Source: references/artefacts/2026-03-16_audit-fonctionnel-terrain.md]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-16.md]
- [Source: _bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md — inventaire documentaire ; section 2 grille / presets, raccourcis, layout]
- [Source: _bmad-output/implementation-artifacts/18-4-audit-caisse-1-4-4-inventaire-fonctionnel-exhaustif.md — variante exhaustive si besoin]
- Regle conduite visuelle : `.cursor/rules/epic11-parite-et-refactor-propre.mdc` et artefacts 11-x references dans cette regle

### Project Structure Notes

- Pas de nouveau module npm attendu pour cette story.
- Si un template Markdown est genere par script, rester dans `_bmad-output/implementation-artifacts/`.

### Testing Requirements

- **Pas de tests automatises obligatoires** pour fermer cette story : la preuve est l’artefact terrain + critere Strophe.
- Si correction mineure (ex. typo template), pas d’impact CI.

### Intelligence story precedente (19.5)

- 19.5 a renforce la robustesse Reception (ErrorBoundary). Pour la caisse, noter dans l’audit toute page blanche ou crash React sur `/cash-register/sale` comme **KO** avec lien eventuel vers bug separe.

## Dependencies

- **19.1** — import categories (parent_id / sous-categories) : **done** en suivi sprint ; **validation Strophe** requise pour que l’audit terrain soit significatif (alignement `epics.md`).
- **19.7–19.9** — **debloquées** : livrable `19-6-audit-caisse-post-categories.md` complété avec le terrain du 2026-03-23 (tableaux + synthèse §8 + chevauchements §9)

## Change Log

- **2026-03-23** — Story fermee cote livraison dev : creation du fichier livrable `19-6-audit-caisse-post-categories.md` (structure complete, tableaux themes, section audit documentaire preliminaire depuis le code, instructions pour parcours terrain). Sprint 19-6 passe a **done** avec gate explicite : remplissage terrain par Strophe dans les tableaux §4–§8 et date en §1.
- **2026-03-23 (revision)** — Alignement AC : preuves scindees (dev vs terrain Strophe) ; taches 2–6 : sous-taches terrain laissees ouvertes ; note en tete de fichier pour eviter lecture « story totalement close » alors que §4–§8 du livrable sont encore des placeholders.
- **2026-03-23 (code-review QA)** — Review adversarial : approuve livraison dev ; findings mineurs documentaires (§3.3 formulation finalisation, File List / epics, lignes fragiles) en section Senior Developer Review.
- **2026-03-23 (terrain Strophe + consolidation)** — Tableaux §4–§7 remplis ; §8 synthese priorisee et §9 chevauchements ajoutes dans le livrable ; taches terrain de la story cochees ; **19.7–19.9** peuvent demarrer sur cette base.

## Dev Agent Record

### Agent Model Used

bmad-dev (Cursor), session 2026-03-23

### Debug Log References

Aucun.

### Completion Notes List

- Livrable obligatoire : `_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md` — metadonnees, preconditions, **Audit documentaire preliminaire** (code vs terrain clairement separe), tableaux terrain pour grille categories, presets (19.7), AZERTY (19.8), layout (19.9), synthese KO/Partiels, chevauchements, instructions Strophe.
- **Gate final (HITL)** : **ferme 2026-03-23** — parcours Strophe documente dans §4–§7 ; date §1 ; synthese §8 et chevauchements §9 dans le livrable.
- **Date audit terrain** : **23/03/2026** (inscrite §1 du livrable).
- 19.1 : confirme **done** dans `sprint-status.yaml` au moment de l’implementation.
- Parcours dev documente : `http://localhost:4173` → dashboard caisse → `/cash-register/sale` ; API `GET /v1/categories/sale-tickets`, `GET /v1/presets/active`.

### File List

- `_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md` — **cree** (livrable audit distinct, structure + placeholders terrain + audit documentaire code)
- `_bmad-output/implementation-artifacts/19-6-caisse-audit-conformite-1-4-4-post-categories.md` — **mis a jour** (tasks, status, Dev Agent Record, Change Log)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — **mis a jour** (19-6 → done)

## Senior Developer Review (AI)

**Date :** 2026-03-23 · **Resultat :** Approuve (livraison dev / gabarit + audit documentaire code ; gate terrain Strophe inchangé)

### Resume adversarial

- **AC / preuves :** La preuve « dev » (structure livrable, §3 séparé du terrain, tableaux §4–§7 en gabarit, §8–§9, instructions §10) est **conforme** aux « Preuves obligatoires » de la story. Les sous-taches terrain restent ouvertes comme annoncé ; pas de case `[x]` usurpée.
- **Croisement code (hors `_bmad-output`) :** Constats §3.1 (26 premieres categories API pour raccourcis / badges), §3.2 (`PresetButtonGrid` retourne `null` si vide), §3.3 (`useEffect` deps `[]`, listener `document` L205–L261, Enter → `handleFinalize` avec garde panier vide), §3.4 (zones composants) **verifies** sur `CashRegisterSalePage.tsx`, `CategoryGrid.tsx`, `PresetButtonGrid.tsx`, `cashKeyboardShortcuts.ts`.

### Findings (non bloquants)

| Gravite | Description |
|---------|-------------|
| Moyenne | §3.3 : formulation « raccourcis globaux **partiellement** suspendus » sous `FinalizationScreen` — le handler quitte **immediatement** si `showFinalizationRef` est vrai (suspension complete des raccourcis document, pas partielle). A preciser dans une prochaine passe doc si besoin. |
| Moyenne | **File List :** si `epics.md` a ete ajuste pour pointer explicitement le livrable 19-6, mentionner ce fichier dans le File List des prochaines stories liees (transparence git). |
| Basse | Reference « L205–L261 » dans le livrable : fragile au refactor ; preferer ancrage par commentaire de section dans le code ou recherche `keydown` / `showFinalizationRef`. |
| Basse | Statut fichier `done` sans lecteur attentif sur la note de tete : risque de confusion ; deja mitige par la relecture 2026-03-23. |

### Sprint

`development_status['19-6-caisse-audit-conformite-1-4-4-post-categories']` : **done** — maintenu (pas de retour `in-progress` : fermeture sprint = branche dev livree, terrain = HITL).
