import { CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useMarkAllRead, useMarkRead, useNotificationList, useUnreadCount } from '../hooks/useNotifications'

export default function NotificationsPage() {
  const [tab, setTab] = useState<'unread' | 'read'>('unread')
  const list = useNotificationList(tab === 'read')
  const unread = useUnreadCount()
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={!unread.data || markAll.isPending}>
            <CheckCheck aria-hidden /> Mark all as read
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'unread' | 'read')}>
        <TabsList>
          <TabsTrigger value="unread">Unread {unread.data ? `(${unread.data})` : ''}</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>
        {/* One panel for whichever tab is chosen: the tabs' aria-controls point at it. */}
        <TabsContent value={tab} className="mt-3 max-w-3xl rounded-lg border bg-card">
          {list.isPending ? (
            <TableSkeleton rows={5} columns={2} />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : list.data.results.length === 0 ? (
            <EmptyState title={tab === 'unread' ? "You're all caught up" : 'No read notifications'} />
          ) : (
            <ul className="divide-y">
              {list.data.results.map((n) => (
                <li key={n.id} className="flex gap-3 p-4">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : 'bg-primary')} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)}>
                      Mark read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
