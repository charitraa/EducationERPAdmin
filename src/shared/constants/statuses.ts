import {
  Archive,
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Clock,
  FileEdit,
  Loader,
  Lock,
  type LucideIcon,
  Send,
  ShieldCheck,
  Undo2,
  XCircle,
} from 'lucide-react'

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'muted'

/**
 * One visual treatment per backend status value, across every module. Color is
 * never the only signal: each status also has an icon and its label.
 */
export const STATUS_STYLES: Record<string, { tone: StatusTone; icon: LucideIcon }> = {
  active: { tone: 'success', icon: CheckCircle2 },
  inactive: { tone: 'muted', icon: CircleDashed },
  pending: { tone: 'warning', icon: Clock },
  in_review: { tone: 'warning', icon: Clock },
  open: { tone: 'info', icon: CircleDot },
  in_progress: { tone: 'info', icon: Loader },
  approved: { tone: 'success', icon: CheckCircle2 },
  enrolled: { tone: 'success', icon: ShieldCheck },
  verified: { tone: 'success', icon: ShieldCheck },
  published: { tone: 'success', icon: CheckCircle2 },
  paid: { tone: 'success', icon: CheckCircle2 },
  resolved: { tone: 'success', icon: CheckCircle2 },
  completed: { tone: 'success', icon: CheckCircle2 },
  accepted: { tone: 'success', icon: CheckCircle2 },
  issued: { tone: 'info', icon: Send },
  submitted: { tone: 'info', icon: Send },
  scheduled: { tone: 'info', icon: Clock },
  made: { tone: 'info', icon: Send },
  draft: { tone: 'neutral', icon: FileEdit },
  returned: { tone: 'warning', icon: Undo2 },
  on_leave: { tone: 'warning', icon: Clock },
  suspended: { tone: 'danger', icon: Ban },
  rejected: { tone: 'danger', icon: XCircle },
  declined: { tone: 'danger', icon: XCircle },
  cancelled: { tone: 'muted', icon: XCircle },
  withdrawn: { tone: 'muted', icon: Undo2 },
  graduated: { tone: 'info', icon: ShieldCheck },
  left: { tone: 'muted', icon: Archive },
  closed: { tone: 'muted', icon: Lock },
  archived: { tone: 'muted', icon: Archive },
  revoked: { tone: 'danger', icon: Ban },
  filled: { tone: 'success', icon: CheckCircle2 },
  current: { tone: 'success', icon: CheckCircle2 },
  transferred: { tone: 'muted', icon: ArrowRightLeft },
  moved: { tone: 'muted', icon: ArrowRightLeft },
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-secondary text-secondary-foreground border-border',
  info: 'bg-info-soft text-info border-info/20',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/20',
  muted: 'bg-muted text-muted-foreground border-border',
}
