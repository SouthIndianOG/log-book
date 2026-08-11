import type { ReactNode } from 'react'

export function BottomSheet({
  onClose,
  children,
}: {
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90svh] overflow-y-auto rounded-t-2xl bg-white p-5 pb-8">
        {children}
      </div>
    </div>
  )
}
