import type { AlumniEvent, AlumniProfile, Mentorship } from '@/features/alumni/api/alumni.api'
import type { ApplicationRow, Certificate } from '@/features/applications/api/applications.api'
import type { AttendanceRecord, StaffDay, StaffReportRow, StudentReport } from '@/features/attendance/api/attendance.api'
import type { Interview, JobOffer } from '@/features/careers/api/careers.api'
import type { Event, Registration } from '@/features/events/api/events.api'
import type { ReportCard, Transcript } from '@/features/examinations/api/examinations.api'
import type { Statement } from '@/features/finance/api/finance.api'
import type { Allocation, Complaint } from '@/features/hostel/api/hostel.api'
import type { Contract, EmployeeProfile, LeaveBalance, LeaveRequest, StaffDocument } from '@/features/hr/api/hr.api'
import type { Asset } from '@/features/inventory/api/inventory.api'
import type { Fine, Loan, Member, Reservation } from '@/features/library/api/library.api'
import type { Payslip } from '@/features/payroll/api/payroll.api'
import type { PublicVacancy } from '@/features/public/api/public.api'
import type { StaffMember } from '@/features/staff/api/staff.api'
import type { Student } from '@/features/students/api/students.api'
import type { Entry, Lesson } from '@/features/timetable/api/timetable.api'
import type { Rider, TripRecord } from '@/features/transport/api/transport.api'
import { apiClient } from '@/shared/api/client'
import type { Id, Paginated, Schema } from '@/shared/types/api'

// The `/…/me/` endpoints: the signed-in person's own records. Parents pass
// `student` to pick a child. Most of them are typed `None` in the OpenAPI, so
// the shapes here are read off the backend views.

/** `?student=` for a parent's child; nothing for one's own records. */
export type ChildParam = { student?: Id }

export interface Child {
  student: Id
  student_number: string
  full_name: string
  campus_name: string
  status: string
  relationship: string
  is_primary_contact: boolean
}
export type ParentMe = Omit<Schema<'ParentWithChildren'>, 'children'> & { children: Child[] }

export interface MyTimetable {
  as: 'teacher' | 'student' | 'parent'
  date: string | null
  student?: Id
  /** The week's entries without `date`; that day's lessons with it. */
  lessons: Entry[] | Lesson[]
}

export interface MyExam {
  id: Id
  name: string
  type: string
  status: string
  start_date: string
  end_date: string
  instructions: string
  papers: Array<{ subject_name: string; date: string | null; start_time: string | null; end_time: string | null }>
  seat: { room: string; seat_number: string | number } | null
  admit_card: { id: Id; card_number: string; status: string; withheld_reason: string } | null
}

/** `/admit-cards/me/`: a card as printed. */
export interface AdmitCardData {
  card_number: string
  status: string
  withheld_reason: string
  exam: { id: Id; name: string; type: string; start_date: string; end_date: string; instructions: string }
  student: { id: Id; name: string; student_number: string }
  campus: string
  program: string
  section: string
  seat: MyExam['seat']
  papers: MyExam['papers']
}

/** `/events/me/`: published events at the student's campus, with their registration. */
export type MyEvent = Event & { my_registration: Registration | null }

export type UpcomingAlumniEvent = Pick<AlumniEvent, 'id' | 'campus' | 'campus_name' | 'title' | 'description' | 'starts_at' | 'ends_at' | 'venue' | 'online_url' | 'capacity' | 'places_taken'> & {
  my_response: 'going' | 'maybe' | 'declined' | null
  my_guests: number
}

export interface MentorCard {
  id: Id
  full_name: string
  program_name: string
  academic_year: string
  city: string
  country: string
  mentor_topics: string
  linkedin_url: string
  bio: string
  places_left: number | null
  current_job: AlumniProfile['current_job']
}

/** Every row of a paginated `me` list; nobody has hundreds of their own. */
const ALL = { page_size: 100 }

const get = <T>(url: string, params?: object) => apiClient.get<T>(url, { params }).then((r) => r.data)
const all = <T>(url: string, params?: object) => get<Paginated<T>>(url, { ...ALL, ...params }).then((d) => d.results)
const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)

