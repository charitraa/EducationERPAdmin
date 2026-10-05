import { useBranches } from '@/app/providers/BranchProvider'
import { SimpleCrudList } from '@/components/common/SimpleCrudList'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import {
  useAuthors,
  useCreateAuthor,
  useCreateLibraryCategory,
  useCreatePublisher,
  useCreateShelf,
  useLibraryCategories,
  usePublishers,
  useRemoveAuthor,
  useRemoveLibraryCategory,
  useRemovePublisher,
  useRemoveShelf,
  useShelves,
  useUpdateAuthor,
  useUpdateLibraryCategory,
  useUpdatePublisher,
  useUpdateShelf,
} from '../hooks/useLibrary'
import { tr } from '@/lib/i18n'

/** Authors, categories and publishers for the catalog, and the shelves copies sit on. */
export default function CatalogSetupPage() {
  const { selectedBranchId, defaultBranchId, isMultiBranch, branchName } = useBranches()
  const campus = selectedBranchId ?? defaultBranchId
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <SimpleCrudList permission={PERMS.library.manage} title={tr('Authors')} noun={tr('author')} fields={[{ name: 'name', label: tr('Name'), required: true }, { name: 'bio', label: tr('About') }]} query={useAuthors({ ...PICKER_PARAMS, ordering: 'name' })} create={useCreateAuthor() as never} update={useUpdateAuthor() as never} remove={useRemoveAuthor()} label={(r) => String(r.name)} />
      <SimpleCrudList permission={PERMS.library.manage} title={tr('Categories')} noun={tr('category')} fields={[{ name: 'code', label: tr('Code'), required: true, mono: true }, { name: 'name', label: tr('Name'), required: true }]} query={useLibraryCategories({ ...PICKER_PARAMS, ordering: 'name' })} create={useCreateLibraryCategory() as never} update={useUpdateLibraryCategory() as never} remove={useRemoveLibraryCategory()} label={(r) => `${r.name} (${r.code})`} />
      <SimpleCrudList permission={PERMS.library.manage} title={tr('Publishers')} noun={tr('publisher')} fields={[{ name: 'name', label: tr('Name'), required: true }, { name: 'address', label: tr('Address') }]} query={usePublishers({ ...PICKER_PARAMS, ordering: 'name' })} create={useCreatePublisher() as never} update={useUpdatePublisher() as never} remove={useRemovePublisher()} label={(r) => String(r.name)} />
      <SimpleCrudList permission={PERMS.library.manage}
        title={isMultiBranch && campus ? tr('Shelves at {branchName}', { branchName: branchName(campus) }) : tr('Shelves')}
        noun={tr('shelf')}
        fields={[{ name: 'code', label: tr('Code'), required: true, mono: true }, { name: 'name', label: tr('Name') }]}
        query={useShelves({ ...PICKER_PARAMS, campus: campus ?? undefined })}
        create={useCreateShelf() as never}
        update={useUpdateShelf() as never}
        remove={useRemoveShelf()}
        label={(r) => `${r.code}${r.name ? ` · ${r.name}` : ''}`}
        extra={{ campus }}
      />
    </div>
  )
}
