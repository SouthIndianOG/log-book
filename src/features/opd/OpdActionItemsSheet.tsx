import { useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { updateRecord } from '../../lib/sync/outbox'
import type { ActionItem, OpdActionItemsSummary } from './useOpdActionItems'

export function OpdActionItemsSheet({
  summary,
  onClose,
  onSelectOpdPatient,
}: {
  summary: OpdActionItemsSummary
  onClose: () => void
  onSelectOpdPatient?: (patientName: string, procedureType: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'gdm' | 'ectopic' | 'usg' | 'hpe'>('all')
  const [editingHpeId, setEditingHpeId] = useState<string | null>(null)
  const [hpeResultText, setHpeResultText] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredItems = summary.items.filter((item) => {
    if (activeTab === 'all') return true
    return item.type === activeTab
  })

  async function resolveHpe(item: ActionItem) {
    if (!hpeResultText.trim()) return
    setSaving(true)
    const table = item.recordType === 'case' ? 'cases' : 'opd_entries'
    await updateRecord(table, item.id, {
      hpe_status: 'received',
      hpe_notes: `[Received]: ${hpeResultText.trim()}`,
    })
    setSaving(false)
    setEditingHpeId(null)
    setHpeResultText('')
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base font-medium text-neutral-900 mb-3">OPD Action Items ({summary.totalCount})</h2>

      {/* Tabs Bar */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-neutral-200 mb-3">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
            activeTab === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          All ({summary.totalCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gdm')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
            activeTab === 'gdm' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          GDM ({summary.gdmCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ectopic')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
            activeTab === 'ectopic' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          Ectopic hCG ({summary.ectopicCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('usg')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
            activeTab === 'usg' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          USG Review ({summary.usgCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hpe')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
            activeTab === 'hpe' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          HPE Pending ({summary.hpeCount})
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-neutral-500 py-6 text-center">No action items in this category.</p>
        ) : (
          filteredItems.map((item) => (
            <div key={`${item.recordType}-${item.id}`} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-neutral-900">{item.patientName}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                  {item.type}
                </span>
              </div>
              <p className="text-xs text-neutral-600">{item.detail}</p>
              {item.dueDate && (
                <div className="text-[11px] text-red-600 font-medium">
                  Due: {item.dueDate} ({item.daysOverdue ?? 0} days overdue)
                </div>
              )}

              {item.type === 'hpe' ? (
                editingHpeId === item.id ? (
                  <div className="pt-2 space-y-2 border-t border-neutral-200">
                    <textarea
                      placeholder="Enter histopathology result report..."
                      value={hpeResultText}
                      onChange={(e) => setHpeResultText(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2 rounded-lg border border-neutral-300 bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving || !hpeResultText.trim()}
                        onClick={() => resolveHpe(item)}
                        className="flex-1 py-1 text-xs font-semibold bg-neutral-900 text-white rounded-lg disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Mark Received'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingHpeId(null)}
                        className="px-3 py-1 text-xs font-semibold bg-neutral-200 text-neutral-700 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingHpeId(item.id)
                      setHpeResultText('')
                    }}
                    className="mt-1 text-xs font-medium text-neutral-900 underline"
                  >
                    Enter HPE Result →
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    if (onSelectOpdPatient) {
                      onSelectOpdPatient(item.patientName, item.type === 'ectopic' ? 'ectopic_hcg' : item.type)
                    }
                  }}
                  className="mt-1 text-xs font-medium text-neutral-900 underline"
                >
                  Log Review Entry →
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </BottomSheet>
  )
}
