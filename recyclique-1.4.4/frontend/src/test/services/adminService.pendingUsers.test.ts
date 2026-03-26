import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPendingUsersApi } = vi.hoisted(() => ({
  mockPendingUsersApi: vi.fn(),
}))

vi.mock('../../generated/api', () => ({
  AdminApi: {
    pendingusersv1adminuserspendingget: mockPendingUsersApi,
  },
  UsersApi: {},
}))

vi.mock('../../api/axiosClient', () => ({
  default: {},
}))

import { adminService, UserRole, UserStatus } from '../../services/adminService'

describe('AdminService pending users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mappe les utilisateurs en attente sans exposer telegram_id côté AdminUser', async () => {
    mockPendingUsersApi.mockResolvedValue([
      {
        id: 'pending-1',
        username: 'pending_alpha',
        first_name: 'Pending',
        last_name: 'Alpha',
        full_name: 'Pending Alpha',
        role: UserRole.USER,
        status: UserStatus.PENDING,
        created_at: '2024-01-03T00:00:00Z',
      },
    ])

    const result = await adminService.getPendingUsers()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'pending-1',
      username: 'pending_alpha',
      status: UserStatus.PENDING,
      is_active: true,
    })
  })
})
