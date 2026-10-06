import { useQuery } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { FilterDef } from '@/components/common/FilterPanel'
import { useAuth } from '@/hooks/useAuth'
import { tr } from '@/lib/i18n'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import type { Campus } from '@/shared/types/organization'
import { branchesApi, branchKeys } from '@/features/settings/branches/api/branches.api'

interface BranchContextValue {
  branches: Campus[]
  isLoading: boolean
  /**
   * The one-campus rule. False → no branch selector, column, filter or picker
   * anywhere; forms fill `campus` with `defaultBranchId` silently.
   */
  isMultiBranch: boolean
  /** The only (or main) branch: what forms send as `campus` when the user isn't asked. */
  defaultBranchId: Id | null
  /** The header selector's choice when there are several branches; null = all. */
  selectedBranchId: Id | null
  setSelectedBranchId: (id: Id | null) => void
  branchName: (id: Id | null | undefined) => string
}

const BranchContext = createContext<BranchContextValue | null>(null)
const SELECTED_KEY = 'erp.branch'

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user, permissions } = useAuth()
  const canView = permissions.has('campuses.view')

  const query = useQuery({
    queryKey: branchKeys.list({ ...PICKER_PARAMS, is_active: true }),
    queryFn: () => branchesApi.list({ ...PICKER_PARAMS, is_active: true }),
    enabled: Boolean(user) && canView,
    staleTime: 5 * 60_000,
  })

  const storageKey = user ? `${SELECTED_KEY}.${user.id}` : null
  const [selected, setSelected] = useState<Id | null>(null)

  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      setSelected(raw ? Number(raw) : null)
    } catch {
      setSelected(null)
    }
  }, [storageKey])

  const setSelectedBranchId = useCallback(
    (id: Id | null) => {
      setSelected(id)
      if (!storageKey) return
      try {
        if (id === null) localStorage.removeItem(storageKey)
        else localStorage.setItem(storageKey, String(id))
      } catch {
        // per-viewer convenience only
      }
    },
    [storageKey],
  )

  const value = useMemo<BranchContextValue>(() => {
    const branches = query.data?.results ?? []
    const isMultiBranch = branches.length > 1
    const main = branches.find((b) => b.is_main) ?? branches[0]
    const validSelected = isMultiBranch && branches.some((b) => b.id === selected) ? selected : null
    return {
      branches,
      isLoading: canView && query.isPending,
      isMultiBranch,
      defaultBranchId: validSelected ?? main?.id ?? null,
      selectedBranchId: validSelected,
      setSelectedBranchId,
      branchName: (id) => branches.find((b) => b.id === id)?.name ?? '—',
    }
  }, [query.data, query.isPending, canView, selected, setSelectedBranchId])

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranches() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranches must be used inside <BranchProvider>')
  return ctx
}

/** The header's branch, or null for all (and outside the signed-in layout). */
export function useSelectedBranchId(): Id | null {
  return useContext(BranchContext)?.selectedBranchId ?? null
}

/** The `campus` list filter, shown only when there are several branches. */
export function useBranchFilter(): FilterDef {
  const { isMultiBranch, branches } = useBranches()
  return { name: 'campus', label: tr('Branch'), hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) }
}
