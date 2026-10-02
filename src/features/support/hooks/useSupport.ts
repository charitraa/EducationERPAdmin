import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id } from '@/shared/types/api'
import { supportApi, ticketKeys, type Ticket } from '../api/support.api'

export const { useList: useTickets, useOne: useTicket, useCreate: useRaiseTicket } = createResourceHooks(supportApi, ticketKeys)

const commentsKey = (id: Id) => [...ticketKeys.detail(id), 'comments']

export function useTicketComments(id: Id) {
  return useQuery({ queryKey: commentsKey(id), queryFn: () => supportApi.comments(id) })
}

export function useAddComment(id: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => supportApi.addComment(id, body),
    meta: { form: true },
    onSuccess: () => void qc.invalidateQueries({ queryKey: commentsKey(id) }),
  })
}

/** Assign, resolve and close all return the ticket. Errors are shown by the dialog that ran them. */
function useTicketAction<TVars>(run: (vars: TVars) => Promise<Ticket>, meta: Record<string, unknown> = { silent: true }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: run,
    meta,
    onSuccess: (ticket) => {
      qc.setQueryData(ticketKeys.detail(ticket.id), ticket)
      void qc.invalidateQueries({ queryKey: ticketKeys.lists() })
    },
  })
}

export const useAssignTicket = () => useTicketAction(({ id, user }: { id: Id; user: Id }) => supportApi.assign(id, user), { form: true })
export const useResolveTicket = () => useTicketAction((id: Id) => supportApi.resolve(id))
export const useCloseTicket = () => useTicketAction((id: Id) => supportApi.close(id))
