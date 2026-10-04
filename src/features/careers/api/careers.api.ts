import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

/** `requirements` is a bare JSON field in the OpenAPI; it's a list of lines. */
export type Vacancy = Omit<Schema<'Vacancy'>, 'requirements'> & { requirements: string[] }
export type VacancyInput = Omit<Schema<'VacancyRequest'>, 'requirements'> & { requirements: string[] }
export type Candidacy = Schema<'Candidacy'>
export type CandidacyDetail = Omit<Schema<'CandidacyDetail'>, 'data'> & { data: Record<string, unknown> }
export type Interview = Schema<'Interview'>
export type JobOffer = Schema<'JobOffer'>
export type JobPosting = Schema<'JobPosting'>
export type JobPostingInput = Schema<'JobPostingRequest'>

const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)

export const vacanciesApi = {
  ...createResourceApi<Vacancy, VacancyInput>('/careers/vacancies/'),
  open: (id: Id) => post<Vacancy>(`/careers/vacancies/${id}/open/`),
  close: (id: Id) => post<Vacancy>(`/careers/vacancies/${id}/close/`),
}
export const vacancyKeys = createQueryKeys('careers-vacancies')

const candidacies = createResourceApi<CandidacyDetail>('/careers/candidacies/')
export const candidaciesApi = {
  list: createResourceApi<Candidacy>('/careers/candidacies/').list,
  get: candidacies.get,
  screen: (id: Id, input: { score: number | null; note: string }) => post<Candidacy>(`/careers/candidacies/${id}/screen/`, input),
}
export const candidacyKeys = createQueryKeys('careers-candidacies')

export interface ScheduleInput {
  candidacy: Id
  round?: number
  scheduled_at: string
  duration_minutes?: number
  mode?: Interview['mode']
  location?: string
  panel?: Id[]
}

export const interviewsApi = {
  list: createResourceApi<Interview>('/careers/interviews/').list,
  schedule: (input: ScheduleInput) => post<Interview>('/careers/interviews/', input),
  reschedule: (id: Id, input: { scheduled_at: string; location?: string }) => post<Interview>(`/careers/interviews/${id}/reschedule/`, input),
  cancel: (id: Id, reason: string) => post<Interview>(`/careers/interviews/${id}/cancel/`, { reason }),
  outcome: (id: Id, input: { status: 'completed' | 'no_show'; score?: string | null; recommendation?: string; feedback?: string }) => post<Interview>(`/careers/interviews/${id}/outcome/`, input),
}
export const interviewKeys = createQueryKeys('careers-interviews')

export interface OfferInput {
  candidacy: Id
  start_date: string
  contract_kind?: JobOffer['contract_kind']
  probation_ends_on?: string | null
  contract_end_date?: string | null
  salary_note?: string
  terms?: string
  expires_on?: string | null
}

export const offersApi = {
  list: createResourceApi<JobOffer>('/careers/offers/').list,
  make: (input: OfferInput) => post<JobOffer>('/careers/offers/', input),
  withdraw: (id: Id, reason: string) => post<JobOffer>(`/careers/offers/${id}/withdraw/`, { reason }),
}
export const offerKeys = createQueryKeys('careers-offers')

export const postingsApi = {
  ...createResourceApi<JobPosting, JobPostingInput>('/careers/postings/'),
  review: (id: Id, input: { approve: boolean; note?: string }) => post<JobPosting>(`/careers/postings/${id}/review/`, input),
  close: (id: Id) => post<JobPosting>(`/careers/postings/${id}/close/`),
}
export const postingKeys = createQueryKeys('careers-postings')
