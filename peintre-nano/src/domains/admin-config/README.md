# Domaine — admin config

Surfaces d'admin simple (P2 rappel : persistance PostgreSQL côté backend) — epic 9.

**Story 17.1** : widgets admin mutualisables sous contrat CREOS (ex. `admin.pending-users.demo` — placeholder liste « pending » sans `data_contract` tant que l'OpenAPI canon ne matérialise pas `GET /v1/admin/users/pending`).

**Story 17.2** : `admin.cash-registers.demo` et `admin.sites.demo` — placeholders honnêtes pour `/admin/cash-registers` et `/admin/sites` (gaps **G-OA-02** → Epic 16), même ossature shell que 17.1.

**Story 17.3** (rail U) :

- **`AdminListPageShell`** — coquille liste + bandeau « détail simple » démo (`data-testid` **`admin-list-page-shell`** / **`admin-detail-simple-demo-strip`**).
- **`admin-transverse-list-shell-slots.ts`** — `slot_id` CREOS homogènes (`admin.transverse-list.*`) pour les trois `PageManifest` liste admin transverse.
- **`admin-transverse-list-page-guards.ts`** — convention guards (`transverse.admin.view` + `requires_site`) ; source de refus = **ContextEnvelope** + manifestes, pas de permission inventée côté UI.
