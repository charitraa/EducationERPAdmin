import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, ListParams, Paginated, Schema } from '@/shared/types/api'

export type ApplicationKind = Schema<'ApplicationKindEnum'>
export type ApplicationStatus = Schema<'ApplicationStatusEnum'>

/** An extra question on a form. */
export interface FieldDefinition {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'choice' | 'boolean'
  required?: boolean
  choices?: string[]
}

/** `fields` is a bare JSON list in the OpenAPI; this is its shape. */
export type ApplicationType = Omit<Schema<'ApplicationType'>, 'fields'> & { fields: FieldDefinition[] }
export type ApplicationTypeInput = Omit<Schema<'ApplicationTypeRequest'>, 'fields'> & { fields: FieldDefinition[] }

/** `GET /application-types/available/`: what an applicant sees, steps as names only. */
export interface AvailableType {
  id: Id
  code: string
  name: string
  kind: ApplicationKind
  description: string
  campus: Id | null
  fields: FieldDefinition[]
  steps: string[]
}

export type ApplicationEvent = Schema<'ApplicationEvent'>
export type Application = Omit<Schema<'Application'>, 'data' | 'outcome'> & { data: Record<string, unknown>; outcome: Record<string, unknown> }
export type ApplicationRow = Omit<Application, 'data' | 'events'>
export type Certificate = Omit<Schema<'Certificate'>, 'contents'> & { contents: Record<string, unknown> }

const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)

export const typesApi = {
  ...createResourceApi<ApplicationType, ApplicationTypeInput>('/application-types/'),
  available: () => apiClient.get<AvailableType[]>('/application-types/available/').then((r) => r.data),
}
export const typeKeys = createQueryKeys('application-types')

export interface SubmitInput {
  application_type: Id
  campus?: Id | null
  student?: Id | null
  staff?: Id | null
  data: Record<string, unknown>
}

const apps = createResourceApi<Application>('/applications/')
export const applicationsApi = {
  list: createResourceApi<ApplicationRow>('/applications/').list,
  get: apps.get,
  pending: (params: ListParams = {}) => apiClient.get<Paginated<ApplicationRow>>('/applications/pending/', { params }).then((r) => r.data),
  mine: (params: ListParams = {}) => apiClient.get<Paginated<ApplicationRow>>('/applications/me/', { params }).then((r) => r.data),
  submit: (input: SubmitInput) => post<Application>('/applications/', input),
  /** `decision` is what the final step must supply: `{ bed }` for hostel, `{ employee_number }` for a job. */
  approve: (id: Id, input: { note?: string; decision?: Record<string, unknown> }) => post<Application>(`/applications/${id}/approve/`, input),
  reject: (id: Id, note: string) => post<Application>(`/applications/${id}/reject/`, { note }),
  sendBack: (id: Id, note: string) => post<Application>(`/applications/${id}/send-back/`, { note }),
  resubmit: (id: Id, input: { data: Record<string, unknown>; note?: string }) => post<Application>(`/applications/${id}/resubmit/`, input),
  withdraw: (id: Id, note?: string) => post<Application>(`/applications/${id}/withdraw/`, { note: note ?? '' }),
}
export const applicationKeys = createQueryKeys('applications')

const certs = createResourceApi<Certificate>('/certificates/')
export const certificatesApi = {
  list: certs.list,
  get: certs.get,
  issue: (input: { student: Id; title: string; purpose?: string }) => post<Certificate>('/certificates/', input),
  revoke: (id: Id, reason: string) => post<Certificate>(`/certificates/${id}/revoke/`, { reason }),
}
export const certificateKeys = createQueryKeys('certificates')
