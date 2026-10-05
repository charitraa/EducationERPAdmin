import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { navigation } from '@/app/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import { t, tr } from '@/lib/i18n'

const DESCRIPTIONS: Record<string, string> = {
  '/settings/organization': tr("Your school's name, address and contact details."),
  '/settings/branches': tr('Add a branch, or close one. With one branch, branch choices stay hidden.'),
  '/settings/templates': tr('Ready-made grade scales, fee items, leave types and application forms.'),
  '/settings/setup': tr('The step-by-step setup guide. Pick up where you left off.'),
  '/settings/api-keys': tr("Keys for your school's other programs, such as its website."),
}

export default function SettingsPage() {
  const { can } = usePermissions()
  const items = [
    ...navigation.find((s) => s.label === 'nav.section.settings')!.items,
    ...navigation.flatMap((s) => s.items).filter((i) => i.path === '/settings/api-keys'),
  ].filter((i) => can(i.permission))

  return (
    <>
      <PageHeader title={t('nav.section.settings')} />
      <ul className="grid max-w-3xl gap-2">
        {items.map((item) => (
          <li key={item.path}>
            <Link to={item.path} className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
              <item.icon className="h-5 w-5 text-primary" aria-hidden />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-medium">
                  {t(item.label)}
                  {item.status === 'planned' && <span className="rounded border px-1 text-[10px] uppercase text-muted-foreground">{t('nav.soon')}</span>}
                </span>
                <span className="block text-sm text-muted-foreground">{DESCRIPTIONS[item.path]}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
