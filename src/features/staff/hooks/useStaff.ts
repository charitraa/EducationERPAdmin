import { createResourceHooks } from '@/shared/api/hooks'
import { staffApi, staffKeys } from '../api/staff.api'

export const {
  useList: useStaffList,
  useOne: useStaffMember,
  useCreate: useCreateStaff,
  useUpdate: useUpdateStaff,
  useRemove: useRemoveStaff,
} = createResourceHooks(staffApi, staffKeys)
