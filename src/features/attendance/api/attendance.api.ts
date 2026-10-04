import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Session = Schema<'Session'>
export type AttendanceRecord = Schema<'Record'>
export type AttendanceStatus = Schema<'AttendanceStatusEnum'>
export type StaffDay = Schema<'StaffDay'>
export type StaffDayStatus = Schema<'StaffDayStatusEnum'>
export type Punch = Schema<'Punch'>
export type WorkSchedule = Schema<'WorkSchedule'>
export type WorkScheduleInput = Schema<'WorkScheduleRequest'>
export type StaffWorkSchedule = Schema<'StaffWorkSchedule'>
export type StaffWorkScheduleInput = Schema<'StaffWorkScheduleRequest'>
export type Device = Schema<'Device'>
export type DeviceInput = Schema<'DeviceRequest'>
export type BiometricIdentity = Schema<'BiometricIdentity'>
export type BiometricIdentityInput = Schema<'BiometricIdentityRequest'>

/** Roll-call order: the three a teacher uses most come first. */
export const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused', 'leave', 'medical_leave', 'on_duty']

/** One letter per status, for the register grid and the roll-call buttons. */
export const STATUS_SHORT: Record<AttendanceStatus, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  excused: 'E',
  leave: 'LV',
  medical_leave: 'ML',
  on_duty: 'OD',
}

export const STATUS_TONE: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'info' | 'muted'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  excused: 'muted',
  leave: 'muted',
  medical_leave: 'muted',
  on_duty: 'info',
}

// The shapes below are hand-written: these actions are typed `None` in the OpenAPI.

/** A class to take attendance for today (from `/sessions/mine/`). */
export interface MyClass {
  kind: 'lesson' | 'daily'
  section: Id
  section_name: string
  timetable_entry: Id | null
  subject_name: string | null
  start_time: string | null
  end_time: string | null
  session: Id | null
  status: 'open' | 'submitted' | null
}

export interface RosterStudent {
  enrollment: Id
  student: Id
  student_name: string
  student_number: string
  record: Id | null
  status: AttendanceStatus | null
  source: string | null
  note: string
}

export interface Roster {
  session: Session
  students: RosterStudent[]
}

export interface MarkInput {
  records?: Array<{ enrollment: Id; status: AttendanceStatus; note?: string }>
  rest?: AttendanceStatus
}

/** Attendance not taken or not submitted on a day. */
export interface MissingItem {
  kind: 'lesson' | 'daily'
  section: Id
  section_name: string
  timetable_entry: Id | null
  subject_name: string | null
  start_time: string | null
  teacher: Id | null
  teacher_name: string | null
  session: Id | null
}

/** Counts per status, with the percentage of counted sessions attended (excused kinds left out). */
export type Summary = Record<AttendanceStatus, number> & { total: number; attended: number; percentage: number | null }

export interface StudentReport {
  student: Id
  student_name: string
  from: string
  to: string
  overall: Summary
  daily: Summary
  subjects: Array<Summary & { subject: Id; subject_name: string }>
}

export interface Register {
  section: Id
  section_name: string
  from: string
  to: string
  sessions: Array<{ session: Id; date: string; kind: 'lesson' | 'daily'; status: 'open' | 'submitted'; subject_name: string | null; start_time: string | null }>
  students: Array<Summary & { enrollment: Id; student: Id; student_name: string; student_number: string; marks: Array<AttendanceStatus | null> }>
}

export interface Defaulter extends Summary {
  student: Id
  section: Id
  student_name: string
  student_number: string
}

export interface StaffReportRow {
  staff: Id
  staff_name: string
  employee_number: string
  working_days: number
  present: number
  late: number
  half_day: number
  absent: number
  leave: number
  on_duty: number
  average_worked_minutes: number | null
}

/** `expires_at` is Unix seconds (a float), not an ISO date. */
export interface QrToken {
  token: string
  expires_at: number
}

/** Seconds each code works (15–300). With all three location fields, scans from further than `radius` metres are refused. */
export interface QrOptions {
  ttl?: number
  latitude?: number
  longitude?: number
  radius?: number
}

export interface ScanInput {
  token: string
  latitude?: number
  longitude?: number
}

export interface Span {
  from?: string
  to?: string
}

