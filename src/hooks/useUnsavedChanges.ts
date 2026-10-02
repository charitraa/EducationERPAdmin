import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Warn before leaving with unsaved changes: the browser's own prompt on
 * reload/close, and a blocker for in-app navigation that the caller renders
 * as <UnsavedChangesDialog blocker={...} />.
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  return useBlocker(({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname)
}
