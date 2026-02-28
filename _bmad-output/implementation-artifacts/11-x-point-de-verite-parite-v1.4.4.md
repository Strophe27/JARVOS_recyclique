# Point de verite - Parite v1.4.4

Date: 2026-02-28
Owner: Strophe
Statut: ACTIF

## 1) Decision produit

- Objectif visuel v1: parite 1.4.4 quasi pixel perfect.
- Modernisation: minimale, uniquement si risque UX ou technique critique.
- Principe: pas de redesign creatif pendant Epic 11.

## 2) Verites techniques (sources)

- La stack legacy 1.4.4 est deja React + Vite + Mantine + FastAPI.
- La cible JARVOS conserve cette base, avec refactor et architecture propre.
- References:
  - `references/ancien-repo/technology-stack.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/ux-design-specification.md`

## 3) Scope Epic 11

- Domaines:
  - 11.1 Auth
  - 11.2 Caisse
  - 11.3 Reception
  - 11.4 Admin 1
  - 11.5 Admin 2
  - 11.6 Admin 3 / Categories

## 4) Exclusions validees (hors scope correctif visuel prioritaire)

- `pin login`
- `users pending`
- `permissions`

Note: ces exclusions sont des ecrans historiquement non operationnels. Elles ne bloquent pas la parite visuelle du reste du perimetre.

## 5) Regles non negociables

- Reecriture propre, pas de patch opportuniste local non trace.
- Aucune divergence visuelle volontaire sans decision explicite.
- Chaque correction visuelle doit pointer vers une preuve avant/apres.
- Toujours appliquer copy + consolidate + security (checklist import 1.4.4).

## 6) Definition of done globale (Epic 11)

- 0 ecart critique/majeur sur le perimetre inclus.
- Build frontend et stack locale OK.
- Tests UI cibles passes.
- Audit visuel post-merge execute et archive.
