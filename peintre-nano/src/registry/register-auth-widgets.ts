import { registerWidget } from './widget-registry';
import { PublicLoginWidget } from '../widgets/auth/PublicLoginWidget';

/** Préfixe `auth.live.*` — login public sous contrat CREOS, logique portée par `LiveAuthShell`. */
export function registerAuthWidgets(): void {
  registerWidget('auth.live.public-login', PublicLoginWidget);
}
