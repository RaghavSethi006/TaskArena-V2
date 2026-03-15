import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="bg-s1 border-b1 rounded-[12px] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[14px]">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-tx2 leading-relaxed">{description}</p>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? "h-8 px-3 rounded-[7px] bg-rose-500 text-white text-[12px] hover:bg-rose-600"
                : "h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600"
            }
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
