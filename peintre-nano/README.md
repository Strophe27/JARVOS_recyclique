# Peintre_nano

Frontend Recyclique v2 — React, TypeScript, Vite, Mantine v8 (P1), CSS Modules + `src/styles/tokens.css`.

## Scripts

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification TypeScript + build production |
| `npm run lint` | Vérification projet TypeScript (`tsc -b`, sans Vite) |
| `npm run preview` | Prévisualisation du build |
| `npm run test` | Vitest (unitaires + suites sous `tests/`) |

## Tests

- **Unitaires** : `tests/unit/`.
- **Dossier `tests/e2e/`** : nom historique BMAD ; exécution **Vitest + jsdom + Testing Library** (pas Playwright / pas navigateur réel). Voir `tests/e2e/README.md` pour la portée et les limites.

## Arborescence

Alignée sur `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` (Piste A).  
Aucun import runtime depuis `references/` — documentation de cadrage uniquement.

## Quatre artefacts (story 3.0)

Types et câblage conceptuel sous `src/types/`, `src/runtime/conceptual-artifacts.ts` (types) et `conceptual-artifacts.stub.ts` (stub tests + import `main.tsx`). Chargement JSON / validation exhaustive : stories 3.2–3.3.
