import { apiClient } from '@/shared/api/client'
import { ApiError, toApiError } from '@/shared/api/errors'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, ListParams, Paginated, Schema } from '@/shared/types/api'

export type GradeScale = Schema<'GradeScale'>
export type GradeScaleInput = Schema<'GradeScaleRequest'>
export type GradeBand = Schema<'GradeBand'>
export type ExamType = Schema<'ExamType'>
export type ExamTypeInput = Schema<'ExamTypeRequest'>
export type Exam = Schema<'Exam'>
export type ExamInput = Schema<'ExamRequest'>
export type ExamStatus = Schema<'ExamStatusEnum'>
export type Paper = Schema<'ExamSubject'>
export type PaperInput = Schema<'ExamSubjectRequest'>
export type Component = Schema<'ExamComponent'>
export type ExamRoom = Schema<'ExamRoom'>
export type ExamRoomInput = Schema<'ExamRoomRequest'>
export type Seat = Schema<'SeatAllocation'>
export type Invigilation = Schema<'Invigilation'>
export type InvigilationInput = Schema<'InvigilationRequest'>
export type AdmitCard = Schema<'AdmitCard'>
export type MarkSheet = Schema<'MarkSheet'>
export type Mark = Schema<'Mark'>
export type MarkStatus = Schema<'MarkStatusEnum'>
export type Result = Schema<'Result'>
export type ResultRow = Schema<'ResultList'>
export type ResultPlan = Schema<'ResultPlan'>
export type ResultPlanInput = Schema<'ResultPlanRequest'>

// The shapes below are hand-written: these actions are typed `None` in the OpenAPI.

/** A paper a teacher marks (from `/mark-sheets/mine/`). */
export interface MyPaper {
  exam: Id
  exam_name: string
  exam_subject: Id
  subject_name: string
  date: string | null
  /** The paper's date has come: marks can be entered. */
  held: boolean
  section: Id
  section_name: string
  sheet: Id | null
  status: MarkSheet['status'] | null
}

export interface SheetComponent {
  id: Id
  name: string
  kind: string
  full_marks: number
  pass_marks: number
}

export interface SheetStudent {
  enrollment: Id
  student: Id
  student_name: string
  student_number: string
  admit_card: 'issued' | 'withheld' | null
  /** Component id → the mark so far, or null. */
  marks: Record<string, { status: MarkStatus; marks: number | null } | null>
}

export interface SheetRoster {
  sheet: MarkSheet
  components: SheetComponent[]
  students: SheetStudent[]
}

export interface MarkEntryInput {
  enrollment: Id
  component: Id
  status: MarkStatus
  marks?: number | null
}

interface SheetLabel {
  exam_subject: Id
  subject: string
  section: Id
  section_name: string
}

export interface Readiness {
  ready: boolean
  expected_sheets: number
  not_started: SheetLabel[]
  not_verified: Array<SheetLabel & { sheet: Id; status: MarkSheet['status'] }>
}

export interface ExamSummary {
  exam: Id
  name: string
  results: number
  by_status: Partial<Record<Result['status'], number>>
  pass_rate: number | null
  average_percentage: number | null
  subjects: Array<{ subject_name: string; students: number; passed: number; absent: number; pass_rate: number; average: number; highest: number; lowest: number }>
  toppers: Array<{ student: Id; student_name: string; section_name: string; percentage: number; rank_in_level: number | null }>
}

export interface SeatPlanResult {
  students: number
  seats: number
  rooms: Array<{ room: string; students: number }>
  dry_run: boolean
}

export interface ReportLine {
  subject: Id
  subject_name: string
  subject_code: string
  credit_hours: number
  obtained: number
  full: number
  percentage: number
  letter: string
  grade_point: number
  remark: string
  status: Result['status']
  absent: boolean
  detail: Array<Record<string, unknown>>
}

