import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type StatusVariant = 
  | 'default' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'pending'
  | 'draft'

interface StatusBadgeProps {
  status: string
  variant?: StatusVariant
  className?: string
}

const variantStyles: Record<StatusVariant, string> = {
  default: 'bg-secondary text-secondary-foreground',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

// Auto-detect variant based on common status strings
function getVariantFromStatus(status: string): StatusVariant {
  const lowerStatus = status.toLowerCase()
  
  if (['approved', 'published', 'complete', 'active', 'continue'].includes(lowerStatus)) {
    return 'success'
  }
  if (['rejected', 'overdue', 'cancelled', 'cancel', 'delayed', 'flagged'].includes(lowerStatus)) {
    return 'danger'
  }
  if (['pending', 'submitted', 'voting', 'pending-quorum'].includes(lowerStatus)) {
    return 'pending'
  }
  if (['in-progress', 'hiatus'].includes(lowerStatus)) {
    return 'info'
  }
  if (['deferred', 'at-risk'].includes(lowerStatus)) {
    return 'warning'
  }
  if (['draft'].includes(lowerStatus)) {
    return 'draft'
  }
  
  return 'default'
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const autoVariant = variant || getVariantFromStatus(status)
  
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium capitalize',
        variantStyles[autoVariant],
        className
      )}
    >
      {status.replace(/-/g, ' ')}
    </Badge>
  )
}
