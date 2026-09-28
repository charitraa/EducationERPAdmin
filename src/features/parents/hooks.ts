import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  parentsApi,
  type Child,
  type GuardianRelationship,
  type Parent,
  type ParentListParams,
  type ParentPayload,
} from '@/lib/api/parents'
import { createResourceHooks } from '@/lib/query/useResource'

export const {
  keys: parentKeys,
  useList: useParents,
  useDetail: useParent,
  useCreate: useCreateParent,
  useUpdate: useUpdateParent,
} = createResourceHooks<Parent, ParentPayload, ParentPayload, ParentListParams>('parents', parentsApi)

function childrenKey(id: number) {
  return [...parentKeys.detail(id), 'children'] as const
}

export function useParentChildren(id: number | null) {
  return useQuery<{ results: Child[] }>({
    queryKey: childrenKey(id as number),
    queryFn: () => parentsApi.students(id as number, { page_size: 200 }),
    enabled: id !== null,
  })
}

export function useLinkStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: { student: number; relationship: GuardianRelationship; is_primary_contact?: boolean }
    }) => parentsApi.linkStudent(id, payload),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: childrenKey(vars.id) }),
  })
}

export function useUnlinkStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, student }: { id: number; student: number }) => parentsApi.unlinkStudent(id, student),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: childrenKey(vars.id) }),
  })
}
