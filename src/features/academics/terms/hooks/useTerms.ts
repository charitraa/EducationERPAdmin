import { createResourceHooks } from '@/shared/api/hooks'
import { termKeys, termsApi } from '../api/terms.api'

export const {
  useList: useTerms,
  useCreate: useCreateTerm,
  useUpdate: useUpdateTerm,
  useRemove: useRemoveTerm,
} = createResourceHooks(termsApi, termKeys)
