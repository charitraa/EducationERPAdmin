import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Ticket = Schema<'SupportTicket'>
export type TicketInput = Schema<'SupportTicketRequest'>
export type TicketComment = Schema<'TicketComment'>

export const TICKET_STEPS = ['open', 'in_progress', 'resolved', 'closed'] as const

const base = createResourceApi<Ticket, TicketInput>('/support/tickets/')

export const supportApi = {
  ...base,
  assign: (id: Id, assignedTo: Id) => apiClient.post<Ticket>(`${base.url(id)}assign/`, { assigned_to: assignedTo }).then((r) => r.data),
  resolve: (id: Id) => apiClient.post<Ticket>(`${base.url(id)}resolve/`).then((r) => r.data),
  close: (id: Id) => apiClient.post<Ticket>(`${base.url(id)}close/`).then((r) => r.data),
  comments: (id: Id) => apiClient.get<TicketComment[]>(`${base.url(id)}comments/`).then((r) => r.data),
  addComment: (id: Id, body: string) => apiClient.post<TicketComment>(`${base.url(id)}comments/`, { body }).then((r) => r.data),
}

export const ticketKeys = createQueryKeys('support-tickets')
