import { createResourceHooks } from '@/shared/api/hooks'
import { branchesApi, branchKeys } from '../api/branches.api'

export const {
  useList: useBranchList,
  useOne: useBranch,
  useCreate: useCreateBranch,
  useUpdate: useUpdateBranch,
  useRemove: useRemoveBranch,
} = createResourceHooks(branchesApi, branchKeys)
