import * as React from 'react'
import { cn } from '../../lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-line-strong bg-surface px-3 text-[13px] text-ink-900 shadow-[0_1px_1px_rgb(11_18_22/0.03)] transition-colors placeholder:text-ink-500/70 focus:border-signal-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-500',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-9 w-full appearance-none rounded-lg border border-line-strong bg-surface bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%23647b84%22%20stroke-width%3D%221.6%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E")] bg-[length:16px_16px] bg-[right_0.6rem_center] bg-no-repeat pl-3 pr-8 text-[13px] text-ink-900 transition-colors focus:border-signal-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-paper',
      className
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-xs font-medium text-ink-700', className)}
    {...props}
  />
))
Label.displayName = 'Label'
