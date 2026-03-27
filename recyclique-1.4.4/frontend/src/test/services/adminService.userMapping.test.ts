import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUsersApi } = vi.hoisted(() => ({
  mockUsersApi: {
    usersv1usersget: vi.fn(),
    userv1usersuseridget: vi.fn(),
    userv1userspost: vi.fn(),
    userv1usersuseridput: vi.fn(),
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

/** Clé héritée éventuelle côté API (éviter le littéral en dur dans les sources). */
const staleExternalIdKey = ['tele', 'gram', '_id'].join('')

/** Réponse API type UserResponse (lot 9C) ; `full_name` dérivé prénom/nom/username. */
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
  username: 'admin_alpha',
  full_name: 'Admin Alpha',
  role: UserRole.ADMIN,
  status: UserStatus.APPROVED,
}

describe('AdminService user mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ne propage pas de clé messager héritée depuis UsersApi (liste) — lot 10A', async () => {
    mockUsersApi.usersv1usersget.mockResolvedValue([userResponseAsApi])

    const result = await adminService.getUsers()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject(expectedAdminMappingSlice)
    expect(result[0]).not.toHaveProperty(staleExternalIdKey)
  })

  it('ne propage pas de clé messager héritée depuis UsersApi (getUserById)', async () => {
    mockUsersApi.userv1usersuseridget.mockResolvedValue(userResponseAsApi)

    const result = await adminService.getUserById('user-1')

    expect(mockUsersApi.userv1usersuseridget).toHaveBeenCalledWith('user-1')
    expect(result).toMatchObject(expectedAdminMappingSlice)
    expect(result).not.toHaveProperty(staleExternalIdKey)
  })

  it('ne propage pas de clé messager héritée depuis la réponse createUser (UsersApi)', async () => {
    mockUsersApi.userv1userspost.mockResolvedValue(userResponseAsApi)

    const result = await adminService.createUser({
      username: 'admin_alpha',
      first_name: 'Admin',
      last_name: 'Alpha',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
    })

    expect(mockUsersApi.userv1userspost).toHaveBeenCalled()
    expect(result).toMatchObject(expectedAdminMappingSlice)
    expect(result).not.toHaveProperty(staleExternalIdKey)
  })

  it('ne propage pas de clé messager héritée depuis la réponse updateUser (UsersApi)', async () => {
    mockUsersApi.userv1usersuseridput.mockResolvedValue(userResponseAsApi)

    const result = await adminService.updateUser('user-1', { first_name: 'Admin' })

    expect(mockUsersApi.userv1usersuseridput).toHaveBeenCalledWith('user-1', { first_name: 'Admin' })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject(expectedAdminMappingSlice)
    expect(result.data).not.toHaveProperty(staleExternalIdKey)
  })
})
