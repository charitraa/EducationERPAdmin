import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id, ListParams } from '@/shared/types/api'
import {
  biometricApi,
  biometricKeys,
  deviceKeys,
  devicesApi,
  punchesApi,
  punchKeys,
  recordKeys,
  recordsApi,
  reportKeys,
  reportsApi,
  sessionKeys,
  sessionsApi,
  staffDayKeys,
  staffDaysApi,
  staffScheduleKeys,
  staffSchedulesApi,
  workScheduleKeys,
  workSchedulesApi,
  type AttendanceStatus,
  type MarkInput,
  type Span,
} from '../api/attendance.api'

/** Marking anything makes sessions, records and every report stale. */
function useInvalidateAttendance() {
  const qc = useQueryClient()
  return () => {
    for (const key of [sessionKeys.all, recordKeys.all, reportKeys.all]) void qc.invalidateQueries({ queryKey: key })
  }
}

export function useSessions(params: ListParams) {
  return useQuery({ queryKey: sessionKeys.list(params), queryFn: () => sessionsApi.list(params), placeholderData: keepPreviousData })
}

export function useMyClasses(date: string, enabled = true) {
  return useQuery({ queryKey: [...sessionKeys.all, 'mine', date], queryFn: () => sessionsApi.mine(date), enabled, retry: false })
}

/** `live`: poll while a QR code is up, so scans show as they come in. */
export function useRoster(id: Id | null, live = false) {
  return useQuery({ queryKey: [...sessionKeys.all, 'roster', id], queryFn: () => sessionsApi.roster(id!), enabled: id != null, refetchInterval: live ? 5000 : false })
}

export function useOpenSession() {
  const invalidate = useInvalidateAttendance()
  return useMutation({ mutationFn: sessionsApi.open, onSuccess: invalidate })
}

/** Errors are shown on the roll-call page itself. */
export function useMarkSession() {
  const invalidate = useInvalidateAttendance()
  return useMutation({ mutationFn: ({ id, ...input }: MarkInput & { id: Id }) => sessionsApi.mark(id, input), meta: { silent: true }, onSuccess: invalidate })
}

export function useSubmitSession() {
  const invalidate = useInvalidateAttendance()
  return useMutation({ mutationFn: ({ id, rest }: { id: Id; rest?: AttendanceStatus }) => sessionsApi.submit(id, rest), meta: { silent: true }, onSuccess: invalidate })
}

export function useReopenSession() {
  const invalidate = useInvalidateAttendance()
  return useMutation({ mutationFn: sessionsApi.reopen, meta: { silent: true }, onSuccess: invalidate })
}

export function useCorrectRecord() {
  const invalidate = useInvalidateAttendance()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: Id; status: AttendanceStatus; reason?: string; note?: string }) => recordsApi.correct(id, input),
    meta: { form: true },
    onSuccess: invalidate,
  })
}

export function useRecords(params: ListParams, enabled = true) {
  return useQuery({ queryKey: recordKeys.list(params), queryFn: () => recordsApi.list(params), enabled, placeholderData: keepPreviousData })
}

export function useMissing(params: { date: string; campus?: Id }, enabled = true) {
  return useQuery({ queryKey: [...reportKeys.all, 'missing', params], queryFn: () => reportsApi.missing(params), enabled })
}

export function useRegister(params: Span & { section: Id | null }) {
  return useQuery({
    queryKey: [...reportKeys.all, 'register', params],
    queryFn: () => reportsApi.register({ ...params, section: params.section! }),
    enabled: params.section != null,
  })
}

export function useStudentReport(params: Span & { student: Id | null }) {
  return useQuery({
    queryKey: [...reportKeys.all, 'student', params],
    queryFn: () => reportsApi.student({ ...params, student: params.student! }),
    enabled: params.student != null,
  })
}

export function useDefaulters(params: Span & { below?: number; section?: Id; program?: Id }) {
  return useQuery({ queryKey: [...reportKeys.all, 'defaulters', params], queryFn: () => reportsApi.defaulters(params) })
}

export function useStaffReport(params: Span & { campus?: Id; staff?: Id }) {
  return useQuery({ queryKey: [...reportKeys.all, 'staff', params], queryFn: () => reportsApi.staff(params) })
}

export function useStaffDays(params: ListParams) {
  return useQuery({ queryKey: staffDayKeys.list(params), queryFn: () => staffDaysApi.list(params), placeholderData: keepPreviousData })
}

function useInvalidateStaff() {
  const qc = useQueryClient()
  return () => {
    for (const key of [staffDayKeys.all, punchKeys.all, reportKeys.all]) void qc.invalidateQueries({ queryKey: key })
  }
}

export function useSetStaffDay() {
  const invalidate = useInvalidateStaff()
  return useMutation({ mutationFn: staffDaysApi.set, meta: { form: true }, onSuccess: invalidate })
}

export function useClearStaffDay() {
  const invalidate = useInvalidateStaff()
  return useMutation({ mutationFn: staffDaysApi.clear, meta: { silent: true }, onSuccess: invalidate })
}

export function usePunches(params: ListParams) {
  return useQuery({ queryKey: punchKeys.list(params), queryFn: () => punchesApi.list(params), placeholderData: keepPreviousData })
}

export function useManualPunch() {
  const invalidate = useInvalidateStaff()
  return useMutation({ mutationFn: punchesApi.create, meta: { form: true }, onSuccess: invalidate })
}

export const {
  useList: useWorkSchedules,
  useCreate: useCreateWorkSchedule,
  useUpdate: useUpdateWorkSchedule,
  useRemove: useRemoveWorkSchedule,
} = createResourceHooks(workSchedulesApi, workScheduleKeys, { alsoInvalidate: [reportKeys.all] })

export const {
  useList: useStaffSchedules,
  useCreate: useCreateStaffSchedule,
  useUpdate: useUpdateStaffSchedule,
  useRemove: useRemoveStaffSchedule,
} = createResourceHooks(staffSchedulesApi, staffScheduleKeys, { alsoInvalidate: [reportKeys.all] })

export const { useList: useDevices, useCreate: useCreateDevice, useUpdate: useUpdateDevice, useRemove: useRemoveDevice } = createResourceHooks(devicesApi, deviceKeys)

export function useRotateDeviceKey() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: devicesApi.rotateKey, onSuccess: () => void qc.invalidateQueries({ queryKey: deviceKeys.all }) })
}

export const {
  useList: useBiometricIds,
  useCreate: useCreateBiometricId,
  useUpdate: useUpdateBiometricId,
  useRemove: useRemoveBiometricId,
} = createResourceHooks(biometricApi, biometricKeys, { alsoInvalidate: [staffDayKeys.all, punchKeys.all] })
