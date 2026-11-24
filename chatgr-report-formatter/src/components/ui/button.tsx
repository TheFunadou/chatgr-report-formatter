import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,color,border-color,box-shadow,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-signal-600 text-white shadow-[0_1px_0_rgb(255_255_255/0.14)_inset,0_1px_2px_rgb(11_18_22/0.18)] hover:bg-signal-700',
        secondary:
          'border border-line-strong bg-surface text-ink-800 shadow-[0_1px_1px_rgb(11_18_22/0.03)] hover:border-ink-500/50 hover:bg-paper',
        outline:
          'border border-line-strong bg-transparent text-ink-700 hover:bg-surface hover:text-ink-900',
        ghost: 'text-ink-600 hover:bg-ink-900/[0.06] hover:text-ink-900',
        danger:
          'border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100',
        link: 'h-auto p-0 text-signal-700 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-2.5 text-[13px]',
        md: 'h-9 px-3.5 text-[13px]',
        lg: 'h-10 px-4 text-sm',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { buttonVariants }
