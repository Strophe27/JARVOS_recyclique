# Story 15.1: Shell global — bandeau vert, navigation horizontale, brand correct

Status: done

## Story

En tant qu'utilisateur,
je veux un header vert avec navigation horizontale identique à la 1.4.4,
afin de retrouver l'expérience visuelle de référence.

## Références visuelles

- `_bmad-output/implementation-artifacts/screenshots/11-0/caisse/caisse-01-dashboard.png`
- `_bmad-output/implementation-artifacts/screenshots/11-0/auth/auth-01-login.png`

## Acceptance Criteria

1. **Étant donné** n'importe quelle page de l'application (hors login/pin)
   **Quand** l'utilisateur la consulte
   **Alors** un bandeau vert pleine largeur est visible en haut avec :
   - Logo RecyClique (icône recyclage SVG + texte "RecyClique") à gauche
   - Navigation horizontale centrée : "Tableau de bord" | "Caisse" | "Réception" | "Administration"
   - Dropdown utilisateur à droite (prénom/nom + chevron, logout au clic)
   - Couleur brand : vert (approx `#2e7d32` extrait des screenshots)

2. **Étant donné** l'interface actuelle
   **Quand** le shell est livré
   **Alors** il n'y a plus de sidebar gauche blanche avec liens texte

3. **Étant donné** les pages login et pin (non loguées)
   **Quand** l'utilisateur les consulte
   **Alors** le bandeau vert est affiché sans la navigation principale (centrée) — logo à gauche, zone vide ou minimale au centre

4. **Étant donné** la page login
   **Quand** elle s'affiche
   **Alors** les liens "Créer un compte" et "Mot de passe oublié ?" sont supprimés

5. **Étant donné** le mode caisse verrouillé
   **Quand** l'opérateur est en poste caisse
   **Alors** le menu reste réduit à "Caisse" uniquement (comportement existant conservé)

## Tasks / Subtasks

