import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Author = Schema<'Author'>
export type LibraryCategory = Schema<'Category'>
export type Publisher = Schema<'Publisher'>
export type Book = Schema<'Book'>
export type BookInput = Schema<'BookRequest'>
export type Shelf = Schema<'Shelf'>
export type Copy = Schema<'Copy'>
export type CopyInput = Schema<'CopyRequest'>
export type Member = Schema<'Member'>
export type MemberInput = Schema<'MemberRequest'>
export type Loan = Schema<'Issue'>
export type Reservation = Schema<'Reservation'>
export type Fine = Schema<'Fine'>

export const authorsApi = createResourceApi<Author, Schema<'AuthorRequest'>>('/library/authors/')
export const authorKeys = createQueryKeys('library-authors')
export const libraryCategoriesApi = createResourceApi<LibraryCategory, Schema<'CategoryRequest'>>('/library/categories/')
export const libraryCategoryKeys = createQueryKeys('library-categories')
export const publishersApi = createResourceApi<Publisher, Schema<'PublisherRequest'>>('/library/publishers/')
export const publisherKeys = createQueryKeys('library-publishers')
export const shelvesApi = createResourceApi<Shelf, Schema<'ShelfRequest'>>('/library/shelves/')
export const shelfKeys = createQueryKeys('library-shelves')

export const booksApi = createResourceApi<Book, BookInput>('/library/books/')
export const bookKeys = createQueryKeys('library-books')

const copiesBase = createResourceApi<Copy, CopyInput>('/library/copies/')
export const copiesApi = { ...copiesBase, withdraw: (id: Id) => apiClient.post<Copy>(`${copiesBase.url(id)}withdraw/`).then((r) => r.data) }
export const copyKeys = createQueryKeys('library-copies')

const membersBase = createResourceApi<Member, MemberInput>('/library/members/')
export const membersApi = { ...membersBase, deactivate: (id: Id) => apiClient.post<Member>(`${membersBase.url(id)}deactivate/`).then((r) => r.data) }
export const memberKeys = createQueryKeys('library-members')

export const loansApi = {
  list: createResourceApi<Loan>('/library/issues/').list,
  issue: (input: { copy: Id; member: Id }) => apiClient.post<Loan>('/library/issues/', input).then((r) => r.data),
  /** `damaged` and `lost` also fine the copy's price, on top of any overdue fine. */
  return: (id: Id, outcome: 'returned' | 'damaged' | 'lost') => apiClient.post<Loan>(`/library/issues/${id}/return/`, { outcome }).then((r) => r.data),
}
export const loanKeys = createQueryKeys('library-issues')

export const reservationsApi = {
  list: createResourceApi<Reservation>('/library/reservations/').list,
  /** Only when no copy is available right now. */
  reserve: (input: { book: Id; member: Id }) => apiClient.post<Reservation>('/library/reservations/', input).then((r) => r.data),
  cancel: (id: Id, reason: string) => apiClient.post<Reservation>(`/library/reservations/${id}/cancel/`, { reason }).then((r) => r.data),
  /** Hands the held copy over: becomes a loan. */
  fulfil: (id: Id) => apiClient.post<Loan>(`/library/reservations/${id}/fulfil/`).then((r) => r.data),
  expireStale: () => apiClient.post<{ expired: number }>('/library/reservations/expire-stale/').then((r) => r.data),
}
export const reservationKeys = createQueryKeys('library-reservations')

export const finesApi = {
  list: createResourceApi<Fine>('/library/fines/').list,
  pay: (id: Id) => apiClient.post<Fine>(`/library/fines/${id}/pay/`).then((r) => r.data),
  waive: (id: Id, reason: string) => apiClient.post<Fine>(`/library/fines/${id}/waive/`, { reason }).then((r) => r.data),
}
export const fineKeys = createQueryKeys('library-fines')
