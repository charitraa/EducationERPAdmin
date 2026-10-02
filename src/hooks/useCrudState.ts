import { useState } from 'react'

/** Which record a page's form/delete dialogs are open for. `'new'` = create. */
export function useCrudState<T>() {
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  return {
    editing,
    deleting,
    formOpen: editing !== null,
    record: editing === 'new' ? null : editing,
    openCreate: () => setEditing('new'),
    openEdit: (row: T) => setEditing(row),
    closeForm: () => setEditing(null),
    openDelete: (row: T) => setDeleting(row),
    closeDelete: () => setDeleting(null),
  }
}
