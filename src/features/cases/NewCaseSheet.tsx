import { useState, type FormEvent } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { createRecord } from '../../lib/sync/outbox'
import { todayISO } from './helpers'

export function NewCaseSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [patientName, setPatientName] = useState('')
  const [patientRef, setPatientRef] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [procedure, setProcedure] = useState('')
  const [admitDate, setAdmitDate] = useState(todayISO())
  const [fellowshipTag, setFellowshipTag] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()
    await createRecord('cases', {
      id: crypto.randomUUID(),
      user_id: userId,
      patient_name: patientName.trim(),
      patient_ref: patientRef.trim() || null,
      diagnosis: diagnosis.trim() || null,
      procedure: procedure.trim() || null,
      admit_date: admitDate,
      status: 'active',
      discharge_date: null,
      discharge_outcome: null,
      discharge_followup: null,
      fellowship_tag: fellowshipTag.trim() || null,
      updated_at: now,
      created_at: now,
    })
    setSaving(false)
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base font-medium text-neutral-900 mb-4">New case</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-neutral-600 mb-1">Patient name</label>
          <input
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">Patient ref (optional)</label>
          <input
            value={patientRef}
            onChange={(e) => setPatientRef(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">Diagnosis</label>
          <input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">Procedure</label>
          <input
            value={procedure}
            onChange={(e) => setProcedure(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">Admit date</label>
          <input
            type="date"
            required
            value={admitDate}
            onChange={(e) => setAdmitDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">Fellowship tag (optional)</label>
          <input
            value={fellowshipTag}
            onChange={(e) => setFellowshipTag(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !patientName.trim()}
          className="w-full rounded-lg bg-neutral-900 text-white py-2.5 font-medium disabled:opacity-50 mt-2"
        >
          {saving ? 'Saving…' : 'Add case'}
        </button>
      </form>
    </BottomSheet>
  )
}
