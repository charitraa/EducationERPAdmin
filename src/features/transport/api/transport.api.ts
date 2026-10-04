import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Vehicle = Schema<'Vehicle'>
export type VehicleInput = Schema<'VehicleRequest'>
export type VehicleDocument = Schema<'VehicleDocument'>
export type Driver = Schema<'Driver'>
export type DriverInput = Schema<'DriverRequest'>
export type Route = Schema<'Route'>
export type RouteInput = Schema<'RouteRequest'>
export type Stop = Schema<'Stop'>
export type StopInput = Schema<'StopRequest'>
export type Rider = Schema<'Assignment'>
export type TripRow = Schema<'TripList'>
export type TripRecord = Schema<'TripRecord'>
export type VehicleMaintenance = Schema<'VehicleMaintenance'>
export type FuelLog = Schema<'FuelLog'>
export type BoardingStatus = Schema<'BoardingStatusEnum'>

/** The roster is typed loosely in the OpenAPI; this is what the serializer returns. */
export interface RosterRow {
  assignment: Id
  rider_name: string
  student: Id | null
  staff: Id | null
  stop: Id
  stop_name: string
  status: BoardingStatus | null
  at: string | null
}
export type Trip = Omit<Schema<'Trip'>, 'roster'> & { roster: RosterRow[] }

/** `GET /transport/trips/mine/`: routes the signed-in staff member crews, with the day's trips. */
export interface MyRoutes {
  date: string
  routes: Array<{ route: Id; name: string; vehicle: string | null; pickup_trip: Id | null; drop_trip: Id | null }>
}

const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)

export const vehiclesApi = createResourceApi<Vehicle, VehicleInput>('/transport/vehicles/')
export const vehicleKeys = createQueryKeys('transport-vehicles')
export const documentsApi = createResourceApi<VehicleDocument, Schema<'VehicleDocumentRequest'>>('/transport/vehicle-documents/')
export const documentKeys = createQueryKeys('transport-documents')
export const driversApi = createResourceApi<Driver, DriverInput>('/transport/drivers/')
export const driverKeys = createQueryKeys('transport-drivers')
export const routesApi = createResourceApi<Route, RouteInput>('/transport/routes/')
export const routeKeys = createQueryKeys('transport-routes')
export const stopsApi = createResourceApi<Stop, StopInput>('/transport/stops/')
export const stopKeys = createQueryKeys('transport-stops')
export const maintenanceApi = createResourceApi<VehicleMaintenance, Schema<'VehicleMaintenanceRequest'>>('/transport/maintenance/')
export const maintenanceKeys = createQueryKeys('transport-maintenance')
export const fuelApi = createResourceApi<FuelLog, Schema<'FuelLogRequest'>>('/transport/fuel-logs/')
export const fuelKeys = createQueryKeys('transport-fuel')

export const ridersApi = {
  list: createResourceApi<Rider>('/transport/assignments/').list,
  assign: (input: { route: Id; stop: Id; student?: Id; staff?: Id; direction: Rider['direction']; start_date?: string }) => post<Rider>('/transport/assignments/', input),
  /** Stops riding after `on` (the last day ridden). */
  end: (id: Id, input: { on?: string; reason?: string }) => post<Rider>(`/transport/assignments/${id}/end/`, input),
  /** One invoice per student rider for the term, at their stop's (or route's) fee; safe to rerun. */
  generateInvoices: (input: { term: Id; route?: Id; due_date?: string }) =>
    post<{ created: number; skipped: number; not_enrolled: number; routes_without_fee_category: string[] }>('/transport/assignments/generate-invoices/', input),
}
export const riderKeys = createQueryKeys('transport-riders')

export const tripsApi = {
  list: createResourceApi<TripRow>('/transport/trips/').list,
  get: (id: Id) => apiClient.get<Trip>(`/transport/trips/${id}/`).then((r) => r.data),
  mine: (date?: string) => apiClient.get<MyRoutes>('/transport/trips/mine/', { params: { date } }).then((r) => r.data),
  /** Returns the existing trip (200) if it's already open. */
  open: (input: { route: Id; direction: 'pickup' | 'drop'; date?: string }) => post<Trip>('/transport/trips/', input),
  mark: (id: Id, entries: Array<{ assignment: Id; status: BoardingStatus; at?: string | null; note?: string }>) => post<Trip>(`/transport/trips/${id}/mark/`, { entries }),
  complete: (id: Id) => post<Trip>(`/transport/trips/${id}/complete/`),
}
export const tripKeys = createQueryKeys('transport-trips')
