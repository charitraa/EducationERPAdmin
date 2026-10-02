import { useQuery } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { staffApi, staffKeys } from '../api/staff.api'

export const {
  useList: useStaffList,
  useOne: useStaffMember,
  useCreate: useCreateStaff,
  useUpdate: useUpdateStaff,
  useRemove: useRemoveStaff,
} = createResourceHooks(staffApi, staffKeys)

/** The signed-in person's staff record (null if they aren't staff). Staff-only actions check this. */
export function useMyStaffRecord() {
  return useQuery({ queryKey: [...staffKeys.all, 'me'], queryFn: staffApi.me, staleTime: 5 * 60_000 })
}
