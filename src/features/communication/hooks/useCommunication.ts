import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id, ListParams } from '@/shared/types/api'
import { appointmentKeys, appointmentsApi, slotKeys, slotsApi, threadKeys, threadsApi, type Appointment, type StartThreadInput } from '../api/communication.api'

/** New messages arrive without a page reload; this is how often to look. */
const POLL_MS = 15_000

export function useThreads(params: ListParams) {
  return useQuery({ queryKey: threadKeys.list(params), queryFn: () => threadsApi.list(params), placeholderData: keepPreviousData, refetchInterval: POLL_MS })
}

export function useThread(id: Id | null) {
  return useQuery({ queryKey: threadKeys.detail(id ?? 0), queryFn: () => threadsApi.get(id!), enabled: id != null })
}

const messagesKey = (id: Id) => [...threadKeys.detail(id), 'messages']

export function useMessages(id: Id | null) {
  return useQuery({ queryKey: messagesKey(id ?? 0), queryFn: () => threadsApi.messages(id!), enabled: id != null, refetchInterval: POLL_MS })
}

export function useSendMessage(id: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => threadsApi.send(id, body),
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messagesKey(id) })
      // Sending re-opens a closed thread and moves it to the top.
      void qc.invalidateQueries({ queryKey: threadKeys.all })
    },
  })
}

export function useStartThread() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: StartThreadInput) => threadsApi.start(input), meta: { form: true }, onSuccess: () => void qc.invalidateQueries({ queryKey: threadKeys.all }) })
}

export function useCloseThread() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: Id) => threadsApi.close(id), meta: { silent: true }, onSuccess: () => void qc.invalidateQueries({ queryKey: threadKeys.all }) })
}

export const { useList: useSlots, useCreate: usePublishSlot, useUpdate: useUpdateSlot, useRemove: useRemoveSlot } = createResourceHooks(slotsApi, slotKeys, {
  alsoInvalidate: [appointmentKeys.all],
})

export function useCancelSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => slotsApi.cancel(id),
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: slotKeys.all })
      void qc.invalidateQueries({ queryKey: appointmentKeys.all })
    },
  })
}

export const { useList: useAppointments, useCreate: useBookAppointment } = createResourceHooks(appointmentsApi, appointmentKeys, { alsoInvalidate: [slotKeys.all] })

function useAppointmentAction<TVars>(run: (vars: TVars) => Promise<Appointment>, meta: Record<string, unknown> = { silent: true }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: run,
    meta,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: appointmentKeys.all })
      void qc.invalidateQueries({ queryKey: slotKeys.all })
    },
  })
}

export const useApproveAppointment = () => useAppointmentAction((id: Id) => appointmentsApi.approve(id))
export const useCompleteAppointment = () => useAppointmentAction((id: Id) => appointmentsApi.complete(id))
export const useCancelAppointment = () => useAppointmentAction(({ id, reason }: { id: Id; reason: string }) => appointmentsApi.cancel(id, reason), { form: true })
