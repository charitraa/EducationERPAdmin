import { BranchProvider } from '@/app/providers/BranchProvider'
import { AppShell } from '@/components/layout/AppShell'

/** Everything behind login: branch context + the app chrome. */
export function ProtectedLayout() {
  return (
    <BranchProvider>
      <AppShell />
    </BranchProvider>
  )
}
