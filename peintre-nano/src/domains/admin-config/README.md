# Domaine — admin config

Surfaces d'admin simple (P2 rappel : persistance PostgreSQL côté backend) — epic 9.

**Story 17.1** : widget **`admin.users.demo`** → **`AdminUsersWidget`** sur **`/admin/users`** — gestion utilisateurs sous contrat CREOS / OpenAPI. Le rail historique **`/admin/pending`** n'est pas porté côté Peintre.

**Story 17.2** : **`admin.cash-registers.demo`** → **`AdminCashRegistersWidget`** (`admin-cash-registers-client.ts`, opérations OpenAPI **`recyclique_cashRegisters_*`** sur **`/v1/cash-registers/`** + **`getCashRegistersStatus`** pour l'état session) ; **`admin.sites.demo`** → **`AdminSitesWidget`** (`admin-sites-client.ts`, **`/v1/sites/`**). Ce ne sont plus des placeholders sans fetch.

**Story 17.3** (rail U) :

- **`AdminListPageShell`** — coquille liste + bandeau « détail simple » démo (`data-testid` **`admin-list-page-shell`** / **`admin-detail-simple-demo-strip`**), couverte par les tests unitaires ; **`AdminDetailSimpleDemoStrip`** est réutilisé par **`AdminReceptionStatsSupervisionWidget`** (19.1). Les pages **`/admin/cash-registers`**, **`/admin/sites`**, **`/admin/session-manager`**, **`/admin/users`**, **`/admin/groups`**, etc. s'appuient aujourd'hui sur des manifestes souvent réduits au seul slot **`admin.transverse-list.main`** (sans enrobage React commun à ces widgets).
- **`admin-transverse-list-shell-slots.ts`** — `slot_id` CREOS homogènes (`admin.transverse-list.*`) pour les `PageManifest` qui les déclarent (ex. stats réception : **`header`** + **`contract-gap`** + **`main`**).
- **`admin-transverse-list-page-guards.ts`** — convention guards (`transverse.admin.view` + `requires_site`) ; source de refus = **ContextEnvelope** + manifestes, pas de permission inventée côté UI.

**Pages démo / hors nav servie** : **`/admin/groups`**, **`/admin/categories`**, **`/admin/audit-log`** — `page_key` **`transverse-admin-*`** et widgets **`admin.groups.demo`**, **`admin.categories.demo`**, **`admin.audit-log.demo`** (`AdminGroupsWidget`, **`AdminCategoriesWidget`**, **`AdminAuditLogWidget`**) ; résolution de route dans **`RuntimeDemoApp`** + manifestes importés dans **`runtime-demo-manifest.ts`**. À la date du dépôt, **`navigation-transverse-served.json`** (et la copie **`public/manifests/navigation.json`**) ne listent pas ces trois chemins : accès typique via le hub legacy **`admin.legacy.dashboard.home`** ou URL directe en démo.

**Story 14.5** : **`admin.groups.demo`** → **`AdminGroupsWidget`** + **`admin-groups-client.ts`** — liste/détail et mutations alignées `adminGroups*` (16.2) ; écarts catalogue legacy nommés à l'écran.

**Story 18.2** : **`admin.session-manager.demo`** → **`SessionManagerAdminWidget`** (`SessionManagerAdminWidget.tsx`, **`admin-cash-sessions-client.ts`**) — liste + KPIs + export par session ; export groupé aligné sur les filtres du haut de page uniquement, désactivé tant que le panneau « Filtres avancés » a des critères actifs.