- [x] Task 1 : Tokens brand vert (AC: #1)
  - [x] Modifier `frontend/src/shared/theme/tokens.ts` : remplacer `brandScale` bleu par une échelle verte issue de `#2e7d32` (Material Green 800)
  - [x] Mettre à jour `navActiveBackground`, `navActiveText`, `focusRing` pour cohérence verte
  - [x] Référence : `references/ancien-repo/` ou screenshot 11-0 pour extraire la teinte exacte

- [x] Task 2 : Réécrire AppShell (AC: #1, #2)
  - [x] Modifier `frontend/src/shared/layout/AppShell.tsx` :
    - Header vert pleine largeur (background brand vert)
    - Structure : logo gauche | nav centrée | dropdown utilisateur droite
    - Supprimer la prop `nav` comme sidebar ; intégrer la nav dans le header
  - [x] Modifier `frontend/src/App.tsx` : adapter l'utilisation de AppShell (plus de sidebar, header contient nav)

- [x] Task 3 : Réécrire AppShellNav en navigation horizontale (AC: #1, #5)
  - [x] Modifier `frontend/src/shared/layout/AppShellNav.tsx` :
    - Remplacer la liste verticale par une barre horizontale avec 4 onglets : "Tableau de bord", "Caisse", "Réception", "Administration"
    - Tableau de bord → `/caisse` (page sélection poste)
    - Caisse → `/caisse` (même point d'entrée ; vérifier screenshots 11-0 pour ordre exact des libellés)
    - Réception → `/reception`
    - Administration → `/admin`
  - [x] Permissions : afficher uniquement les onglets selon `useAuth().permissions` et `useCashRegisterLock().isRestricted`
  - [x] Mode caisse verrouillé : afficher seulement les entrées caisse + déverrouiller PIN
  - [x] Style : onglets avec états actif/hover, icônes Mantine optionnelles

- [x] Task 4 : Dropdown utilisateur (AC: #1)
  - [x] Créer ou étendre un composant header pour le dropdown droit
  - [x] Afficher prénom/nom (ou username si vide) + chevron
  - [x] Au clic : menu avec "Profil", "Déconnexion" (logout)

- [x] Task 5 : Logo RecyClique (AC: #1)
  - [x] Ajouter icône recyclage SVG (ou composant Mantine) + texte "RecyClique" dans le header gauche
  - [x] Lien vers dashboard ou page d'accueil

- [x] Task 6 : Layout login/pin sans nav (AC: #3)
  - [x] Adapter le rendu AppShell pour les routes `/login` et `/cash-register/pin` (CAISSE_PIN_PATH) : bandeau vert + logo, pas de nav centrée
  - [x] Condition sur la route actuelle pour masquer les onglets (useLocation) ; afficher le bandeau sur toutes les pages

- [x] Task 7 : LoginPage — supprimer liens (AC: #4)
  - [x] Modifier `frontend/src/auth/LoginPage.tsx` : supprimer les deux `Anchor` (Créer un compte, Mot de passe oublié)

- [x] Task 8 : CSS sidebar (AC: #2)
  - [x] Modifier `frontend/src/shared/layout/app-shell.css` : supprimer `.app-shell__sidebar`, `.app-shell__body` flex avec sidebar
  - [x] Adapter `.app-shell__body` pour zone contenu seule (main pleine largeur)

- [x] Task 9 : Tests et build (DoD Epic 15)
  - [x] Mettre à jour `AppShell.test.tsx` et `AppShellNav.test.tsx` pour le nouveau layout
  - [x] `npm run build` OK
  - [x] Screenshot avant/après sur au moins une page (ex. dashboard caisse, login)

- [x] Review Follow-ups (AI)
  - [x] [AI-Review][HIGH] Screenshot avant/après manquant — DoD Epic 15 exige preuve visuelle sur au moins une page (ex. dashboard caisse, login) [story Task 9]

## Dev Notes

### Architecture

- **Mantine** : AppShell.Header, Menu (dropdown), Tabs ou NavLink pour la nav horizontale
- **Structure actuelle** : `AppShell` reçoit `nav` en prop et affiche une sidebar ; à remplacer par header intégré
- **Auth** : `useAuth()` fournit `user`, `logout`, `permissions`
- **Caisse verrouillée** : `useCashRegisterLock().isRestricted` — menu caisse uniquement

### Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `frontend/src/shared/theme/tokens.ts` | Remplacer brandScale par vert |
| `frontend/src/shared/layout/AppShell.tsx` | Réécrire : header vert, pas de sidebar |
| `frontend/src/shared/layout/AppShellNav.tsx` | Réécrire : nav horizontale 4 onglets |
| `frontend/src/shared/layout/app-shell.css` | Supprimer sidebar, adapter layout |
| `frontend/src/App.tsx` | Adapter passage de nav au shell |
| `frontend/src/auth/LoginPage.tsx` | Supprimer 2 Anchor |
| `frontend/src/caisse/AppNav.tsx` | Inchangé (wrapper AppShellNav) |

### Prérequis

- **Story 15.0 livrée** : fix URLs API (helper `buildUrl`) — bloquant pour que les pages se chargent sans crash.

### Références

- Charte visuelle : `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`
- Story 15.0 (fix URLs) : helper `buildUrl` en place — ne pas toucher aux appels API
- Epic 15 DoD : build OK, screenshot avant/après, pas de crash console

### Règle brownfield

Réécriture/adaptation depuis 1.4.4, pas collage. Identifier dans `references/ancien-repo/` le header et la nav 1.4.4 pour traçabilité Copy.

## Dev Agent Record

### Agent Model Used

bmad-dev (dev-story workflow)

### Completion Notes List

- Tokens : brandScale Material Green (e8f5e9..1b5e20), navActiveBackground/navActiveText/focusRing cohérents
- AppShell : header vert pleine largeur, structure logo | nav | dropdown ; prop `nav` supprimée ; nav intégrée dans header
- AppShellNav : 4 onglets horizontaux (Tableau de bord, Caisse, Réception, Administration), permissions + mode caisse verrouillé
- Dropdown utilisateur : Mantine Menu, profil + déconnexion
- Logo : SVG recyclage + texte RecyClique, lien /caisse
- Login/pin : useLocation, masquage nav sur /login et CAISSE_PIN_PATH
- LoginPage : 2 Anchor supprimés
- CSS : sidebar supprimée, layout main pleine largeur
- Tests : AppShell, AppShellNav, AppNav mis à jour ; build OK
- Screenshots DoD : 15-1-login.png, 15-1-caisse.png (MCP Chrome DevTools, http://localhost:4175)

### File List

- frontend/src/shared/theme/tokens.ts
- frontend/src/shared/theme/mantineTheme.ts
- frontend/src/shared/layout/AppShell.tsx
- frontend/src/shared/layout/AppShellNav.tsx
- frontend/src/shared/layout/app-shell.css
- frontend/src/App.tsx
- frontend/src/auth/LoginPage.tsx
- frontend/src/shared/layout/AppShell.test.tsx
- frontend/src/shared/layout/AppShellNav.test.tsx
- frontend/src/caisse/AppNav.test.tsx
- _bmad-output/implementation-artifacts/screenshots/15-1/15-1-login.png
- _bmad-output/implementation-artifacts/screenshots/15-1/15-1-caisse.png

## Senior Developer Review (AI)

**Date:** 2026-03-01  
**Résultat:** approved

### Synthèse

- **AC 1-5:** Implémentés (bandeau vert, nav horizontale, pas de sidebar, login/pin sans nav, liens login supprimés, mode caisse verrouillé OK).
- **Tasks 1-8:** Conformes. Tokens brand, AppShell, AppShellNav, dropdown, logo, CSS, LoginPage sans Anchor.
- **Task 9:** Tests, build OK, **screenshots livrés** — 15-1-login.png et 15-1-caisse.png vérifiés.
- **Vérification captures :** login : bandeau vert, logo, pas de nav (AC #3). Caisse : bandeau vert, logo, nav horizontale, dropdown agent_dev.
- **Tests scope 15.1:** AppShell, AppShellNav, AppNav — tous passent.
- **Git vs File List:** Cohérent (fichiers api/* de 15.0 exclus du périmètre 15.1).

### Findings

| Sévérité | Description |
|---------|-------------|
| HIGH | Screenshot avant/après sur au moins une page requis par DoD Epic 15 — non réalisé |
| LOW | Tableau de bord et Caisse (tous deux `/caisse`) partagent l’état actif sur `/caisse` — comportement acceptable mais redondant |
| LOW | `.app-shell__content` max-width sans `margin: 0 auto` — centrage optionnel |

## Change Log

| Date | Acteur | Action |
|------|--------|--------|
| 2026-03-01 | bmad-qa | Code review adversarial — changes-requested (screenshot DoD manquant) |
| 2026-03-01 | bmad-dev | Screenshots 15-1-login.png, 15-1-caisse.png via MCP Chrome DevTools — Task 9 + Review Follow-up cochés |
| 2026-03-01 | bmad-qa | Code review adversarial — approved (screenshots vérifiés, story → done) |
