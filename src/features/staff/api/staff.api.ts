import { apiClient } from '@/shared/api/client'
import { isStatus } from '@/shared/api/errors'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type StaffMember = Schema<'StaffMember'>
export type StaffMemberInput = Schema<'StaffMemberRequest'>

export const staffApi = {
  ...createResourceApi<StaffMember, StaffMemberInput>('/staff/'),
  /** The caller's own staff record, or null when their login isn't linked to one. */
  me: () =>
    apiClient
      .get<StaffMember>('/staff/me/')
      .then((r) => r.data)
      .catch((err: unknown) => {
        if (isStatus(err, 404)) return null
        throw err
      }),
}
export const staffKeys = createQueryKeys('staff')