const sessionsBase = createResourceApi<Session, never>('/attendance/sessions/')
export const sessionsApi = {
  list: sessionsBase.list,
  get: sessionsBase.get,
  /** 201 when opened now, 200 when it was already open: either way the session comes back. */
  open: (input: { date?: string; section?: Id; timetable_entry?: Id }) => apiClient.post<Session>('/attendance/sessions/', input).then((r) => r.data),
  mine: (date?: string) => apiClient.get<{ date: string; classes: MyClass[] }>('/attendance/sessions/mine/', { params: { date } }).then((r) => r.data),
  roster: (id: Id) => apiClient.get<Roster>(`/attendance/sessions/${id}/roster/`).then((r) => r.data),
  mark: (id: Id, input: MarkInput) => apiClient.post<AttendanceRecord[]>(`/attendance/sessions/${id}/mark/`, input).then((r) => r.data),
  submit: (id: Id, rest?: AttendanceStatus) => apiClient.post<Session>(`/attendance/sessions/${id}/submit/`, rest ? { rest } : {}).then((r) => r.data),
  reopen: (id: Id) => apiClient.post<Session>(`/attendance/sessions/${id}/reopen/`).then((r) => r.data),
  /** A short-lived code for students to scan; ask again before `expires_at`. */
  qr: (id: Id, input: QrOptions & { late_after?: string }) => apiClient.post<QrToken & { session: Id }>(`/attendance/sessions/${id}/qr/`, input).then((r) => r.data),
  /** The signed-in student scans a class's code. 201 when marked now, 200 with `already_marked`. */
  scan: (input: ScanInput & { device_id?: string }) =>
    apiClient.post<{ already_marked: boolean; status: AttendanceStatus; session: Id }>('/attendance/sessions/scan/', input).then((r) => r.data),
}
export const sessionKeys = createQueryKeys('attendance-sessions')

export const recordsApi = {
  list: createResourceApi<AttendanceRecord>('/attendance/records/').list,
  /** After submission this is a correction: `reason` is required and kept in `corrections`. */
  correct: (id: Id, input: { status: AttendanceStatus; reason?: string; note?: string }) =>
    apiClient.patch<AttendanceRecord>(`/attendance/records/${id}/`, input).then((r) => r.data),
}
export const recordKeys = createQueryKeys('attendance-records')

export const reportsApi = {
  register: (params: Span & { section: Id }) => apiClient.get<Register>('/attendance/reports/register/', { params }).then((r) => r.data),
  student: (params: Span & { student: Id }) => apiClient.get<StudentReport>('/attendance/reports/student/', { params }).then((r) => r.data),
  defaulters: (params: Span & { below?: number; section?: Id; program?: Id }) =>
    apiClient.get<{ from: string; to: string; below: number; students: Defaulter[] }>('/attendance/reports/defaulters/', { params }).then((r) => r.data),
  missing: (params: { date?: string; campus?: Id }) => apiClient.get<{ date: string; missing: MissingItem[] }>('/attendance/reports/missing/', { params }).then((r) => r.data),
  staff: (params: Span & { campus?: Id; staff?: Id }) =>
    apiClient.get<{ from: string; to: string; staff: StaffReportRow[] }>('/attendance/reports/staff/', { params }).then((r) => r.data),
}
export const reportKeys = createQueryKeys('attendance-reports')

const staffDaysBase = createResourceApi<StaffDay, never>('/attendance/staff-days/')
export const staffDaysApi = {
  list: staffDaysBase.list,
  /** Sets the day by hand; it then ignores punches until cleared. */
  set: (input: { staff: Id; date: string; status: StaffDayStatus; note: string }) => apiClient.post<StaffDay>('/attendance/staff-days/', input).then((r) => r.data),
  /** Only for days set by hand: hands the day back to the punches. */
  clear: staffDaysBase.remove,
}
export const staffDayKeys = createQueryKeys('attendance-staff-days')

const punchesBase = createResourceApi<Punch, never>('/attendance/punches/')
export const punchesApi = {
  list: punchesBase.list,
  create: (input: { staff: Id; punched_at: string; direction: 'in' | 'out' | 'unknown'; note: string }) => apiClient.post<Punch>('/attendance/punches/', input).then((r) => r.data),
  /** A short-lived code shown at a campus for staff to check in with. */
  qr: (input: QrOptions & { campus: Id }) => apiClient.post<QrToken>('/attendance/punches/qr/', input).then((r) => r.data),
  /** The signed-in staff member scans the campus code. */
  checkIn: (input: ScanInput) => apiClient.post<Punch>('/attendance/punches/check-in/', input).then((r) => r.data),
}
export const punchKeys = createQueryKeys('attendance-punches')

export const workSchedulesApi = createResourceApi<WorkSchedule, WorkScheduleInput>('/attendance/work-schedules/')
export const workScheduleKeys = createQueryKeys('attendance-work-schedules')

export const staffSchedulesApi = createResourceApi<StaffWorkSchedule, StaffWorkScheduleInput>('/attendance/staff-schedules/')
export const staffScheduleKeys = createQueryKeys('attendance-staff-schedules')

/** A generic device's create response also carries `api_key`, shown once. */
const devicesBase = createResourceApi<Device & { api_key?: string }, DeviceInput>('/attendance/devices/')
export const devicesApi = {
  ...devicesBase,
  rotateKey: (id: Id) => apiClient.post<{ api_key: string; key_prefix: string }>(`${devicesBase.url(id)}rotate-key/`).then((r) => r.data),
}
export const deviceKeys = createQueryKeys('attendance-devices')

export const biometricApi = createResourceApi<BiometricIdentity, BiometricIdentityInput>('/attendance/biometric-ids/')
export const biometricKeys = createQueryKeys('attendance-biometric-ids')
