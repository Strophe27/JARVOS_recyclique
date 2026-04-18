# Audit frontend — architecture et structure (base active 1.4.4)

**Date:** 2026-03-23  
**Perimetre:** stack UI, taille des modules, auth globale, services API, stores, notifications, routing.  
**Base de reference:** application frontend sous `recyclique-1.4.4/` (chemins indicatifs ci-dessous).

---

## Contexte

Le frontend combine plusieurs bibliotheques et patterns. Ce rapport resume la structure observee et les points de friction pour des futurs agents qui decoupent des modules ou unifient les flux.

---

## Findings par severite

### Critique

- **Stack reelle vs documentation possible:** Mantine + styled-components + Lucide / Tabler — pas Bootstrap; toute doc ou starter obsolete induit des erreurs de choix technique.

### Eleve

- **Fichiers tres volumineux:** `TicketForm` ~2250+ lignes, `LegacyImport` ~1730+, `SaleWizard` ~1430+ — lisibilite, tests et merges difficiles.
- **Auth exposee sur `window` dans `App.jsx`:** surface globale, risque debug / XSS / fuites de conventions.
- **Couches API dupliquees / paralleles:** `categoryService` vs `categoriesService`; `cashSessionService` vs `cashSessionsService`.
- **`useAuth` vs `useAuthStore`:** deux modeles d'authentification en parallele.
- **Double systeme de notifications:** Mantine + `react-hot-toast` — UX et maintenance dupliquees.

### Moyen

- **Imports probablement inutilises dans `App.jsx`,** lazy routes peu claires, fichier `Categories_old.tsx` — bruit et dette.

### Bas

- **Tests disperses** — pas de convention unique localisable dans les constats.

---

## Fichiers et zones concernes (indicatif)

- `recyclique-1.4.4/frontend/src/App.jsx` (ou `App.tsx`)
- Composants: `TicketForm`, `LegacyImport`, `SaleWizard` (chemins sous `src/` selon arborescence)
- Services: `categoryService`, `categoriesService`, `cashSessionService`, `cashSessionsService`
- Hooks / stores: `useAuth`, `useAuthStore`
- `Categories_old.tsx`
- Repertoire `tests` / `__tests__` frontend

---

## Recommandations (ordonnees)

1. **Clarifier la cible UI** dans la documentation du module (Mantine + styled-components comme reference).
2. **Decouper les gros fichiers** par etapes / sous-composants / hooks dedies avec boundaries claires.
3. **Unifier la couche HTTP** (un client, une convention de services) et fusionner les paires de services dupliques.
4. **Reduire l'exposition globale `window`:** patterns de debug derriere flag dev uniquement ou suppression en prod.
5. **Resoudre la dualite `useAuth` / `useAuthStore`:** un seul chemin documente pour l'etat session.
6. **Nettoyer `App.jsx`:** imports, lazy routes, fichiers legacy (`Categories_old`).
7. **Planifier migration React Query / TanStack** ou retrait si inutilise (voir audit coherence technique).
8. **Adopter une convention de tests** (emplacement, nommage, outils) et la documenter brievement.

---

## Limites de ce document

Chemins exacts du dossier frontend (`frontend/` vs `web/`) a confirmer sur le depot; les noms de fichiers viennent des constats d'audit.
