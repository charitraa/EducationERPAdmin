import type { Schema } from './api'

export type Organization = Schema<'Organization'>
export type OrganizationUpdate = Schema<'PatchedOrganizationWriteRequest'>
/** A campus in the API; "branch" everywhere in the UI. */
export type Campus = Schema<'Campus'>
export type CampusInput = Schema<'CampusRequest'>
