import { BottomSheet } from '../../components/BottomSheet'
import type { GdmFollowUpDue } from './useGdmFollowUpsDue'

export function GdmFollowUpsDueSheet({
  items,
  onClose,
  onPick,
}: {
  items: GdmFollowUpDue[]
  onClose: () => void
  onPick: (item: GdmFollowUpDue) => void
}) {
  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base font-medium text-neutral-900 mb-4">GDM follow-ups due</h2>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.patientName}
            type="button"
            onClick={() => onPick(item)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100 flex items-center justify-between gap-3"
          >
            <span>{item.patientName}</span>
            <span className="text-sm text-amber-700 shrink-0">
              due {item.dueDate} · {item.daysOverdue}d overdue
            </span>
          </button>
        ))}
        {items.length === 0 && <p className="text-sm text-neutral-500 px-3 py-2">Nothing due.</p>}
      </div>
    </BottomSheet>
  )
}
