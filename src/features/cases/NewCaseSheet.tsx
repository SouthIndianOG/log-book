import { useState, useEffect, type FormEvent } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { createRecord } from '../../lib/sync/outbox'
import { todayISO } from '../../lib/date'
import type { SurgicalRole } from '../../lib/db/types'
import { getAutocompleteProcedures, SEED_PROCEDURES, toTitleCase } from '../../lib/db/autocomplete'

export function NewCaseSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [patientName, setPatientName] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [patientRef, setPatientRef] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [procedure, setProcedure] = useState('')
  const [role, setRole] = useState<SurgicalRole>('performed')
  const [admitDate, setAdmitDate] = useState(todayISO())
  const [fellowshipTag, setFellowshipTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    void getAutocompleteProcedures(procedure).then(setSuggestions)
  }, [procedure])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()
    const formattedProcedure = procedure.trim() ? toTitleCase(procedure) : null
    const formattedDiagnosis = diagnosis.trim() ? toTitleCase(diagnosis) : null

    await createRecord('cases', {
      id: crypto.randomUUID(),
      user_id: userId,
      patient_name: patientName.trim(),
      patient_age: patientAge ? parseInt(patientAge, 10) : null,
      patient_ref: patientRef.trim() || null,
      diagnosis: formattedDiagnosis,
      procedure: formattedProcedure,
      role,
      admit_date: admitDate,
      status: 'active',
      discharge_date: null,
      discharge_condition: null,
      discharge_outcome: null,
      discharge_followup: null,
      discharge_followup_date: null,
      hpe_status: 'none',
      hpe_notes: null,
      fellowship_tag: fellowshipTag.trim() || null,
      updated_at: now,
      created_at: now,
    })
    setSaving(false)
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base font-medium text-neutral-900 mb-4">New Ward Case</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label htmlFor="new-case-patient-name" className="block text-sm text-neutral-600 mb-1">
              Patient name
            </label>
            <input
              id="new-case-patient-name"
              name="patientName"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              placeholder="e.g. Anitha R"
            />
          </div>
          <div>
            <label htmlFor="new-case-patient-age" className="block text-sm text-neutral-600 mb-1">
              Age
            </label>
            <input
              id="new-case-patient-age"
              name="patientAge"
              type="number"
              min="0"
              max="120"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              placeholder="e.g. 28"
            />
          </div>
        </div>

        <div>
          <label htmlFor="new-case-patient-ref" className="block text-sm text-neutral-600 mb-1">
            Patient ref / IPD No. (optional)
          </label>
          <input
            id="new-case-patient-ref"
            name="patientRef"
            value={patientRef}
            onChange={(e) => setPatientRef(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            placeholder="IPD-10245"
          />
        </div>

        <div>
          <label htmlFor="new-case-diagnosis" className="block text-sm text-neutral-600 mb-1">
            Diagnosis
          </label>
          <input
            id="new-case-diagnosis"
            name="diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            placeholder="e.g. Fibroid Uterus / Previous CS in Labor"
          />
        </div>

        <div className="relative">
          <label htmlFor="new-case-procedure" className="block text-sm text-neutral-600 mb-1">
            Procedure
          </label>
          <input
            id="new-case-procedure"
            name="procedure"
            value={procedure}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              setProcedure(e.target.value)
              setShowSuggestions(true)
            }}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            placeholder="Search or select procedure..."
          />

          {showSuggestions && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-white border border-neutral-200 rounded-lg shadow-lg py-1">
              <div className="px-2 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Common Procedures
              </div>
              {suggestions.length > 0 ? (
                suggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setProcedure(item)
                      setShowSuggestions(false)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 transition-colors"
                  >
                    {item}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-neutral-500">Press enter to use "{procedure}"</div>
              )}
              <div className="border-t border-neutral-100 my-1" />
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="w-full text-center py-1 text-xs text-neutral-500 font-medium bg-neutral-50"
              >
                Close suggestions
              </button>
            </div>
          )}
        </div>

        {/* Procedure Seed Quick Pickers */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-medium text-neutral-500">Quick seed picks:</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-neutral-50 rounded-lg border border-neutral-200">
            {Object.entries(SEED_PROCEDURES).map(([category, items]) => (
              <div key={category} className="w-full">
                <span className="text-[10px] text-neutral-400 font-bold uppercase">{category}</span>
                <div className="flex flex-wrap gap-1 mt-0.5 mb-1">
                  {items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setProcedure(item)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        procedure === item
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Surgical Role */}
        <div>
          <span className="block text-sm text-neutral-600 mb-1">Surgical Role</span>
          <div className="flex gap-2">
            {(['performed', 'assisted', 'observed'] as SurgicalRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors ${
                  role === r
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="new-case-admit-date" className="block text-sm text-neutral-600 mb-1">
              Admit date
            </label>
            <input
              id="new-case-admit-date"
              name="admitDate"
              type="date"
              required
              value={admitDate}
              onChange={(e) => setAdmitDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label htmlFor="new-case-fellowship-tag" className="block text-sm text-neutral-600 mb-1">
              Fellowship tag
            </label>
            <input
              id="new-case-fellowship-tag"
              name="fellowshipTag"
              value={fellowshipTag}
              onChange={(e) => setFellowshipTag(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              placeholder="e.g. F.MAS"
            />
          </div>
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
