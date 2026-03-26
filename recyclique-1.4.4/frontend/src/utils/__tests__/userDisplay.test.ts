import { describe, expect, it } from 'vitest'

import { usernameOrTelegramForAtHandle } from '../userDisplay'

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
