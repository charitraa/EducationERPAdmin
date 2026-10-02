import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Event = Schema<'Event'>
export type EventInput = Schema<'EventRequest'>
export type EventCategory = Schema<'EventCategory'>
export type EventCategoryInput = Schema<'EventCategoryRequest'>
export type Registration = Schema<'EventRegistration'>
export type Attendance = Schema<'EventAttendance'>
export type Participation = Schema<'EventParticipation'>
export type ParticipationRole = Schema<'ParticipationRoleEnum'>
export type PointRule = Schema<'PointRule'>
export type PointRuleInput = Schema<'PointRuleRequest'>
export type Award = Schema<'Award'>
export type AwardInput = Schema<'AwardRequest'>
export type AwardRule = Schema<'AwardRule'>
export type AwardRuleInput = Schema<'AwardRuleRequest'>
export type StudentAward = Schema<'StudentAward'>
export type PointEntry = Schema<'PointEntry'>

/** `/events/{id}/roster/`: untyped in the OpenAPI file; this is the backend's event_roster(). */
export interface RosterRow {
  student: Id
  student_name: string
  student_number: string
  registration_status: Registration['status'] | null
  attendance_status: 'present' | 'absent' | null
  roles: ParticipationRole[]
}

/** `/student-points/leaderboard/`: the backend's leaderboard(), top 20. */
export interface LeaderboardRow {
  rank: number
  student: Id
  student_name: string
  student_number: string
  points: number
}

const eventsBase = createResourceApi<Event, EventInput>('/events/')
const ev = (id: Id, action: string) => `${eventsBase.url(id)}${action}/`

export const eventsApi = {
  ...eventsBase,
  publish: (id: Id) => apiClient.post<Event>(ev(id, 'publish')).then((r) => r.data),
  cancel: (id: Id, reason: string) => apiClient.post<Event>(ev(id, 'cancel'), { reason }).then((r) => r.data),
  roster: (id: Id) => apiClient.get<RosterRow[]>(ev(id, 'roster')).then((r) => r.data),
  registrations: (id: Id) => apiClient.get<Registration[]>(ev(id, 'registrations')).then((r) => r.data),
  participation: (id: Id) => apiClient.get<Participation[]>(ev(id, 'participation')).then((r) => r.data),
  markAttendance: (id: Id, entries: Array<{ student: Id; status: 'present' | 'absent' }>) =>
    apiClient.post<Attendance[]>(ev(id, 'mark-attendance'), { entries }).then((r) => r.data),
  recordParticipation: (id: Id, input: { student: Id; role: ParticipationRole; position: number | null; remark: string }) =>
    apiClient.post<Participation>(ev(id, 'record-participation'), input).then((r) => r.data),
}
export const eventKeys = createQueryKeys('events')

export const registrationsApi = {
  /** The office registers a student (any registration mode except "no sign-up"). */
  create: (input: { event: Id; student: Id; note: string }) => apiClient.post<Registration>('/event-registrations/', input).then((r) => r.data),
  decide: (id: Id, approve: boolean, note: string) => apiClient.post<Registration>(`/event-registrations/${id}/decide/`, { approve, note }).then((r) => r.data),
}

export const categoriesApi = createResourceApi<EventCategory, EventCategoryInput>('/event-categories/')
export const categoryKeys = createQueryKeys('event-categories')

export const pointRulesApi = createResourceApi<PointRule, PointRuleInput>('/point-rules/')
export const pointRuleKeys = createQueryKeys('point-rules')

export const pointsApi = {
  leaderboard: () => apiClient.get<LeaderboardRow[]>('/student-points/leaderboard/').then((r) => r.data),
  award: (input: { student: Id; points: number; reason: string }) => apiClient.post<PointEntry>('/point-entries/', input).then((r) => r.data),
}
export const pointKeys = createQueryKeys('student-points')

export const awardsApi = createResourceApi<Award, AwardInput>('/awards/')
export const awardKeys = createQueryKeys('awards')

export const awardRulesApi = createResourceApi<AwardRule, AwardRuleInput>('/award-rules/')
export const awardRuleKeys = createQueryKeys('award-rules')

const grantsBase = createResourceApi<StudentAward, { student: Id; award: Id; note: string }>('/student-awards/')
export const studentAwardsApi = {
  ...grantsBase,
  end: (id: Id) => apiClient.post<StudentAward>(`${grantsBase.url(id)}end/`).then((r) => r.data),
}
export const studentAwardKeys = createQueryKeys('student-awards')
