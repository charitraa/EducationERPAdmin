import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

/** `current_job` is a bare dict in the OpenAPI. */
export interface CurrentJob {
  employer: string
  title: string
  location: string
}
export type AlumniProfile = Omit<Schema<'AlumniProfile'>, 'current_job'> & { current_job: CurrentJob | null }
export type AlumniProfileInput = Schema<'AlumniProfileRequest'>
export type Employment = Schema<'Employment'>
export type HigherStudy = Schema<'HigherStudy'>
export type Achievement = Schema<'Achievement'>
export type AlumniEvent = Schema<'AlumniEvent'>
export type AlumniEventInput = Schema<'AlumniEventRequest'>
export type Rsvp = Schema<'Rsvp'>
export type Mentorship = Schema<'Mentorship'>
export type Campaign = Schema<'Campaign'>
export type CampaignInput = Schema<'CampaignRequest'>
export type Donation = Schema<'Donation'>
export type GraduationResult = Omit<Schema<'GraduationResult'>, 'skipped'> & { skipped: Array<{ student: Id; name: string; code: string; reason: string }> }

const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)

export const profilesApi = {
  ...createResourceApi<AlumniProfile, AlumniProfileInput>('/alumni/profiles/'),
  /** Either a class (everyone placed in it) or a list of students. */
  graduate: (input: { section?: Id; students?: Id[]; on_date?: string; reason?: string }) => post<GraduationResult>('/alumni/profiles/graduate/', input),
}
export const profileKeys = createQueryKeys('alumni-profiles')

export const employmentsApi = createResourceApi<Employment, Schema<'EmploymentRequest'>>('/alumni/employments/')
export const employmentKeys = createQueryKeys('alumni-employments')
export const studiesApi = createResourceApi<HigherStudy, Schema<'HigherStudyRequest'>>('/alumni/higher-studies/')
export const studyKeys = createQueryKeys('alumni-studies')
export const achievementsApi = createResourceApi<Achievement, Schema<'AchievementRequest'>>('/alumni/achievements/')
export const achievementKeys = createQueryKeys('alumni-achievements')

export const eventsApi = {
  ...createResourceApi<AlumniEvent, AlumniEventInput>('/alumni/events/'),
  publish: (id: Id) => post<AlumniEvent>(`/alumni/events/${id}/publish/`),
  cancel: (id: Id, reason: string) => post<AlumniEvent>(`/alumni/events/${id}/cancel/`, { reason }),
  rsvps: (id: Id) => apiClient.get<Rsvp[]>(`/alumni/events/${id}/rsvps/`).then((r) => r.data),
}
export const eventKeys = createQueryKeys('alumni-events')

export const mentorshipsApi = { list: createResourceApi<Mentorship>('/alumni/mentorships/').list }
export const mentorshipKeys = createQueryKeys('alumni-mentorships')

export const campaignsApi = createResourceApi<Campaign, CampaignInput>('/alumni/campaigns/')
export const campaignKeys = createQueryKeys('alumni-campaigns')

export interface DonationInput {
  campus: Id
  campaign?: Id | null
  donor?: Id | null
  donor_name?: string
  donor_email?: string
  donor_phone?: string
  amount: string
  method?: Donation['method']
  received_on?: string
  reference?: string
  note?: string
  is_anonymous?: boolean
}

const donations = createResourceApi<Donation>('/alumni/donations/')
export const donationsApi = {
  list: donations.list,
  get: donations.get,
  record: (input: DonationInput) => post<Donation>('/alumni/donations/', input),
  refund: (id: Id, input: { amount: string; reason: string; method?: Donation['method']; reference?: string }) => post<Donation>(`/alumni/donations/${id}/refund/`, input),
}
export const donationKeys = createQueryKeys('alumni-donations')
