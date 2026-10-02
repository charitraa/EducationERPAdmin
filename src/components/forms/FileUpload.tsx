import { CheckCircle2, FileText, Loader2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { formatBytes } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { filesApi, type StoredFile } from '@/features/files/api/files.api'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  image: 'image/jpeg,image/png,image/webp',
}

interface FileUploadProps {
  /** Backend upload purpose; decides which types it accepts. */
  purpose: string
  /** Which of pdf/docx/image to allow in the picker. The server checks again. */
  types?: Array<keyof typeof ACCEPT>
  /** Called with the uploaded file (send its `id` with the record) or null when removed. */
  onChange: (file: StoredFile | null) => void
  disabled?: boolean
  id?: string
  'aria-describedby'?: string
}

type State =
  | { kind: 'idle' }
  | { kind: 'uploading'; file: File; progress: number }
  | { kind: 'done'; stored: StoredFile }
  | { kind: 'error'; file: File; message: string }

export function FileUpload({ purpose, types = ['pdf', 'docx', 'image'], onChange, disabled, id, ...aria }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [dragging, setDragging] = useState(false)

  const start = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setState({ kind: 'error', file, message: `${file.name} is ${formatBytes(file.size)}. The limit is 5 MB.` })
      return
    }
    setState({ kind: 'uploading', file, progress: 0 })
    try {
      const stored = await filesApi.upload(file, purpose, (progress) =>
        setState((s) => (s.kind === 'uploading' ? { ...s, progress } : s)),
      )
      setState({ kind: 'done', stored })
      onChange(stored)
    } catch (err) {
      setState({ kind: 'error', file, message: errorMessage(err) })
    }
  }

  const remove = async () => {
    if (state.kind === 'done') {
      // Best effort: an unattached upload can be deleted; otherwise the server keeps it.
      filesApi.remove(state.stored.id).catch(() => undefined)
    }
    setState({ kind: 'idle' })
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const name = state.kind === 'done' ? state.stored.name : state.kind !== 'idle' ? state.file.name : ''
  const size = state.kind === 'done' ? state.stored.size : state.kind !== 'idle' ? state.file.size : 0

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        accept={types.map((t) => ACCEPT[t]).join(',')}
        disabled={disabled || state.kind === 'uploading'}
        onChange={(e) => e.target.files?.[0] && void start(e.target.files[0])}
        {...aria}
      />
      {state.kind === 'idle' ? (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (e.dataTransfer.files[0]) void start(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed px-4 py-5 text-center text-sm',
            dragging ? 'border-primary bg-accent' : 'hover:bg-muted/50',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
          <span>
            <span className="font-medium text-primary">Choose a file</span> or drag it here
          </span>
          <span className="text-xs text-muted-foreground">
            {types.map((t) => (t === 'image' ? 'Images' : t.toUpperCase())).join(', ')} · up to 5 MB
          </span>
        </label>
      ) : (
        <div className={cn('flex items-center gap-3 rounded-md border px-3 py-2', state.kind === 'error' && 'border-danger/40 bg-danger-soft')}>
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(size)}
              {state.kind === 'uploading' && ` · uploading ${state.progress}%`}
            </p>
            {state.kind === 'uploading' && (
              <div className="mt-1 h-1 overflow-hidden rounded bg-muted" role="progressbar" aria-valuenow={state.progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-primary transition-all" style={{ width: `${state.progress}%` }} />
              </div>
            )}
            {state.kind === 'error' && <p className="text-xs font-medium text-danger" role="alert">{state.message}</p>}
          </div>
          {state.kind === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
          {state.kind === 'done' && <CheckCircle2 className="h-4 w-4 text-success" aria-label="Uploaded" />}
          {state.kind !== 'uploading' && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void remove()} aria-label="Remove file">
              <X />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
