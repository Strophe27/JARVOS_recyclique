/** Nom d'utilisateur pour affichage @handle (chaîne vide si absent). */
export function displayAtUsername(username?: string | null): string {
  const s = username?.trim();
  return s || '';
}

/**
 * Libellé principal : prénom + nom, ou username, ou repli sur identifiant interne court.
 */
export function fullNameOrUsernameDisplayFallback(
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null,
  userId?: string | null,
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  const partial = firstName || lastName || (username?.trim() || null);
  if (partial) {
    return partial;
  }

  if (userId) {
    const compact = userId.replace(/-/g, '');
    const short = compact.slice(0, 8);
    return `Utilisateur (${short}…)`;
  }

  return 'Sans identifiant affichable';
}
