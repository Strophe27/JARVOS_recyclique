import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUsersApi } = vi.hoisted(() => ({
  mockUsersApi: {
    usersapiv1usersget: vi.fn(),
  },
}))

vi.mock('../../generated/api', () => ({
  UsersApi: mockUsersApi,
  AdminApi: {},
}))

vi.mock('../../api/axiosClient', () => ({
  default: {},
}))

import { adminService, UserRole, UserStatus } from '../../services/adminService'

describe('AdminService user mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves non numeric telegram_id values in admin user lists', async () => {
    mockUsersApi.usersapiv1usersget.mockResolvedValue([
      {
        id: 'user-1',
        telegram_id: 'tg_admin_alpha',
        username: 'admin_alpha',
        first_name: 'Admin',
        last_name: 'Alpha',
        role: UserRole.ADMIN,
        status: UserStatus.APPROVED,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])

    const result = await adminService.getUsers()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'user-1',
      telegram_id: 'tg_admin_alpha',
      username: 'admin_alpha',
      full_name: 'Admin Alpha',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
    })
  })
})