export interface ReportCard {
  /** The result's status (pass, fail…): the backend's dict sets `result` twice (id, then status) and the status wins. */
  result: Result['status']
  kind: 'exam' | 'term'
  title: string
  exam_type: string | null
  academic_year: string
  term: string | null
  published_at: string | null
  student: { id: Id; name: string; student_number: string; date_of_birth: string | null; gender: string }
  campus: string
  program: string
  level: number
  level_label: string
  section: string
  subjects: ReportLine[]
  total_obtained: number
  total_full: number
  percentage: number
  grade_point: number
  letter: string
  division: string
  rank_in_section: number | null
  rank_in_level: number | null
  class_size: number
  attendance: { from: string; to: string; total: number; attended: number; percentage: number | null } | null
  remark: string
  grading: Array<{ from: number; letter: string; grade_point: number; remark: string; pass: boolean }>
}

export interface Transcript {
  student: ReportCard['student']
  records: Array<{
    /** The result's status (pass, fail…): the backend's dict sets `result` twice and the status wins. */
    result: Result['status']
    kind: 'exam' | 'term'
    title: string
    academic_year: string
    program: string
    level_label: string
    campus: string
    subjects: ReportLine[]
    percentage: number
    grade_point: number
    letter: string
    division: string
  }>
  cumulative: { credits: number; credits_passed: number; gpa: number | null }
}

/** Per status, how many results a compute or publish produced. */
export type ResultCounts = Partial<Record<Result['status'], number>>

export const gradeScalesApi = createResourceApi<GradeScale, GradeScaleInput>('/grades/scales/')
export const gradeScaleKeys = createQueryKeys('grade-scales')

export const examTypesApi = createResourceApi<ExamType, ExamTypeInput>('/exam-types/')
export const examTypeKeys = createQueryKeys('exam-types')

const examsBase = createResourceApi<Exam, ExamInput>('/exams/')
const post = <T = unknown>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)
export const examsApi = {
  ...examsBase,
  addCurriculum: (id: Id, input: { levels: number[]; full_marks?: number; pass_marks?: number; kind?: string }) => post<Paper[]>(`${examsBase.url(id)}add-curriculum/`, input),
  schedule: (id: Id) => post<Exam>(`${examsBase.url(id)}schedule/`),
  unschedule: (id: Id) => post<Exam>(`${examsBase.url(id)}unschedule/`),
  readiness: (id: Id) => apiClient.get<Readiness>(`${examsBase.url(id)}readiness/`).then((r) => r.data),
  compute: (id: Id) => post<{ results: ResultCounts }>(`${examsBase.url(id)}compute/`),
  publish: (id: Id) => post<{ results: ResultCounts }>(`${examsBase.url(id)}publish/`),
  unpublish: (id: Id, reason: string) => post<Exam>(`${examsBase.url(id)}unpublish/`, { reason }),
  summary: (id: Id) => apiClient.get<ExamSummary>(`${examsBase.url(id)}summary/`).then((r) => r.data),
  seatPlan: (id: Id, input: { strategy: 'interleave' | 'sequential'; dry_run: boolean }) => post<SeatPlanResult>(`${examsBase.url(id)}seat-plan/`, input),
  clearSeatPlan: (id: Id) => post<void>(`${examsBase.url(id)}clear-seat-plan/`),
  generateAdmitCards: (id: Id, section?: Id) => post<{ created: number; withheld: number; skipped: number }>(`${examsBase.url(id)}generate-admit-cards/`, section ? { section } : {}),
}
export const examKeys = createQueryKeys('exams')

export const papersApi = createResourceApi<Paper, PaperInput>('/exam-subjects/')
export const paperKeys = createQueryKeys('exam-subjects')

export const examRoomsApi = createResourceApi<ExamRoom, ExamRoomInput>('/exam-rooms/')
export const examRoomKeys = createQueryKeys('exam-rooms')

export const seatsApi = { list: createResourceApi<Seat>('/seat-allocations/').list }
export const seatKeys = createQueryKeys('seat-allocations')

