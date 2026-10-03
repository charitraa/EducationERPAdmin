import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, ListParams } from '@/shared/types/api'
import {
  admitCardKeys,
  admitCardsApi,
  examKeys,
  examRoomKeys,
  examRoomsApi,
  examsApi,
  examTypeKeys,
  examTypesApi,
  gradeScaleKeys,
  gradeScalesApi,
  invigilationKeys,
  invigilationsApi,
  paperKeys,
  papersApi,
  planKeys,
  plansApi,
  reportCardsApi,
  resultKeys,
  resultsApi,
  seatKeys,
  seatsApi,
  sheetKeys,
  sheetsApi,
  transcriptsApi,
  type MarkEntryInput,
} from '../api/examinations.api'

function useInvalidate(...keys: QueryKey[]) {
  const qc = useQueryClient()
  return () => {
    for (const key of keys) void qc.invalidateQueries({ queryKey: key })
  }
}

/** An exam's status moves papers, sheets, seats and results along with it. */
const EXAM_WIDE = [examKeys.all, paperKeys.all, sheetKeys.all, resultKeys.all, seatKeys.all, admitCardKeys.all]

export const {
  useList: useGradeScales,
  useCreate: useCreateGradeScale,
  useUpdate: useUpdateGradeScale,
  useRemove: useRemoveGradeScale,
} = createResourceHooks(gradeScalesApi, gradeScaleKeys)

export function useGradeScaleOptions(enabled = true) {
  return useQuery({ queryKey: gradeScaleKeys.list(PICKER_PARAMS), queryFn: () => gradeScalesApi.list(PICKER_PARAMS), select: (p) => p.results, enabled, staleTime: 5 * 60_000 })
}

export const {
  useList: useExamTypes,
  useCreate: useCreateExamType,
  useUpdate: useUpdateExamType,
  useRemove: useRemoveExamType,
} = createResourceHooks(examTypesApi, examTypeKeys)

export function useExamTypeOptions() {
  const params = { ...PICKER_PARAMS, is_active: true }
  return useQuery({ queryKey: examTypeKeys.list(params), queryFn: () => examTypesApi.list(params), select: (p) => p.results, staleTime: 5 * 60_000 })
}

export const { useList: useExams, useOne: useExam, useCreate: useCreateExam, useUpdate: useUpdateExam, useRemove: useRemoveExam } = createResourceHooks(examsApi, examKeys)

export function useExamOptions(params: ListParams = {}, enabled = true) {
  const p = { ...PICKER_PARAMS, ordering: '-start_date', ...params }
  return useQuery({ queryKey: examKeys.list(p), queryFn: () => examsApi.list(p), select: (r) => r.results, enabled })
}

/** Exam actions (schedule, publish…): the error shows where the action was taken. */
function useExamAction<V>(fn: (v: V) => Promise<unknown>) {
  const invalidate = useInvalidate(...EXAM_WIDE)
  return useMutation({ mutationFn: fn, meta: { silent: true }, onSuccess: invalidate })
}

export const useScheduleExam = () => useExamAction(examsApi.schedule)
export const useUnscheduleExam = () => useExamAction(examsApi.unschedule)
export const useComputeExam = () => useExamAction(examsApi.compute)
export const usePublishExam = () => useExamAction(examsApi.publish)
export const useUnpublishExam = () => useExamAction(({ id, reason }: { id: Id; reason: string }) => examsApi.unpublish(id, reason))
export const useSeatPlan = () => useExamAction(({ id, ...input }: { id: Id; strategy: 'interleave' | 'sequential'; dry_run: boolean }) => examsApi.seatPlan(id, input))
export const useClearSeatPlan = () => useExamAction(examsApi.clearSeatPlan)
export const useGenerateAdmitCards = () => useExamAction(({ id, section }: { id: Id; section?: Id }) => examsApi.generateAdmitCards(id, section))

export function useAddCurriculum() {
  const invalidate = useInvalidate(paperKeys.all, examKeys.all)
  return useMutation({
    mutationFn: ({ id, ...input }: { id: Id; levels: number[]; full_marks: number; pass_marks: number; kind: string }) => examsApi.addCurriculum(id, input),
    meta: { form: true },
    onSuccess: invalidate,
  })
}

export function useReadiness(id: Id, enabled = true) {
  return useQuery({ queryKey: [...examKeys.detail(id), 'readiness'], queryFn: () => examsApi.readiness(id), enabled })
}

export function useExamSummary(id: Id, enabled = true) {
  return useQuery({ queryKey: [...resultKeys.all, 'summary', id], queryFn: () => examsApi.summary(id), enabled })
}

export function usePapers(exam: Id) {
  const params = { ...PICKER_PARAMS, exam }
  return useQuery({ queryKey: paperKeys.list(params), queryFn: () => papersApi.list(params), select: (p) => p.results })
}

export const { useCreate: useCreatePaper, useUpdate: useUpdatePaper, useRemove: useRemovePaper } = createResourceHooks(papersApi, paperKeys, { alsoInvalidate: [examKeys.all] })

