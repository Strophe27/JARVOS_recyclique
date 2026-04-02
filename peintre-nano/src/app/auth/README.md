# Auth — session et `ContextEnvelope` (Piste A)

- **`auth-context-port.ts`** : façade `AuthContextPort` (`getSession`, `getContextEnvelope`) — stable pour Convergence 1 (client HTTP / TanStack Query derrière le même port).
- **`AuthRuntimeProvider.tsx`** : provider racine ; hooks `useAuthSession()`, `useContextEnvelope()`.
- **`mock-auth-adapter.ts`** : `createMockAuthAdapter({ session, envelope })` pour tests.
- **`default-demo-auth-adapter.ts`** : enveloppe démo + permissions factices `demo.permission.*` (pas de sémantique métier parallèle).

**Interdit au runtime** : `import` depuis `references/` (doc projet seulement hors bundle).

Les permissions effectives et le contexte actif viennent de l’enveloppe fournie par le port, pas d’un état React local ad hoc comme source de vérité.
