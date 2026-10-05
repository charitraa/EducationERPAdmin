import { useBranches } from '@/app/providers/BranchProvider'
import { SimpleCrudList } from '@/components/common/SimpleCrudList'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import {
  useCreateItemCategory,
  useCreateStore,
  useCreateSupplier,
  useItemCategories,
  useRemoveItemCategory,
  useRemoveStore,
  useRemoveSupplier,
  useStores,
  useSuppliers,
  useUpdateItemCategory,
  useUpdateStore,
  useUpdateSupplier,
} from '../hooks/useInventory'
import { tr } from '@/lib/i18n'

/** Item categories, suppliers, and the stores stock and assets are kept in. */
export default function InventorySetupPage() {
  const { selectedBranchId, defaultBranchId, isMultiBranch, branchName } = useBranches()
  const campus = selectedBranchId ?? defaultBranchId
  const manage = PERMS.inventory.manage
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <SimpleCrudList permission={manage} title={tr('Item categories')} noun={tr('category')} fields={[{ name: 'code', label: tr('Code'), required: true, mono: true }, { name: 'name', label: tr('Name'), required: true }]} query={useItemCategories({ ...PICKER_PARAMS, ordering: 'name' })} create={useCreateItemCategory() as never} update={useUpdateItemCategory() as never} remove={useRemoveItemCategory()} label={(r) => `${r.name} (${r.code})`} />
      <SimpleCrudList
        permission={manage}
        title={isMultiBranch && campus ? tr('Stores at {branchName}', { branchName: branchName(campus) }) : tr('Stores')}
        noun={tr('store')}
        fields={[{ name: 'code', label: tr('Code'), required: true, mono: true }, { name: 'name', label: tr('Name'), required: true }]}
        query={useStores({ ...PICKER_PARAMS, campus: campus ?? undefined })}
        create={useCreateStore() as never}
        update={useUpdateStore() as never}
        remove={useRemoveStore()}
        label={(r) => `${r.name} (${r.code})`}
        extra={{ campus }}
      />
      <SimpleCrudList
        permission={manage}
        title={tr('Suppliers')}
        noun={tr('supplier')}
        fields={[
          { name: 'name', label: tr('Name'), required: true },
          { name: 'contact_person', label: tr('Contact person') },
          { name: 'phone', label: tr('Phone') },
          { name: 'email', label: tr('Email') },
          { name: 'address', label: tr('Address') },
          { name: 'tax_number', label: tr('PAN / VAT no.'), mono: true },
        ]}
        query={useSuppliers({ ...PICKER_PARAMS, ordering: 'name' })}
        create={useCreateSupplier() as never}
        update={useUpdateSupplier() as never}
        remove={useRemoveSupplier()}
        label={(r) => `${r.name}${r.phone ? ` · ${r.phone}` : ''}`}
      />
    </div>
  )
}
