import { create } from 'zustand'
import type { CurrentUser } from '@/lib/api/types'

interface AuthState {
  user: CurrentUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  setUser: (user: CurrentUser) => void
  setStatus: (status: AuthState['status']) => void
  logout: () => void
  hasPermission: (code: string) => boolean
  hasAnyPermission: (codes: string[]) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: 'authenticated' }),
  setStatus: (status) => set({ status }),
  logout: () => set({ user: null, status: 'unauthenticated' }),
  hasPermission: (code) => {
    const user = get().user
    return !!user && (user.is_superuser || user.permissions.includes(code))
  },
  hasAnyPermission: (codes) => {
    const user = get().user
    if (!user) return false
    if (user.is_superuser) return true
    return codes.some((code) => user.permissions.includes(code))
  },
}))
