import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, ListParams, Paginated, Schema } from '@/shared/types/api'

export type Thread = Schema<'MessageThread'>
export type Message = Schema<'Message'>
export type StartThreadInput = Schema<'StartThreadRequest'>
export type Slot = Schema<'AppointmentSlot'>
export type SlotInput = Schema<'AppointmentSlotRequest'>
export type Appointment = Schema<'Appointment'>
export type BookInput = Schema<'BookAppointmentRequest'>

const threads = '/communication/threads/'
const thread = (id: Id) => `${threads}${id}/`

export const threadsApi = {
  list: (params: ListParams = {}) => apiClient.get<Paginated<Thread>>(threads, { params }).then((r) => r.data),
  get: (id: Id) => apiClient.get<Thread>(thread(id)).then((r) => r.data),
  /** Staff only. Re-opens and returns the existing conversation with that person, if any. */
  start: (input: StartThreadInput) => apiClient.post<Thread>(threads, input).then((r) => r.data),
  /** Plain list, oldest first. */
  messages: (id: Id) => apiClient.get<Message[]>(`${thread(id)}messages/`).then((r) => r.data),
  send: (id: Id, body: string) => apiClient.post<Message>(`${thread(id)}messages/`, { body }).then((r) => r.data),
  close: (id: Id) => apiClient.post<Thread>(`${thread(id)}close/`).then((r) => r.data),
}
export const threadKeys = createQueryKeys('threads')

const slotsBase = createResourceApi<Slot, SlotInput>('/communication/appointment-slots/')
export const slotsApi = {
  ...slotsBase,
  cancel: (id: Id) => apiClient.post<Slot>(`${slotsBase.url(id)}cancel/`).then((r) => r.data),
}
export const slotKeys = createQueryKeys('appointment-slots')

const apptBase = createResourceApi<Appointment, BookInput>('/communication/appointments/')
export const appointmentsApi = {
  ...apptBase,
  approve: (id: Id) => apiClient.post<Appointment>(`${apptBase.url(id)}approve/`).then((r) => r.data),
  cancel: (id: Id, reason: string) => apiClient.post<Appointment>(`${apptBase.url(id)}cancel/`, { reason }).then((r) => r.data),
  complete: (id: Id) => apiClient.post<Appointment>(`${apptBase.url(id)}complete/`).then((r) => r.data),
}
export const appointmentKeys = createQueryKeys('appointments')
