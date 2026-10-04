import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, ListParams } from '@/shared/types/api'
import { allocationKeys, allocationsApi, bedKeys, bedsApi, buildingKeys, buildingsApi, complaintKeys, complaintsApi, floorKeys, floorsApi, roomKeys, roomsApi, roomTypeKeys, roomTypesApi } from '../api/hostel.api'

/** An allocation changes who's in a bed, and so every room's and bed's occupancy. */
const OCCUPANCY = [allocationKeys.all, bedKeys.all, roomKeys.all]

function useOccupancy<V, R>(fn: (v: V) => Promise<R>, form = true) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: form ? { form: true } : { silent: true },
    onSuccess: () => {
      for (const key of OCCUPANCY) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export const { useList: useBuildings, useCreate: useCreateBuilding, useUpdate: useUpdateBuilding, useRemove: useRemoveBuilding } = createResourceHooks(buildingsApi, buildingKeys, { alsoInvalidate: [roomKeys.all] })
export const { useList: useFloors, useCreate: useCreateFloor, useUpdate: useUpdateFloor, useRemove: useRemoveFloor } = createResourceHooks(floorsApi, floorKeys)
export const { useList: useRoomTypes, useCreate: useCreateRoomType, useUpdate: useUpdateRoomType, useRemove: useRemoveRoomType } = createResourceHooks(roomTypesApi, roomTypeKeys)
export const { useList: useRooms, useCreate: useCreateRoom, useUpdate: useUpdateRoom, useRemove: useRemoveRoom } = createResourceHooks(roomsApi, roomKeys, { alsoInvalidate: [bedKeys.all] })
export const { useList: useBeds, useCreate: useCreateBed, useUpdate: useUpdateBed, useRemove: useRemoveBed } = createResourceHooks(bedsApi, bedKeys, { alsoInvalidate: [roomKeys.all] })

export function useBuildingOptions() {
  const q = useBuildings({ ...PICKER_PARAMS, is_active: true })
  return (q.data?.results ?? []).map((b) => ({ value: String(b.id), label: b.name }))
}

export function useAllocations(params: ListParams) {
  return useQuery({ queryKey: allocationKeys.list(params), queryFn: () => allocationsApi.list(params), placeholderData: keepPreviousData })
}
export const useAllocate = () => useOccupancy(allocationsApi.allocate)
export const useCheckIn = () => useOccupancy(allocationsApi.checkIn, false)
export const useCheckOut = () => useOccupancy(({ id, ...input }: { id: Id; on?: string; note?: string }) => allocationsApi.checkOut(id, input))
export const useCancelAllocation = () => useOccupancy(({ id, reason }: { id: Id; reason: string }) => allocationsApi.cancel(id, reason))
export const useMoveAllocation = () => useOccupancy(({ id, ...input }: { id: Id; bed: Id; on?: string; note?: string }) => allocationsApi.move(id, input))
export function useHostelInvoices() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: allocationsApi.generateInvoices, meta: { form: true }, onSuccess: () => void qc.invalidateQueries({ queryKey: ['invoices'] }) })
}

export function useComplaints(params: ListParams) {
  return useQuery({ queryKey: complaintKeys.list(params), queryFn: () => complaintsApi.list(params), placeholderData: keepPreviousData })
}
function useComplaintAction<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, meta: { form: true }, onSuccess: () => void qc.invalidateQueries({ queryKey: complaintKeys.all }) })
}
export const useRecordComplaint = () => useComplaintAction(complaintsApi.create)
export const useAssignComplaint = () => useComplaintAction(({ id, staff }: { id: Id; staff: Id }) => complaintsApi.assign(id, staff))
export const useResolveComplaint = () => useComplaintAction(({ id, resolution }: { id: Id; resolution: string }) => complaintsApi.resolve(id, resolution))
export const useRejectComplaint = () => useComplaintAction(({ id, reason }: { id: Id; reason: string }) => complaintsApi.reject(id, reason))