export const invigilationsApi = createResourceApi<Invigilation, InvigilationInput>('/invigilations/')
export const invigilationKeys = createQueryKeys('invigilations')

export const admitCardsApi = {
  list: createResourceApi<AdmitCard>('/admit-cards/').list,
  withhold: (id: Id, reason: string) => post<AdmitCard>(`/admit-cards/${id}/withhold/`, { reason }),
  release: (id: Id) => post<AdmitCard>(`/admit-cards/${id}/release/`),
}
export const admitCardKeys = createQueryKeys('admit-cards')

export const sheetsApi = {
  list: (params: ListParams = {}) => apiClient.get<Paginated<MarkSheet>>('/mark-sheets/', { params }).then((r) => r.data),
  /** 201 when opened now, 200 when it existed: the sheet comes back either way. */
  open: (input: { exam_subject: Id; section: Id }) => post<MarkSheet>('/mark-sheets/', input),
  mine: () => apiClient.get<MyPaper[]>('/mark-sheets/mine/').then((r) => r.data),
  roster: (id: Id) => apiClient.get<SheetRoster>(`/mark-sheets/${id}/roster/`).then((r) => r.data),
  /** After submission only the exam office may change marks, and must give a reason. */
  enter: (id: Id, input: { entries: MarkEntryInput[]; reason?: string }) => post<Mark[]>(`/mark-sheets/${id}/marks/`, input),
  submit: (id: Id) => post<MarkSheet>(`/mark-sheets/${id}/submit/`),
  verify: (id: Id) => post<MarkSheet>(`/mark-sheets/${id}/verify/`),
  sendBack: (id: Id, reason: string) => post<MarkSheet>(`/mark-sheets/${id}/send-back/`, { reason }),
}
export const sheetKeys = createQueryKeys('mark-sheets')

export const resultsApi = {
  list: createResourceApi<ResultRow>('/results/').list,
  get: (id: Id) => apiClient.get<Result>(`/results/${id}/`).then((r) => r.data),
  remark: (id: Id, remark: string) => post<Result>(`/results/${id}/remark/`, { remark }),
  reportCard: (id: Id) => apiClient.get<ReportCard>(`/results/${id}/report-card/`).then((r) => r.data),
}
export const resultKeys = createQueryKeys('results')

export const reportCardsApi = {
  list: (params: { exam?: Id; plan?: Id; section?: Id; student?: Id }) => apiClient.get<ReportCard[]>('/report-cards/', { params }).then((r) => r.data),
}

export const transcriptsApi = {
  get: (student: Id) => apiClient.get<Transcript>(`/transcripts/${student}/`).then((r) => r.data),
}

const plansBase = createResourceApi<ResultPlan, ResultPlanInput>('/term-results/')
export const plansApi = {
  ...plansBase,
  compute: (id: Id) => post<{ results: ResultCounts }>(`${plansBase.url(id)}compute/`),
  publish: (id: Id) => post<{ results: ResultCounts }>(`${plansBase.url(id)}publish/`),
  unpublish: (id: Id, reason: string) => post<ResultPlan>(`${plansBase.url(id)}unpublish/`, { reason }),
}
export const planKeys = createQueryKeys('term-results')

/** Decimal strings from the API (`"35.00"`) → a short number for display. */
export const dec = (v: string | number | null | undefined) => (v == null || v === '' ? '—' : String(Number(v)))

/** A 400/409 whose `details.problems` lists what's wrong (schedule, grade scale): one message with all of them. */
export function withProblems(err: unknown): never {
  const e = toApiError(err)
  const problems = e.details && !Array.isArray(e.details) && Array.isArray((e.details as { problems?: unknown }).problems) ? ((e.details as { problems: string[] }).problems ?? []) : []
  if (problems.length) throw new ApiError({ code: e.code, message: [e.message, ...problems].join(' '), details: e.details }, e.status)
  throw err
}
