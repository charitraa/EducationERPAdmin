import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, ListParams } from '@/shared/types/api'
import {
  authorKeys,
  authorsApi,
  bookKeys,
  booksApi,
  copiesApi,
  copyKeys,
  fineKeys,
  finesApi,
  libraryCategoriesApi,
  libraryCategoryKeys,
  loanKeys,
  loansApi,
  memberKeys,
  membersApi,
  publisherKeys,
  publishersApi,
  reservationKeys,
  reservationsApi,
  shelfKeys,
  shelvesApi,
} from '../api/library.api'

/** A loan, return or reservation moves copies, books' availability, members' counts and fines together. */
const CIRCULATION = [loanKeys.all, copyKeys.all, bookKeys.all, memberKeys.all, reservationKeys.all, fineKeys.all]

function useCirculation<V, R>(fn: (v: V) => Promise<R>, form = false) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: form ? { form: true } : { silent: true },
    onSuccess: () => {
      for (const key of CIRCULATION) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export const { useList: useAuthors, useCreate: useCreateAuthor, useUpdate: useUpdateAuthor, useRemove: useRemoveAuthor } = createResourceHooks(authorsApi, authorKeys)
export const { useList: useLibraryCategories, useCreate: useCreateLibraryCategory, useUpdate: useUpdateLibraryCategory, useRemove: useRemoveLibraryCategory } = createResourceHooks(libraryCategoriesApi, libraryCategoryKeys)
export const { useList: usePublishers, useCreate: useCreatePublisher, useUpdate: useUpdatePublisher, useRemove: useRemovePublisher } = createResourceHooks(publishersApi, publisherKeys)
export const { useList: useShelves, useCreate: useCreateShelf, useUpdate: useUpdateShelf, useRemove: useRemoveShelf } = createResourceHooks(shelvesApi, shelfKeys)

/** Authors, categories and publishers for the book form. */
export function useCatalogOptions() {
  const authors = useAuthors({ ...PICKER_PARAMS, ordering: 'name' })
  const categories = useLibraryCategories({ ...PICKER_PARAMS, ordering: 'name' })
  const publishers = usePublishers({ ...PICKER_PARAMS, ordering: 'name' })
  return { authors: authors.data?.results ?? [], categories: categories.data?.results ?? [], publishers: publishers.data?.results ?? [] }
}

export const { useList: useBooks, useOne: useBook, useCreate: useCreateBook, useUpdate: useUpdateBook, useRemove: useRemoveBook } = createResourceHooks(booksApi, bookKeys)

export function useCopies(params: ListParams, enabled = true) {
  return useQuery({ queryKey: copyKeys.list(params), queryFn: () => copiesApi.list(params), placeholderData: keepPreviousData, enabled })
}
export const { useCreate: useCreateCopy, useUpdate: useUpdateCopy, useRemove: useRemoveCopy } = createResourceHooks(copiesApi, copyKeys, { alsoInvalidate: [bookKeys.all] })
export const useWithdrawCopy = () => useCirculation(copiesApi.withdraw)

export function useMembers(params: ListParams, enabled = true) {
  return useQuery({ queryKey: memberKeys.list(params), queryFn: () => membersApi.list(params), placeholderData: keepPreviousData, enabled })
}
export const { useCreate: useCreateMember, useUpdate: useUpdateMember } = createResourceHooks(membersApi, memberKeys)
export const useDeactivateMember = () => useCirculation(membersApi.deactivate)

export function useLoans(params: ListParams, enabled = true) {
  return useQuery({ queryKey: loanKeys.list(params), queryFn: () => loansApi.list(params), placeholderData: keepPreviousData, enabled })
}
export const useIssueBook = () => useCirculation(loansApi.issue)
export const useReturnBook = () => useCirculation(({ id, outcome }: { id: Id; outcome: 'returned' | 'damaged' | 'lost' }) => loansApi.return(id, outcome))

export function useReservations(params: ListParams) {
  return useQuery({ queryKey: reservationKeys.list(params), queryFn: () => reservationsApi.list(params), placeholderData: keepPreviousData })
}
export const useReserveBook = () => useCirculation(reservationsApi.reserve, true)
export const useCancelReservation = () => useCirculation(({ id, reason }: { id: Id; reason: string }) => reservationsApi.cancel(id, reason), true)
export const useFulfilReservation = () => useCirculation(reservationsApi.fulfil)
export const useExpireReservations = () => useCirculation((_: void) => reservationsApi.expireStale())

export function useFines(params: ListParams) {
  return useQuery({ queryKey: fineKeys.list(params), queryFn: () => finesApi.list(params), placeholderData: keepPreviousData })
}
export const usePayFine = () => useCirculation(finesApi.pay)
export const useWaiveFine = () => useCirculation(({ id, reason }: { id: Id; reason: string }) => finesApi.waive(id, reason), true)
