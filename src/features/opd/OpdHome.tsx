import { useState } from 'react'
import { useOpdActionItems } from './useOpdActionItems'
import { OpdEntryForm } from './OpdEntryForm'
import { OpdActionItemsSheet } from './OpdActionItemsSheet'
import type { OpdProcedureType } from '../../lib/db/types'

const TYPES: { type: OpdProcedureType; label: string; icon: string }[] = [
  { type: 'usg', label: 'USG', icon: '👶' },
  { type: 'mtp', label: 'MTP', icon: '💊' },
  { type: 'contraception', label: 'Contraception', icon: '🛡️' },
  { type: 'gdm', label: 'GDM', icon: '🩸' },
  { type: 'ectopic_hcg', label: 'Ectopic hCG', icon: '📉' },
  { type: 'other', label: 'Other', icon: '🩺' },
]

const LAST_USED_KEY = 'opd_last_used_type'

export function OpdHome({ userId }: { userId: string }) {
  const [lastUsed, setLastUsed] = useState<OpdProcedureType | null>(
    () => (localStorage.getItem(LAST_USED_KEY) as OpdProcedureType | null) ?? null,
  )
  const [activeType, setActiveType] = useState<OpdProcedureType | null>(null)
  const [prefill, setPrefill] = useState<{ patientName: string; procedureType: OpdProcedureType } | null>(null)
  const [showActionItems, setShowActionItems] = useState(false)

  const actionItemsSummary = useOpdActionItems(userId)

  function handleSaved() {
    if (activeType) {
      localStorage.setItem(LAST_USED_KEY, activeType)
      setLastUsed(activeType)
    }
    setActiveType(null)
    setPrefill(null)
  }

  return (
    <div className="min-h-svh bg-white p-4">
      <h1 className="text-base font-medium text-neutral-900 mb-3">OPD Quick Log</h1>

      {actionItemsSummary && actionItemsSummary.totalCount > 0 && (
        <button
          type="button"
          onClick={() => setShowActionItems(true)}
          className="w-full mb-4 rounded-xl bg-amber-50 border border-amber-300 p-3 text-sm text-amber-900 text-left shadow-sm hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
              </span>
              OPD Action Items Due
            </span>
            <span className="bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded-full font-bold">
              {actionItemsSummary.totalCount}
            </span>
          </div>
          <div className="flex gap-2 text-xs text-amber-800 mt-1.5">
            {actionItemsSummary.gdmCount > 0 && <span>GDM: {actionItemsSummary.gdmCount}</span>}
            {actionItemsSummary.ectopicCount > 0 && <span>Ectopic: {actionItemsSummary.ectopicCount}</span>}
            {actionItemsSummary.usgCount > 0 && <span>USG: {actionItemsSummary.usgCount}</span>}
            {actionItemsSummary.hpeCount > 0 && <span>HPE: {actionItemsSummary.hpeCount}</span>}
          </div>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {TYPES.map(({ type, label, icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`rounded-2xl border p-5 flex flex-col items-center justify-center gap-2 transition-all ${
              lastUsed === type
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-900/20'
                : 'border-neutral-200 bg-neutral-50/50 text-neutral-800 hover:border-neutral-400'
            }`}
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {activeType && (
        <OpdEntryForm
          userId={userId}
          procedureType={activeType}
          initialPatientName={prefill?.patientName}
          onClose={() => {
            setActiveType(null)
            setPrefill(null)
          }}
          onSaved={handleSaved}
        />
      )}

      {showActionItems && actionItemsSummary && (
        <OpdActionItemsSheet
          summary={actionItemsSummary}
          onClose={() => setShowActionItems(false)}
          onSelectOpdPatient={(patientName, procedureType) => {
            setPrefill({ patientName, procedureType: procedureType as OpdProcedureType })
            setActiveType(procedureType as OpdProcedureType)
            setShowActionItems(false)
          }}
        />
      )}
    </div>
  )
}
