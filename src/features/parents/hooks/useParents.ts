import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import { parentKeys, parentsApi, type LinkStudentInput } from '../api/parents.api'

export const {
  useList: useParents,
  useOne: useParent,
  useCreate: useCreateParent,
  useUpdate: useUpdateParent,
  useRemove: useRemoveParent,
} = createResourceHooks(parentsApi, parentKeys)

const childrenKey = (id: Id) => [...parentKeys.detail(id), 'children']

export function useParentChildren(id: Id | null | undefined) {
  return useQuery({ queryKey: childrenKey(id ?? 0), queryFn: () => parentsApi.children(id!), enabled: id != null })
}

/** The parents linked to one student (for the student's page). */
export function useStudentParents(student: Id, enabled = true) {
  const params = { ...PICKER_PARAMS, student }
  return useQuery({ queryKey: parentKeys.list(params), queryFn: () => parentsApi.list(params), select: (p) => p.results, enabled })
}

/** Links change both sides: the parent's children and every parents-of-a-student list. */
function useLinkMutation<TVars>(run: (vars: TVars) => Promise<unknown>, meta: Record<string, unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: run,
    meta,
    onSuccess: () => void qc.invalidateQueries({ queryKey: parentKeys.all }),
  })
}

export const useLinkStudent = () => useLinkMutation(({ id, input }: { id: Id; input: LinkStudentInput }) => parentsApi.linkStudent(id, input), { form: true })
export const useUnlinkStudent = () => useLinkMutation(({ id, student }: { id: Id; student: Id }) => parentsApi.unlinkStudent(id, student), { silent: true })
