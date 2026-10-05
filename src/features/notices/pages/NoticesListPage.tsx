import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useListState } from '@/hooks/usePagination'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import { noticeState, type Notice } from '../api/notices.api'
import { useNotices } from '../hooks/useNotices'
import { tr } from '@/lib/i18n'

const STATE_LABELS = { draft: tr('Draft'), published: tr('Published'), expired: tr('Expired') }

export default function NoticesListPage() {
  const navigate = useNavigate()
  const { isMultiBranch, branches } = useBranches()
  const list = useListState({ filters: ['audience', 'campus'], defaultOrdering: '' })
  const query = useNotices(list.query)

  const columns: Column<Notice>[] = [
    { id: 'title', header: tr('Notice'), mobile: 'title', cell: (n) => <span className="font-medium">{n.title}</span> },
    { id: 'audience', header: tr('For'), cell: (n) => enumLabel('AudienceEnum', n.audience ?? 'all') },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (n) => n.campus_name ?? tr('All branches') },
    { id: 'published', header: tr('Published'), className: 'tabular-nums', cell: (n) => (n.published_at ? formatDate(n.published_at) : <span className="text-muted-foreground">—</span>) },
    { id: 'expires', header: tr('Shown until'), className: 'tabular-nums', mobile: 'hidden', cell: (n) => (n.expires_at ? formatDate(n.expires_at) : <span className="text-muted-foreground">{tr('No end')}</span>) },
    {
      id: 'state',
      header: tr('Status'),
      cell: (n) => {
        const s = noticeState(n)
        return <StatusBadge status={s === 'expired' ? 'closed' : s} label={STATE_LABELS[s]} />
      },
    },
  ]

  const addButton = (label: string) => (
    <PermissionGate permission={PERMS.notices.manage}>
      <Button asChild>
        <Link to="/notices/new">
          <Plus aria-hidden /> {label}
        </Link>
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <PageHeader title={tr('Notices')} description={tr('Announcements for students, parents and staff.')} actions={addButton(tr('Write a notice'))} />
      <DataTable
        ariaLabel={tr('Notices')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(n) => n.id}
        onRowClick={(n) => navigate(`/notices/${n.id}`)}
        searchPlaceholder={tr('Search notice titles…')}
        filters={[
          { name: 'audience', label: tr('For'), options: enumOptions('AudienceEnum') },
          { name: 'campus', label: tr('Branch'), hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        empty={{ title: tr('No notices'), description: tr('Notices you publish appear on everyone’s dashboard in their audience.'), action: addButton(tr('Write the first notice')) }}
      />
    </>
  )
}
