# Audit caisse 1.4.4 — Inventaire fonctionnel exhaustif

## Métadonnées

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-03-02 |
| **Story** | 18-4 |
| **Auteur** | bmad-dev (audit documentaire automatisé) |
| **Note importante** | Les fichiers source 1.4.4 listés dans la story (`references/ancien-repo/repo/frontend/src/...`) **ne sont pas présents physiquement** dans le dépôt. Seuls les fichiers de documentation d'analyse brownfield existent dans `references/ancien-repo/`. L'audit 1.4.4 s'appuie donc sur la documentation de référence disponible : `fonctionnalites-actuelles.md`, `component-inventory-frontend.md`, `data-models-api.md`, `api-contracts-api.md`, `architecture-patterns.md`. |

### Sources 1.4.4 analysées (documentation)

- `references/ancien-repo/fonctionnalites-actuelles.md` — liste exhaustive des fonctionnalités livrées (v1.4.4)
- `references/ancien-repo/component-inventory-frontend.md` — inventaire composants UI React
- `references/ancien-repo/data-models-api.md` — modèles de données
- `references/ancien-repo/api-contracts-api.md` — contrats API
- `references/ancien-repo/architecture-patterns.md` — patterns architecture (Zustand, React Query, etc.)
- `references/ancien-repo/source-tree-analysis.md` — arborescence projet

### Fichiers actuels analysés

- `frontend/src/caisse/CaisseDashboardPage.tsx`
- `frontend/src/caisse/CashRegisterSalePage.tsx`
- `frontend/src/caisse/CashRegisterSessionOpenPage.tsx`
- `frontend/src/caisse/CashRegisterSessionClosePage.tsx`
- `frontend/src/caisse/CaisseContext.tsx`
- `frontend/src/caisse/CaisseHeader.tsx`
- `frontend/src/caisse/CaisseStatsBar.tsx`
- `frontend/src/caisse/cashRegisterRoutes.ts`
- `frontend/src/caisse/AppNav.tsx`
- `frontend/src/caisse/LockButton.tsx`
- `frontend/src/caisse/CashRegisterGuard.tsx`
- `frontend/src/caisse/CashRegisterPinPage.tsx`
- `frontend/src/caisse/PinUnlockModal.tsx`
- `frontend/src/caisse/useCashRegisterLock.ts`
- `frontend/src/caisse/useOnlineStatus.ts`
- `frontend/src/caisse/offlineQueue/types.ts`
- `frontend/src/caisse/offlineQueue/indexedDb.ts`
- `frontend/src/caisse/offlineQueue/sync.ts`
- `frontend/src/api/caisse.ts`

---

## §1 — Layout et navigation

### Fichiers 1.4.4 sources

- `CashRegisterDashboard.tsx` — page dashboard : liste des caisses, choix type (réelle/virtuelle/différée)
- `Sale.tsx` — page saisie vente plein écran avec header caisse, KPI banner, grille
- `CashKPIBanner.tsx` — barre de statistiques live (fond sombre, 6 indicateurs)
- `CashSessionHeader.tsx` — header dédié caisse (fond vert, agent + session + bouton fermer)
- `SessionManager.tsx` (admin) — liste et gestion des sessions (admin)
- `CashSessionDetail.tsx` (admin) — détail d'une session avec tickets
- `AdminLayout.tsx` — layout admin avec menu latéral

### Composants équivalents (nouvelle app)

- `frontend/src/caisse/CaisseDashboardPage.tsx` — présent ✓
- `frontend/src/caisse/CashRegisterSalePage.tsx` — présent ✓
- `frontend/src/caisse/CaisseHeader.tsx` — présent ✓ (header vert, agent + session + bouton fermer)
- `frontend/src/caisse/CaisseStatsBar.tsx` — présent ✓ (6 indicateurs, toggle Live/Session, horloge)
- `frontend/src/caisse/cashRegisterRoutes.ts` — présent ✓ (définition des routes autorisées)
- `frontend/src/caisse/CashRegisterGuard.tsx` — présent ✓
- Page Caisse Virtuelle `/cash-register/virtual` — À créer ✗
- Page Saisie Différée `/cash-register/deferred` — À créer ✗
- Page Admin sessions (SessionManager) — hors scope caisse, à vérifier dans admin/

### Fonctionnalités inventoriées

