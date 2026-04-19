# Story 25.2 : Fermer l'ADR PIN kiosque versus PIN opérateur et secret de poste

Status: done

**Story key :** `25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste`  
**Epic :** 25 — Socle d'alignement PRD vision kiosque / multisite / permissions, brownfield et ADR  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste.md`

## Contexte produit

Story **documentaire** : produire une **ADR approuvée** qui sépare explicitement le **PIN opérateur** (canon brownfield, serveur, JWT, step-up) du **modèle cible PIN kiosque / secret de poste** (PRD vision PWA offline-first), afin que auth, lockout, comportement offline et règles de revalidation ne divergent pas entre équipes. Le gel BMAD hors `25-*` reste actif jusqu'à levée documentée ; cette story ne code pas le kiosque, elle **ferme la décision d'architecture**.

**Prérequis :** matrice d'alignement Story 25.1 (`references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md`) — ligne PIN kiosque en **ADR requise**.

## Story (BDD)

As a **security and product owner**,  
I want **an approved ADR that separates the canonical operator PIN from the target kiosk PIN model**,  
So that **authentication, lockout, offline behavior, and step-up rules do not drift into contradictory implementations**.

## Acceptance criteria

Voir `_bmad-output/planning-artifacts/epics.md` — **Story 25.2**. Rappel normatif :

**Given** `_bmad-output/planning-artifacts/prd.md` distingue `PIN opérateur` de `PIN kiosque` et le rapport de recherche documente le chemin PIN côté serveur brownfield  
**When** l'ADR est produite  
**Then** elle fixe le **modèle de confiance** retenu pour l'identité kiosque, la vérification locale / hybride / autre, les **seuils de lockout**, la **tolérance offline** et les **frontières de revalidation** sans affaiblir le **PIN opérateur** canonique côté serveur  
**And** elle cite au minimum `_bmad-output/planning-artifacts/prd.md`, `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`, et `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`  
**And** elle nomme les **stories aval** qui restent bloquées tant que cette ADR n'est pas approuvée, y compris toute future story d'auth kiosque ou de « passer la main »

## Définition of Done

- [x] Fichier ADR publié sous un chemin stable du dépôt (convention alignée sur les ADR BMAD existantes, p. ex. `_bmad-output/planning-artifacts/architecture/` avec préfixe date — nom exact laissé à la rédaction VS/ADR).
- [x] Contenu : modèle de confiance kiosque, secret de poste ou variante, lockout, offline, revalidation ; **non-régression** explicite sur `PIN opérateur` / §11.2 `prd.md`.
- [x] Citations minimales : les trois chemins obligatoires ci-dessus + liste nommée des stories / epics aval bloqués.
- [x] Revue humaine / approbation tracée (produit + archi ou process défini dans l'ADR ou note d'approbation).
- [x] Section **Trace Epic 25 — ADR** du présent fichier story mise à jour après rédaction (remplacer le stub ci-dessous).

## Livrables

| Livrable | Chemin cible (à confirmer à la rédaction) |
|----------|-------------------------------------------|
| ADR PIN kiosque vs PIN opérateur / secret de poste | `_bmad-output/planning-artifacts/architecture/` (nom fichier daté `2026-04-19-adr-…` ou équivalent projet) |

## QA Gate (story documentaire)

| # | Vérification | Résultat |
|---|----------------|----------|
| Q1 | Chaque AC epics §25.2 est couvert par une section ou des paragraphes explicites de l'ADR | OK — contexte, décision (séparation, hybride, lockout, offline, revalidation), références §25.2 |
| Q2 | Aucune formulation ne contredit `PIN opérateur` canonique (`prd.md` §4.1, §11.2) sans section « décision / migration » | OK — non-régression §11.2 et chemin serveur explicités |
| Q3 | Stories aval bloquées nommées (auth kiosque, passer la main, etc.) | OK — section « Stories aval » de l'ADR (11.3, 13.x, 25.4, futures auth / Session Swap) |

## Dev Notes — ancres sources (implémentation = rédaction ADR)

