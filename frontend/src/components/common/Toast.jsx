import { memo } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import useStore from '../../store/useStore'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const variants = {
  success: 'bg-success text-fg-inverse border-success/30',
  error: 'bg-danger text-danger-fg border-danger/30',
  info: 'bg-info text-fg-inverse border-info/30',
}

function Toast({ toast }) {
  const removeToast = useStore((s) => s.removeToast)
  const Icon = icons[toast.type] || Info

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-slide-up ${variants[toast.type] || variants.info}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button onClick={() => removeToast(toast.id)} className="p-0.5 hover:opacity-70 rounded" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function ToastContainer() {
  const toasts = useStore((s) => s.toasts)

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  )
}

export default memo(ToastContainer)
