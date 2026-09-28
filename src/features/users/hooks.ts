import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type User, type UserPayload } from '@/lib/api/users'
import { createResourceHooks } from '@/lib/query/useResource'
import type { ListParams } from '@/lib/api/types'

export interface UserListParams extends ListParams {
  is_active?: boolean
  user_type?: string
}

export const {
  useList: useUsers,
  useDetail: useUser,
  useCreate: useCreateUser,
  useUpdate: useUpdateUser,
} = createResourceHooks<User, UserPayload, UserPayload, UserListParams>('users', usersApi)

export function useSetPassword() {
  return useMutation({
    mutationFn: ({ id, new_password }: { id: number; new_password: string }) => usersApi.setPassword(id, new_password),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UserPayload }) => usersApi.deactivate(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['users', 'list'] })
      qc.invalidateQueries({ queryKey: ['users', 'detail', vars.id] })
    },
  })
}

export function useReset2fa() {
  return useMutation({ mutationFn: (id: number) => usersApi.reset2fa(id) })
}

export function useAssignRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { role: number; campus?: number | null; expires_at?: string | null } }) =>
      usersApi.assignRole(id, payload),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['users', 'detail', vars.id] }),
  })
}

export function useRevokeRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { role: number; campus?: number | null } }) =>
      usersApi.revokeRole(id, payload),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['users', 'detail', vars.id] }),
  })
}
