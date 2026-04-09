# Auth — session et `ContextEnvelope` (Piste A)

- **`auth-context-port.ts`** : façade `AuthContextPort` (`getSession`, `getContextEnvelope`) — stable pour Convergence 1 (client HTTP / TanStack Query derrière le même port).
- **`AuthRuntimeProvider.tsx`** : provider racine ; hooks `useAuthSession()`, `useContextEnvelope()`.
- **`mock-auth-adapter.ts`** : `createMockAuthAdapter({ session, envelope })` pour tests.
- **`default-demo-auth-adapter.ts`** : enveloppe démo + permissions factices `demo.permission.*` (pas de sémantique métier parallèle).
- **`LiveAuthShell.tsx`** : login terrain minimal (sans Swagger) quand **`VITE_LIVE_AUTH`** vaut `true` ou `1` : `POST /v1/auth/login`, jeton en `sessionStorage` (`LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY` dans `src/api/recyclique-auth-client.ts`), puis `GET /v1/users/me/context` mappé vers `ContextEnvelopeStub`. Surcharge API : **`VITE_RECYCLIQUE_API_PREFIX`** (défaut `/api`, proxy Vite → backend).
- **`../api/context-envelope-from-api.ts`** : normalisation défensive de la réponse OpenAPI `ContextEnvelope`.

**Interdit au runtime** : `import` depuis `references/` (doc projet seulement hors bundle).

Les permissions effectives et le contexte actif viennent de l’enveloppe fournie par le port, pas d’un état React local ad hoc comme source de vérité.
