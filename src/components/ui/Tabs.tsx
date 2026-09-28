import { cn } from '@/lib/utils'

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="m-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn('m-tabs__item', active === tab.key && 'is-active')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
