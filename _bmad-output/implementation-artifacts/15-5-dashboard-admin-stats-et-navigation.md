# Story 15.5: Dashboard Admin — stats et navigation

Status: done

## Story

En tant qu'administrateur,
je veux retrouver le dashboard admin identique a la 1.4.4,
afin d'avoir une vue d'ensemble et d'acceder aux fonctions admin rapidement.

## References visuelles

- `_bmad-output/implementation-artifacts/screenshots/11-0/admin-1/admin1-01-dashboard-admin.png`
- `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`
- `references/ancien-repo/` (code source 1.4.4)

## Acceptance Criteria

1. **Etant donne** un admin sur `/admin`
   **Quand** la page se charge
   **Alors** le titre "Tableau de Bord d'Administration" est affiche en haut de la page (en gras, centre)

2. **Etant donne** la barre de resume en haut
   **Quand** la page se charge
   **Alors** elle affiche 3 cellules horizontales sur une ligne :
   - Cellule gauche : icone cloche + "Notifications" + badge nombre (N) + lien "Voir"
   - Cellule centre : icone euro + "CA Mois" + montant en euros
   - Cellule droite : icone utilisateur + "Utilisateurs connectes" + badge nombre (N) + lien "Voir"
   - Les cellules sont separees par des bordures fines (`withBorder`)

3. **Etant donne** la section "Statistiques quotidiennes"
   **Quand** la page se charge
   **Alors** elle affiche un titre de section + 3 cards colorees en ligne (grille 3 colonnes) :
   - **Card verte** (bordure gauche verte epaisse) : icone euro + "Financier" en vert, montant CA en gros, sous-texte "CA: X.XX€ . Dons: X.XX€"
   - **Card orange** (bordure gauche orange epaisse) : icone balance + "Poids sorti" en orange, poids en kg, sous-texte "Sorti aujourd'hui"
   - **Card bleue** (bordure gauche bleue epaisse) : icone balance + "Poids recu" en bleu, poids en kg, sous-texte "Recu aujourd'hui"
   - Les montants par defaut sont 0.00€ / 0.0 kg si l'API ne retourne rien

4. **Etant donne** la section "Navigation principale"
   **Quand** la page se charge
   **Alors** elle affiche 6 blocs en grille 3x2, chaque bloc etant un lien cliquable avec icone et texte centre :
   - Ligne 1 :
     * Bleu clair (`#e3f2fd`) : icone users + "Utilisateurs & Profils" (texte bleu) → `/admin/users`
     * Vert clair (`#e8f5e9`) : icone shield + "Groupes & Permissions" (texte vert) → `/admin/groups`
     * Orange (`#fff3e0`) : icone tags + "Categories & Tarifs" (texte orange) → `/admin/categories`
   - Ligne 2 :
     * Gris (`#f5f5f5`) : icone caisse + "Sessions de Caisse" (texte gris fonce) → `/admin/session-manager`
     * Vert pale (`#e8f5e9`) : icone reception + "Sessions de Reception" (texte vert) → `/admin/reception`
     * Rouge pale (`#fce4ec`) : icone activity + "Activite & Logs" (texte rouge) → `/admin/audit-log`
   - Chaque bloc a une hauteur fixe (~100px), coins arrondis, centrage vertical et horizontal

5. **Etant donne** un utilisateur super_admin
   **Quand** la page se charge
   **Alors** une section supplementaire "Administration Super-Admin" est visible en bas, avec 3 blocs en ligne :
   - "Sante Systeme" (icone activity) → `/admin/health`
   - "Parametres Avances" (icone settings) → `/admin/settings`
   - "Sites & Caisses" (icone building) → `/admin/sites`
   - Fond blanc avec bordure fine, meme style de bloc que la section Navigation

6. **Etant donne** un utilisateur admin (non super_admin)
   **Quand** la page se charge
   **Alors** la section "Administration Super-Admin" n'est PAS visible

