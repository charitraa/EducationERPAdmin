import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type StaffMember = Schema<'StaffMember'>
export type StaffMemberInput = Schema<'StaffMemberRequest'>

export const staffApi = createResourceApi<StaffMember, StaffMemberInput>('/staff/')
export const staffKeys = createQueryKeys('staff')
