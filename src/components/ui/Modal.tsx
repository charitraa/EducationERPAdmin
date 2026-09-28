import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeClass = {
  sm: 'modal-sm',
  md: '',
  lg: 'modal-lg',
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div className="modal-backdrop fade show" onClick={onClose} aria-hidden="true" />
      <div className="modal fade show" style={{ display: 'block' }} role="dialog" aria-modal="true" tabIndex={-1}>
        <div className={cn('modal-dialog modal-dialog-centered modal-dialog-scrollable', sizeClass[size])}>
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2 className="modal-title fs-5">{title}</h2>
                {description && (
                  <p className="mb-0 mt-1" style={{ fontSize: 13.5, color: 'var(--m-text-muted)' }}>
                    {description}
                  </p>
                )}
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
