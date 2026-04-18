# Audit frontend — authentification et permissions (base active 1.4.4)

**Date:** 2026-03-23  
**Perimetre:** routes protegees, store auth, redirections, alignement roles / types, tests.  
**Base de reference:** application frontend sous `recyclique-1.4.4/`.

---

## Contexte

Ce rapport couvre la coherence entre le store d'authentification, les gardes de route et le modele utilisateur cote client. Les ecarts peuvent produire des acces incoherents ou des etats session invalides.

---

## Findings par severite

### Critique

- **Divergence `ProtectedRoute` vs `authStore`:** l'admin n'a pas de bypass `requiredPermission` dans `ProtectedRoute` alors que le store lui accorde tous les droits — comportement d'autorisation incoherent selon le chemin de code.

### Eleve

- **`window.useAuthStore` expose globalement** — meme categorie de risque que l'exposition auth dans `App.jsx` (debug, fuite d'API interne).
- **Redirections 401 via `window.location.href`** — perte d'etat SPA, pas de gestion centralisee du router.
- **`initializeAuth` ne recharge pas user / permissions;** TODO laisse en place — session partielle apres refresh.
- **Echec de l'API permissions apres login peut laisser des permissions vides** sans strategie de repli claire.
- **`useAuth.ts`:** ancien modele parallele au store — double verite.

### Moyen

- **`ProtectedRoute` n'utilise pas `loading`:** flash de contenu ou mauvaise route pendant le chargement.
- **Page `PendingUsers` sans route dans `App.jsx`** — code mort ou fonctionnalite inaccessible.
- **Tests `public-routes` non alignes avec le routeur reel** — faux positifs / negatifs.
- **Role `manager` mentionne dans `ProtectedRoute` pas aligne avec le type `User` du store** — comparaisons de role potentiellement fausses.

### Bas

- Aucun constat supplementaire au-dela de la liste fournie pour ce theme.

---

## Fichiers et zones concernes (indicatif)

- `ProtectedRoute` (composant ou module dedie)
- Store: `authStore` / `useAuthStore`
- `useAuth.ts` (legacy)
- `App.jsx` (routes, `PendingUsers`)
- Tests: suites `public-routes` ou equivalent
- Types `User` du store

---

## Recommandations (ordonnees)

1. **Unifier la logique d'autorisation:** une seule source (store + garde) avec regles identiques pour admin / manager / permissions requises.
2. **Completer `initializeAuth`:** rehydratation user et permissions depuis le backend ou le stockage securise, sans TODO bloquant.
3. **Retirer `window.useAuthStore` en production** (ou le cantonner strictement au dev avec garde build).
4. **Remplacer la redirection hard vers login** par navigation router + gestion d'etat 401 centralisee.
5. **Nettoyer `App.jsx` / route `PendingUsers`:** ajouter la route ou retirer la page.
6. **Realigner les tests** sur les routes et comportements reels du routeur.
7. **Decider du sort de `useAuth.ts`:** suppression ou wrapper mince vers le store; mettre a jour les types `User` / roles pour correspondre aux gardes.

---

## Limites de ce document

Noms exacts des fichiers (`authStore.ts` vs `useAuthStore.ts`) a confirmer sur l'arbre source; la logique decrite est celle des constats d'audit.
