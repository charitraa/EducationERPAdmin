import { publicClient as client } from '@/shared/api/publicClient'
import type { Id } from '@/shared/types/api'
import type { FieldDefinition } from '@/features/applications/api/applications.api'

const base = (code: string) => `/public/organizations/${encodeURIComponent(code)}`

export interface PublicForm {
  id: Id
  code: string
  name: string
  kind: string
  description: string
  campus: Id | null
  fields: FieldDefinition[]
  steps: string[]
}

export interface PublicForms {
  organization: string
  campuses: Array<{ id: Id; name: string }>
  forms: PublicForm[]
}

export interface Receipt {
  number: string
  token: string
  status: string
}

export interface PublicStatus {
  number: string
  type_name: string
  status: 'in_review' | 'returned' | 'approved' | 'rejected' | 'withdrawn'
  submitted_at: string
  decided_at: string | null
  outcome_label: string
  data: Record<string, unknown>
  history: Array<{ action: string; step_name: string; at: string; note: string }>
}

export interface PublicVacancy {
  id: Id
  code: string
  title: string
  campus: Id
  campus_name: string
  department_name: string | null
  staff_type: string
  contract_kind: string
  openings: number
  description: string
  requirements: string[]
  min_experience_years: number | null
  salary_range: string
  opens_on: string | null
  closes_on: string | null
  resume_required: boolean
  form_fields: FieldDefinition[]
}

export interface PublicOffer {
  vacancy_title: string
  start_date: string
  contract_kind: string
  probation_ends_on: string | null
  contract_end_date: string | null
  salary_note: string
  terms: string
  expires_on: string | null
  status: 'made' | 'accepted' | 'declined' | 'withdrawn'
  responded_at: string | null
}

export interface Lookup {
  number: string
  token: string
}

const get = <T>(url: string) => client.get<T>(url).then((r) => r.data)
const post = <T>(url: string, body: unknown) => client.post<T>(url, body).then((r) => r.data)

export const publicApi = {
  forms: (code: string) => get<PublicForms>(`${base(code)}/application-types/`),
  submit: (code: string, input: { application_type: Id; campus: Id; contact: { name: string; email: string; phone: string }; data: Record<string, unknown> }) =>
    post<Receipt>(`${base(code)}/applications/`, input),
  status: (code: string, lookup: Lookup) => post<PublicStatus>(`${base(code)}/applications/status/`, lookup),
  resubmit: (code: string, input: Lookup & { data: Record<string, unknown> }) => post<PublicStatus>(`${base(code)}/applications/resubmit/`, input),
  withdraw: (code: string, lookup: Lookup) => post<PublicStatus>(`${base(code)}/applications/withdraw/`, lookup),
  vacancies: (code: string) => get<PublicVacancy[]>(`${base(code)}/careers/vacancies/`),
  vacancy: (code: string, id: Id) => get<PublicVacancy>(`${base(code)}/careers/vacancies/${id}/`),
  /** Multipart when there's a résumé file: `data` goes as a JSON string. */
  apply: (code: string, id: Id, data: Record<string, unknown>, resume: File | null) => {
    if (!resume) return post<Receipt>(`${base(code)}/careers/vacancies/${id}/apply/`, { data })
    const body = new FormData()
    body.append('data', JSON.stringify(data))
    body.append('resume', resume)
    return post<Receipt>(`${base(code)}/careers/vacancies/${id}/apply/`, body)
  },
  offer: (code: string, lookup: Lookup) => post<PublicOffer>(`${base(code)}/careers/offer/`, lookup),
  respond: (code: string, input: Lookup & { accept: boolean; note?: string }) => post<PublicOffer>(`${base(code)}/careers/offer/respond/`, input),
}
