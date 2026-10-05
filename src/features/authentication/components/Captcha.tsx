import { useEffect, useRef, useState } from 'react'
import type { SignupConfig } from '../api/account.api'
import { tr } from '@/lib/i18n'

type Provider = SignupConfig['captcha_provider']

interface Widget {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string | number
  reset: (id?: string | number) => void
}

declare global {
  interface Window {
    turnstile?: Widget
    hcaptcha?: Widget
    grecaptcha?: { ready: (cb: () => void) => void; execute: (key: string, opts: { action: string }) => Promise<string> }
  }
}

const SCRIPTS: Record<Exclude<Provider, 'off'>, (key: string) => string> = {
  turnstile: () => 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
  hcaptcha: () => 'https://js.hcaptcha.com/1/api.js?render=explicit',
  recaptcha: (key) => `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`,
}

const loading = new Map<string, Promise<void>>()
function loadScript(src: string): Promise<void> {
  let p = loading.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        loading.delete(src)
        reject(new Error(tr('CAPTCHA failed to load')))
      }
      document.head.appendChild(s)
    })
    loading.set(src, p)
  }
  return p
}

/** Wait for a global the provider script defines once it has booted. */
async function waitFor<T>(get: () => T | undefined): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const v = get()
    if (v) return v
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error(tr('CAPTCHA failed to load'))
}

export interface CaptchaHandle {
  /** A token for this submit, or '' when CAPTCHA is off. Throws if there's none yet. */
  token: () => Promise<string>
  /** Tokens are single-use: get a fresh challenge after each submit. */
  reset: () => void
}

/**
 * The widget `GET /signup/config/` asks for. Turnstile and hCaptcha show a
 * checkbox; reCAPTCHA v3 is invisible and scores each submit.
 */
export function Captcha({ provider, siteKey, action, onReady }: { provider: Provider; siteKey: string; action: string; onReady: (h: CaptchaHandle) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (provider === 'off' || !siteKey) {
      onReady({ token: async () => '', reset: () => {} })
      return
    }
    let cancelled = false
    let current = ''
    let widgetId: string | number | undefined
    loadScript(SCRIPTS[provider](siteKey))
      .then(async () => {
        if (provider === 'recaptcha') {
          const g = await waitFor(() => window.grecaptcha)
          onReady({ token: () => new Promise((resolve, reject) => g.ready(() => g.execute(siteKey, { action }).then(resolve, reject))), reset: () => {} })
          return
        }
        const widget = await waitFor(() => (provider === 'turnstile' ? window.turnstile : window.hcaptcha))
        if (cancelled || !box.current) return
        widgetId = widget.render(box.current, {
          sitekey: siteKey,
          action: provider === 'turnstile' ? action : undefined,
          callback: (t: string) => (current = t),
          'expired-callback': () => (current = ''),
        })
        onReady({
          token: async () => {
            if (!current) throw new Error(tr('Complete the check above first.'))
            return current
          },
          reset: () => {
            current = ''
            widget.reset(widgetId)
          },
        })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
    // onReady is a setter from the parent; the widget mounts once per provider.
  }, [provider, siteKey, action])

  if (provider === 'off' || provider === 'recaptcha') return null
  return (
    <div>
      <div ref={box} />
      {failed && <p className="text-sm text-danger">{tr("The anti-spam check didn't load. Turn off content blockers for this page and reload.")}</p>}
    </div>
  )
}
