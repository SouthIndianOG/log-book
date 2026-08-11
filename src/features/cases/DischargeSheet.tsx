import { useState, type FormEvent } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { updateRecord } from '../../lib/sync/outbox'
import { todayISO } from './helpers'
import type { Case } from '../../lib/db/types'

export function DischargeSheet({ activeCase, onClose }: { activeCase: Case; onClose: () => void }) {
  const [outcome, setOutcome] = useState('')
  const [followup, setFollowup] = useState('')
  const [dischargeDate, setDischargeDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await updateRecord('cases', activeCase.id, {
      status: 'discharged',
      discharge_date: dischargeDate,
      discharge_outcome: outcome.trim() || null,
      discharge_followup: followup.trim() || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base font-medium text-neutral-900 mb-1">Discharge {activeCase.patient_name}</h2>
      <form onSubmit={handleSubmit} className="space-y-3 mt-3">
        <div>
          <label htmlFor="discharge-date" className="block text-sm text-neutral-600 mb-1">
            Discharge date
          </label>
          <input
            id="discharge-date"
            name="dischargeDate"
            type="date"
            required
            value={dischargeDate}
            onChange={(e) => setDischargeDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="discharge-outcome" className="block text-sm text-neutral-600 mb-1">
            Outcome
          </label>
          <textarea
            id="discharge-outcome"
            name="outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="discharge-followup" className="block text-sm text-neutral-600 mb-1">
            Follow-up plan
          </label>
          <textarea
            id="discharge-followup"
            name="followup"
            value={followup}
            onChange={(e) => setFollowup(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-neutral-900 text-white py-2.5 font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Discharge'}
        </button>
      </form>
    </BottomSheet>
  )
}
