import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

const TABS = [
  { to: '/inventory', label: tr('Stock'), end: true },
  { to: '/inventory/items', label: tr('Items') },
  { to: '/inventory/purchases', label: tr('Purchases') },
  { to: '/inventory/assets', label: tr('Assets') },
  { to: '/inventory/assignments', label: tr('Assignments') },
  { to: '/inventory/maintenance', label: tr('Maintenance') },
  { to: '/inventory/categories', label: tr('Categories & stores') },
]

/** Consumable stock and the fixed-asset register under one sub-navigation. */
export function InventoryLayout() {
  return (
    <div>
      <PageHeader title={tr('Inventory')} description={tr('Consumables by quantity in each store, and fixed assets one by one: who has them, their repairs, and disposal.')} />
      <nav aria-label={tr('Inventory')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => cn('-mb-px inline-flex border-b-2 px-3 py-2 text-sm transition-colors', isActive ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