export const selfApi = {
  staff: () => get<StaffMember>('/staff/me/'),
  student: () => get<Student>('/students/me/'),
  parent: () => get<ParentMe>('/parents/me/'),
  alumnus: () => get<AlumniProfile>('/alumni/profiles/me/'),

  timetable: (params: { as?: MyTimetable['as']; student?: Id; date?: string }) => get<MyTimetable>('/timetable/me/', params),
  studentAttendance: (params: ChildParam & { from?: string; to?: string }) =>
    get<{ summary: StudentReport; records: AttendanceRecord[] }>('/attendance/records/me/', params),
  staffAttendance: (params: { from?: string; to?: string }) => get<{ summary: StaffReportRow; days: StaffDay[] }>('/attendance/staff-days/me/', params),

  // Staff
  leaveBalances: () => get<LeaveBalance[]>('/hr/leave-balances/me/'),
  leaveRequests: () => get<LeaveRequest[]>('/hr/leave-requests/me/'),
  payslips: () => get<Payslip[]>('/payroll/payslips/me/'),
  contracts: () => get<Contract[]>('/hr/contracts/me/'),
  hrProfile: () => get<EmployeeProfile>('/hr/profiles/me/'),
  documents: () => get<StaffDocument[]>('/hr/documents/me/'),
  assets: () => all<Asset>('/inventory/assets/me/'),
  interviews: () => all<Interview>('/careers/interviews/mine/'),
  offers: () => all<JobOffer>('/careers/offers/mine/'),
  respondOffer: (id: Id, input: { accept: boolean; note?: string }) => post<JobOffer>(`/careers/offers/${id}/respond/`, input),
  vacancies: () => all<PublicVacancy>('/careers/vacancies/current/'),
  applyVacancy: (id: Id, input: { data: Record<string, unknown>; resume_file?: Id | null }) => post(`/careers/vacancies/${id}/apply/`, input),

  // Students, or a parent's child
  exams: (params: ChildParam) => get<MyExam[]>('/exams/me/', params),
  admitCards: (params: ChildParam & { exam?: Id }) => get<AdmitCardData[]>('/admit-cards/me/', params),
  /** Published results, each as its report card. */
  reportCards: (params: ChildParam) => get<ReportCard[]>('/results/me/', { ...params, include_card: true }),
  transcript: (params: ChildParam) => get<Transcript>('/transcripts/me/', params),
  statement: (params: ChildParam) => get<Statement>('/invoices/me/', params),
  events: (params: ChildParam) => get<MyEvent[]>('/events/me/', params),
  registerEvent: (id: Id, note = '') => post<Registration>(`/events/${id}/register/`, { note }),
  withdrawRegistration: (id: Id) => post<Registration>(`/event-registrations/${id}/withdraw/`),

  // Anyone with the record
  libraryMember: () => get<Member>('/library/members/me/'),
  loans: () => get<Loan[]>('/library/issues/me/'),
  reservations: () => get<Reservation[]>('/library/reservations/me/'),
  fines: () => get<Fine[]>('/library/fines/me/'),
  beds: () => get<Allocation[]>('/hostel/allocations/me/'),
  complaints: () => get<Complaint[]>('/hostel/complaints/me/'),
  raiseComplaint: (input: { category: string; title: string; description?: string }) => post<Complaint>('/hostel/complaints/me/', input),
  routes: () => get<Rider[]>('/transport/assignments/me/'),
  boarding: () => all<TripRecord>('/transport/trip-records/me/'),
  applications: () => all<ApplicationRow>('/applications/me/'),
  certificates: () => get<Certificate[]>('/certificates/me/'),

  // Alumni and mentoring
  mentors: () => all<MentorCard>('/alumni/profiles/mentors/'),
  mentorships: () => all<Mentorship>('/alumni/mentorships/'),
  askMentor: (input: { mentor: Id; topic: string; message?: string }) => post<Mentorship>('/alumni/mentorships/', input),
  mentorshipAction: (id: Id, action: 'accept' | 'decline' | 'end', note = '') => post<Mentorship>(`/alumni/mentorships/${id}/${action}/`, { note }),
  alumniEvents: () => all<UpcomingAlumniEvent>('/alumni/events/upcoming/'),
  rsvp: (id: Id, input: { response: 'going' | 'maybe' | 'declined'; guests?: number }) => post(`/alumni/events/${id}/rsvp/`, input),
}
