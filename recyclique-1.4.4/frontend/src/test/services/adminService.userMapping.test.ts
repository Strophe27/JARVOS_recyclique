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

/** Réponse API type UserResponse (lot 9C) : pas de `telegram_id` ; `full_name` dérivé prénom/nom/username. */
const userResponseAsApi = {
  id: 'user-1',
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
  telegram_id: undefined,
  username: 'admin_alpha',
  full_name: 'Admin Alpha',
  role: UserRole.ADMIN,
  status: UserStatus.APPROVED,
}

describe('AdminService user mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ne propage pas telegram_id depuis UsersApi (liste)', async () => {
    mockUsersApi.usersapiv1usersget.mockResolvedValue([userResponseAsApi])

    const result = await adminService.getUsers()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject(expectedAdminMappingSlice)
  })

  it('ne propage pas telegram_id depuis UsersApi (getUserById)', async () => {
    mockUsersApi.userapiv1usersuseridget.mockResolvedValue(userResponseAsApi)

    const result = await adminService.getUserById('user-1')

    expect(mockUsersApi.userapiv1usersuseridget).toHaveBeenCalledWith('user-1')
    expect(result).toMatchObject(expectedAdminMappingSlice)
  })

  it('ne propage pas telegram_id depuis la réponse createUser (UsersApi)', async () => {
    mockUsersApi.userapiv1userspost.mockResolvedValue(userResponseAsApi)

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

  it('ne propage pas telegram_id depuis la réponse updateUser (UsersApi)', async () => {
    mockUsersApi.userapiv1usersuseridput.mockResolvedValue(userResponseAsApi)

    const result = await adminService.updateUser('user-1', { first_name: 'Admin' })

    expect(mockUsersApi.userapiv1usersuseridput).toHaveBeenCalledWith('user-1', { first_name: 'Admin' })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject(expectedAdminMappingSlice)
  })
})
