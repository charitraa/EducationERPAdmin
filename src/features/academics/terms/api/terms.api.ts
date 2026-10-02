import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type Term = Schema<'Term'>
export type TermInput = Schema<'TermRequest'>

export const termsApi = createResourceApi<Term, TermInput>('/terms/')
export const termKeys = createQueryKeys('terms')
