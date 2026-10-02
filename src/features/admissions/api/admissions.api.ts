import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Admission = Schema<'Admission'>
export type AdmissionInput = Schema<'AdmissionRequest'>
export type AdmissionStatus = Schema<'AdmissionStatusEnum'>
export type EnrollInput = Schema<'EnrollRequest'>

/** The happy path, and the two ways out of it. */
export const ADMISSION_STEPS = ['pending', 'approved', 'enrolled'] as const
export const ADMISSION_TERMINAL = ['rejected', 'withdrawn'] as const

/** Where each action may start from; mirrors the backend's `_ALLOWED_FROM`. */
export const ADMISSION_ACTIONS_FROM = {
  approve: ['pending'],
  reject: ['pending'],
  withdraw: ['pending', 'approved'],
  enroll: ['approved'],
  /** Details can only change before a decision. */
  edit: ['pending'],
  /** Approved and enrolled applications are part of a student's record. */
  delete: ['pending', 'rejected', 'withdrawn'],
} as const satisfies Record<string, readonly AdmissionStatus[]>

export type AdmissionDecision = 'approve' | 'reject' | 'withdraw'

const base = createResourceApi<Admission, AdmissionInput>('/admissions/')

export const admissionsApi = {
  ...base,
  decide: (id: Id, decision: AdmissionDecision, note: string) =>
    apiClient.post<Admission>(`${base.url(id)}${decision}/`, { note }).then((r) => r.data),
  enroll: (id: Id, input: EnrollInput) => apiClient.post<Admission>(`${base.url(id)}enroll/`, input).then((r) => r.data),
}

export const admissionKeys = createQueryKeys('admissions')
