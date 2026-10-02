import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { notifyError } from '@/lib/errors'
import { toApiError } from '@/shared/api/errors'
import { authKeys } from '@/features/authentication/api/auth.api'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** The caller shows 400 errors itself (on form fields), so don't toast them. */
      form?: boolean
      /** The caller handles every error itself. */
      silent?: boolean
    }
  }
}

function createQueryClient() {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (err) => {
        // A 403 can mean roles changed since login: refresh `me` so menus and gates catch up.
        if (toApiError(err).status === 403) void client.invalidateQueries({ queryKey: authKeys.me })
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        const e = toApiError(err)
        if (e.status === 403) void client.invalidateQueries({ queryKey: authKeys.me })
        if (mutation.meta?.silent) return
        if (mutation.meta?.form && e.status === 400) return
        notifyError(e)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // 4xx answers won't change on retry (and 404 may be another tenant's record).
        retry: (failures, err) => {
          const status = toApiError(err).status
          if (status && status < 500) return false
          return failures < 2
        },
      },
    },
  })
  return client
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
