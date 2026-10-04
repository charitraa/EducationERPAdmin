import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id, ListParams } from '@/shared/types/api'
import { candidaciesApi, candidacyKeys, interviewKeys, interviewsApi, offerKeys, offersApi, postingKeys, postingsApi, vacanciesApi, vacancyKeys, type OfferInput, type ScheduleInput } from '../api/careers.api'

export const { useList: useVacancies, useOne: useVacancy, useCreate: useCreateVacancy, useUpdate: useUpdateVacancy, useRemove: useRemoveVacancy } = createResourceHooks(vacanciesApi, vacancyKeys)
export const { useList: usePostings, useCreate: useCreatePosting, useUpdate: useUpdatePosting } = createResourceHooks(postingsApi, postingKeys)

function useAction<V, R>(fn: (v: V) => Promise<R>, keys: QueryKey[], form = true) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: form ? { form: true } : { silent: true },
    onSuccess: () => {
      for (const key of keys) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

// Hiring moves a candidate's application along, so its screens refresh too.
const HIRING: QueryKey[] = [vacancyKeys.all, candidacyKeys.all, interviewKeys.all, offerKeys.all, ['applications']]

export const useOpenVacancy = () => useAction(vacanciesApi.open, HIRING, false)
export const useCloseVacancy = () => useAction(vacanciesApi.close, HIRING, false)

export function useCandidacies(params: ListParams, enabled = true) {
  return useQuery({ queryKey: candidacyKeys.list(params), queryFn: () => candidaciesApi.list(params), placeholderData: keepPreviousData, enabled })
}
export function useCandidacy(id: Id | null) {
  return useQuery({ queryKey: candidacyKeys.detail(id ?? 0), queryFn: () => candidaciesApi.get(id!), enabled: id != null })
}
export const useScreen = () => useAction(({ id, ...input }: { id: Id; score: number | null; note: string }) => candidaciesApi.screen(id, input), HIRING)

export function useInterviews(params: ListParams, enabled = true) {
  return useQuery({ queryKey: interviewKeys.list(params), queryFn: () => interviewsApi.list(params), placeholderData: keepPreviousData, enabled })
}
export const useScheduleInterview = () => useAction((input: ScheduleInput) => interviewsApi.schedule(input), HIRING)
export const useRescheduleInterview = () => useAction(({ id, ...input }: { id: Id; scheduled_at: string; location?: string }) => interviewsApi.reschedule(id, input), HIRING)
export const useCancelInterview = () => useAction(({ id, reason }: { id: Id; reason: string }) => interviewsApi.cancel(id, reason), HIRING)
export const useInterviewOutcome = () =>
  useAction(({ id, ...input }: { id: Id; status: 'completed' | 'no_show'; score?: string | null; recommendation?: string; feedback?: string }) => interviewsApi.outcome(id, input), HIRING)

export function useOffers(params: ListParams, enabled = true) {
  return useQuery({ queryKey: offerKeys.list(params), queryFn: () => offersApi.list(params), placeholderData: keepPreviousData, enabled })
}
export const useMakeOffer = () => useAction((input: OfferInput) => offersApi.make(input), HIRING)
export const useWithdrawOffer = () => useAction(({ id, reason }: { id: Id; reason: string }) => offersApi.withdraw(id, reason), HIRING)

export const useReviewPosting = () => useAction(({ id, ...input }: { id: Id; approve: boolean; note?: string }) => postingsApi.review(id, input), [postingKeys.all])
export const useClosePosting = () => useAction(postingsApi.close, [postingKeys.all], false)
