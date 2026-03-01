# Story 15.3: Saisie Vente Caisse — interface complete

Status: done

## Story

En tant qu'operateur caisse,
je veux la page de saisie de vente identique a la 1.4.4,
afin de saisir les ventes efficacement avec les raccourcis clavier et le ticket en temps reel.

## References visuelles

- `_bmad-output/implementation-artifacts/screenshots/11-0/caisse/caisse-04-saisie-vente.png`
- `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`
- `references/ancien-repo/` (code source 1.4.4)

## Acceptance Criteria

1. **Etant donne** une session caisse ouverte sur `/cash-register/sale`
   **Quand** l'operateur accede a la saisie
   **Alors** le header vert global (AppShell) est remplace par un header caisse dedie :
   - Icone utilisateur + "agent [username] Session #[id court]" a gauche
   - Bouton rouge "Fermer la Caisse" a droite (avec icone sortie)
   - Fond vert brand identique au shell global (`#2e7d32`)

2. **Etant donne** la page de saisie affichee
   **Quand** l'operateur la consulte
   **Alors** une barre de stats sombre/violette est visible sous le header avec :
   - 6 indicateurs : TICKETS (nombre), DERNIER TICKET (montant ou `--`), CA JOUR (montant), DONS JOUR (montant), POIDS SORTIS (kg), POIDS RENTRES (kg)
   - A droite : toggles "Live" / "Session" + heure courante
   - Fond sombre/indigo (approx `#2d2b55` ou equivalent sombre) avec texte blanc

3. **Etant donne** la zone principale de saisie
   **Quand** l'operateur la consulte
   **Alors** elle affiche :
   - 4 onglets pills : "Categorie" (actif par defaut, vert), "Sous-categorie", "Poids", "Prix"
   - Zone d'info "ARTICLE EN COURS DE SAISIE" avec "Qte: 1" (etat courant de la ligne en saisie)
   - Grille de cards categories en CSS Grid (5 colonnes sur desktop) : nom categorie + badge lettre raccourci clavier (cercle colore en bas a gauche de la card)
   - La card selectionnee a une bordure coloree visible

4. **Etant donne** les raccourcis clavier
   **Quand** l'operateur appuie sur la lettre d'un raccourci (badge affiché sur la card)
   **Alors** la categorie correspondante est selectionnee dans la grille
   **Et** les raccourcis ne s'activent pas quand un champ texte est focus

5. **Etant donne** le panneau lateral droit "Ticket de Caisse"
   **Quand** l'operateur saisit des articles
   **Alors** le panneau affiche en temps reel :
   - Titre "Ticket de Caisse"
   - Liste des articles ajoutes (ou "Aucun article ajoute" si vide)
   - Compteur "N articles" et total "X.XX EUR" en bas
   - Bouton "Entree" pour valider le ticket (equivalent du submit actuel)
   - Le panneau a une largeur fixe (~300px) et reste visible sans scroll horizontal

## Tasks / Subtasks

