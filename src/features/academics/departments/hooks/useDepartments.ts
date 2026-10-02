import { useQuery } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { departmentKeys, departmentsApi } from '../api/departments.api'

export const {
  useList: useDepartments,
  useCreate: useCreateDepartment,
  useUpdate: useUpdateDepartment,
  useRemove: useRemoveDepartment,
} = createResourceHooks(departmentsApi, departmentKeys, { alsoInvalidate: [['programs'], ['subjects']] })

export function useDepartmentOptions() {
  const params = { ...PICKER_PARAMS, ordering: 'name' }
  return useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => departmentsApi.list(params),
    select: (page) => page.results.map((d) => ({ value: String(d.id), label: d.name })),
    staleTime: 5 * 60_000,
  })
}
