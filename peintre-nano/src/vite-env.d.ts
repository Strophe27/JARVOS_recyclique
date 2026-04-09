/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `true` ou `1` : écran login + session API réelle (`POST /v1/auth/login`, contexte `GET /v1/users/me/context`). */
  readonly VITE_LIVE_AUTH?: string;
  readonly VITE_RECYCLIQUE_API_PREFIX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