- [ ] Task 1 : Header caisse dedie (AC: #1)
  - [ ] Creer `frontend/src/caisse/CaisseHeader.tsx` (composant interne a `caisse/`)
  - [ ] Afficher icone user + "agent [username] Session #[id court 8 chars]" a gauche
  - [ ] Bouton rouge "Fermer la Caisse" a droite (navigate vers `/cash-register/session/close`)
  - [ ] Masquer le header global AppShell sur cette page (voir Dev Notes ci-dessous)

- [ ] Task 2 : Barre de stats (AC: #2)
  - [ ] Creer `frontend/src/caisse/CaisseStatsBar.tsx`
  - [ ] 6 indicateurs avec valeurs issues de la session / stats API (ou placeholders 0 si API absente)
  - [ ] Toggles Live/Session a droite + horloge temps reel
  - [ ] Fond sombre/indigo, texte blanc, labels en small caps

- [ ] Task 3 : Zone principale avec tabs et grille categories (AC: #3, #4)
  - [ ] Onglets pills "Categorie" | "Sous-categorie" | "Poids" | "Prix" — tab active = vert brand
  - [ ] Zone info "ARTICLE EN COURS DE SAISIE" avec quantite
  - [ ] Grille CSS Grid de category cards (5 colonnes desktop, responsive 3-4 sur tablette)
  - [ ] Chaque card : nom categorie + badge raccourci clavier (cercle colore, lettre)
  - [ ] Card selectionnee : bordure coloree distincte
  - [ ] Raccourcis clavier : `useEffect` global sur `keydown`, desactive si focus dans un input/textarea

- [ ] Task 4 : Panneau ticket lateral droit (AC: #5)
  - [ ] Panneau fixe a droite (~300px), fond blanc, bordure gauche
  - [ ] Titre "Ticket de Caisse"
  - [ ] Etat vide : "Aucun article ajoute"
  - [ ] Liste articles ajoutes (nom, quantite, prix)
  - [ ] Footer : "N articles" + total en EUR + bouton "Entree" (vert, pleine largeur)
  - [ ] La logique panier existante (`cart`, `addPresetToCart`, `addCategoryToCart`, `removeCartLine`) est reutilisee

- [ ] Task 5 : Layout global de la page (AC: #1 a #5)
  - [ ] Reecrire `CashRegisterSalePage.tsx` : pas de `PageContainer`, layout custom
  - [ ] Structure : header dedie > stats bar > zone principale (tabs + grille + panneau ticket)
  - [ ] La zone principale = flex row : grille a gauche (flex-grow) + panneau ticket fixe a droite
  - [ ] Conserver toute la logique metier existante (cart, presets, paiements, offline, submit)
  - [ ] Creer `frontend/src/caisse/CashRegisterSalePage.module.css` pour les styles specifiques

- [ ] Task 6 : Tests et DoD Epic 15 (AC: #1 a #5)
  - [ ] Mettre a jour `frontend/src/caisse/CashRegisterSalePage.test.tsx`
  - [ ] Tester : header caisse (username, session id, bouton fermer), stats bar visible, grille categories visible, panneau ticket visible
  - [ ] `npm run test:run -- src/caisse/CashRegisterSalePage.test.tsx` OK
  - [ ] `npm run build` OK
  - [ ] Captures avant/apres sur `/cash-register/sale`
  - [ ] Console navigateur : aucun crash ni "Failed to construct URL"
  - [ ] Completion Notes : trace Copy / Consolidate / Security

## Dev Notes

### Architecture / Patterns

- **Mantine** : composants Mantine pour boutons, badges, tabs. CSS module pour le layout custom.
- **Tests** : co-loces `*.test.tsx` (Vitest + RTL + jsdom).
- **Tokens** : reutiliser `visualTokens` de `frontend/src/shared/theme/tokens.ts` pour les couleurs brand (`brandScale[8]` = `#2e7d32`).
- **`useAuth`** : le hook fournit `{ accessToken, user, logout }`. Le code actuel de la page ne destructure que `accessToken`. Le header caisse dedie (AC#1) a besoin de `user` (proprietes `username`, `first_name`, `last_name`) — ajouter `user` a la destructuration.

### Masquage du header global AppShell

La page de saisie vente a un header dedie qui remplace le header global.

**Approche recommandee** : etendre la fonction existante `isAuthPage()` dans `AppShell.tsx`. Actuellement elle verifie `LOGIN_PATH` et `CAISSE_PIN_PATH`. Creer une fonction `isFullScreenPage(pathname)` qui couvre aussi `/cash-register/sale`. Quand `isFullScreenPage` est vrai :
- Masquer entierement le `<header>` global (pas seulement la nav)
- Rendre `{children}` directement sans le wrapper `app-shell__body` / `app-shell__main` / `app-shell__content`
- La page de saisie gere elle-meme tout son layout (CaisseHeader + stats + grille + ticket)

**Code actuel** : `AppShell.tsx` utilise `useLocation()` et `isAuthPage()` → etendre avec `isFullScreenPage()` en ajoutant `/cash-register/sale` (et potentiellement d'autres routes caisse a l'avenir).

**Important** : ne pas creer un second layout global. L'AppShell reste le wrapper de toutes les pages ; seul le chrome (header, body wrapper) est masque pour les pages plein ecran.

### Logique metier existante a conserver

Le fichier actuel `CashRegisterSalePage.tsx` contient deja :
- `getCurrentCashSession`, `getPresetsActive`, `getCategoriesSaleTickets` (chargement initial)
- `updateCashSessionStep` (passage a l'etape "sale")
- Panier : `cart` state, `addPresetToCart`, `addCategoryToCart`, `removeCartLine`
- Paiements : `payments` state, `addPayment`, `removePayment`
- Submit : `handleSubmit` → `postSale` (online) ou `addTicket` (offline)
- Offline : `useOnlineStatus`, `syncOfflineQueue`, `getPendingCount`
- Note et date optionnelle sur le ticket

**Toute cette logique doit etre conservee intacte**. Le refactoring porte uniquement sur le rendu visuel.

### Grille categories et raccourcis clavier

Dans la 1.4.4, chaque categorie a une lettre de raccourci clavier affichee dans un badge colore (cercle en bas a gauche de la card). Les lettres sont generees a partir du nom de categorie (premiere lettre, ou code explicite si doublon).

**Flux carte → panier** : le clic sur une category card (ou le raccourci clavier) selectionne la categorie. La zone "ARTICLE EN COURS DE SAISIE" affiche l'article en preparation (qte: 1 par defaut). Le dev doit connecter la selection a `addCategoryToCart(category, quantity, unitPriceCents, weight)` existant. Le code actuel utilise un `<Select>` dropdown + champs manuels — les cards remplacent le Select, mais la logique `addCategoryToCart` et les champs prix/poids sont conserves. La card selectionnee = `selectedCategoryId` state (deja dans le code existant).

Pour les raccourcis clavier :
- Attacher un `useEffect` avec `keydown` sur `document`
- Verifier que `document.activeElement` n'est pas un input/textarea/select avant d'activer
- Mapper la lettre a la categorie correspondante → `setSelectedCategoryId(category.id)`

### Tabs "Categorie / Sous-categorie / Poids / Prix"

Dans la 1.4.4, ces tabs changent le mode de saisie :
- **Categorie** : grille de cards categories (mode par defaut)
- **Sous-categorie** : sous-categories de la categorie selectionnee
- **Poids** : saisie directe du poids
- **Prix** : saisie directe du prix

Pour cette story, implementer au minimum le tab "Categorie" (grille). Les autres tabs peuvent etre des placeholders fonctionnels (afficher un message "A venir" ou un formulaire simple) si la logique metier sous-jacente n'est pas encore implementee. Le tab actif doit etre visuellement correct (vert).

### Stats bar — donnees

Les 6 indicateurs (TICKETS, DERNIER TICKET, CA JOUR, DONS JOUR, POIDS SORTIS, POIDS RENTRES) necessitent des donnees de session. Si l'API ne fournit pas encore ces stats, utiliser des valeurs par defaut (0, "--", "0,00 EUR", "0.0 kg") et les rendre dynamiques plus tard. Le toggle Live/Session et l'heure sont purement front-end.

### Previous Story Intelligence (15.1, 15.2)

**15.1 (Shell global)** :
- Le shell global a ete refactore (header vert + nav horizontale, plus de sidebar).
- Tokens brand vert en place dans `tokens.ts` (Material Green 800).
- `AppShell.tsx` detecte deja les pages auth (login/pin) pour masquer la nav.
- Etendre cette logique pour la page de saisie vente (masquer tout le header).

**15.2 (Dashboard caisse)** :
- `CaisseDashboardPage.tsx` refactore avec CSS modules.
- Pattern a suivre : CSS module local + composants Mantine + tokens.
- Lecons : eviter les styles inline, preferer les CSS modules.
- Les tests utilisent des `data-testid` specifiques — suivre le meme pattern.

### data-testid des nouveaux composants

| Composant | data-testid |
|-----------|------------|
| Layout racine page saisie | `page-cash-register-sale` |
| CaisseHeader | `caisse-header` |
| Bouton "Fermer la Caisse" | `caisse-header-close` |
| CaisseStatsBar | `caisse-stats-bar` |
| Onglets pills (Tabs) | `caisse-sale-tabs` |
| Zone "ARTICLE EN COURS" | `caisse-current-item` |
| Grille categories | `caisse-category-grid` |
| Card categorie (chaque) | `category-card-{id}` |
| Panneau ticket | `caisse-ticket-panel` |
| Bouton "Entree" (submit ticket) | `caisse-ticket-submit` |

### Mise a jour des tests existants

Le fichier `CashRegisterSalePage.test.tsx` actuel :
- Repose sur `PageContainer` (import de `../shared/layout`) et `data-testid="page-sale"` — supprimes dans le nouveau layout
- Tous les `screen.getByTestId('page-sale')` doivent devenir `'page-cash-register-sale'`
- Les mocks API et offline restent identiques (memes imports `../api/caisse`, `./offlineQueue`)
- Ajouter tests : header caisse visible (username + session), stats bar visible, grille categories visible, panneau ticket visible
- Garder les tests offline/sync existants en adaptant les selectors

### Fichiers a creer

| Fichier | Role |
|---------|------|
| `frontend/src/caisse/CaisseHeader.tsx` | Header caisse dedie (user + session + fermer) |
| `frontend/src/caisse/CaisseStatsBar.tsx` | Barre stats sombre (6 KPIs + toggles) |
| `frontend/src/caisse/CashRegisterSalePage.module.css` | Styles layout specifiques saisie vente |

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `frontend/src/caisse/CashRegisterSalePage.tsx` | Reecrire le rendu (layout, composants internes) |
| `frontend/src/caisse/CashRegisterSalePage.test.tsx` | Mettre a jour tests (nouveau layout) |
| `frontend/src/shared/layout/AppShell.tsx` | Ajouter route `/cash-register/sale` en mode plein ecran |

### Prerequis

- Story 15.2 livree (dashboard caisse en place)
- Session caisse ouverte pour tester la page

### References

- Epic 15 / Story 15.3 dans `_bmad-output/planning-artifacts/epics.md`
- Screenshot : `_bmad-output/implementation-artifacts/screenshots/11-0/caisse/caisse-04-saisie-vente.png`
- Charte visuelle : `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`
- Code 1.4.4 : `references/ancien-repo/`
- Regle brownfield / checklist import : `references/ancien-repo/checklist-import-1.4.4.md`
- Tokens visuels : `frontend/src/shared/theme/tokens.ts`
- API caisse : `frontend/src/api/caisse.ts`
- Contexte caisse : `frontend/src/caisse/CaisseContext.tsx` (etat verrouille/deverrouille et poste courant — pas directement importe par la page actuelle mais pertinent pour le mode caisse)

### Regle brownfield

Reecriture/adaptation depuis 1.4.4, pas collage. Identifier dans `references/ancien-repo/` les composants et styles de la page de saisie vente pour tracabilite Copy. Appliquer Consolidate (pas de doublon) et Security (pas de secret en dur, `npm audit` OK).

## Dev Agent Record

### Agent Model Used

bmad-dev (implementation)

### Debug Log References

Aucun blocage rencontre.

### Completion Notes List

**Copy** : Layout et structure inspires de la 1.4.4 (header vert, stats bar indigo, grille 5 colonnes, panneau ticket lateral). Raccourcis clavier par lettre de categorie reproduits. Pas de copie directe de code — reecriture complete en Mantine + CSS modules.

**Consolidate** : Tokens visuels reutilises de `tokens.ts` (brandScale[8] = #2e7d32). Pattern CSS modules identique a 15-2 (CaisseDashboardPage). Composants Mantine coherents avec le reste du projet. Pas de doublon de composant header — le header global AppShell est masque via `isFullScreenPage()`.

**Security** : Aucun secret en dur. `accessToken` transmis via `useAuth()` comme dans tout le projet. Pas de `dangerouslySetInnerHTML`. Raccourcis clavier desactives quand focus dans un input/textarea/select.

### File List

**Crees :**
- `frontend/src/caisse/CaisseHeader.tsx` — header caisse dedie (user + session + bouton fermer)
- `frontend/src/caisse/CaisseStatsBar.tsx` — barre stats sombre (6 KPIs + toggles Live/Session + horloge)
- `frontend/src/caisse/CashRegisterSalePage.module.css` — styles layout plein ecran saisie vente

**Modifies :**
- `frontend/src/caisse/CashRegisterSalePage.tsx` — layout reecrit (header + stats + tabs + grille + ticket), logique metier intacte
- `frontend/src/caisse/CashRegisterSalePage.test.tsx` — 12 tests (layout 15.3 + offline 5.4), tous les data-testid mis a jour
- `frontend/src/shared/layout/AppShell.tsx` — ajout `isFullScreenPage()` pour `/cash-register/sale` (masque header + body wrapper)
- `frontend/src/shared/layout/AppShell.test.tsx` — ajout test plein ecran (total 7 tests)
