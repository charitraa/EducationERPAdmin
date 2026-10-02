import { useQuery } from '@tanstack/react-query'
import { usePermissions } from '@/hooks/usePermissions'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import { staffApi, staffKeys } from '../api/staff.api'

/**
 * Active staff for pickers (class teacher, department head). Needs `staff.view`;
 * `canPick` is false without it and callers hide the field.
 */
export function useStaffOptions(campus?: Id | null) {
  const { hasPermission } = usePermissions()
  const canPick = hasPermission(PERMS.staff.view)
  const params = { ...PICKER_PARAMS, status: 'active', ordering: 'first_name', campus: campus ?? undefined }
  const query = useQuery({
    queryKey: staffKeys.list(params),
    queryFn: () => staffApi.list(params),
    select: (page) => page.results.map((s) => ({ value: String(s.id), label: s.designation ? `${s.full_name} · ${s.designation}` : s.full_name })),
    enabled: canPick,
    staleTime: 5 * 60_000,
  })
  return { ...query, canPick }
}
