import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { teachingKeys } from '@/features/academics/teaching/api/teaching.api'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, ListParams } from '@/shared/types/api'
import { changeKeys, changesApi, entriesApi, entryKeys, periodKeys, periodsApi, scheduleKeys, schedulesApi, type GenerateInput } from '../api/timetable.api'

export const {
  useList: useSchedules,
  useCreate: useCreateSchedule,
  useUpdate: useUpdateSchedule,
  useRemove: useRemoveSchedule,
} = createResourceHooks(schedulesApi, scheduleKeys, { alsoInvalidate: [periodKeys.all] })

export function useScheduleOptions(campus?: Id | null) {
  const params = { ...PICKER_PARAMS, is_active: true, campus: campus ?? undefined }
  return useQuery({ queryKey: scheduleKeys.list(params), queryFn: () => schedulesApi.list(params), select: (p) => p.results, staleTime: 5 * 60_000 })
}

/** A schedule's current periods (ended ones, from before a retime, are left out by the API). */
export function useSchedulePeriods(schedule: Id | null | undefined) {
  const params = { ...PICKER_PARAMS, schedule: schedule ?? undefined }
  return useQuery({ queryKey: periodKeys.list(params), queryFn: () => periodsApi.list(params), select: (p) => p.results, enabled: schedule != null })
}

export const { useCreate: useCreatePeriod, useUpdate: useUpdatePeriod, useRemove: useRemovePeriod } = createResourceHooks(periodsApi, periodKeys, {
  alsoInvalidate: [entryKeys.all],
})

export function useRetime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: Id; effective_from: string; periods: Array<{ period: Id; start_time: string; end_time: string }> }) => schedulesApi.retime(id, input),
    meta: { form: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: periodKeys.all })
      void qc.invalidateQueries({ queryKey: entryKeys.all })
    },
  })
}

/** Weekly lessons for one class, teacher or room (from today on). */
export function useWeek(params: ListParams, enabled: boolean) {
  const p = { ...PICKER_PARAMS, ...params }
  return useQuery({ queryKey: entryKeys.list(p), queryFn: () => entriesApi.list(p), select: (r) => r.results, enabled })
}

export function useDay(params: ListParams & { date: string }, enabled = true) {
  return useQuery({ queryKey: [...entryKeys.all, 'day', params], queryFn: () => entriesApi.day(params), enabled })
}

export const { useCreate: useCreateEntry, useUpdate: useUpdateEntry, useRemove: useRemoveEntry } = createResourceHooks(entriesApi, entryKeys, {
  alsoInvalidate: [changeKeys.all],
})

export function useGenerate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GenerateInput) => entriesApi.generate(input),
    meta: { form: true },
    onSuccess: (r) => {
      if (!r.dry_run) void qc.invalidateQueries({ queryKey: entryKeys.all })
    },
  })
}

export function useHandOver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: entriesApi.handOver,
    meta: { form: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: entryKeys.all })
      void qc.invalidateQueries({ queryKey: teachingKeys.all })
    },
  })
}

export const {
  useList: useLessonChanges,
  useCreate: useCreateLessonChange,
  useUpdate: useUpdateLessonChange,
  useRemove: useRemoveLessonChange,
} = createResourceHooks(changesApi, changeKeys, { alsoInvalidate: [entryKeys.all] })
