import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const TONE_COLOR: Record<'success' | 'error' | 'info', string> = {
  success: 'var(--m-success)',
  error: 'var(--m-danger)',
  info: 'var(--m-accent)',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1100, display: 'flex', flexDirection: 'column', gap: 8, width: 320 }}>
      {toasts.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <div key={t.id} className="m-toast">
            <Icon size={16} style={{ color: TONE_COLOR[t.variant], marginTop: 2, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: 'var(--m-text)' }}>{t.title}</p>
              {t.description && (
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--m-text-muted)' }}>{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              style={{ background: 'none', border: 0, padding: 0, color: 'var(--m-text-faint)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
