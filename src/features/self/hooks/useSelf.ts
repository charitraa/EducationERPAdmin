import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { isStatus } from '@/shared/api/errors'
import type { Id } from '@/shared/types/api'
import { selfApi, type ChildParam, type MyTimetable } from '../api/self.api'

const ME = ['me'] as const
const key = (...parts: unknown[]) => [...ME, ...parts]

/** A profile the account may not have: 404 means "not linked", not an error. */
async function maybe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    if (isStatus(err, 404) || isStatus(err, 403)) return null
    throw err
  }
}

const profile = <T>(name: string, fn: () => Promise<T>) => ({ queryKey: key('profile', name), queryFn: () => maybe(fn), staleTime: 5 * 60_000, retry: false })

/** Which records the signed-in account is linked to: a staff member, a student, a parent, a graduate. */
export function useWho() {
  const staff = useQuery(profile('staff', selfApi.staff))
  const student = useQuery(profile('student', selfApi.student))
  const parent = useQuery(profile('parent', selfApi.parent))
  const alumnus = useQuery(profile('alumnus', selfApi.alumnus))
  const all = [staff, student, parent, alumnus]
  return {
    staff: staff.data ?? null,
    student: student.data ?? null,
    parent: parent.data ?? null,
    alumnus: alumnus.data ?? null,
    isPending: all.some((q) => q.isPending),
    error: all.find((q) => q.isError)?.error ?? null,
  }
}

/**
 * Whose records the self-service pages show: the person's own as staff, their
 * own as a student, or one of a parent's children (`child`). `none`: the account
 * is linked to no staff, student or parent record.
 */
export type Subject = { kind: 'staff' } | { kind: 'student'; child: Id | null; name: string } | { kind: 'none' }

const STORAGE_KEY = 'erp.me.subject'

/** The last chosen subject: `staff`, `student`, or `child-<id>`. */
export function rememberedSubject(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberSubject(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Private mode: the choice lasts until reload.
  }
}

export const SubjectContext = createContext<Subject | null>(null)

export function useSubject(): Subject {
  const s = useContext(SubjectContext)
  if (!s) throw new Error('useSubject outside the self-service layout')
  return s
}

/** `?student=` for the chosen child; nothing when it's the person's own record. */
export function useChildParam(): ChildParam {
  const s = useSubject()
  return s.kind === 'student' && s.child != null ? { student: s.child } : {}
}

const q = <T>(parts: unknown[], fn: () => Promise<T>, enabled = true) => ({ queryKey: key(...parts), queryFn: fn, retry: false, enabled })

export function useMyTimetable(params: { as?: MyTimetable['as']; student?: Id; date?: string }) {
  return useQuery(q(['timetable', params], () => selfApi.timetable(params)))
}
export function useMyStudentAttendance(params: ChildParam & { from?: string; to?: string }, enabled = true) {
  return useQuery(q(['attendance', 'student', params], () => selfApi.studentAttendance(params), enabled))
}
export function useMyStaffAttendance(params: { from?: string; to?: string }, enabled = true) {
  return useQuery(q(['attendance', 'staff', params], () => selfApi.staffAttendance(params), enabled))
}

export const useMyPayslips = () => useQuery(q(['payslips'], selfApi.payslips))
export const useMyContracts = () => useQuery(q(['contracts'], selfApi.contracts))
export const useMyHrProfile = () => useQuery(q(['hr-profile'], () => maybe(selfApi.hrProfile)))
export const useMyDocuments = () => useQuery(q(['documents'], selfApi.documents))
export const useMyAssets = () => useQuery(q(['assets'], selfApi.assets))
export const useMyInterviews = () => useQuery(q(['interviews'], selfApi.interviews))
export const useMyOffers = () => useQuery(q(['offers'], selfApi.offers))
export const useOpenVacancies = () => useQuery(q(['vacancies'], selfApi.vacancies))

export const useMyExams = (p: ChildParam) => useQuery(q(['exams', p], () => selfApi.exams(p)))
export const useMyReportCards = (p: ChildParam) => useQuery(q(['report-cards', p], () => selfApi.reportCards(p)))
export const useMyAdmitCard = (p: ChildParam & { exam: Id }) => useQuery(q(['admit-card', p], () => selfApi.admitCards(p)))
export const useMyTranscript = (p: ChildParam, enabled: boolean) => useQuery(q(['transcript', p], () => selfApi.transcript(p), enabled))
export const useMyStatement = (p: ChildParam) => useQuery(q(['statement', p], () => selfApi.statement(p)))
export const useMyEvents = (p: ChildParam) => useQuery(q(['events', p], () => selfApi.events(p)))

export const useMyLibraryMember = () => useQuery(q(['library', 'member'], () => maybe(selfApi.libraryMember)))
export const useMyLoans = (enabled: boolean) => useQuery(q(['library', 'loans'], selfApi.loans, enabled))
export const useMyReservations = (enabled: boolean) => useQuery(q(['library', 'reservations'], selfApi.reservations, enabled))
export const useMyFines = (enabled: boolean) => useQuery(q(['library', 'fines'], selfApi.fines, enabled))
export const useMyBeds = () => useQuery(q(['hostel', 'beds'], selfApi.beds))
export const useMyComplaints = () => useQuery(q(['hostel', 'complaints'], selfApi.complaints))
export const useMyRoutes = () => useQuery(q(['transport', 'routes'], selfApi.routes))
export const useMyBoarding = () => useQuery(q(['transport', 'boarding'], selfApi.boarding))
export const useMyApplications = () => useQuery(q(['applications'], selfApi.applications))
export const useMyCertificates = () => useQuery(q(['certificates'], selfApi.certificates))

export const useMentors = (enabled: boolean) => useQuery(q(['mentors'], selfApi.mentors, enabled))
export const useMyMentorships = () => useQuery(q(['mentorships'], selfApi.mentorships))
export const useAlumniEvents = (enabled: boolean) => useQuery(q(['alumni-events'], selfApi.alumniEvents, enabled))

/** A self-service change; refreshes the `me` queries it touches. */
function useMeMutation<V, R>(fn: (v: V) => Promise<R>, ...touches: string[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: { form: true },
    onSuccess: () => {
      for (const t of touches) void qc.invalidateQueries({ queryKey: key(t) })
    },
  })
}

export const useRespondOffer = () => useMeMutation(({ id, ...input }: { id: Id; accept: boolean; note?: string }) => selfApi.respondOffer(id, input), 'offers')
export const useApplyVacancy = () =>
  useMeMutation(({ id, ...input }: { id: Id; data: Record<string, unknown>; resume_file?: Id | null }) => selfApi.applyVacancy(id, input), 'applications', 'vacancies')
export const useRegisterEvent = () => useMeMutation(({ id, note }: { id: Id; note?: string }) => selfApi.registerEvent(id, note), 'events')
export const useWithdrawRegistration = () => useMeMutation((id: Id) => selfApi.withdrawRegistration(id), 'events')
export const useRaiseComplaint = () => useMeMutation(selfApi.raiseComplaint, 'hostel')
export const useAskMentor = () => useMeMutation(selfApi.askMentor, 'mentorships', 'mentors')
export const useMentorshipAction = () =>
  useMeMutation(({ id, action, note }: { id: Id; action: 'accept' | 'decline' | 'end'; note?: string }) => selfApi.mentorshipAction(id, action, note), 'mentorships', 'mentors')
export const useRsvp = () =>
  useMeMutation(({ id, ...input }: { id: Id; response: 'going' | 'maybe' | 'declined'; guests?: number }) => selfApi.rsvp(id, input), 'alumni-events')
