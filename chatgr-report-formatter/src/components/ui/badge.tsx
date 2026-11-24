import * as React from 'react'
import { cn } from '../../lib/utils'

type BadgeTone = 'neutral' | 'signal' | 'warning' | 'danger' | 'info' | 'outline'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-ink-900/10 bg-ink-900/[0.05] text-ink-600',
  signal: 'border-signal-200 bg-signal-50 text-signal-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  outline: 'border-line-strong bg-transparent text-ink-600',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  tone = 'neutral',
  dot = false,
  children,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4',
      toneClasses[tone],
      className
    )}
    {...props}
  >
    {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
    {children}
  </span>
)
