import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type Room = Schema<'Room'>
export type RoomInput = Schema<'RoomRequest'>

export const roomsApi = createResourceApi<Room, RoomInput>('/rooms/')
export const roomKeys = createQueryKeys('rooms')
