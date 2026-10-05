import { Bell, Languages, LifeBuoy, LogOut, Moon, Settings, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/app/providers/ThemeProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { enumLabel } from '@/lib/formatters'
import { setLocale, t, useLocale, tr } from '@/lib/i18n'
import { initials } from '@/lib/utils'

export function ProfileMenu() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const locale = useLocale()
  const navigate = useNavigate()
  if (!user) return null
  const roleLabel = user.roles[0] ? tr(user.roles[0].name) : enumLabel('UserTypeEnum', user.user_type)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 text-left hover:bg-muted" aria-label={tr('Account menu')}>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials(user.full_name || user.email)}</AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 lg:block">
          <span className="block max-w-40 truncate text-sm font-medium leading-tight">{user.full_name || user.email}</span>
          <span className="block max-w-40 truncate text-xs leading-tight text-muted-foreground">{roleLabel}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          {user.organization && <p className="mt-1 truncate text-xs text-muted-foreground">{user.organization.name}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/me')}>
          <UserRound aria-hidden /> {t('header.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/notifications')}>
          <Bell aria-hidden /> {t('header.notifications')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings aria-hidden /> {t('header.settings')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/support')}>
          <LifeBuoy aria-hidden /> {t('header.help')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => {
          e.preventDefault()
          setTheme(theme === 'dark' ? 'light' : 'dark')
        }}>
          <Moon aria-hidden /> <span className="flex-1">{t('header.theme')}</span>
          <Switch checked={theme === 'dark'} tabIndex={-1} aria-hidden className="scale-75" />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLocale(locale === 'en' ? 'ne' : 'en')}>
          <Languages aria-hidden /> {t('header.language')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()} className="text-danger focus:text-danger">
          <LogOut aria-hidden /> {t('header.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
