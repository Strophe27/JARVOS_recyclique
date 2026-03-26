import { describe, expect, it } from 'vitest'

import {
  fullNameOrUsernameOrTelegramFallback,
  usernameOrTelegramForAtHandle,
} from '../userDisplay'

describe('usernameOrTelegramForAtHandle', () => {
  it('returns username first when present', () => {
    expect(usernameOrTelegramForAtHandle('alice', 'tg_alpha')).toBe('alice')
  })

  it('falls back to a numeric telegram id', () => {
    expect(usernameOrTelegramForAtHandle(undefined, 123456789)).toBe('123456789')
  })

  it('falls back to a non numeric telegram id', () => {
    expect(usernameOrTelegramForAtHandle(undefined, 'tg_alpha')).toBe('tg_alpha')
  })

  it('returns an empty string when both values are absent', () => {
    expect(usernameOrTelegramForAtHandle(undefined, undefined)).toBe('')
  })

  it('keeps the previous falsy behavior for a zero telegram id', () => {
    expect(usernameOrTelegramForAtHandle(undefined, 0)).toBe('')
  })
})

describe('fullNameOrUsernameOrTelegramFallback', () => {
  it('returns the full name when first and last name are present', () => {
    expect(fullNameOrUsernameOrTelegramFallback('Alice', 'Martin', 'alice', 'tg_alpha')).toBe('Alice Martin')
  })

  it('falls back to username when no name is available', () => {
    expect(fullNameOrUsernameOrTelegramFallback(undefined, undefined, 'alice', 'tg_alpha')).toBe('alice')
  })

  it('falls back to telegram id when username is absent', () => {
    expect(fullNameOrUsernameOrTelegramFallback(undefined, undefined, undefined, 'tg_alpha')).toBe('User tg_alpha')
  })

  it('uses a partial name before username when available', () => {
    expect(fullNameOrUsernameOrTelegramFallback('Alice', undefined, 'alice', 'tg_alpha')).toBe('Alice')
  })

  it('falls back to Bénévole when no identifier is available', () => {
    expect(fullNameOrUsernameOrTelegramFallback(undefined, undefined, undefined, undefined)).toBe('Bénévole')
  })
})
