import { useState } from 'react'
import { useGdmFollowUpsDue } from './useGdmFollowUpsDue'
import { OpdEntryForm } from './OpdEntryForm'
import { GdmFollowUpsDueSheet } from './GdmFollowUpsDueSheet'
import type { OpdProcedureType } from '../../lib/db/types'

const TYPES: { type: OpdProcedureType; label: string }[] = [
  { type: 'usg', label: 'USG' },
  { type: 'mtp', label: 'MTP' },
  { type: 'contraception', label: 'Contraception' },
  { type: 'gdm', label: 'GDM' },
  { type: 'other', label: 'Other' },
]

const LAST_USED_KEY = 'opd_last_used_type'

export function OpdHome({ userId }: { userId: string }) {
  const [lastUsed, setLastUsed] = useState<OpdProcedureType | null>(
    () => (localStorage.getItem(LAST_USED_KEY) as OpdProcedureType | null) ?? null,
  )
  const [activeType, setActiveType] = useState<OpdProcedureType | null>(null)
  const [gdmPrefill, setGdmPrefill] = useState<{ patientName: string; patientRef: string | null } | null>(null)
  const [showGdmDue, setShowGdmDue] = useState(false)

  const gdmDue = useGdmFollowUpsDue(userId)

  function handleSaved() {
    if (activeType) {
      localStorage.setItem(LAST_USED_KEY, activeType)
      setLastUsed(activeType)
    }
    setActiveType(null)
    setGdmPrefill(null)
  }

  return (
    <div className="min-h-svh bg-white p-4">
      <h1 className="text-base font-medium text-neutral-900 mb-4">OPD Quick Log</h1>

      {gdmDue && gdmDue.length > 0 && (
        <button
          type="button"
          onClick={() => setShowGdmDue(true)}
          className="w-full mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 text-left"
        >
          GDM follow-ups due: {gdmDue.length}
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {TYPES.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`rounded-xl border py-6 text-base font-medium ${
              lastUsed === type
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'border-neutral-300 text-neutral-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeType && (
        <OpdEntryForm
          userId={userId}
          procedureType={activeType}
          initialPatientName={gdmPrefill?.patientName}
          initialPatientRef={gdmPrefill?.patientRef}
          initialGdmVisitType={gdmPrefill ? 'follow_up' : undefined}
          onClose={() => {
            setActiveType(null)
            setGdmPrefill(null)
          }}
          onSaved={handleSaved}
        />
      )}

      {showGdmDue && (
        <GdmFollowUpsDueSheet
          items={gdmDue ?? []}
          onClose={() => setShowGdmDue(false)}
          onPick={(item) => {
            setGdmPrefill({ patientName: item.patientName, patientRef: item.patientRef })
            setActiveType('gdm')
            setShowGdmDue(false)
          }}
        />
      )}
    </div>
  )
}