export function useExamRooms(exam: Id) {
  const params = { ...PICKER_PARAMS, exam }
  return useQuery({ queryKey: examRoomKeys.list(params), queryFn: () => examRoomsApi.list(params), select: (p) => p.results })
}

export const { useCreate: useCreateExamRoom, useUpdate: useUpdateExamRoom, useRemove: useRemoveExamRoom } = createResourceHooks(examRoomsApi, examRoomKeys, { alsoInvalidate: [seatKeys.all] })

export function useSeats(params: ListParams) {
  return useQuery({ queryKey: seatKeys.list(params), queryFn: () => seatsApi.list(params), placeholderData: keepPreviousData })
}

export function useInvigilations(exam: Id) {
  const params = { ...PICKER_PARAMS, exam_subject__exam: exam }
  return useQuery({ queryKey: invigilationKeys.list(params), queryFn: () => invigilationsApi.list(params), select: (p) => p.results })
}

export const { useCreate: useCreateInvigilation, useRemove: useRemoveInvigilation } = createResourceHooks(invigilationsApi, invigilationKeys)

export function useAdmitCards(params: ListParams) {
  return useQuery({ queryKey: admitCardKeys.list(params), queryFn: () => admitCardsApi.list(params), placeholderData: keepPreviousData })
}

export function useWithholdCard() {
  const invalidate = useInvalidate(admitCardKeys.all)
  return useMutation({ mutationFn: ({ id, reason }: { id: Id; reason: string }) => admitCardsApi.withhold(id, reason), meta: { form: true }, onSuccess: invalidate })
}

export function useReleaseCard() {
  const invalidate = useInvalidate(admitCardKeys.all)
  return useMutation({ mutationFn: admitCardsApi.release, meta: { silent: true }, onSuccess: invalidate })
}

export function useSheets(params: ListParams, enabled = true) {
  return useQuery({ queryKey: sheetKeys.list(params), queryFn: () => sheetsApi.list(params), placeholderData: keepPreviousData, enabled })
}

export function useMyPapers(enabled = true) {
  return useQuery({ queryKey: [...sheetKeys.all, 'mine'], queryFn: sheetsApi.mine, enabled, retry: false })
}

export function useSheetRoster(id: Id | null) {
  return useQuery({ queryKey: [...sheetKeys.all, 'roster', id], queryFn: () => sheetsApi.roster(id!), enabled: id != null })
}

const SHEET_WIDE = [sheetKeys.all, examKeys.all, resultKeys.all]

export function useOpenSheet() {
  const invalidate = useInvalidate(...SHEET_WIDE)
  return useMutation({ mutationFn: sheetsApi.open, meta: { silent: true }, onSuccess: invalidate })
}

export function useEnterMarks() {
  const invalidate = useInvalidate(...SHEET_WIDE)
  return useMutation({ mutationFn: ({ id, ...input }: { id: Id; entries: MarkEntryInput[]; reason?: string }) => sheetsApi.enter(id, input), meta: { silent: true }, onSuccess: invalidate })
}

export function useSheetAction<V>(fn: (v: V) => Promise<unknown>) {
  const invalidate = useInvalidate(...SHEET_WIDE)
  return useMutation({ mutationFn: fn, meta: { silent: true }, onSuccess: invalidate })
}

export function useResults(params: ListParams, enabled = true) {
  return useQuery({ queryKey: resultKeys.list(params), queryFn: () => resultsApi.list(params), placeholderData: keepPreviousData, enabled })
}

export function useResult(id: Id | null) {
  return useQuery({ queryKey: resultKeys.detail(id ?? 0), queryFn: () => resultsApi.get(id!), enabled: id != null })
}

export function useRemark() {
  const invalidate = useInvalidate(resultKeys.all)
  return useMutation({ mutationFn: ({ id, remark }: { id: Id; remark: string }) => resultsApi.remark(id, remark), meta: { form: true }, onSuccess: invalidate })
}

export function useReportCards(params: { exam?: Id; plan?: Id; section?: Id; student?: Id }, enabled: boolean) {
  return useQuery({ queryKey: [...resultKeys.all, 'report-cards', params], queryFn: () => reportCardsApi.list(params), enabled })
}

export function useTranscript(student: Id | null) {
  return useQuery({ queryKey: [...resultKeys.all, 'transcript', student], queryFn: () => transcriptsApi.get(student!), enabled: student != null })
}

export const { useList: usePlans, useCreate: useCreatePlan, useUpdate: useUpdatePlan, useRemove: useRemovePlan } = createResourceHooks(plansApi, planKeys, { alsoInvalidate: [resultKeys.all] })

function usePlanAction<V>(fn: (v: V) => Promise<unknown>) {
  const invalidate = useInvalidate(planKeys.all, resultKeys.all)
  return useMutation({ mutationFn: fn, meta: { silent: true }, onSuccess: invalidate })
}

export const useComputePlan = () => usePlanAction(plansApi.compute)
export const usePublishPlan = () => usePlanAction(plansApi.publish)
export const useUnpublishPlan = () => usePlanAction(({ id, reason }: { id: Id; reason: string }) => plansApi.unpublish(id, reason))
