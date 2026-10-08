import { BranchProvider } from '@/app/providers/BranchProvider'
import { AppShell } from '@/components/layout/AppShell'
import { usePageMeta } from '@/hooks/usePageMeta'
import { tr } from '@/lib/i18n'

/** Everything behind login: branch context + the app chrome. */
export function ProtectedLayout() {
  // Private pages: keep them out of search results.
  usePageMeta({ title: tr('Education ERP'), noindex: true })
  return (
    <BranchProvider>
      <AppShell />
    </BranchProvider>
  )
}
