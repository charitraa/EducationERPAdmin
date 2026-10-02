import { Globe } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { StatusPage } from './StatusPage'

/**
 * Public pages (admission form, careers, status check) live under
 * /public/:organizationCode/… and use /api/v1/public/organizations/{code}/….
 * The routes exist; the screens come with the Applications and Careers modules.
 */
export default function PublicPlaceholder() {
  const { organizationCode } = useParams()
  return (
    <div className="min-h-dvh bg-background">
      <StatusPage icon={Globe} code={organizationCode} title="This page isn't open yet">
        Online admission forms, job applications and status checks will be available here soon.
      </StatusPage>
    </div>
  )
}
