import { useMutation, useQueryClient } from '@tanstack/react-query'
import { roleKeys } from '@/features/roles/api/roles.api'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id } from '@/shared/types/api'
import { userKeys, usersApi, type AssignRoleInput, type UserUpdateInput } from '../api/users.api'

export const { useList: useUsers, useOne: useUser, useCreate: useCreateUser, useRemove: useRemoveUser } = createResourceHooks(usersApi, userKeys, {
  // Role "assigned users" counts change with new users.
  alsoInvalidate: [roleKeys.all],
})

/** Every change to an account refreshes users and role counts. `form` puts 400s on fields; `silent` leaves errors to the dialog. */
function useUserMutation<TVars>(run: (vars: TVars) => Promise<unknown>, meta: Record<string, unknown> = { form: true }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: run,
    meta,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: userKeys.all })
      void qc.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}

export const useEditUser = () => useUserMutation(({ id, input }: { id: Id; input: UserUpdateInput }) => usersApi.edit(id, input))
export const useAssignRole = () => useUserMutation(({ id, input }: { id: Id; input: AssignRoleInput }) => usersApi.assignRole(id, input))
export const useRevokeRole = () =>
  useUserMutation(({ id, role, campus }: { id: Id; role: Id; campus: Id | null }) => usersApi.revokeRole(id, { role, campus }), { silent: true })
export const useSetPassword = () => useUserMutation(({ id, password }: { id: Id; password: string }) => usersApi.setPassword(id, password))
export const useDeactivateUser = () => useUserMutation((id: Id) => usersApi.deactivate(id), { silent: true })
export const useReactivateUser = () => useUserMutation((id: Id) => usersApi.edit(id, { is_active: true }), { silent: true })
export const useResetTwoFactor = () => useUserMutation((id: Id) => usersApi.resetTwoFactor(id), { silent: true })
