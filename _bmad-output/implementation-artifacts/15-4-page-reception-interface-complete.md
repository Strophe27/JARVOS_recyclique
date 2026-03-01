# Story 15.4: Page Reception — interface complete

Status: review

## Story

En tant qu'operateur reception,
je veux retrouver la page de reception identique a la 1.4.4,
afin d'ouvrir un poste et gerer les tickets efficacement.

## References visuelles

- `_bmad-output/implementation-artifacts/screenshots/11-0/reception/reception-01-accueil-module.png`
- `_bmad-output/implementation-artifacts/screenshots/11-0/reception/reception-02-ouverture-poste-saisie-differee.png`
- `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`
- `references/ancien-repo/` (code source 1.4.4)

## Acceptance Criteria

1. **Etant donne** un utilisateur connecte sur `/reception`
   **Quand** la page se charge
   **Alors** un en-tete de section affiche :
   - Icone clipboard/reception + titre "Module de Reception" a gauche
   - "Bonjour, [username]" au centre-droit
   - Bouton "Voir tous les tickets" a droite (bordure verte, texte vert)

2. **Etant donne** la section principale d'actions
   **Quand** l'utilisateur la consulte
   **Alors** elle affiche :
   - Gros bouton vert pleine largeur avec icone "+" et texte "Ouvrir un poste de reception"
     (fond vert brand `#2e7d32`, texte blanc, hauteur ~80px, coins arrondis)
   - Bouton secondaire orange "Saisie differee" en dessous
     (fond orange pale avec bordure orange, icone horloge, centre, largeur reduite)

3. **Etant donne** la section "Tickets Recents"
   **Quand** des tickets existent
   **Alors** la section affiche :
   - Titre "Tickets Recents" avec icone liste/tableau
   - Liste de cards tickets, chaque card contenant sur une ligne :
     * ID court en gras "Ticket #[8 premiers chars]"
     * Icone calendrier + date/heure
     * Icone utilisateur + nom operateur
     * Icone articles + "N article(s)"
     * Icone poids + "X.XX kg"
     * Badge statut : "Ouvert" (vert) ou "Ferme" (gris)
   - Bouton d'action a droite de chaque card :
     * "Modifier" (vert, avec icone oeil) si ticket ouvert
     * "Voir les details" (vert, avec icone oeil) si ticket ferme

4. **Etant donne** la pagination en bas de liste
   **Quand** il y a plus de tickets que la taille de page
   **Alors** elle affiche :
   - Texte "Affichage de X a Y sur Z tickets" a gauche
   - Selecteur "Par page" (dropdown : 5, 10, 20, 50) au centre
   - Boutons "Precedent" (desactive si page 1) et "Suivant" (vert, desactive si derniere page) a droite

5. **Etant donne** la logique existante de reception
   **Quand** l'utilisateur interagit avec la page
   **Alors** toute la logique metier est conservee :
   - `openPoste`, `closePoste`, `createTicket`, `closeTicket`
   - `getReceptionStatsLive`, `exportLignesCsv`
   - Navigation vers `/reception/tickets/{id}` pour le detail
   - Modal d'ouverture de poste (avec date optionnelle pour saisie differee)
   - Modal export lignes (periode)

## Tasks / Subtasks

