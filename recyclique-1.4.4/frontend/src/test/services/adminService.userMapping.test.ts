import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUsersApi } = vi.hoisted(() => ({
  mockUsersApi: {
    usersapiv1usersget: vi.fn(),
    userapiv1usersuseridget: vi.fn(),
    userapiv1userspost: vi.fn(),
    userapiv1usersuseridput: vi.fn(),
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

/** Réponse API type UserResponse : `telegram_id` non numérique (après lot 2BM, `full_name` via helper). */
const userResponseNonNumericTelegram = {
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
}

const expectedAdminMappingSlice = {
  id: 'user-1',
  telegram_id: 'tg_admin_alpha',
  username: 'admin_alpha',
  full_name: 'Admin Alpha',
  role: UserRole.ADMIN,
  status: UserStatus.APPROVED,
}

describe('AdminService user mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves non numeric telegram_id values in admin user lists', async () => {
    mockUsersApi.usersapiv1usersget.mockResolvedValue([userResponseNonNumericTelegram])

    const result = await adminService.getUsers()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject(expectedAdminMappingSlice)
  })

  it('preserves non numeric telegram_id and full_name via getUserById', async () => {
    mockUsersApi.userapiv1usersuseridget.mockResolvedValue(userResponseNonNumericTelegram)

    const result = await adminService.getUserById('user-1')

    expect(mockUsersApi.userapiv1usersuseridget).toHaveBeenCalledWith('user-1')
    expect(result).toMatchObject(expectedAdminMappingSlice)
  })

  it('preserves non numeric telegram_id and full_name via createUser', async () => {
    mockUsersApi.userapiv1userspost.mockResolvedValue(userResponseNonNumericTelegram)

    const result = await adminService.createUser({
      telegram_id: 'tg_admin_alpha',
      username: 'admin_alpha',
      first_name: 'Admin',
      last_name: 'Alpha',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
    })

    expect(mockUsersApi.userapiv1userspost).toHaveBeenCalled()
    expect(result).toMatchObject(expectedAdminMappingSlice)
  })

  it('preserves non numeric telegram_id and full_name via updateUser', async () => {
    mockUsersApi.userapiv1usersuseridput.mockResolvedValue(userResponseNonNumericTelegram)

    const result = await adminService.updateUser('user-1', { first_name: 'Admin' })

    expect(mockUsersApi.userapiv1usersuseridput).toHaveBeenCalledWith('user-1', { first_name: 'Admin' })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject(expectedAdminMappingSlice)
  })
})
