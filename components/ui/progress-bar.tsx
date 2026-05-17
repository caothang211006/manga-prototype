import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = true,
  variant = 'default',
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  // Auto-detect variant based on percentage for gradient mode
  const getAutoVariant = () => {
    if (variant !== 'gradient') return variant
    if (percentage >= 80) return 'success'
    if (percentage >= 50) return 'warning'
    return 'danger'
  }

  const actualVariant = getAutoVariant()

  const variantStyles = {
    default: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    gradient: percentage >= 80 
      ? 'bg-emerald-500' 
      : percentage >= 50 
        ? 'bg-amber-500' 
        : 'bg-red-500',
  }

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn(
        'flex-1 bg-secondary rounded-full overflow-hidden',
        sizeStyles[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            variantStyles[actualVariant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn(
          'text-sm font-medium tabular-nums min-w-[3ch]',
          actualVariant === 'success' && 'text-emerald-600',
          actualVariant === 'warning' && 'text-amber-600',
          actualVariant === 'danger' && 'text-red-600',
          actualVariant === 'default' && 'text-foreground',
        )}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

// Quorum progress bar for voting
interface QuorumBarProps {
  current: number
  required: number
  className?: string
}

export function QuorumBar({ current, required, className }: QuorumBarProps) {
  const percentage = Math.min((current / required) * 100, 100)
  const hasQuorum = current >= required

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Quorum Progress</span>
        <span className={cn(
          'font-medium',
          hasQuorum ? 'text-emerald-600' : 'text-muted-foreground'
        )}>
          {current}/{required} votes
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            hasQuorum ? 'bg-emerald-500' : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
