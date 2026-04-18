# Providers applicatifs

## `UserRuntimePrefsProvider` / `useUserRuntimePrefs`

- **Rôle :** état de **présentation locale** (densité UI, panneaux, onboarding, etc.).
- **Lecteurs autorisés :** composants qui n’influencent **que** le rendu visuel ou le confort (classes CSS, `data-*`, tokens).
- **Interdit :** `filterNavigation`, `resolvePageAccess`, `FilteredNavList`, toute décision d’accès ou de structure commanditaire — ces chemins ne reçoivent **pas** `UserRuntimePrefs` à dessein.

La persistance par défaut utilise `localStorage` sous la clé `peintre-nano:user-runtime-prefs` (facade testable via `disablePersistence` sur le provider).
