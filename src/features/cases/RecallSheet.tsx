import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BottomSheet } from '../../components/BottomSheet'
import { db } from '../../lib/db/schema'
import { todayISO } from './helpers'
import type { Case } from '../../lib/db/types'

export function RecallSheet({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (patientCase: Case, entryDate: string) => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Case | null>(null)
  const [entryDate, setEntryDate] = useState(todayISO())

  const cases = useLiveQuery(() => db.cases.where('status').equals('active').toArray(), [])
  const matches = (cases ?? []).filter((c) =>
    c.patient_name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  if (selected) {
    return (
      <BottomSheet onClose={onClose}>
        <h2 className="text-base font-medium text-neutral-900 mb-4">
          Log earlier visit — {selected.patient_name}
        </h2>
        <label htmlFor="recall-entry-date" className="block text-sm text-neutral-600 mb-1">
          Visit date
        </label>
        <input
          id="recall-entry-date"
          name="entryDate"
          type="date"
          value={entryDate}
          max={todayISO()}
          onChange={(e) => setEntryDate(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base mb-4"
        />
        <button
          type="button"
          onClick={() => onPick(selected, entryDate)}
          className="w-full rounded-lg bg-neutral-900 text-white py-2.5 font-medium"
        >
          Continue
        </button>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base font-medium text-neutral-900 mb-4">Log earlier visit</h2>
      <label htmlFor="recall-search" className="sr-only">
        Search patient name
      </label>
      <input
        id="recall-search"
        name="search"
        autoFocus
        placeholder="Search patient name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base mb-3"
      />
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {matches.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100"
          >
            {c.patient_name}
            <span className="text-neutral-500 text-sm"> — {c.diagnosis || c.procedure || ''}</span>
          </button>
        ))}
        {query && matches.length === 0 && (
          <p className="text-sm text-neutral-500 px-3 py-2">No matches</p>
        )}
      </div>
    </BottomSheet>
  )
}
