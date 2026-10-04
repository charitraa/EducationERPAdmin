import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type ItemCategory = Schema<'ItemCategory'>
export type Supplier = Schema<'Supplier'>
export type SupplierInput = Schema<'SupplierRequest'>
export type Item = Schema<'Item'>
export type ItemInput = Schema<'ItemRequest'>
export type Store = Schema<'Store'>
export type StoreInput = Schema<'StoreRequest'>
export type StockLevel = Schema<'StockLevel'>
export type StockMovement = Schema<'StockMovement'>
export type StockTransfer = Schema<'StockTransfer'>
export type StockIssue = Schema<'StockIssue'>
export type PurchaseOrder = Schema<'PurchaseOrder'>
export type Asset = Schema<'Asset'>
export type AssetInput = Schema<'AssetRequest'>
/** `asset_name` was added to the backend after openapi.yaml was last generated. */
export type AssetAssignment = Schema<'AssetAssignment'> & { asset_name: string }
export type Maintenance = Schema<'Maintenance'>
export type Disposal = Schema<'Disposal'>
export type AssetCondition = Schema<'ConditionEnum'>

const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)

export const itemCategoriesApi = createResourceApi<ItemCategory, Schema<'ItemCategoryRequest'>>('/inventory/categories/')
export const itemCategoryKeys = createQueryKeys('inventory-categories')
export const suppliersApi = createResourceApi<Supplier, SupplierInput>('/inventory/suppliers/')
export const supplierKeys = createQueryKeys('inventory-suppliers')
export const itemsApi = createResourceApi<Item, ItemInput>('/inventory/items/')
export const itemKeys = createQueryKeys('inventory-items')
export const storesApi = createResourceApi<Store, StoreInput>('/inventory/stores/')
export const storeKeys = createQueryKeys('inventory-stores')

export const stockApi = {
  levels: createResourceApi<StockLevel>('/inventory/stock-levels/').list,
  movements: createResourceApi<StockMovement>('/inventory/stock-movements/').list,
  /** A stock-take correction, damage or write-off: delta is signed and must not be zero. */
  adjust: (input: { item: Id; store: Id; delta: number; reason: string }) => post<StockMovement>('/inventory/stock-levels/adjust/', input),
  transfers: createResourceApi<StockTransfer>('/inventory/stock-transfers/').list,
  transfer: (input: { item: Id; from_store: Id; to_store: Id; quantity: number; note?: string }) => post<StockTransfer>('/inventory/stock-transfers/', input),
  issues: createResourceApi<StockIssue>('/inventory/stock-issues/').list,
  /** Give consumables to a staff member or a department. */
  issue: (input: { store: Id; staff?: Id; department?: Id; purpose?: string; issued_on?: string; lines: Array<{ item: Id; quantity: number }> }) => post<StockIssue>('/inventory/stock-issues/', input),
}
export const stockKeys = createQueryKeys('inventory-stock')

export const purchasesApi = {
  list: createResourceApi<PurchaseOrder>('/inventory/purchase-orders/').list,
  get: (id: Id) => apiClient.get<PurchaseOrder>(`/inventory/purchase-orders/${id}/`).then((r) => r.data),
  create: (input: { supplier: Id; store: Id; expected_on?: string | null; note?: string; lines: Array<{ item: Id; quantity: number; unit_price: string }> }) =>
    post<PurchaseOrder>('/inventory/purchase-orders/', input),
  place: (id: Id) => post<PurchaseOrder>(`/inventory/purchase-orders/${id}/place/`),
  cancel: (id: Id, reason: string) => post<PurchaseOrder>(`/inventory/purchase-orders/${id}/cancel/`, { reason }),
  /** A delivery, whole or part: quantities per order line. */
  receive: (id: Id, lines: Array<{ line: Id; quantity: number }>) => post<PurchaseOrder>(`/inventory/purchase-orders/${id}/receive/`, { lines }),
}
export const purchaseKeys = createQueryKeys('inventory-purchases')

const assetsBase = createResourceApi<Asset, AssetInput>('/inventory/assets/')
export const assetsApi = {
  list: assetsBase.list,
  get: assetsBase.get,
  /** Registers an asset outside a purchase (a donation, the opening register). */
  create: assetsBase.create,
  update: (id: Id, input: Partial<Schema<'AssetUpdate'>>) => apiClient.patch<Asset>(assetsBase.url(id), input).then((r) => r.data),
  assign: (id: Id, input: { staff?: Id; student?: Id; room?: Id; department?: Id; assigned_on?: string; note?: string }) => post<AssetAssignment>(`${assetsBase.url(id)}assign/`, input),
  return: (id: Id, input: { condition?: AssetCondition | ''; returned_on?: string; note?: string }) => post<AssetAssignment>(`${assetsBase.url(id)}return/`, input),
  move: (id: Id, input: { store: Id; note?: string }) => post<Asset>(`${assetsBase.url(id)}move/`, input),
  dispose: (id: Id, input: { method: Disposal['method']; reason: string; disposed_on?: string; proceeds?: string | null }) => post<Disposal>(`${assetsBase.url(id)}dispose/`, input),
}
export const assetKeys = createQueryKeys('inventory-assets')

export const assignmentsApi = { list: createResourceApi<AssetAssignment>('/inventory/asset-assignments/').list }
export const assignmentKeys = createQueryKeys('inventory-assignments')

export const maintenanceApi = {
  list: createResourceApi<Maintenance>('/inventory/maintenance/').list,
  schedule: (input: { asset: Id; kind: Maintenance['kind']; description: string; supplier?: Id | null; scheduled_on?: string | null }) => post<Maintenance>('/inventory/maintenance/', input),
  start: (id: Id) => post<Maintenance>(`/inventory/maintenance/${id}/start/`),
  complete: (id: Id, input: { cost?: string | null; outcome?: string; condition?: AssetCondition | ''; completed_on?: string }) => post<Maintenance>(`/inventory/maintenance/${id}/complete/`, input),
  cancel: (id: Id, reason: string) => post<Maintenance>(`/inventory/maintenance/${id}/cancel/`, { reason }),
}
export const maintenanceKeys = createQueryKeys('inventory-maintenance')

export const disposalsApi = { list: createResourceApi<Disposal>('/inventory/disposals/').list }
export const disposalKeys = createQueryKeys('inventory-disposals')
