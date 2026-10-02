import { createResourceHooks } from '@/shared/api/hooks'
import { classesApi, classKeys } from '../api/classes.api'

export const {
  useList: useClasses,
  useCreate: useCreateClass,
  useUpdate: useUpdateClass,
  useRemove: useRemoveClass,
} = createResourceHooks(classesApi, classKeys)