- Dashboard : liste des postes de caisse avec statut OUVERTE/FERMÉE ✓
- Dashboard : badge caisse virtuelle (SIMULATION) avec lien ✓
- Dashboard : badge saisie différée (ADMIN) avec lien ✓
- Dashboard : auto-sélection du poste si un seul poste ouvert ✓
- Dashboard : accès direct fermeture session en cours ✓
- Page sale plein écran avec header dédié vert ✓
- Barre stats (CashKPIBanner) — fond sombre/indigo, 6 indicateurs ✓
- Toggle Live/Session dans la barre stats ✓ (UI présente, données partiellement câblées)
- Horloge temps réel dans barre stats ✓
- Routing caisse : `/caisse`, `/cash-register/sale`, `/cash-register/session/open`, `/cash-register/session/close`, `/cash-register/pin` ✓
- Route `/cash-register/virtual` — bouton présent sur dashboard ✗ (pas de page dédiée)
- Route `/cash-register/deferred` — bouton présent sur dashboard ✗ (pas de page dédiée)
- Mode plein écran (pas d'AppShell global) sur `/cash-register/sale` ✓
- SessionStatusBanner (alerte hors-ligne / token expirant) — partiellement ⚠️ (offline banner présent dans SalePage)
- Guard de route caisse (isCaisseAllowedPath) ✓
- CashRegisterPinPage / PinUnlockModal ✓

### Écarts identifiés

1. **Page Caisse Virtuelle absente** : `/cash-register/virtual` est listé dans le dashboard mais aucune page n'existe. En 1.4.4, `VirtualCashRegister.tsx` était une page dédiée avec le même workflow (session virtuelle sans impact réel).
2. **Page Saisie Différée absente** : `/cash-register/deferred` est listé dans le dashboard mais aucune page dédiée n'existe. La saisie différée est gérée comme `session_type='deferred'` dans `CashRegisterSessionOpenPage`, mais sans flux dédié.
3. **Données stats partiellement câblées** : `donsJour`, `poidsSortis`, `poidsRentres` passent `0` en dur dans `CashRegisterSalePage`; non récupérés depuis l'API live.
4. **Toggle Live/Session non fonctionnel** : le toggle est affiché dans `CaisseStatsBar` mais ne change pas les données affichées (pas de callback).

---

## §2 — Grille catégories et presets

### Fichiers 1.4.4 sources

- `EnhancedCategorySelector.tsx` — sélecteur de catégories enrichi (hiérarchique, filtres par onglet, sous-catégories)
- `CategorySelector.tsx` — sélecteur basique (version simple)
- `CategoryDisplayManager.tsx` — gestion affichage des catégories (visibilité, ordre)
- `PresetButtonGrid.tsx` — grille de boutons presets (Don 0 €, Don -18, Recyclage, Déchèterie, etc.)
- `PriceCalculator.tsx` — calculateur de prix pour presets et articles
- `Sale.tsx` — page saisie avec intégration des composants ci-dessus

### Composants équivalents (nouvelle app)

- Grille catégories inline dans `frontend/src/caisse/CashRegisterSalePage.tsx` — partiel ⚠️
- Presets inline dans `frontend/src/caisse/CashRegisterSalePage.tsx` — partiel ⚠️
- `EnhancedCategorySelector` — À créer ✗
- `PresetButtonGrid` — À créer ✗
- `CategoryDisplayManager` — À créer ✗

### Fonctionnalités inventoriées

- Affichage catégories en grille avec raccourcis clavier ✓ (implémentation basique)
- Raccourci lettre auto-assigné par catégorie ✓ (algorithme basique)
- Sélection catégorie → mise en surbrillance ✓
- Presets actifs chargés via `GET /v1/presets/active` ✓
- Affichage presets en boutons rapides (petits, groupe horizontal) ✓ (mais non en grille dédiée)
- Ajout preset au panier en un clic ✓
- Onglet "Sous-catégorie" — placeholder ✗ ("à venir" inscrit dans le code)
- Filtre catégories par onglet (catégorie / sous-catégorie / poids / prix) ✓ (4 onglets présents)
- Hiérarchie catégories (parent_id) — non utilisée dans la grille ✗
- Types de presets (Don 0€, Don -18, Recyclage, Déchèterie) — chargés mais non différenciés visuellement ⚠️
- Presets Recyclage/Déchèterie avec logique dédiée (B49-P6) ✗ (non implémenté)
- Mode "item sans prix" (prix global, option B49-P2) ✗ (non implémenté)
- Filtre visibilité caisse (`is_visible_sale`) — géré côté API (`/v1/categories/sale-tickets`) ✓
- Ordre d'affichage (`display_order`) — rendu dans l'ordre API ✓
- Noms courts vs noms officiels (double dénomination B48-P5) ✗ (affiche uniquement `name`)

### Écarts identifiés

1. **Pas de composant `EnhancedCategorySelector`** : la grille est inline dans `CashRegisterSalePage`. En 1.4.4, c'était un composant dédié réutilisable avec hiérarchie, filtres par onglet, et affordances avancées.
2. **Sous-catégories non implémentées** : le panneau sous-catégorie affiche "à venir". En 1.4.4, la navigation hiérarchique (catégorie → sous-catégorie) était fonctionnelle.
3. **Presets sans différenciation visuelle par type** : Don 0€, Recyclage, Déchèterie ont des comportements distincts en 1.4.4 (Recyclage = poids obligatoire, Déchèterie = logique spécifique). Non différenciés actuellement.
4. **Pas de `PresetButtonGrid`** : les presets s'affichent en `Group` horizontal compact. En 1.4.4 la grille était plus visuelle (icônes, couleurs par type).
5. **Noms officiels non utilisés** : le champ `official_name` (B48-P5) est dans le modèle mais non affiché en caisse.

---

## §3 — Raccourcis clavier AZERTY

### Fichiers 1.4.4 sources

- `cashKeyboardShortcuts.ts` — logique principale des raccourcis caisse (touche → action)
- `azertyKeyboard.ts` — mapping disposition AZERTY (positions physiques → caractères)
- `keyboardShortcuts.ts` — utilitaire générique de raccourcis (event listener, priority)

### Composants équivalents (nouvelle app)

- Raccourcis basiques inline dans `frontend/src/caisse/CashRegisterSalePage.tsx` — partiel ⚠️
- `cashKeyboardShortcuts.ts` — À créer ✗
- `azertyKeyboard.ts` — À créer ✗

### Fonctionnalités inventoriées

- Raccourcis lettre par catégorie (auto-assigné à la première lettre disponible) ✓ (basique)
- Désactivation raccourcis si focus sur input/textarea/select ✓
- Mapping AZERTY physique des touches pour raccourcis ✗ (non implémenté)
- Raccourci quantité (ex: `2` puis lettre = 2× article) ✗
- Raccourci poids (ex: clavier numérique → poids) ✗
- Raccourci prix libre (ex: `P` puis valeur) ✗
- Touche Entrée = valider/ajouter article ✗
- Touche Suppr/Backspace = annuler ligne en cours ✗
- Touche Echap = annuler saisie en cours ✗
- Raccourci preset (touche dédiée par preset, ex: `F1`=Don, `F2`=Recyclage) ✗
- Raccourci finalisation ticket (ex: `Ctrl+Enter`) ✗
- Raccourci mode paiement (ex: `E`=espèces, `C`=carte, `Q`=chèque) ✗

### Écarts identifiés

1. **Pas de mapping AZERTY physique** : en 1.4.4, `azertyKeyboard.ts` mappait les positions physiques du clavier AZERTY (les lettres `A-Z` en positions AZERTY vs QWERTY). L'implémentation actuelle utilise directement `e.key.toUpperCase()`, ce qui ne gère pas les différences de layout.
2. **Pas de modificateurs numériques** : en 1.4.4, saisir `2` puis une lettre de catégorie ajoutait 2 unités. Non présent actuellement.
3. **Pas de raccourcis spéciaux** : les touches fonctionnelles (Entrée, Echap, Suppr, F1-F12) ne sont pas utilisées.
4. **Pas de mode paiement au clavier** : en 1.4.4, des raccourcis permettaient de sélectionner le mode de paiement directement.
5. **Algorithme d'assignation des lettres non-AZERTY** : l'algorithme actuel prend la première lettre disponible du nom ; il ne considère pas les positions AZERTY ni la fréquence d'usage.

---

## §4 — Ticket en temps réel

### Fichiers 1.4.4 sources

- `Ticket.tsx` — composant ticket dédié (liste des lignes, subtotal, total, dons, remises)
- `TicketDisplay.tsx` (business/) — wrapper ticket avec styles et états (vide/en cours/finalisé)
- `SaleWizard.tsx` — assistant vente (encapsule le ticket et la navigation entre étapes)
- `Sale.tsx` — page principale qui orchestre ticket + grille

### Composants équivalents (nouvelle app)

- Ticket inline dans `frontend/src/caisse/CashRegisterSalePage.tsx` (panneau `aside`) — partiel ⚠️
- `Ticket.tsx` dédié — À créer ✗
- `TicketDisplay.tsx` — À créer ✗

### Fonctionnalités inventoriées

- Panneau ticket latéral visible en permanence ✓
- Liste des lignes (nom, quantité, poids, prix total) ✓
- Suppression d'une ligne (bouton × par ligne) ✓
- Total du ticket en temps réel ✓ (recalcul à chaque changement du panier)
- Nombre d'articles affiché ✓
- État "Aucun article" (panier vide) ✓
- Poids par ligne (si saisi) ✓
- Note sur le ticket ✓ (champ texte)
- Date de vente optionnelle (sale_date) ✓ (champ date)
- Sous-total / total avec remises ✗ (pas de gestion des remises)
- Dons suivis séparément (CA vs dons) ✗ (pas de ligne "Don" distincte dans le ticket)
- Édition de quantité sur une ligne existante ✗ (uniquement suppression + ré-ajout)
- Édition du prix sur une ligne existante ✗
- Indicateur poids total du ticket ✗
- Distinction visuelle preset (Don, Recyclage) vs article ✗
- Scrollable si ticket long ⚠️ (dépend du CSS, non confirmé)

### Écarts identifiés

1. **Pas de composant `Ticket` dédié** : le ticket est un bloc `aside` inline dans `CashRegisterSalePage`. En 1.4.4, c'était un composant autonome réutilisable (`Ticket.tsx`), facilitant la réutilisation dans `SaleWizard`, caisse virtuelle, etc.
2. **Pas d'édition de ligne** : on ne peut que supprimer une ligne et la re-saisir. En 1.4.4, il était possible de modifier la quantité et le prix d'une ligne directement dans le ticket.
3. **Pas de distinction Don/vente normale** : les dons (présets à 0€ ou négatifs) ne sont pas visuellement différenciés dans le ticket. En 1.4.4, les dons étaient surlignés différemment et le total distinguait CA réel et dons.
4. **Poids total du ticket absent** : en 1.4.4, le poids cumulé des articles (B52-P6) était affiché dans le ticket. Actuellement, le poids est noté par ligne mais aucun cumul n'est affiché.
5. **Pas de SaleWizard** : en 1.4.4, `SaleWizard.tsx` orchestrait les étapes de la vente (sélection → saisie → paiement → confirmation). Actuellement, tout est dans une seule vue.

---

## §5 — Finalisation et paiements

### Fichiers 1.4.4 sources

- `FinalizationScreen.tsx` — écran de finalisation (résumé ticket, saisie paiements, rendu monnaie)
- `SaleWizard.tsx` — orchestre le flow entry → sale → exit
- `Sale.tsx` — page principale avec intégration FinalizationScreen
- `cashSessionService.ts` — appels API pour clôture du ticket

### Composants équivalents (nouvelle app)

- Paiements inline dans `frontend/src/caisse/CashRegisterSalePage.tsx` — partiel ⚠️
- `FinalizationScreen.tsx` — À créer ✗

### Fonctionnalités inventoriées

- Multi-paiements (espèces + chèque + CB dans un même ticket) ✓ (B52-P1)
- Modes de paiement : espèces, chèque, carte bancaire ✓
- Ajout de plusieurs lignes de paiement ✓
- Suppression d'une ligne de paiement ✓
- Validation : total paiements = total panier ✓
- Total paiements affiché ✓
- Rendu monnaie calculé automatiquement ✗ (non présent)
- Affichage "Montant donné" vs "Montant dû" ✗
- Mode chèque sans rendu monnaie (B39-P6) ⚠️ (le mode chèque existe mais sans logique "pas de rendu")
- Raccourci "Montant exact" (espèces = total) ✗
- Pavé numérique pour saisie du montant ✗ (champs `NumberInput` basiques)
- Récapitulatif ticket avant validation ⚠️ (le ticket est visible en parallèle, pas en écran dédié)
- Confirmation visuelle après enregistrement ✗ (le panier se vide silencieusement)
- Offline : mise en buffer IndexedDB si hors-ligne ✓ (Story 5.4)
- Sync offline au retour en ligne ✓ (Story 5.4)
- Indicateur tickets en attente de sync ✓
- POST `/v1/sales` avec `items[]` et `payments[]` ✓

### Écarts identifiés

1. **Pas de `FinalizationScreen`** : en 1.4.4, cet écran modal/page résumait le ticket complet, demandait le montant donné (espèces), calculait et affichait le rendu monnaie. Actuellement, la finalisation est intégrée directement dans le panneau ticket sans étape dédiée.
2. **Pas de calcul de rendu monnaie** : fonctionnalité critique pour une caisse physique. Si le client paye 20€ pour 13,50€ d'achats, le rendu (6,50€) n'est pas calculé ni affiché.
3. **Pas de mode chèque spécifique** : en 1.4.4 (B39-P6), le mode chèque ne calculait pas de rendu monnaie et acceptait le montant exact uniquement. Ce comportement n'est pas différencié.
4. **Confirmation visuelle absente** : après validation d'un ticket, le panier se vide mais aucune confirmation ("Ticket enregistré — 3 articles, 15,00 €") n'est affichée. En 1.4.4, il y avait un feedback visuel clair.
5. **Pas de pavé numérique** : en 1.4.4, la saisie du montant utilisait un numpad adapté aux écrans tactiles. Les `NumberInput` actuels sont des champs texte.

---

## §6 — Ouverture de session

### Fichiers 1.4.4 sources

- `OpenCashSession.tsx` — page dédiée ouverture de session
- `CashRegisterForm.tsx` — formulaire saisie fond de caisse + sélection poste
- `cashSessionService.ts` — `POST /v1/cash-sessions`
- `cashSessionStore.ts` — state Zustand (id session, step, operateur)

### Composants équivalents (nouvelle app)

- `frontend/src/caisse/CashRegisterSessionOpenPage.tsx` — présent ✓
- Store Zustand session — À créer ✗ (état local uniquement)

### Fonctionnalités inventoriées

- Sélection du poste de caisse ✓ (Select avec GET `/v1/cash-registers`)
- Pré-sélection du poste si `register_id` passé en query param ✓
- Saisie fond de caisse (€) ✓
- Type de session : réelle / virtuelle / différée ✓
- Saisie date réelle pour session différée ✓
- Vérification doublon session différée (GET `/v1/cash-sessions/deferred/check`) ✓
- Message retour vérification doublon ✓
- Validation form + POST `/v1/cash-sessions` ✓
- Redirection vers `/cash-register/sale` après ouverture ✓
- Indicateur de chargement ✓
- Gestion d'erreur API ✓
- Filtre postes par site ✗ (non implémenté, tous les postes listés)
- Indicateur visuel "step 1/3" (StepIndicator) ✗ (formulaire nu sans indicateur d'étape)
- Affichage statut "session déjà ouverte" sur ce poste ✗ (non vérifié avant ouverture)
- Fond de caisse pré-rempli (suggestion basée sur fermeture précédente) ✗

### Écarts identifiés

1. **Pas d'indicateur d'étapes** : en 1.4.4, `StepIndicator` (composant générique `ui/`) indiquait la progression (Entry → Sale → Exit). Non présent dans `CashRegisterSessionOpenPage`.
2. **Pas de filtre par site** : si plusieurs sites existent, tous les postes sont listés sans filtrage. En 1.4.4, les postes étaient filtrés par site de l'opérateur.
3. **Pas de pré-remplissage fond de caisse** : en 1.4.4, le fond de caisse suggéré correspondait à l'argent rendu de la session précédente (montant clôture session N-1).

---

## §7 — Fermeture de session

### Fichiers 1.4.4 sources

- `CloseSession.tsx` — page fermeture : comptage physique, contrôle totaux, écart, commentaire
- `cashSessionStore.ts` — state (totaux session, variance)
- `cashSessionService.ts` — `POST /v1/cash-sessions/{id}/close`
- `CashSessionDetail.tsx` (admin) — détail post-clôture (rapport)

### Composants équivalents (nouvelle app)

- `frontend/src/caisse/CashRegisterSessionClosePage.tsx` — présent ⚠️ (basique)
- Rapport de clôture — À créer ✗

### Fonctionnalités inventoriées

- Affichage date/heure ouverture session ✓
- Affichage fond de caisse initial ✓
- Affichage total ventes et nombre de lignes ✓
- Saisie montant de clôture (closing_amount) ✓
- Saisie montant compté physiquement (actual_amount) ✓
- Saisie commentaire écart ✓
- Calcul et affichage de la variance (écart) ✗ (saisi mais non affiché en retour visuel)
- Comptage physique par dénomination (billets/pièces) ✗ (non présent)
- Résumé de session (nombre de tickets, CA par mode de paiement) ✗
- Rapport de clôture email automatique ✗ (endpoint API existe, non déclenché depuis le frontend)
- Sync Paheko à la clôture ✗ (non implémenté côté frontend)
- Indicateur `step = exit` déclenché automatiquement ✗ (le step n'est pas mis à jour)
- POST `/v1/cash-sessions/{id}/close` ✓
- Redirection vers `/caisse` après fermeture ✓
- Gestion erreur API ✓
- Récapitulatif total ventes tous modes de paiement ✗ (uniquement total global)

### Écarts identifiés

1. **Pas de comptage physique par dénomination** : en 1.4.4, `CloseSession.tsx` proposait une interface de comptage espèces (champs par dénomination : 500€, 200€, 100€, 50€, 20€, 10€, 5€, 2€, 1€, 0.50€, 0.20€, 0.10€, 0.05€). L'écart était calculé automatiquement. Non présent actuellement.
2. **Variance non affichée** : `closing_amount` et `actual_amount` sont saisis mais la variance calculée (closing - actual) n'est pas affichée avant validation.
3. **Pas de récapitulatif par mode de paiement** : en 1.4.4, la fermeture affichait le total espèces, CB, chèques séparément. Critique pour la réconciliation.
4. **Rapport de clôture non déclenché** : l'API supporte l'envoi d'un rapport par email à la clôture, mais le frontend ne l'active pas.
5. **Step `exit` non géré** : `updateCashSessionStep` avec `'exit'` n'est pas appelé lors de la fermeture. En 1.4.4, le workflow en 3 étapes (entry/sale/exit) était géré explicitement.

---

## §8 — Caisse virtuelle

### Fichiers 1.4.4 sources

- `VirtualCashRegister.tsx` — page dédiée caisse virtuelle (même workflow, données isolées)
- `virtualCashSessionStore.ts` — store Zustand spécifique (données non persistées/marquées virtual)
- `Sale.tsx` — réutilisé avec prop `isVirtual`

### Composants équivalents (nouvelle app)

- Bouton "Simuler" sur `CaisseDashboardPage.tsx` → `/cash-register/virtual` ⚠️ (lien existant)
- Page `/cash-register/virtual` — À créer ✗
- `virtualCashSessionStore` — À créer ✗

### Fonctionnalités inventoriées

- Accès depuis le dashboard avec badge SIMULATION ✓ (bouton présent)
- Page dédiée caisse virtuelle ✗ (route non implémentée, renvoie probablement sur 404 ou page générique)
- Workflow identique à la caisse réelle (saisie, presets, catégories, paiements) ✗
- Session de type `virtual` via `session_type='virtual'` à l'ouverture ⚠️ (possible via `CashRegisterSessionOpenPage` en sélectionnant "Virtuelle")
- Indicateur visuel "MODE VIRTUEL" pendant la saisie ✗
- Données non envoyées en production ⚠️ (API marque la session comme virtuelle, mais le flux frontend n'est pas différencié)
- Isolation du store Zustand pour éviter pollution ✗ (pas de store, état local partagé)
- Description "Mode d'entraînement sans impact" ✓ (texte présent sur dashboard)

### Écarts identifiés

1. **Page dédiée caisse virtuelle absente** : en 1.4.4, `VirtualCashRegister.tsx` offrait une expérience complète et identifiée comme virtuelle (bannière de mode, couleur différente). Actuellement, la route `/cash-register/virtual` n'est pas implémentée comme page.
2. **Pas d'indicateur visuel en mode virtuel** : l'opérateur ne sait pas visuellement qu'il est en mode simulation pendant la saisie.
3. **Store virtuel absent** : en 1.4.4, `virtualCashSessionStore.ts` isolait le state virtuel du state réel pour éviter les confusions et permettre une réinitialisation propre.

---

## §9 — Saisie différée

### Fichiers 1.4.4 sources

- `Sale.tsx` — réutilisé avec prop `isDeferred` ou via session de type deferred
- `deferredCashSessionStore.ts` — store Zustand spécifique saisie différée
- `cashSessionService.ts` — vérification doublon, création session différée
- `CashRegisterDashboard.tsx` — entrée dédiée avec sélection date réelle

### Composants équivalents (nouvelle app)

- Saisie différée via `session_type='deferred'` dans `CashRegisterSessionOpenPage.tsx` ⚠️
- Bouton "Accéder" sur `CaisseDashboardPage.tsx` → `/cash-register/deferred` ⚠️ (lien sans page dédiée)
- `deferredCashSessionStore` — À créer ✗

### Fonctionnalités inventoriées

- Accès depuis le dashboard avec badge ADMIN ✓ (bouton présent)
- Vérification doublon session différée par date ✓ (implémentée dans `CashRegisterSessionOpenPage`)
- Saisie date réelle du cahier (`opened_at`) ✓ (champ date dans open page quand type=deferred)
- Flow dédié `/cash-register/deferred` ✗ (route non implémentée comme page)
- Indicateur visuel "MODE DIFFÉRÉ — Date : XX/XX/XXXX" pendant la saisie ✗
- Field `sale_date` sur chaque ticket pour date réelle de vente ✓ (présent dans `CashRegisterSalePage`)
- Correction sessions différées bloquées (endpoint admin `fix-blocked-deferred`) ✗ (admin seulement)
- Isolation du store saisie différée ✗ (pas de store dédié)
- Rapport de clôture adapté (mention "session différée") ✗

### Écarts identifiés

1. **Pas de page dédiée saisie différée** : en 1.4.4, la saisie différée avait son propre flux (page d'accueil, sélection date, etc.). Actuellement, elle passe par `CashRegisterSessionOpenPage` via `session_type='deferred'` sans accès guidé depuis `/cash-register/deferred`.
2. **Pas d'indicateur de mode différé pendant la saisie** : l'opérateur ne voit pas clairement qu'il saisit pour une date passée pendant la saisie des ventes.
3. **Store dédié absent** : en 1.4.4, `deferredCashSessionStore.ts` gérait les spécificités de la saisie différée (date courante, session id, etc.).

---

## §10 — State management

### Fichiers 1.4.4 sources

- `cashSessionStore.ts` — store principal (session id, step, operator, totaux)
- `categoryStore.ts` — store catégories (liste, hiérarchie, chargée une fois, réutilisée)
- `virtualCashSessionStore.ts` — store session virtuelle (isolation des données)
- `deferredCashSessionStore.ts` — store session différée (date, session id différée)
- React Query — cache API (sessions, presets, catégories)

### Composants équivalents (nouvelle app)

- `frontend/src/caisse/CaisseContext.tsx` — présent ⚠️ (lock/unlock, poste courant uniquement)
- `frontend/src/caisse/offlineQueue/indexedDb.ts` — présent ✓ (stockage offline IndexedDB)
- Zustand stores caisse — À créer ✗ (aucun store Zustand pour caisse)
- React Query pour caisse — À créer ✗ (fetch natif direct dans pages)

### Architecture 1.4.4

```
cashSessionStore (Zustand)
├── sessionId: string | null
├── step: 'entry' | 'sale' | 'exit'
├── operatorId: string | null
├── initialAmount: number
├── totalSales: number
├── totalItems: number
├── actions: { open, close, setStep, reset }

categoryStore (Zustand)
├── categories: Category[]
├── hierarchy: CategoryNode[]
├── loaded: boolean
├── actions: { load, reset }

virtualCashSessionStore (Zustand)
├── [même structure que cashSessionStore]
├── isVirtual: true (constant)

deferredCashSessionStore (Zustand)
├── [même structure que cashSessionStore]
├── deferredDate: string
├── isDeferred: true (constant)
```

### Architecture actuelle (nouvelle app)

```
CaisseContext (React Context)
├── isLocked: boolean
├── unlockedBy: UserInToken | null
├── currentRegisterId: string | null
├── currentRegisterStarted: boolean
├── isCashRegisterActive: boolean
├── actions: { unlockWithPin, lock, setCurrentRegister }

CashRegisterSalePage (état local useState)
├── session: CashSessionItem | null
├── presets: PresetItem[]
├── categories: CategoryItem[]
├── cart: CartLine[]
├── payments: PaymentPayload[]
├── paymentMethod, paymentAmountEur, note, saleDate
├── offline state (pendingOfflineCount, syncing)

offlineQueue (IndexedDB)
├── BufferedTicket[] (offline_id, created_at + payload sale)
├── CRUD: addTicket, getAllTickets, removeTicket, getPendingCount
├── sync: syncOfflineQueue (au retour en ligne)
```

### Fonctionnalités inventoriées

- Store Zustand session caisse (réelle) ✗ — état local dans page uniquement
- Store Zustand catégories (chargement unique, réutilisation) ✗ — rechargé à chaque montage
- Store Zustand caisse virtuelle ✗
- Store Zustand saisie différée ✗
- React Query pour cache et invalidation ✗ — fetch natif non caché
- CaisseContext (lock/unlock PIN + poste courant) ✓
- IndexedDB offline queue ✓
- Actions caisse centralisées ✗ — logique dispersée dans les pages
- Persistance du panier entre navigations ✗ (perdu si on quitte la page sale)
- Partage de session entre composants (currentSession accessible globalement) ✗

### Écarts identifiés

1. **Pas de store Zustand caisse** : le state de session, panier, paiements est local à `CashRegisterSalePage`. Si l'utilisateur navigue (ex: vers PIN), le panier est perdu. En 1.4.4, `cashSessionStore` persistait le state du panier en cours.
2. **Pas de categoryStore** : les catégories sont rechargées à chaque montage de la page. En 1.4.4, `categoryStore` chargeait les catégories une fois et les réutilisait (optimisation critique pour les performances en caisse).
3. **Pas de React Query** : les appels API utilisent `fetch` natif avec `useState/useEffect`. Pas de cache, pas d'invalidation automatique, pas de retry. En 1.4.4, React Query gérait cache, invalidation et états loading/error standardisés.
4. **État partagé insuffisant** : `CaisseContext` ne gère que le verrou et le poste. Le reste (session courante, totaux, panier) n'est pas partageable entre composants sans prop drilling.
5. **Pas de stores dédiés virtual/deferred** : impossible d'isoler les données de simulation de la caisse réelle sans store dédié.

---

## Synthèse

### Fonctionnalités couvertes (évaluation par section)

| Section | Couverture | Notes |
|---------|-----------|-------|
| §1 Layout et navigation | 75% | Header, stats bar, dashboard OK ; pages virtual/deferred absentes |
| §2 Grille catégories et presets | 50% | Grille basique OK ; sous-catégories, types presets, EnhancedCategorySelector absents |
| §3 Raccourcis clavier AZERTY | 20% | Raccourcis lettre basiques OK ; AZERTY, modificateurs, raccourcis spéciaux absents |
| §4 Ticket en temps réel | 65% | Affichage OK ; édition lignes, dons, poids total absents |
| §5 Finalisation et paiements | 60% | Multi-paiements OK ; rendu monnaie, FinalizationScreen, confirmation absents |
| §6 Ouverture de session | 80% | Complet ; indicateur étapes, filtre site, pré-remplissage absents |
| §7 Fermeture de session | 50% | Formulaire basique OK ; comptage physique, récapitulatif, rapport absents |
| §8 Caisse virtuelle | 15% | Bouton dashboard uniquement ; page + store + indicateurs absents |
| §9 Saisie différée | 30% | Session type deferred OK ; page dédiée, store, indicateurs absents |
| §10 State management | 30% | CaisseContext OK ; stores Zustand, React Query, persistance absents |

**Couverture globale estimée : 47%**

### Écarts critiques (P0)

1. **Pages Virtual et Deferred absentes** : deux modes de caisse accessibles depuis le dashboard ne sont pas implémentés.
2. **Rendu monnaie absent** : fonctionnalité indispensable pour toute caisse physique.
3. **Pas de store Zustand caisse** : le panier se perd à la navigation ; architecture fragile.
4. **Raccourcis AZERTY non conformes** : l'implémentation actuelle ne correspond pas à la disposition physique AZERTY.
5. **Pas de comptage physique à la fermeture** : la réconciliation caisse est incomplète.
6. **Sous-catégories non implémentées** : placeholder "à venir" dans le code.

### Écarts importants (P1)

7. **FinalizationScreen absent** : pas d'écran de confirmation avant envoi.
8. **Pas de React Query** : performances et fiabilité des données dégradées.
9. **Données stats partielles** : dons, poids sortis/rentrés à 0 en dur.
10. **Types presets non différenciés** : Recyclage (poids obligatoire), Déchèterie, Don ont des comportements distincts non gérés.

### Recommandations pour stories 18.5 – 18.10

| Story cible | Scope recommandé |
|-------------|-----------------|
| **18.5** | Raccourcis clavier AZERTY complets (`cashKeyboardShortcuts.ts`, `azertyKeyboard.ts`) + modificateurs quantité/poids/prix |
| **18.6** | `EnhancedCategorySelector` + sous-catégories + `PresetButtonGrid` avec types visuels |
| **18.7** | `FinalizationScreen` (modal dédié) + rendu monnaie + confirmation visuelle après validation |
| **18.8** | Page Caisse Virtuelle (`/cash-register/virtual`) + indicateur mode + `virtualCashSessionStore` |
| **18.9** | Page Saisie Différée (`/cash-register/deferred`) + indicateur mode + `deferredCashSessionStore` |
| **18.10** | Store Zustand caisse (session + panier + paiements) + React Query + comptage physique fermeture |

---

*Audit généré le 2026-03-02 — Story 18-4 — bmad-dev*
