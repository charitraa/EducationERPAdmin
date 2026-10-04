import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, ListParams } from '@/shared/types/api'
import {
  assetKeys,
  assetsApi,
  assignmentKeys,
  assignmentsApi,
  disposalKeys,
  disposalsApi,
  itemCategoriesApi,
  itemCategoryKeys,
  itemKeys,
  itemsApi,
  maintenanceApi,
  maintenanceKeys,
  purchaseKeys,
  purchasesApi,
  stockApi,
  stockKeys,
  storeKeys,
  storesApi,
  supplierKeys,
  suppliersApi,
} from '../api/inventory.api'

/** Stock and assets move together: a receipt makes stock or assets, an asset action changes its history. */
const MOVES = [stockKeys.all, itemKeys.all, purchaseKeys.all, assetKeys.all, assignmentKeys.all, maintenanceKeys.all, disposalKeys.all]

function useMove<V, R>(fn: (v: V) => Promise<R>, form = true) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: form ? { form: true } : { silent: true },
    onSuccess: () => {
      for (const key of MOVES) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

function listHook<T>(key: readonly unknown[], fn: (p: ListParams) => Promise<T>) {
  return (params: ListParams, enabled = true) => useQuery({ queryKey: [...key, 'list', params], queryFn: () => fn(params), placeholderData: keepPreviousData, enabled })
}

export const { useList: useItemCategories, useCreate: useCreateItemCategory, useUpdate: useUpdateItemCategory, useRemove: useRemoveItemCategory } = createResourceHooks(itemCategoriesApi, itemCategoryKeys)
export const { useList: useSuppliers, useCreate: useCreateSupplier, useUpdate: useUpdateSupplier, useRemove: useRemoveSupplier } = createResourceHooks(suppliersApi, supplierKeys)
export const { useList: useItems, useCreate: useCreateItem, useUpdate: useUpdateItem, useRemove: useRemoveItem } = createResourceHooks(itemsApi, itemKeys)
export const { useList: useStores, useCreate: useCreateStore, useUpdate: useUpdateStore, useRemove: useRemoveStore } = createResourceHooks(storesApi, storeKeys)

/** Pickers: active items (optionally one kind), active stores, active suppliers. */
export function useInventoryOptions(kind?: 'consumable' | 'asset') {
  const items = useItems({ ...PICKER_PARAMS, is_active: true, kind, ordering: 'name' })
  const stores = useStores({ ...PICKER_PARAMS, is_active: true })
  const suppliers = useSuppliers({ ...PICKER_PARAMS, is_active: true })
  return {
    items: (items.data?.results ?? []).map((i) => ({ value: String(i.id), label: `${i.name} (${i.code})` })),
    stores: (stores.data?.results ?? []).map((s) => ({ value: String(s.id), label: `${s.name} · ${s.campus_name}` })),
    suppliers: (suppliers.data?.results ?? []).map((s) => ({ value: String(s.id), label: s.name })),
  }
}

export const useStockLevels = listHook([...stockKeys.all, 'levels'], stockApi.levels)
export const useMovements = listHook([...stockKeys.all, 'movements'], stockApi.movements)
export const useTransfers = listHook([...stockKeys.all, 'transfers'], stockApi.transfers)
export const useStockIssues = listHook([...stockKeys.all, 'issues'], stockApi.issues)
export const useAdjustStock = () => useMove(stockApi.adjust)
export const useTransferStock = () => useMove(stockApi.transfer)
export const useIssueStock = () => useMove(stockApi.issue)

export const usePurchases = listHook(purchaseKeys.all, purchasesApi.list)
export function usePurchase(id: Id | null) {
  return useQuery({ queryKey: purchaseKeys.detail(id ?? 0), queryFn: () => purchasesApi.get(id!), enabled: id != null })
}
export const useCreatePurchase = () => useMove(purchasesApi.create)
export const usePlacePurchase = () => useMove(purchasesApi.place, false)
export const useCancelPurchase = () => useMove(({ id, reason }: { id: Id; reason: string }) => purchasesApi.cancel(id, reason))
export const useReceivePurchase = () => useMove(({ id, lines }: { id: Id; lines: Array<{ line: Id; quantity: number }> }) => purchasesApi.receive(id, lines))

export const useAssets = listHook(assetKeys.all, assetsApi.list)
export function useAsset(id: Id | null) {
  return useQuery({ queryKey: assetKeys.detail(id ?? 0), queryFn: () => assetsApi.get(id!), enabled: id != null })
}
export const useCreateAsset = () => useMove(assetsApi.create)
export const useUpdateAsset = () => useMove(({ id, ...input }: { id: Id } & Parameters<typeof assetsApi.update>[1]) => assetsApi.update(id, input))
export const useAssignAsset = () => useMove(({ id, ...input }: { id: Id } & Parameters<typeof assetsApi.assign>[1]) => assetsApi.assign(id, input))
export const useReturnAsset = () => useMove(({ id, ...input }: { id: Id } & Parameters<typeof assetsApi.return>[1]) => assetsApi.return(id, input))
export const useMoveAsset = () => useMove(({ id, ...input }: { id: Id; store: Id; note?: string }) => assetsApi.move(id, input))
export const useDisposeAsset = () => useMove(({ id, ...input }: { id: Id } & Parameters<typeof assetsApi.dispose>[1]) => assetsApi.dispose(id, input))

export const useAssignments = listHook(assignmentKeys.all, assignmentsApi.list)
export const useMaintenance = listHook(maintenanceKeys.all, maintenanceApi.list)
export const useScheduleMaintenance = () => useMove(maintenanceApi.schedule)
export const useStartMaintenance = () => useMove(maintenanceApi.start, false)
export const useCompleteMaintenance = () => useMove(({ id, ...input }: { id: Id } & Parameters<typeof maintenanceApi.complete>[1]) => maintenanceApi.complete(id, input))
export const useCancelMaintenance = () => useMove(({ id, reason }: { id: Id; reason: string }) => maintenanceApi.cancel(id, reason))
export const useDisposals = listHook(disposalKeys.all, disposalsApi.list)
