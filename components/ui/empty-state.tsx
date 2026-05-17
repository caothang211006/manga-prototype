import { cn } from '@/lib/utils'
import { FileText, Inbox, Search, Calendar, AlertCircle } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
  icon?: 'document' | 'inbox' | 'search' | 'calendar' | 'alert'
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const icons = {
  document: FileText,
  inbox: Inbox,
  search: Search,
  calendar: Calendar,
  alert: AlertCircle,
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icon = icons[icon]

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}
