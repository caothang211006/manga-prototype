'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays, isPast } from 'date-fns'

interface CountdownTimerProps {
  deadline: Date
  className?: string
  showLabel?: boolean
  variant?: 'default' | 'compact'
  onExpire?: () => void
}

export function CountdownTimer({ 
  deadline, 
  className, 
  showLabel = true,
  variant = 'default',
  onExpire 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(deadline))

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = getTimeLeft(deadline)
      setTimeLeft(newTimeLeft)
      
      if (newTimeLeft.expired && onExpire) {
        onExpire()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [deadline, onExpire])

  if (timeLeft.expired) {
    return (
      <div className={cn(
        'text-red-600 font-medium',
        variant === 'compact' ? 'text-xs' : 'text-sm',
        className
      )}>
        {showLabel && 'Expired'}
        {!showLabel && '00:00:00'}
      </div>
    )
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24
  const isCritical = timeLeft.days === 0 && timeLeft.hours < 6

  if (variant === 'compact') {
    return (
      <div className={cn(
        'font-mono text-xs',
        isCritical && 'text-red-600',
        isUrgent && !isCritical && 'text-amber-600',
        !isUrgent && 'text-muted-foreground',
        className
      )}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center gap-2',
      className
    )}>
      {showLabel && (
        <span className="text-sm text-muted-foreground">Time left:</span>
      )}
      <div className={cn(
        'flex items-center gap-1 font-medium',
        isCritical && 'text-red-600',
        isUrgent && !isCritical && 'text-amber-600',
        !isUrgent && 'text-foreground',
      )}>
        {timeLeft.days > 0 && (
          <span className="text-sm">{timeLeft.days}d</span>
        )}
        <span className="font-mono text-sm">
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

function getTimeLeft(deadline: Date) {
  const now = new Date()
  
  if (isPast(deadline)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  const totalSeconds = differenceInSeconds(deadline, now)
  const days = Math.floor(totalSeconds / (60 * 60 * 24))
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds, expired: false }
}

// Helper component for SLA countdowns
// Testing mode: 48 minutes SLA, reminder at 36 minutes (12 minutes remaining)
export function SLATimer({ deadline, className }: { deadline: Date; className?: string }) {
  const now = new Date()
  const minutesRemaining = differenceInMinutes(deadline, now)
  const hoursRemaining = differenceInHours(deadline, now)
  const isOverdue = isPast(deadline)
  const isWarning = !isOverdue && minutesRemaining <= 12 // 12 minutes remaining (at 36 minute mark in testing mode)
  
  return (
    <div className={cn(
      'flex items-center gap-2',
      className
    )}>
      <div className={cn(
        'px-2 py-1 rounded text-xs font-medium',
        isOverdue && 'bg-red-100 text-red-700',
        isWarning && !isOverdue && 'bg-amber-100 text-amber-700',
        !isOverdue && !isWarning && minutesRemaining > 12 && 'bg-emerald-100 text-emerald-700',
      )}>
        {isOverdue ? (
          <span>SLA Breached (BR-MAN-05)</span>
        ) : (
          <>
            <CountdownTimer deadline={deadline} showLabel={false} variant="compact" />
            <span className="ml-1">remaining</span>
            {isWarning && <span className="ml-1">(Warning)</span>}
          </>
        )}
      </div>
    </div>
  )
}
