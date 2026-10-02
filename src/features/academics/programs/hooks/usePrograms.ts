import { useQuery } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { programKeys, programsApi } from '../api/programs.api'

export const {
  useList: usePrograms,
  useCreate: useCreateProgram,
  useUpdate: useUpdateProgram,
  useRemove: useRemoveProgram,
} = createResourceHooks(programsApi, programKeys)

/** Every program (active first), for pickers. Returns the full records so callers can read levels. */
export function useProgramOptions(enabled = true) {
  const params = { ...PICKER_PARAMS, ordering: 'name' }
  return useQuery({
    queryKey: programKeys.list(params),
    queryFn: () => programsApi.list(params),
    select: (page) => [...page.results].sort((a, b) => Number(b.is_active ?? true) - Number(a.is_active ?? true)),
    enabled,
    staleTime: 5 * 60_000,
  })
}
