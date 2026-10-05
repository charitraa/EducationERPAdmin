import { Bell, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/data-display/ErrorState'
import { Spinner } from '@/components/data-display/LoadingState'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatRelative } from '@/lib/dates'
import { t, tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Notification } from '../api/notifications.api'
import { useMarkAllRead, useMarkRead, useNotificationList, useUnreadCount } from '../hooks/useNotifications'

function NotificationRow({ n, onRead }: { n: Notification; onRead?: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onRead}
        disabled={!onRead}
        className={cn('flex w-full gap-2.5 px-3 py-2.5 text-left', onRead && 'hover:bg-muted/60')}
      >
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : 'bg-primary')} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{n.title}</span>
          {n.body && <span className="line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {formatRelative(n.created_at)}
            {!n.is_read && <span className="sr-only"> {'· ' + tr('unread, select to mark as read')}</span>}
          </span>
        </span>
      </button>
    </li>
  )
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'unread' | 'read'>('unread')
  const unread = useUnreadCount()
  const list = useNotificationList(tab === 'read', open)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const count = unread.data ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('header.notifications') + (count ? ', ' + tr('{count} unread', { count }) : '')}>
          <Bell />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="text-sm font-semibold">{t('header.notifications')}</h2>
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={count === 0 || markAll.isPending}>
            <CheckCheck aria-hidden />
            {t('notifications.markAllRead')}
          </Button>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'unread' | 'read')} className="px-3 pt-2">
          <TabsList className="h-8 w-full">
            <TabsTrigger value="unread" className="flex-1 text-xs">
              {t('notifications.unread')} {count > 0 && `(${count})`}
            </TabsTrigger>
            <TabsTrigger value="read" className="flex-1 text-xs">
              {t('notifications.read')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {list.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} className="py-6" />
          ) : list.data.results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('notifications.empty')}</p>
          ) : (
            <ul className="divide-y">
              {list.data.results.map((n) => (
                <NotificationRow key={n.id} n={n} onRead={n.is_read ? undefined : () => markRead.mutate(n.id)} />
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
