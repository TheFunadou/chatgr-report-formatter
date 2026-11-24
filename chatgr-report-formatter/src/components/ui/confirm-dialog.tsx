import React from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
    <DialogContent size="sm">
      <DialogHeader>
        <div className="flex items-start gap-3">
          <span
            className={
              tone === 'danger'
                ? 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600'
                : 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-signal-50 text-signal-700'
            }
          >
            <AlertTriangle className="size-4" />
          </span>
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-1 whitespace-pre-line">{description}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <DialogFooter className="justify-end">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
