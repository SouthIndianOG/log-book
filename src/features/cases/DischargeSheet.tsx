import { useState, type FormEvent } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { updateRecord } from '../../lib/sync/outbox'
import { todayISO } from '../../lib/date'
import type { Case, DischargeCondition } from '../../lib/db/types'

export function DischargeSheet({ activeCase, onClose }: { activeCase: Case; onClose: () => void }) {
  const [dischargeCondition, setDischargeCondition] = useState<DischargeCondition>('stable')
  const [outcome, setOutcome] = useState('')
  const [followup, setFollowup] = useState('')
  const [followupDate, setFollowupDate] = useState('')
  const [dischargeDate, setDischargeDate] = useState(todayISO())
  const [hpeSent, setHpeSent] = useState(false)
  const [hpeNotes, setHpeNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await updateRecord('cases', activeCase.id, {
      status: 'discharged',
      discharge_date: dischargeDate,
      discharge_condition: dischargeCondition,
      discharge_outcome: outcome.trim() || null,
      discharge_followup: followup.trim() || null,
      discharge_followup_date: followupDate || null,
      hpe_status: hpeSent ? 'pending' : 'none',
      hpe_notes: hpeSent && hpeNotes.trim() ? hpeNotes.trim() : null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base font-medium text-neutral-900 mb-1">Discharge {activeCase.patient_name}</h2>
      <form onSubmit={handleSubmit} className="space-y-3 mt-3">
        <div>
          <span className="block text-xs font-medium text-neutral-600 mb-1">Condition at Discharge</span>
          <div className="flex gap-1.5">
            {(['stable', 'fair', 'guarded', 'ama'] as DischargeCondition[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDischargeCondition(c)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors ${
                  dischargeCondition === c
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-300'
                }`}
              >
                {c === 'ama' ? 'AMA' : c}
              </button>
            ))}
          </div>
        </div>

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
            Outcome summary
          </label>
          <textarea
            id="discharge-outcome"
            name="outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            placeholder="e.g. Post-op recovery uneventful, wound healthy"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="discharge-followup" className="block text-sm text-neutral-600 mb-1">
              Follow-up plan
            </label>
            <input
              id="discharge-followup"
              name="followup"
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              placeholder="e.g. OPD 1 wk"
            />
          </div>
          <div>
            <label htmlFor="discharge-followup-date" className="block text-sm text-neutral-600 mb-1">
              Follow-up date
            </label>
            <input
              id="discharge-followup-date"
              name="followupDate"
              type="date"
              value={followupDate}
              onChange={(e) => setFollowupDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
        </div>

        {/* Tissue sent for HPE */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
            <input
              type="checkbox"
              checked={hpeSent}
              onChange={(e) => setHpeSent(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900"
            />
            Tissue sent for Histopathology (HPE)
          </label>

          {hpeSent && (
            <div>
              <input
                type="text"
                placeholder="Specimen detail (e.g. Ovarian cyst wall, Uterus)"
                value={hpeNotes}
                onChange={(e) => setHpeNotes(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
          )}
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
