import axios from 'axios'
import { env } from '@/lib/env'
import { toApiError } from './errors'

/**
 * No token, no refresh: for pages used by people without an account (public
 * forms, signup, password reset). An admin who happens to be signed in in the
 * same browser isn't sent along.
 */
export const publicClient = axios.create({ baseURL: env.apiBaseUrl })
publicClient.interceptors.response.use(undefined, (error) => Promise.reject(toApiError(error)))
