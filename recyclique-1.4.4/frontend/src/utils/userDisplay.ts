export function usernameOrTelegramForAtHandle(
  username?: string | null,
  telegramId?: string | number | null,
): string {
  const handle = username || telegramId
  return handle ? String(handle) : ''
}