7. **Etant donne** la logique existante (Paheko, stats)
   **Quand** l'utilisateur interagit avec la page
   **Alors** toute la logique metier est conservee :
   - `pahekoAccessDecision` / `pahekoComptaUrl` (lien Paheko si autorise)
   - `getDashboardStats` (appel API existant)
   - Detection role admin/super_admin
   - Le lien Paheko est integre dans la section Navigation si `canAccessPaheko && pahekoComptaUrl`

## Tasks / Subtasks

- [ ] Task 1 : Titre et barre de resume (AC: #1, #2)
  - [ ] Remplacer le `PageContainer` par un layout custom avec titre "Tableau de Bord d'Administration"
  - [ ] Creer la barre de resume : 3 cellules horizontales (Notifications, CA Mois, Utilisateurs connectes)
  - [ ] Alimenter la barre avec les stats API (notifications = `pending_users_count` ou 0, CA mois = donnee future, utilisateurs connectes = `open_sessions_count` ou donnee future)
  - [ ] Si les donnees ne sont pas disponibles dans l'API actuelle, afficher les valeurs par defaut (0)

- [ ] Task 2 : Section "Statistiques quotidiennes" (AC: #3)
  - [ ] Creer 3 cards colorees avec bordure gauche epaisse (verte, orange, bleue)
  - [ ] Card "Financier" : icone euro, montant CA + sous-texte "CA: X.XX€ . Dons: X.XX€"
  - [ ] Card "Poids sorti" : icone balance, poids en kg + sous-texte "Sorti aujourd'hui"
  - [ ] Card "Poids recu" : icone balance, poids en kg + sous-texte "Recu aujourd'hui"
  - [ ] Etendre `DashboardStats` dans `adminDashboard.ts` pour accepter les champs `ca_jour`, `dons_jour`, `poids_sorti_kg`, `poids_recu_kg` (optionnels, defaut 0)
  - [ ] Si l'API ne renvoie pas ces champs, afficher 0.00€ / 0.0 kg (pas d'erreur)

- [ ] Task 3 : Section "Navigation principale" (AC: #4)
  - [ ] Creer 6 blocs en grille `SimpleGrid cols={3}` : chaque bloc est un `Link` wrappé dans une card coloree
  - [ ] Couleurs de fond specifiques par bloc (bleu clair, vert clair, orange, gris, vert pale, rouge pale)
  - [ ] Icones Mantine (`IconUsers`, `IconShield`, `IconTags`, `IconCash`, `IconClipboard`, `IconActivity` ou equivalents `@tabler/icons-react`)
  - [ ] Texte centre dans chaque bloc avec couleur assortie au fond
  - [ ] Liens vers les routes admin existantes

- [ ] Task 4 : Section "Administration Super-Admin" (AC: #5, #6)
  - [ ] Afficher cette section uniquement si `user?.role === 'super_admin'`
  - [ ] 3 blocs en ligne : "Sante Systeme", "Parametres Avances", "Sites & Caisses"
  - [ ] Style : fond blanc, bordure fine, icones Mantine
  - [ ] Liens vers `/admin/health`, `/admin/settings`, `/admin/sites`

- [ ] Task 5 : Integration Paheko et logique existante (AC: #7)
  - [ ] Conserver `loadPahekoAccessDecision`, `loadPahekoUrl`, `loadStats` sans modification
  - [ ] Integrer le lien Paheko (si autorise) dans la section "Navigation principale" comme bloc supplementaire ou lien discret, selon le rendu 1.4.4
  - [ ] Conserver le message d'acces restreint `paheko-access-restricted` si non autorise

- [ ] Task 6 : Styles CSS module et tokens (AC: #1 a #7)
  - [ ] Creer `frontend/src/admin/AdminDashboardPage.module.css`
  - [ ] Definir les classes : `.page`, `.title`, `.summaryBar`, `.summaryCell`, `.statsSection`, `.statCard`, `.statCardGreen`, `.statCardOrange`, `.statCardBlue`, `.navSection`, `.navBlock`, `.superAdminSection`
  - [ ] Couleurs de fond des blocs navigation en CSS vars ou constantes (pas de couleurs inline dans le TSX)
  - [ ] Bordures gauches epaisses sur les stat cards via CSS (`border-left: 4px solid <couleur>`)

- [ ] Task 7 : Tests et DoD Epic 15 (AC: #1 a #7)
  - [ ] Mettre a jour `frontend/src/admin/AdminDashboardPage.test.tsx`
  - [ ] Tester : titre "Tableau de Bord d'Administration" visible
  - [ ] Tester : barre de resume avec 3 cellules (notifications, CA mois, utilisateurs connectes)
  - [ ] Tester : 3 stat cards (financier, poids sorti, poids recu) avec valeurs par defaut quand stats null
  - [ ] Tester : 6 blocs navigation avec les bons liens et labels
  - [ ] Tester : section super-admin visible pour role super_admin, masquee pour admin
  - [ ] Tester : lien Paheko integre quand autorise
  - [ ] Tester : message acces restreint Paheko quand non autorise
  - [ ] `npm run test:run -- src/admin/AdminDashboardPage.test.tsx` OK
  - [ ] `npm run build` OK
  - [ ] Captures avant/apres sur `/admin`
  - [ ] Console navigateur : aucun crash ni "Failed to construct URL"
  - [ ] Completion Notes : trace Copy / Consolidate / Security

## Dev Notes

### Architecture / Patterns

- **Mantine** : `Card`, `SimpleGrid`, `Text`, `Badge`, `Group`, `Stack`, `Title`, `UnstyledButton` ou `Anchor` pour les blocs navigation. Icones via `@tabler/icons-react`.
- **Tests** : co-loces `*.test.tsx` (Vitest + RTL + jsdom). Mocks existants pour `useAuth`, `adminPahekoCompta`, `adminDashboard`.
- **Tokens** : reutiliser `visualTokens` de `frontend/src/shared/theme/tokens.ts`. Les couleurs de fond des blocs navigation sont specifiques a ce composant — les definir dans le CSS module plutot que dans les tokens globaux (pas reutilisees ailleurs).
- **`useAuth`** : le hook fournit `{ accessToken, permissions, user }`. Le code actuel utilise deja `user.role` pour detecter admin/super_admin. Pas de changement necessaire.

### Analyse du code actuel a refactorer

Le fichier `AdminDashboardPage.tsx` actuel (159 lignes) contient :
- Detection role admin : `isAdmin` (role admin ou super_admin ou permission admin)
- Chargement Paheko : `loadPahekoAccessDecision` + `loadPahekoUrl` (acces et URL Paheko)
- Chargement stats : `loadStats` → `getDashboardStats` (stats agregees optionnelles)
- Rendu actuel : `PageContainer title="Admin"` + stats cards optionnelles + liste de liens textuels

**Toute la logique metier doit etre conservee intacte.** Le refactoring porte uniquement sur le rendu visuel (remplacement de la liste de liens par des blocs colores, ajout barre de resume, ajout section stats quotidiennes, ajout section super-admin).

### API — champs stats quotidiennes

L'endpoint `GET /v1/admin/dashboard/stats` retourne actuellement `DashboardStats` :
```typescript
interface DashboardStats {
  users_count?: number;
  sites_count?: number;
  cash_registers_count?: number;
  open_sessions_count?: number;
  pending_users_count?: number;
}
```

La 1.4.4 affiche des stats quotidiennes supplementaires (CA jour, dons jour, poids sorti, poids recu). Ces champs ne sont pas encore dans l'API. L'approche recommandee :
- Etendre `DashboardStats` avec des champs optionnels : `ca_jour?: number`, `dons_jour?: number`, `poids_sorti_kg?: number`, `poids_recu_kg?: number`, `ca_mois?: number`, `notifications_count?: number`, `connected_users_count?: number`
- Si l'API ne les renvoie pas, afficher les valeurs par defaut (0)
- L'API backend sera etendue dans une story future ou dans un patch backend separe

### Blocs navigation — mapping routes

| Bloc | Couleur fond | Couleur texte | Icone | Route |
|------|-------------|---------------|-------|-------|
| Utilisateurs & Profils | `#e3f2fd` (bleu clair) | `#1565c0` (bleu) | `IconUsers` | `/admin/users` |
| Groupes & Permissions | `#e8f5e9` (vert clair) | `#2e7d32` (vert) | `IconShieldCheck` | `/admin/groups` |
| Categories & Tarifs | `#fff3e0` (orange clair) | `#e65100` (orange) | `IconTags` | `/admin/categories` |
| Sessions de Caisse | `#f5f5f5` (gris) | `#424242` (gris fonce) | `IconCash` | `/admin/session-manager` |
| Sessions de Reception | `#e8f5e9` (vert pale) | `#2e7d32` (vert) | `IconClipboardList` | `/admin/reception` |
| Activite & Logs | `#fce4ec` (rouge pale) | `#c62828` (rouge) | `IconActivity` | `/admin/audit-log` |

### Blocs super-admin — mapping routes

| Bloc | Icone | Route |
|------|-------|-------|
| Sante Systeme | `IconHeartbeat` / `IconActivity` | `/admin/health` |
| Parametres Avances | `IconSettings` | `/admin/settings` |
| Sites & Caisses | `IconBuilding` | `/admin/sites` |

### data-testid des composants

| Composant | data-testid |
|-----------|------------|
| Layout racine page admin | `page-admin` (existant, conserver) |
| Titre principal | `admin-dashboard-title` |
| Barre de resume | `admin-summary-bar` |
| Cellule notifications | `admin-summary-notifications` |
| Cellule CA mois | `admin-summary-ca-mois` |
| Cellule utilisateurs connectes | `admin-summary-connected-users` |
| Section stats quotidiennes | `admin-stats-section` |
| Card financier | `admin-stat-financier` |
| Card poids sorti | `admin-stat-poids-sorti` |
| Card poids recu | `admin-stat-poids-recu` |
| Section navigation principale | `admin-nav-section` |
| Bloc "Utilisateurs & Profils" | `admin-nav-users` |
| Bloc "Groupes & Permissions" | `admin-nav-groups` |
| Bloc "Categories & Tarifs" | `admin-nav-categories` |
| Bloc "Sessions de Caisse" | `admin-nav-sessions-caisse` |
| Bloc "Sessions de Reception" | `admin-nav-sessions-reception` |
| Bloc "Activite & Logs" | `admin-nav-activity` |
| Section super-admin | `admin-superadmin-section` |
| Bloc "Sante Systeme" | `admin-superadmin-health` |
| Bloc "Parametres Avances" | `admin-superadmin-settings` |
| Bloc "Sites & Caisses" | `admin-superadmin-sites` |
| Message acces Paheko restreint | `paheko-access-restricted` (existant) |

### Previous Story Intelligence (15.1 a 15.4)

**15.1 (Shell global)** :
- Le shell global est en place (header vert + nav horizontale).
- La page admin utilise le shell global normal (pas de `isFullScreenPage()`).
- Tokens brand vert dans `tokens.ts`.

**15.2 (Dashboard caisse)** :
- Pattern CSS modules + composants Mantine + tokens applique.
- Tests avec `data-testid` specifiques.

**15.3 (Saisie vente caisse)** :
- Layout plein ecran pour la page de saisie — pas applicable ici.

**15.4 (Reception)** :
- Pattern cards avec badges, en-tete custom, pagination.
- Reecriture complete du rendu avec conservation de la logique.
- Meme approche a suivre pour le dashboard admin.

### Project Structure Notes

- La page reste dans `frontend/src/admin/AdminDashboardPage.tsx` (pas de reorganisation).
- Le CSS module est cree dans le meme dossier (`AdminDashboardPage.module.css`).
- Pas de nouveau composant partage a creer — tout est interne au module admin.

### Prerequis

- Story 15.4 livree (reception en place)
- Le shell global (15.1) est en place

### References

- Epic 15 / Story 15.5 dans `_bmad-output/planning-artifacts/epics.md`
- Screenshot : `_bmad-output/implementation-artifacts/screenshots/11-0/admin-1/admin1-01-dashboard-admin.png`
- Charte visuelle : `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`
- Code 1.4.4 : `references/ancien-repo/`
- Tokens visuels : `frontend/src/shared/theme/tokens.ts`
- API dashboard : `frontend/src/api/adminDashboard.ts`
- Page actuelle : `frontend/src/admin/AdminDashboardPage.tsx`
- Tests actuels : `frontend/src/admin/AdminDashboardPage.test.tsx`

### Regle brownfield

Reecriture/adaptation depuis 1.4.4, pas collage. Identifier dans `references/ancien-repo/` les composants et styles du dashboard admin pour tracabilite Copy. Appliquer Consolidate (pas de doublon) et Security (pas de secret en dur, `npm audit` OK).

### Fichiers a creer

| Fichier | Role |
|---------|------|
| `frontend/src/admin/AdminDashboardPage.module.css` | Styles layout dashboard admin (titre, barre resume, stats cards, blocs navigation, section super-admin) |

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `frontend/src/admin/AdminDashboardPage.tsx` | Reecrire le rendu : titre, barre resume, stats quotidiennes, blocs navigation colores, section super-admin conditionnelle. Conserver logique metier |
| `frontend/src/admin/AdminDashboardPage.test.tsx` | Reecrire tests : titre, barre resume, stats cards, blocs navigation, section super-admin, acces Paheko |
| `frontend/src/api/adminDashboard.ts` | Etendre `DashboardStats` avec champs optionnels stats quotidiennes (`ca_jour`, `dons_jour`, `poids_sorti_kg`, `poids_recu_kg`, `ca_mois`, `notifications_count`, `connected_users_count`) |

## Dev Agent Record

### Agent Model Used

bmad-dev (implementation)

### Debug Log References

Aucun blocage rencontre.

### Completion Notes List

- **Copy** : Layout et structure inspires de la 1.4.4 (titre centre, barre resume 3 cellules, 3 stat cards colorees, grille navigation 3x2, section super-admin). Reecrit proprement avec Mantine + CSS modules.
- **Consolidate** : Reutilise `useAuth`, `getDashboardStats`, `getPahekoAccessDecision`, tokens brand. Pattern CSS modules co-loce (meme pattern que stories 15.2/15.4). Pas de doublon cree.
- **Security** : Pas de secret en dur. Acces API via accessToken existant. Section super-admin masquee par controle de role.

### File List

**Cree :**
- `frontend/src/admin/AdminDashboardPage.module.css` — styles layout dashboard admin (titre, barre resume, stats cards avec bordures gauches colorees, blocs navigation avec fonds colores, section super-admin)

**Modifie :**
- `frontend/src/admin/AdminDashboardPage.tsx` — layout reecrit : titre "Tableau de Bord d'Administration", barre resume (notifications + CA mois + utilisateurs connectes), section stats quotidiennes (3 cards : financier/poids sorti/poids recu), section navigation principale (6 blocs colores en grille 3x2), section super-admin conditionnelle (3 blocs), integration Paheko conservee
- `frontend/src/admin/AdminDashboardPage.test.tsx` — tests reecrits : titre, barre resume, stats cards, blocs navigation, section super-admin visible/masquee, acces Paheko
- `frontend/src/api/adminDashboard.ts` — `DashboardStats` etendu avec champs optionnels pour stats quotidiennes
