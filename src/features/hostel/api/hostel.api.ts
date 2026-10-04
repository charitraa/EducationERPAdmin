import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Building = Schema<'Building'>
export type BuildingInput = Schema<'BuildingRequest'>
export type Floor = Schema<'Floor'>
export type RoomType = Schema<'RoomType'>
export type RoomTypeInput = Schema<'RoomTypeRequest'>
export type HostelRoom = Schema<'HostelRoom'>
export type HostelRoomInput = Schema<'HostelRoomRequest'>
/** `occupant` is typed loosely in the OpenAPI; this is what the serializer returns. */
export type Bed = Omit<Schema<'Bed'>, 'occupant'> & {
  occupant: { allocation: Id; status: 'reserved' | 'checked_in'; name: string; student: Id | null; staff: Id | null } | null
}
export type Allocation = Schema<'Allocation'>
export type Complaint = Schema<'Complaint'>

const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)

export const buildingsApi = createResourceApi<Building, BuildingInput>('/hostel/buildings/')
export const buildingKeys = createQueryKeys('hostel-buildings')
export const floorsApi = createResourceApi<Floor, Schema<'FloorRequest'>>('/hostel/floors/')
export const floorKeys = createQueryKeys('hostel-floors')
export const roomTypesApi = createResourceApi<RoomType, RoomTypeInput>('/hostel/room-types/')
export const roomTypeKeys = createQueryKeys('hostel-room-types')
export const roomsApi = createResourceApi<HostelRoom, HostelRoomInput>('/hostel/rooms/')
export const roomKeys = createQueryKeys('hostel-rooms')
export const bedsApi = createResourceApi<Bed, Schema<'BedRequest'>>('/hostel/beds/')
export const bedKeys = createQueryKeys('hostel-beds')

export const allocationsApi = {
  list: createResourceApi<Allocation>('/hostel/allocations/').list,
  /** Reserves the bed; check in on or after the start date. */
  allocate: (input: { bed: Id; student?: Id; staff?: Id; start_date?: string; note?: string }) => post<Allocation>('/hostel/allocations/', input),
  checkIn: (id: Id) => post<Allocation>(`/hostel/allocations/${id}/check-in/`),
  checkOut: (id: Id, input: { on?: string; note?: string }) => post<Allocation>(`/hostel/allocations/${id}/check-out/`, input),
  cancel: (id: Id, reason: string) => post<Allocation>(`/hostel/allocations/${id}/cancel/`, { reason }),
  /** Ends this stay and starts a new one in the other bed. */
  move: (id: Id, input: { bed: Id; on?: string; note?: string }) => post<Allocation>(`/hostel/allocations/${id}/move/`, input),
  /** One invoice per resident student for the term's hostel fee; safe to rerun. */
  generateInvoices: (input: { term: Id; building?: Id; due_date?: string }) =>
    post<{ created: number; skipped: number; not_enrolled: number; room_types_without_fee_category: string[] }>('/hostel/allocations/generate-invoices/', input),
}
export const allocationKeys = createQueryKeys('hostel-allocations')

export const complaintsApi = {
  list: createResourceApi<Complaint>('/hostel/complaints/').list,
  /** The office records one on a resident's behalf. */
  create: (input: { building: Id; room?: Id; category: string; title: string; description?: string }) => post<Complaint>('/hostel/complaints/', input),
  assign: (id: Id, staff: Id) => post<Complaint>(`/hostel/complaints/${id}/assign/`, { staff }),
  resolve: (id: Id, resolution: string) => post<Complaint>(`/hostel/complaints/${id}/resolve/`, { resolution }),
  reject: (id: Id, reason: string) => post<Complaint>(`/hostel/complaints/${id}/reject/`, { reason }),
}
export const complaintKeys = createQueryKeys('hostel-complaints')
