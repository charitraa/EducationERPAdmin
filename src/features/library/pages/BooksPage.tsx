import { Plus } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { optionalWholeNumber } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Book, BookInput } from '../api/library.api'
import { useBooks, useCatalogOptions, useCreateBook, useUpdateBook } from '../hooks/useLibrary'
import { tr } from '@/lib/i18n'

const schema = z.object({
  title: z.string().trim().min(1, tr('Required.')).max(300),
  isbn: z.string().trim().max(20),
  authors: z.array(z.number()),
  category: z.string(),
  publisher: z.string(),
  edition: z.string().max(50),
  language: z.string().trim().min(1, tr('Required.')).max(50),
  published_year: optionalWholeNumber,
  description: z.string(),
})

export function BookDialog({ open, record, onOpenChange, onSaved }: { open: boolean; record: Book | null; onOpenChange: (o: boolean) => void; onSaved?: (b: Book) => void }) {
  const create = useCreateBook()
  const update = useUpdateBook()
  const { authors, categories, publishers } = useCatalogOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? tr('Edit book') : tr('Add a book')}
      description={tr('The title in the catalog. Physical copies are added on the book’s page.')}
      schema={schema}
      defaultValues={{
        title: record?.title ?? '',
        isbn: record?.isbn ?? '',
        authors: record?.authors ?? [],
        category: record?.category ? String(record.category) : '',
        publisher: record?.publisher ? String(record.publisher) : '',
        edition: record?.edition ?? '',
        language: record?.language ?? 'English',
        published_year: record?.published_year ? String(record.published_year) : '',
        description: record?.description ?? '',
      }}
      onSubmit={async (v) => {
        const input: BookInput = { ...v, category: v.category ? Number(v.category) : null, publisher: v.publisher ? Number(v.publisher) : null, published_year: v.published_year ? Number(v.published_year) : null }
        const book = record ? await update.mutateAsync({ id: record.id, input }) : await create.mutateAsync(input)
        toast.success(record ? tr('Book saved.') : tr('Book added. Add its copies next.'))
        onSaved?.(book)
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label={tr('Title')} required error={errors.title?.message}>
            <Input {...register('title')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="ISBN" error={errors.isbn?.message}>
              <Input {...register('isbn')} className="font-mono" />
            </FormField>
            <FormField label={tr('Edition')} error={errors.edition?.message}>
              <Input {...register('edition')} />
            </FormField>
            <FormField label={tr('Year')} error={errors.published_year?.message}>
              <Input {...register('published_year')} inputMode="numeric" />
            </FormField>
            <FormField label={tr('Category')}>
              {(p) => <Controller control={control} name="category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={categories.map((c) => ({ value: String(c.id), label: c.name }))} />} />}
            </FormField>
            <FormField label={tr('Publisher')}>
              {(p) => <Controller control={control} name="publisher" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={publishers.map((c) => ({ value: String(c.id), label: c.name }))} />} />}
            </FormField>
            <FormField label={tr('Language')} required error={errors.language?.message}>
              <Input {...register('language')} />
            </FormField>
          </div>
          <Controller
            control={control}
            name="authors"
            render={({ field }) => (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1 text-sm font-medium">{tr('Authors')}</legend>
                {authors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tr('No authors yet. Add them under Catalog setup.')}</p>
                ) : (
                  <div className="grid max-h-40 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
                    {authors.map((a) => (
                      <label key={a.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={field.value.includes(a.id)} onCheckedChange={(c) => field.onChange(c ? [...field.value, a.id] : field.value.filter((x) => x !== a.id))} />
                        {a.name}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            )}
          />
          <FormField label={tr('Description')} error={errors.description?.message}>
            <Textarea {...register('description')} rows={3} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** The catalog: every title, with how many copies are on the shelf right now. */
export default function BooksPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['category'], defaultOrdering: '' })
  const query = useBooks(list.query)
  const { categories } = useCatalogOptions()
  const crud = useCrudState<Book>()
  const columns: Column<Book>[] = [
    {
      id: 'title',
      header: tr('Title'),
      mobile: 'title',
      cell: (b) => (
        <span>
          <span className="font-medium">{b.title}</span>
          {b.edition && <span className="text-xs text-muted-foreground"> · {b.edition}</span>}
        </span>
      ),
    },
    { id: 'authors', header: tr('Authors'), cell: (b) => b.author_names.join(', ') || '—' },
    { id: 'category', header: tr('Category'), cell: (b) => b.category_name ?? '—' },
    { id: 'isbn', header: 'ISBN', mobile: 'hidden', className: 'font-mono text-xs', cell: (b) => b.isbn || '—' },
    { id: 'available', header: tr('On shelf'), className: 'tabular-nums', cell: (b) => <span className={b.available_count === 0 ? 'text-muted-foreground' : 'font-medium'}>{b.available_count}</span> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Books')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(b) => b.id}
        searchPlaceholder={tr('Search title or ISBN…')}
        onRowClick={(b) => navigate(`/library/books/${b.id}`)}
        toolbar={
          <PermissionGate permission={PERMS.library.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add book')}
            </Button>
          </PermissionGate>
        }
        filters={[{ name: 'category', label: tr('Category'), options: categories.map((c) => ({ value: String(c.id), label: c.name })) }]}
        empty={{ title: tr('The catalog is empty'), description: tr('Add books, then their copies with accession numbers.') }}
      />
      <BookDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} onSaved={(b) => !crud.record && navigate(`/library/books/${b.id}`)} />
    </>
  )
}
