/** `GET /mark-sheets/mine/` (not described in the OpenAPI file; shape from the backend view). */
export interface MyMarkSheet {
  exam: number
  exam_name: string
  exam_subject: number
  subject_name: string
  date: string
  held: boolean
  section: number
  section_name: string
  sheet: number | null
  status: string | null
}

/** `GET /attendance/sessions/mine/` */
export interface MyRollCalls {
  date: string
  classes: Array<{
    kind: 'lesson' | 'daily'
    section: number
    section_name: string
    subject_name: string | null
    start_time: string | null
    end_time: string | null
    session: number | null
    status: string | null
  }>
}

/** `GET /invoices/reports/outstanding/` — the backend sends numbers here, not decimal strings. */
export interface OutstandingReport {
  as_of: string
  count: number
  total_outstanding: number | string
}

/** `GET /attendance/reports/missing/` */
export interface MissingAttendance {
  date: string
  missing: unknown[]
}
