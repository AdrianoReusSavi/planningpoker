import type { Toast } from '../contexts/ToastContext'

interface ToastItemProps {
  toast: Toast
  index: number
}

export default function ToastItem({ toast, index }: ToastItemProps) {
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '!'

  return (
    <div
      className={`toast toast-${toast.type}`}
      style={{ top: `${20 + index * 52}px` }}
    >
      <span className={`toast-icon toast-icon-${toast.type}`}>{icon}</span>
      {toast.message}
    </div>
  )
}