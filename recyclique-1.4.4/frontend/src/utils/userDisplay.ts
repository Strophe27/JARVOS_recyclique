export function usernameOrTelegramForAtHandle(
  username?: string | null,
  telegramId?: string | number | null,
): string {
  const handle = username || telegramId
  return handle ? String(handle) : ''
}

export function fullNameOrUsernameOrTelegramFallback(
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null,
  telegramId?: string | number | null,
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  return firstName || lastName || username || (telegramId ? `User ${telegramId}` : 'Bénévole')
}
