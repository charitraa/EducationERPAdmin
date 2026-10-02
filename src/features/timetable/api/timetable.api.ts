import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, ListParams, Schema } from '@/shared/types/api'

export type BellSchedule = Schema<'BellSchedule'>
export type BellScheduleInput = Schema<'BellScheduleRequest'>
export type Period = Schema<'Period'>
export type PeriodInput = Schema<'PeriodRequest'>
export type Entry = Schema<'TimetableEntry'>
/** The generated type marks allow_over_capacity required; the backend defaults it to false. */
export type EntryInput = Omit<Schema<'TimetableEntryRequest'>, 'allow_over_capacity'> & { allow_over_capacity?: boolean }
export type LessonChange = Schema<'LessonChange'>
export type LessonChangeInput = Schema<'LessonChangeRequest'>
/** One lesson as it happens on a date, with that day's change applied. */
export type Lesson = Schema<'Lesson'>

/** ISO weekday numbers, as the API uses them. Nepal's school week usually runs Sunday–Friday. */
export const WEEKDAYS = [
  { value: 7, short: 'Sun', label: 'Sunday' },
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
] as const
export const DEFAULT_DAYS = [7, 1, 2, 3, 4, 5]

/** `10:00:00` → `10:00` */
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '')

/** A lesson the generator proposes (or created, with `id`). */
export interface PlannedLesson {
  id: Id | null
  teaching_assignment: Id
  section: Id
  section_name: string
  subject_name: string
  teacher_name: string
  day_of_week: number
  period: Id
  period_name: string
  start_time: string
  end_time: string
  room: Id | null
  room_name: string | null
}
export interface GenerateResult {
  dry_run: boolean
  created: number
  lessons: PlannedLesson[]
  unplaced: Array<{ teaching_assignment: Id; section: string; subject: string; teacher: string; missing: number; reason: string }>
}
export interface GenerateInput {
  sections: Id[]
  schedule: Id
  days: number[]
  term?: Id | null
  valid_from?: string | null
  dry_run: boolean
}

const schedulesBase = createResourceApi<BellSchedule, BellScheduleInput>('/bell-schedules/')
export const schedulesApi = {
  ...schedulesBase,
  retime: (id: Id, input: { effective_from: string; periods: Array<{ period: Id; start_time: string; end_time: string }> }) =>
    apiClient.post(`${schedulesBase.url(id)}retime/`, input).then((r) => r.data),
}
export const scheduleKeys = createQueryKeys('bell-schedules')

export const periodsApi = createResourceApi<Period, PeriodInput>('/periods/')
export const periodKeys = createQueryKeys('periods')

const entriesBase = createResourceApi<Entry, EntryInput>('/timetable/')
export const entriesApi = {
  ...entriesBase,
  day: (params: ListParams & { date: string }) => apiClient.get<Lesson[]>('/timetable/day/', { params }).then((r) => r.data),
  generate: (input: GenerateInput) => apiClient.post<GenerateResult>('/timetable/generate/', input).then((r) => r.data),
  handOver: (input: { teaching_assignments: Id[]; teacher: Id; on?: string }) => apiClient.post('/timetable/hand-over/', input).then((r) => r.data),
}
export const entryKeys = createQueryKeys('timetable')

export const changesApi = createResourceApi<LessonChange, LessonChangeInput>('/lesson-changes/')
export const changeKeys = createQueryKeys('lesson-changes')
