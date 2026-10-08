import { useEffect } from 'react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { env } from '@/lib/env'
import { tr, useLocale } from '@/lib/i18n'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'

type Doc = { title: string; intro: string; sections: { heading: string; body: string[] }[] }

const UPDATED = '2026-10-08'

const TERMS: Doc = {
  title: tr('Terms of Service'),
  intro: tr('These terms cover your use of Education ERP. By creating an account you agree to them on behalf of your institution.'),
  sections: [
    {
      heading: tr('Your account'),
      body: [
        tr('The person who signs up becomes the administrator of the institution account and is responsible for the users they add.'),
        tr('Keep passwords private. Turn on two-step verification for accounts that can see sensitive records.'),
      ],
    },
    {
      heading: tr("Your institution's data"),
      body: [
        tr('The records you enter, such as students, staff, attendance, marks and fees, belong to your institution.'),
        tr('Only enter personal information that your institution is allowed to keep, and keep it accurate.'),
      ],
    },
    {
      heading: tr('Acceptable use'),
      body: [
        tr('Use Education ERP to run an educational institution. Do not use it to break the law, send spam, or try to reach data that belongs to another institution.'),
      ],
    },
    {
      heading: tr('The service'),
      body: [
        tr('Education ERP is free to use. We work to keep it available and secure, but the service is provided as it is, without a guarantee that it will never be interrupted.'),
        tr('We may update these terms. If a change is significant, we will tell administrators before it takes effect.'),
      ],
    },
  ],
}

const PRIVACY: Doc = {
  title: tr('Privacy Policy'),
  intro: tr('This page explains what information Education ERP keeps, why, and who can see it.'),
  sections: [
    {
      heading: tr('What we keep'),
      body: [
        tr("When you sign up: the institution's name and type, and the administrator's name, email and phone number."),
        tr('While you use it: the records your institution enters, and a log of who changed what, so administrators can review activity.'),
      ],
    },
    {
      heading: tr('How it is used'),
      body: [
        tr('Only to run the service for your institution, for example to sign you in, send password-reset emails and show your records to the right people.'),
        tr('We do not sell your data and we do not show advertising.'),
      ],
    },
    {
      heading: tr('Who can see it'),
      body: [
        tr("Each institution's data is kept separate. Inside an institution, roles and permissions decide what each user can see and change."),
        tr('Parents and students see only their own information.'),
      ],
    },
    {
      heading: tr('Security'),
      body: [
        tr('Passwords are stored hashed, never as plain text. Two-step verification is available for every account.'),
        tr('Your browser keeps your sign-in session and your language and theme choices. We do not use advertising or tracking cookies.'),
      ],
    },
  ],
}

export default function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  useLocale()
  const doc = kind === 'terms' ? TERMS : PRIVACY

  usePageMeta({ title: `${doc.title} · ${tr('Education ERP')}`, description: doc.intro })
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [kind])

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader anchors={false} />
      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{tr('Last updated {date}', { date: UPDATED })}</p>
          <p className="mt-6 text-base leading-relaxed">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.heading} className="mt-8">
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-2 leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <section className="mt-8">
            <h2 className="text-lg font-semibold">{tr('Questions')}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {env.contactEmail ? (
                <>
                  {tr('Write to us at')}{' '}
                  <a href={`mailto:${env.contactEmail}`} className="font-medium text-primary hover:underline">
                    {env.contactEmail}
                  </a>
                  .
                </>
              ) : (
                tr("Ask your institution's administrator, or the team that runs this service.")
              )}
            </p>
          </section>
        </article>
      </main>
      <SiteFooter anchors={false} />
    </div>
  )
}
