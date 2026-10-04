import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id, ListParams } from '@/shared/types/api'
import {
  achievementKeys,
  achievementsApi,
  campaignKeys,
  campaignsApi,
  donationKeys,
  donationsApi,
  employmentKeys,
  employmentsApi,
  eventKeys,
  eventsApi,
  mentorshipKeys,
  mentorshipsApi,
  profileKeys,
  profilesApi,
  studyKeys,
  studiesApi,
  type DonationInput,
} from '../api/alumni.api'

export const { useList: useAlumni, useOne: useAlumnus, useCreate: useCreateAlumnus, useUpdate: useUpdateAlumnus, useRemove: useRemoveAlumnus } = createResourceHooks(profilesApi, profileKeys)
// A current job shows on the profile, so profile caches refresh with it.
export const { useList: useEmployments, useCreate: useCreateEmployment, useUpdate: useUpdateEmployment, useRemove: useRemoveEmployment } = createResourceHooks(employmentsApi, employmentKeys, { alsoInvalidate: [profileKeys.all] })
export const { useList: useStudies, useCreate: useCreateStudy, useUpdate: useUpdateStudy, useRemove: useRemoveStudy } = createResourceHooks(studiesApi, studyKeys)
export const { useList: useAchievements, useCreate: useCreateAchievement, useUpdate: useUpdateAchievement, useRemove: useRemoveAchievement } = createResourceHooks(achievementsApi, achievementKeys)
export const { useList: useAlumniEvents, useCreate: useCreateAlumniEvent, useUpdate: useUpdateAlumniEvent, useRemove: useRemoveAlumniEvent } = createResourceHooks(eventsApi, eventKeys)
export const { useList: useCampaigns, useCreate: useCreateCampaign, useUpdate: useUpdateCampaign, useRemove: useRemoveCampaign } = createResourceHooks(campaignsApi, campaignKeys)

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

export const useGraduate = () => useAction(profilesApi.graduate, [profileKeys.all, ['students']])
export const usePublishAlumniEvent = () => useAction(eventsApi.publish, [eventKeys.all], false)
export const useCancelAlumniEvent = () => useAction(({ id, reason }: { id: Id; reason: string }) => eventsApi.cancel(id, reason), [eventKeys.all])
export function useRsvps(id: Id | null) {
  return useQuery({ queryKey: [...eventKeys.detail(id ?? 0), 'rsvps'], queryFn: () => eventsApi.rsvps(id!), enabled: id != null })
}

export function useMentorships(params: ListParams) {
  return useQuery({ queryKey: mentorshipKeys.list(params), queryFn: () => mentorshipsApi.list(params), placeholderData: keepPreviousData })
}

export function useDonations(params: ListParams, enabled = true) {
  return useQuery({ queryKey: donationKeys.list(params), queryFn: () => donationsApi.list(params), placeholderData: keepPreviousData, enabled })
}
// A gift moves its campaign's raised amount.
export const useRecordDonation = () => useAction((input: DonationInput) => donationsApi.record(input), [donationKeys.all, campaignKeys.all])
export const useRefundDonation = () =>
  useAction(({ id, ...input }: { id: Id; amount: string; reason: string; method?: DonationInput['method']; reference?: string }) => donationsApi.refund(id, input), [donationKeys.all, campaignKeys.all])
