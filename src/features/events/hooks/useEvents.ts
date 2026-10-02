import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import {
  awardKeys,
  awardRuleKeys,
  awardRulesApi,
  awardsApi,
  categoriesApi,
  categoryKeys,
  eventKeys,
  eventsApi,
  pointKeys,
  pointRuleKeys,
  pointRulesApi,
  pointsApi,
  registrationsApi,
  studentAwardKeys,
  studentAwardsApi,
  type Event,
  type ParticipationRole,
} from '../api/events.api'

export const { useList: useEvents, useOne: useEvent, useCreate: useCreateEvent, useUpdate: useUpdateEvent, useRemove: useRemoveEvent } = createResourceHooks(
  eventsApi,
  eventKeys,
)

export const {
  useList: useCategories,
  useCreate: useCreateCategory,
  useUpdate: useUpdateCategory,
  useRemove: useRemoveCategory,
} = createResourceHooks(categoriesApi, categoryKeys, { alsoInvalidate: [eventKeys.all] })

export function useCategoryOptions() {
  const params = { ...PICKER_PARAMS, ordering: 'name' }
  return useQuery({ queryKey: categoryKeys.list(params), queryFn: () => categoriesApi.list(params), select: (p) => p.results, staleTime: 5 * 60_000 })
}

export const { useList: usePointRules, useCreate: useCreatePointRule, useUpdate: useUpdatePointRule, useRemove: useRemovePointRule } = createResourceHooks(
  pointRulesApi,
  pointRuleKeys,
)

export const { useList: useAwards, useCreate: useCreateAward, useUpdate: useUpdateAward, useRemove: useRemoveAward } = createResourceHooks(awardsApi, awardKeys, {
  alsoInvalidate: [awardRuleKeys.all, studentAwardKeys.all],
})

export function useAwardOptions() {
  const params = { ...PICKER_PARAMS }
  return useQuery({ queryKey: awardKeys.list(params), queryFn: () => awardsApi.list(params), select: (p) => p.results, staleTime: 5 * 60_000 })
}

export const { useList: useAwardRules, useCreate: useCreateAwardRule, useUpdate: useUpdateAwardRule, useRemove: useRemoveAwardRule } = createResourceHooks(
  awardRulesApi,
  awardRuleKeys,
)

export const { useList: useStudentAwards, useCreate: useGrantAward } = createResourceHooks(studentAwardsApi, studentAwardKeys)

export function useEndAward() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: Id) => studentAwardsApi.end(id), meta: { silent: true }, onSuccess: () => void qc.invalidateQueries({ queryKey: studentAwardKeys.all }) })
}

export function useLeaderboard() {
  return useQuery({ queryKey: [...pointKeys.all, 'leaderboard'], queryFn: pointsApi.leaderboard })
}

export function useAwardPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: pointsApi.award,
    meta: { form: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pointKeys.all })
      void qc.invalidateQueries({ queryKey: studentAwardKeys.all })
    },
  })
}

// ---- One event: workflow, roster, attendance, participation ----

const sub = (id: Id, what: string) => [...eventKeys.detail(id), what]

export function useRoster(id: Id) {
  return useQuery({ queryKey: sub(id, 'roster'), queryFn: () => eventsApi.roster(id) })
}
export function useEventRegistrations(id: Id) {
  return useQuery({ queryKey: sub(id, 'registrations'), queryFn: () => eventsApi.registrations(id) })
}
export function useEventParticipation(id: Id) {
  return useQuery({ queryKey: sub(id, 'participation'), queryFn: () => eventsApi.participation(id) })
}

/** Anything done to an event refreshes it, its roster, points and awards (attendance and roles earn both). */
function useEventMutation<TVars>(run: (vars: TVars) => Promise<unknown>, meta: Record<string, unknown> = { silent: true }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: run,
    meta,
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'registration_mode' in data) qc.setQueryData(eventKeys.detail((data as Event).id), data)
      void qc.invalidateQueries({ queryKey: eventKeys.all })
      void qc.invalidateQueries({ queryKey: pointKeys.all })
      void qc.invalidateQueries({ queryKey: studentAwardKeys.all })
    },
  })
}

export const usePublishEvent = () => useEventMutation((id: Id) => eventsApi.publish(id))
export const useCancelEvent = () => useEventMutation(({ id, reason }: { id: Id; reason: string }) => eventsApi.cancel(id, reason), { form: true })
export const useRegisterStudent = () => useEventMutation((input: { event: Id; student: Id; note: string }) => registrationsApi.create(input), { form: true })
export const useDecideRegistration = () =>
  useEventMutation(({ id, approve, note }: { id: Id; approve: boolean; note: string }) => registrationsApi.decide(id, approve, note), { form: true })
export const useMarkAttendance = () =>
  useEventMutation(({ id, entries }: { id: Id; entries: Array<{ student: Id; status: 'present' | 'absent' }> }) => eventsApi.markAttendance(id, entries))
export const useRecordParticipation = () =>
  useEventMutation(
    ({ id, ...input }: { id: Id; student: Id; role: ParticipationRole; position: number | null; remark: string }) => eventsApi.recordParticipation(id, input),
    { form: true },
  )
