import { useMemo } from 'react'
import { navigation, type NavSection } from '@/app/navigation'
import { usePermissions } from './usePermissions'

/** The navigation tree with everything the user may not open removed. */
export function useNavigation(): NavSection[] {
  const { can } = usePermissions()
  return useMemo(
    () =>
      navigation
        .map((section) => ({ ...section, items: section.items.filter((item) => can(item.permission)) }))
        .filter((section) => section.items.length > 0),
    [can],
  )
}