- [ ] Task 1 : En-tete "Module de Reception" (AC: #1)
  - [ ] Remplacer le titre "Reception" du `PageContainer` par un en-tete custom avec icone + titre
  - [ ] Ajouter "Bonjour, [username]" (via `useAuth` → `user.username` ; `UserInToken` n'a pas de `first_name`)
  - [ ] Bouton "Voir tous les tickets" a droite (navigue vers la liste complete ou ancre)

- [ ] Task 2 : Boutons d'action principaux (AC: #2)
  - [ ] Gros bouton vert pleine largeur "+" "Ouvrir un poste de reception" (ouvre le modal existant)
  - [ ] Bouton secondaire orange "Saisie differee" (ouvre le modal avec champ date pre-rempli)
  - [ ] Styles via CSS module : fond vert brand, fond orange pale, hauteurs et arrondis

- [ ] Task 3 : Section "Tickets Recents" avec cards (AC: #3)
  - [ ] Remplacer le `<Table>` actuel par des cards ticket stylisees
  - [ ] Chaque card : ID court (#8 chars), date, operateur, nb articles, poids total, badge statut
  - [ ] Badge "Ouvert" (vert) / "Ferme" (gris) avec `Badge` Mantine
  - [ ] Bouton "Modifier" (ouvert) ou "Voir les details" (ferme) → lien vers `/reception/tickets/{id}`
  - [ ] Calculer nb articles et poids total a partir de `ticket.lignes` (si disponible dans l'API)

- [ ] Task 4 : Pagination (AC: #4)
  - [ ] Composant pagination en bas de la liste : texte "Affichage de X a Y sur Z tickets"
  - [ ] Selecteur "Par page" (dropdown avec 5, 10, 20, 50)
  - [ ] Boutons Precedent/Suivant avec gestion de l'etat (page courante, total pages)
  - [ ] Mettre a jour `getTickets` pour utiliser `page` et `page_size` dynamiques

- [ ] Task 5 : Layout global et integration (AC: #1 a #5)
  - [ ] Reecrire `ReceptionAccueilPage.tsx` : remplacer `PageContainer` par layout custom
  - [ ] Creer `frontend/src/reception/ReceptionAccueilPage.module.css` pour les styles specifiques
  - [ ] Conserver toute la logique existante (poste, tickets, modals, stats, export)
  - [ ] Ajouter `user` a la destructuration de `useAuth()`

- [ ] Task 6 : Tests et DoD Epic 15 (AC: #1 a #5)
  - [ ] Mettre a jour `frontend/src/reception/ReceptionAccueilPage.test.tsx`
  - [ ] Mettre a jour le mock `useAuth` pour inclure `user` : `useAuth: () => ({ accessToken: 'fake-token', user: { id: 'u1', username: 'TestUser', email: 'test@test.fr', role: 'admin', status: 'active' } })`
  - [ ] Tester : en-tete (titre "Module de Reception", username "TestUser"), bouton ouvrir poste, bouton saisie differee
  - [ ] Tester : section tickets recents visible, cards avec badge statut, boutons Modifier/Voir les details
  - [ ] Tester : pagination visible quand tickets > page_size
  - [ ] `npm run test:run -- src/reception/ReceptionAccueilPage.test.tsx` OK
  - [ ] `npm run build` OK
  - [ ] Captures avant/apres sur `/reception`
  - [ ] Console navigateur : aucun crash ni "Failed to construct URL"
  - [ ] Completion Notes : trace Copy / Consolidate / Security

## Dev Notes

### Architecture / Patterns

- **Mantine** : composants Mantine pour boutons, badges, cards, pagination. CSS module pour le layout custom.
- **Tests** : co-loces `*.test.tsx` (Vitest + RTL + jsdom).
- **Tokens** : reutiliser `visualTokens` de `frontend/src/shared/theme/tokens.ts` pour les couleurs brand (`brandScale[8]` = `#2e7d32`).
- **`useAuth`** : le hook fournit `AuthContextValue` (dont `accessToken`, `user`, `logout`, `permissions`). Le code actuel destructure uniquement `accessToken`. L'en-tete (AC#1) a besoin de `user` (type `UserInToken` : proprietes `id`, `username`, `email`, `role`, `status` — **pas de `first_name`**) — ajouter `user` a la destructuration. Afficher `user.username`.

### Analyse du code actuel a refactorer

Le fichier `ReceptionAccueilPage.tsx` actuel (403 lignes) contient :
- Chargement poste courant (`getCurrentPoste`) + tickets (`getTickets`) + stats live (`getReceptionStatsLive`)
- Gestion etat : `poste`, `tickets`, `totalTickets`, `stats`, `loading`, `error`
- Actions : `handleOpenPoste`, `handleClosePoste`, `handleCreateTicket`, `handleCloseTicket`
- Modals : ouverture de poste (avec `openedAtValue` pour saisie differee), export lignes (periode)
- Export CSV : `exportLignesCsv` (periode from/to)
- Rendu actuel : `PageContainer` + cards Mantine + `<Table>` pour les tickets

**Toute cette logique doit etre conservee intacte.** Le refactoring porte uniquement sur le rendu visuel (remplacement de la table par des cards, ajout de l'en-tete custom, pagination fonctionnelle, boutons conformes 1.4.4).

### Pagination — logique a ajouter

Le code actuel charge les tickets avec `page: 1, page_size: 50` en dur. Pour la pagination 1.4.4 :
- Ajouter des states `currentPage` (defaut 1) et `pageSize` (defaut 5, comme dans le screenshot)
- Passer `page: currentPage` et `page_size: pageSize` a `getTickets()`
- `totalTickets` existe deja (alimente par `res.total` de l'API)
- Calculer `totalPages = Math.ceil(totalTickets / pageSize)`
- Texte : "Affichage de {(currentPage-1)*pageSize+1} a {Math.min(currentPage*pageSize, totalTickets)} sur {totalTickets} tickets"

### Tickets — donnees manquantes possibles

Le screenshot 1.4.4 affiche pour chaque ticket : nb articles et poids total. L'API `getTickets` retourne des `TicketDepotItem` avec un champ optionnel `lignes?: LigneDepotItem[]`.
- Si `lignes` est present : calculer `lignes.length` (nb articles) et `sum(lignes.map(l => l.poids_kg))` (poids total)
- Si `lignes` est absent : afficher "—" pour ces champs (l'API peut ne pas inclure les lignes dans la liste paginee)
- Le champ `benevole_user_id` correspond a l'operateur ; afficher l'ID court ou le username si disponible

### Bouton "Saisie differee"

Dans la 1.4.4, "Saisie differee" ouvre le meme flux d'ouverture de poste mais avec une date anterieure pre-remplie. Le code actuel gere deja `openedAtValue` dans le modal d'ouverture de poste. Le bouton "Saisie differee" peut ouvrir le meme modal en pre-selectionnant le champ date (`setOpenedAtValue(...)` ou un flag `deferred`).

### data-testid des nouveaux composants

| Composant | data-testid |
|-----------|------------|
| Layout racine page reception | `reception-accueil-page` (existant, conserver) |
| En-tete section "Module de Reception" | `reception-header` |
| Texte "Bonjour, [username]" | `reception-greeting` |
| Bouton "Voir tous les tickets" | `reception-view-all-tickets` |
| Bouton "Ouvrir un poste" (gros vert) | `reception-open-poste-btn` (existant) |
| Bouton "Saisie differee" (orange) | `reception-deferred-btn` |
| Section "Tickets Recents" | `reception-tickets-section` (existant) |
| Card ticket (chaque) | `reception-ticket-card-{id}` |
| Badge statut ticket | `reception-ticket-status-{id}` |
| Bouton Modifier/Voir details ticket | `reception-ticket-action-{id}` |
| Pagination container | `reception-pagination` |
| Selecteur "Par page" | `reception-page-size-select` |
| Bouton Precedent | `reception-pagination-prev` |
| Bouton Suivant | `reception-pagination-next` |

### Previous Story Intelligence (15.1 a 15.3)

**15.1 (Shell global)** :
- Le shell global a ete refactore (header vert + nav horizontale, plus de sidebar).
- Tokens brand vert en place dans `tokens.ts` (Material Green 800).
- `AppShell.tsx` detecte deja les pages auth (login/pin) et plein ecran (saisie vente) pour masquer la nav/header.
- La page reception n'est PAS une page plein ecran — elle utilise le shell global normal.

**15.2 (Dashboard caisse)** :
- `CaisseDashboardPage.tsx` refactore avec CSS modules.
- Pattern a suivre : CSS module local + composants Mantine + tokens.
- Lecons : eviter les styles inline, preferer les CSS modules.
- Les tests utilisent des `data-testid` specifiques — suivre le meme pattern.

**15.3 (Saisie vente caisse)** :
- `CashRegisterSalePage.tsx` refactore avec header dedie et layout plein ecran via `isFullScreenPage()`.
- CaisseHeader et CaisseStatsBar crees comme composants internes au domaine `caisse/`.
- La page reception n'a PAS besoin de `isFullScreenPage()` — elle reste dans le layout standard AppShell.

### Project Structure Notes

- La page reception reste dans `frontend/src/reception/` (pas de reorganisation).
- Le CSS module est cree dans le meme dossier que le composant (`ReceptionAccueilPage.module.css`).
- Pas de nouveau composant partage a creer — tout est interne au module reception.

### Prerequis

- Story 15.3 livree (saisie vente caisse en place)
- Le shell global (15.1) est en place — la page reception l'utilise normalement

### References

- Epic 15 / Story 15.4 dans `_bmad-output/planning-artifacts/epics.md`
- Screenshots : `_bmad-output/implementation-artifacts/screenshots/11-0/reception/reception-01-accueil-module.png`
- Charte visuelle : `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`
- Code 1.4.4 : `references/ancien-repo/`
- Regle brownfield / checklist import : `references/ancien-repo/checklist-import-1.4.4.md`
- Tokens visuels : `frontend/src/shared/theme/tokens.ts`
- API reception : `frontend/src/api/reception.ts`
- Page actuelle : `frontend/src/reception/ReceptionAccueilPage.tsx`

### Regle brownfield

Reecriture/adaptation depuis 1.4.4, pas collage. Identifier dans `references/ancien-repo/` les composants et styles de la page d'accueil reception pour tracabilite Copy. Appliquer Consolidate (pas de doublon) et Security (pas de secret en dur, `npm audit` OK).

### Fichiers a creer

| Fichier | Role |
|---------|------|
| `frontend/src/reception/ReceptionAccueilPage.module.css` | Styles layout page reception (en-tete, boutons, cards tickets, pagination) |

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `frontend/src/reception/ReceptionAccueilPage.tsx` | Reecrire le rendu (en-tete, boutons, cards tickets, pagination), conserver logique metier |
| `frontend/src/reception/ReceptionAccueilPage.test.tsx` | Mettre a jour tests (nouveau layout, cards, badges, pagination) |

## Dev Agent Record

### Agent Model Used

bmad-dev (implementation)

### Debug Log References

Aucun blocage rencontre.

### Completion Notes List

- **Copy** : Layout et structure inspires de la 1.4.4 (en-tete "Module de Reception", gros bouton vert, cards tickets, pagination). Reecrit proprement avec Mantine + CSS modules.
- **Consolidate** : Reutilise `useAuth` (user.username), tokens brand (#2e7d32), pattern CSS modules co-loce (meme pattern que CaisseDashboardPage story 15.2). Pas de doublon cree.
- **Security** : Pas de secret en dur. Acces API via accessToken existant.

### File List

**Cree :**
- `frontend/src/reception/ReceptionAccueilPage.module.css` — styles layout page reception (header, boutons action, cards tickets, pagination)

**Modifie :**
- `frontend/src/reception/ReceptionAccueilPage.tsx` — layout reecrit : en-tete "Module de Reception" + "Bonjour [username]" + bouton "Voir tous les tickets", gros bouton vert "Ouvrir un poste" + bouton orange "Saisie differee", cards tickets avec badges statut + articles/poids, pagination complete (prev/next + page size select)
- `frontend/src/reception/ReceptionAccueilPage.test.tsx` — 10 tests : header + username, bouton ouvrir poste, saisie differee, voir tous tickets, KPI live, poste ouvert, cards tickets avec badges, pagination, close ticket, modal saisie differee
