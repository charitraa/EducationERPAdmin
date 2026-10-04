import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, ListParams } from '@/shared/types/api'
import {
  documentKeys,
  documentsApi,
  driverKeys,
  driversApi,
  fuelApi,
  fuelKeys,
  maintenanceApi,
  maintenanceKeys,
  riderKeys,
  ridersApi,
  routeKeys,
  routesApi,
  stopKeys,
  stopsApi,
  tripKeys,
  tripsApi,
  vehicleKeys,
  vehiclesApi,
  type BoardingStatus,
} from '../api/transport.api'

export const { useList: useVehicles, useCreate: useCreateVehicle, useUpdate: useUpdateVehicle, useRemove: useRemoveVehicle } = createResourceHooks(vehiclesApi, vehicleKeys)
export const { useList: useDocuments, useCreate: useCreateDocument, useUpdate: useUpdateDocument, useRemove: useRemoveDocument } = createResourceHooks(documentsApi, documentKeys)
export const { useList: useDrivers, useCreate: useCreateDriver, useUpdate: useUpdateDriver, useRemove: useRemoveDriver } = createResourceHooks(driversApi, driverKeys, { alsoInvalidate: [routeKeys.all] })
export const { useList: useRoutes, useOne: useRoute, useCreate: useCreateRoute, useUpdate: useUpdateRoute, useRemove: useRemoveRoute } = createResourceHooks(routesApi, routeKeys)
export const { useCreate: useCreateStop, useUpdate: useUpdateStop, useRemove: useRemoveStop } = createResourceHooks(stopsApi, stopKeys, { alsoInvalidate: [routeKeys.all] })
export const { useList: useVehicleMaintenance, useCreate: useCreateVehicleMaintenance, useRemove: useRemoveVehicleMaintenance } = createResourceHooks(maintenanceApi, maintenanceKeys)
export const { useList: useFuelLogs, useCreate: useCreateFuelLog, useRemove: useRemoveFuelLog } = createResourceHooks(fuelApi, fuelKeys)

/** Pickers for route forms: vehicles, drivers and assistants. */
export function useFleetOptions() {
  const vehicles = useVehicles({ ...PICKER_PARAMS, is_active: true })
  const crew = useDrivers({ ...PICKER_PARAMS, is_active: true })
  const all = crew.data?.results ?? []
  return {
    vehicles: (vehicles.data?.results ?? []).map((v) => ({ value: String(v.id), label: `${v.name} (${v.registration_number}, ${v.capacity} seats)` })),
    drivers: all.filter((d) => d.role === 'driver').map((d) => ({ value: String(d.id), label: d.name })),
    assistants: all.map((d) => ({ value: String(d.id), label: `${d.name}${d.role === 'driver' ? ' (driver)' : ''}` })),
  }
}

export function useRouteOptions() {
  const q = useRoutes({ ...PICKER_PARAMS, is_active: true })
  return { routes: q.data?.results ?? [], options: (q.data?.results ?? []).map((r) => ({ value: String(r.id), label: r.name })) }
}

const RIDING = [riderKeys.all, routeKeys.all, tripKeys.all]
function useRiding<V, R>(fn: (v: V) => Promise<R>, form = true) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: form ? { form: true } : { silent: true },
    onSuccess: () => {
      for (const key of RIDING) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export function useRiders(params: ListParams) {
  return useQuery({ queryKey: riderKeys.list(params), queryFn: () => ridersApi.list(params), placeholderData: keepPreviousData })
}
export const useAssignRider = () => useRiding(ridersApi.assign)
export const useEndRider = () => useRiding(({ id, ...input }: { id: Id; on?: string; reason?: string }) => ridersApi.end(id, input))
export function useTransportInvoices() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ridersApi.generateInvoices, meta: { form: true }, onSuccess: () => void qc.invalidateQueries({ queryKey: ['invoices'] }) })
}

export function useTrips(params: ListParams, enabled = true) {
  return useQuery({ queryKey: tripKeys.list(params), queryFn: () => tripsApi.list(params), placeholderData: keepPreviousData, enabled })
}
export function useTrip(id: Id | null) {
  return useQuery({ queryKey: tripKeys.detail(id ?? 0), queryFn: () => tripsApi.get(id!), enabled: id != null })
}
export function useMyRoutes(date: string) {
  return useQuery({ queryKey: [...tripKeys.all, 'mine', date], queryFn: () => tripsApi.mine(date) })
}
export const useOpenTrip = () => useRiding(tripsApi.open, false)
export function useMarkTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, entries }: { id: Id; entries: Array<{ assignment: Id; status: BoardingStatus }> }) => tripsApi.mark(id, entries),
    meta: { silent: true },
    onSuccess: (trip) => {
      qc.setQueryData(tripKeys.detail(trip.id), trip)
      void qc.invalidateQueries({ queryKey: tripKeys.lists() })
    },
  })
}
export const useCompleteTrip = () => useRiding(tripsApi.complete, false)
