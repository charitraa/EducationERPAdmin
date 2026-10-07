import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { QrCode } from '@/components/data-display/QrCode'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { pluralize } from '@/lib/formatters'
import { fetchAllPages } from '@/shared/api/pagination'
import { assetKeys, assetsApi, LABEL_FILTERS, type Asset } from '../api/inventory.api'
import { tr } from '@/lib/i18n'

/**
 * Asset tag labels: 21 to an A4 sheet (3 × 7, 63.5 × 38.1 mm, the common
 * sticker size). The QR code opens the asset's page, so anyone with
 * inventory access can scan a desk or projector with a phone camera to see
 * its record. `?ids=` prints chosen assets; otherwise the list filters.
 */
export default function AssetLabelsPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').map(Number).filter(Boolean)
  const filters = Object.fromEntries(LABEL_FILTERS.map((k) => [k, params.get(k) ?? undefined]).filter(([, v]) => v))

  const assets = useQuery({
    queryKey: [...assetKeys.all, 'labels', ids, filters],
    queryFn: (): Promise<Asset[]> => (ids.length ? Promise.all(ids.map((id) => assetsApi.get(id))) : fetchAllPages(assetsApi.list, { ...filters, ordering: 'tag' })),
  })

  if (assets.isPending) return <PageLoader />
  if (assets.isError) return <ErrorState error={assets.error} onRetry={() => void assets.refetch()} />
  const rows = assets.data.filter((a) => a.status !== 'disposed')
  const sheets = Math.ceil(rows.length / 21)

  return (
    <div>
      <PageHeader
        className="print:hidden"
        backTo="/inventory/assets"
        title={tr('Asset labels')}
        description={tr('{labels} on {sheets}. Use A4 sticker sheets of 21 (63.5 × 38.1 mm), print at 100% scale, and stick each label where it’s easy to scan.', { labels: pluralize(rows.length, 'label'), sheets: pluralize(sheets, 'sheet') })}
        actions={
          <Button onClick={() => window.print()} disabled={!rows.length}>
            <Printer aria-hidden /> {tr('Print')}
          </Button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title={tr('No assets to label')} description={tr('Disposed assets get no label.')} />
      ) : (
        <>
          {/* The sticker sheet's own margins, only while this page is open. */}
          <style>{'@page { size: A4; margin: 15.1mm 7.2mm 0; }'}</style>
          <div className="asset-labels grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:gap-0">
            {rows.map((a) => (
              <div key={a.id} className="asset-label flex items-center gap-3 overflow-hidden rounded-md border bg-white p-2 text-black print:rounded-none print:border-0">
                <QrCode value={`${window.location.origin}/inventory/assets/${a.id}`} label={tr('QR code for {tag}', { tag: a.tag })} level="M" className="h-24 w-24 shrink-0 print:h-[30mm] print:w-[30mm]" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[10px] uppercase tracking-wide text-neutral-600">{user?.organization?.name}</p>
                  <p className="mt-0.5 font-mono text-lg font-bold">{a.tag}</p>
                  <p className="line-clamp-2 text-xs">{a.item_name}</p>
                  {a.serial_number && <p className="mt-0.5 truncate font-mono text-[10px] text-neutral-600">{tr('S/N {serial}', { serial: a.serial_number })}</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
