import { staffApi, type StaffListParams, type StaffMember, type StaffPayload } from '@/lib/api/staff'
import { createResourceHooks } from '@/lib/query/useResource'

export const {
  keys: staffKeys,
  useList: useStaffMembers,
  useDetail: useStaffMember,
  useCreate: useCreateStaffMember,
  useUpdate: useUpdateStaffMember,
} = createResourceHooks<StaffMember, StaffPayload, StaffPayload, StaffListParams>('staff', staffApi)