- **Canon PIN opérateur :** `_bmad-output/planning-artifacts/prd.md` — tableau gouvernance en tête (ligne PIN opérateur vs PIN kiosque), **§4.1** contextes, **§11.2** politique minimale PIN v2 (champ d'application PIN opérateur ; extension kiosque après ADR).
- **Cible vision :** `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` — EPIC 2 Identity, PIN, session swap, `kiosk_secret_key`, IndexedDB token, règles soft-lock / escalade.
- **Brownfield vs écart :** `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` — §5.1 route `POST /pin`, hash serveur, rate limit vs lockout métier PRD ; options (a)(b)(c) hybride.
- **Story précédente :** `25-1-cartographier-les-exigences-importees-et-fermer-la-matrice-dalignement-vision-canonique.md` — matrice et phasage ADR 25.2 / 25.3.

### Project Structure Notes

- Ne pas implémenter de code kiosque dans cette story ; toute story `bmad-dev-story` sur PWA / PIN local reste **après** approbation ADR et levée de gel selon pilotage.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 25.2]
- [Source: `_bmad-output/planning-artifacts/prd.md` — §2.4, §4.1, §11.2, tableau exigences importées]
- [Source: `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` — EPIC 1–2]
- [Source: `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` — §3.3, §5.1, §6, matrice écarts]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` — gel process]

## Trace Epic 25 — ADR

| Élément | Valeur |
|---------|--------|
| ADR requis par la story ? | **Oui** — livrable principal = ADR PIN kiosque vs PIN opérateur / secret de poste. |
| Fichier ADR | `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` (chemin absolu : `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`) |
| Date | 2026-04-19 |
| Statut | **`proposed`** — texte normatif rédigé et indexé ; **`accepted`** après revue / approbation explicite produit + archi tracée (DoD story, section Suivi BMAD de l’ADR). |
| Citations minimales AC epics §25.2 | `_bmad-output/planning-artifacts/prd.md` ; `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` (section **Références** de l’ADR). |
| Stories aval bloquées (nommées dans l'ADR) | **11.3**, **13.1**, **13.7**, **13.8** ; **25.4** (alignement invariants poste/kiosque liés au PIN) ; futures stories **auth PIN kiosque**, **« passer la main »** / Session Swap, **step-up kiosque**, **EPIC 1–2 vision** une fois découpées dans `epics.md`. |
| Index architecture | `_bmad-output/planning-artifacts/architecture/index.md` — section **Sécurité / identité kiosque (Epic 25)** + entrée TOC. |

## Dev Agent Record

### Agent Model Used

_(Task spawn Story Runner — CS create-story ; VS validate create-story — PASS 2026-04-19)_

### Debug Log References

- Epic 25 — `epics.md` §25.2.
- Matrice 25.1 — `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md`.

### Completion Notes List

- CS 2026-04-19 : fichier story créé ; `sprint-status` clé `25-2-…` → `ready-for-dev`.
- VS 2026-04-19 : validation checklist + alignement `epics.md` §25.2 (AC) ; YAML `25-2` inchangé `ready-for-dev` ; PASS.
- ADR 2026-04-19 (sous-agent Task post-VS) : ADR `2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` publiée ; `architecture/index.md` + trace **Epic 25 — ADR** (ce fichier) mises à jour ; `sprint-status.yaml` non modifié.
- **DS 2026-04-19 (bmad-dev-story Task)** : DoD + QA Gate story complétés ; statut story **`review`** ; `sprint-status.yaml` clé `25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste` **`ready-for-dev` → `review`** ; **epic-25** inchangé **`in-progress`**. Branche dépôt au moment du DS : **`epic/25-socle-alignement-prd-architecture`** (checkout non bloquant — environnement aligné). Passage ADR YAML frontmatter **`proposed` → `accepted`** : après revue humaine explicite, tracée comme prévu dans **Suivi BMAD** de l'ADR (Story Runner / produit).

### File List

- `_bmad-output/implementation-artifacts/25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste.md` (ce fichier)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (clé `25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste` → `review`)
- `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`
- `_bmad-output/planning-artifacts/architecture/index.md`
