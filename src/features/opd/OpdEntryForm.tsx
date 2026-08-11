import { useState, type FormEvent } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { db } from '../../lib/db/schema'
import { createRecord } from '../../lib/sync/outbox'
import { todayISO } from '../../lib/date'
import type { OpdProcedureType, GdmVisitType } from '../../lib/db/types'

const PROCEDURE_LABELS: Record<OpdProcedureType, string> = {
  usg: 'USG',
  mtp: 'MTP',
  contraception: 'Contraception',
  gdm: 'GDM',
  other: 'Other',
}

export function OpdEntryForm({
  userId,
  procedureType,
  initialPatientName,
  initialPatientRef,
  initialGdmVisitType,
  onClose,
  onSaved,
}: {
  userId: string
  procedureType: OpdProcedureType
  initialPatientName?: string
  initialPatientRef?: string | null
  initialGdmVisitType?: GdmVisitType
  onClose: () => void
  onSaved: () => void
}) {
  const [patientName, setPatientName] = useState(initialPatientName ?? '')
  const [patientRef, setPatientRef] = useState(initialPatientRef ?? '')
  const [entryDate, setEntryDate] = useState(todayISO())
  const [fellowshipTag, setFellowshipTag] = useState('')

  const [gestationalAge, setGestationalAge] = useState('')
  const [usgFindings, setUsgFindings] = useState('')
  const [usgFollowupNeeded, setUsgFollowupNeeded] = useState(false)
  const [usgFollowupDate, setUsgFollowupDate] = useState('')

  const [mtpMethod, setMtpMethod] = useState('')
  const [mtpComplication, setMtpComplication] = useState('')

  const [contraceptionMethod, setContraceptionMethod] = useState('')
  const [contraceptionNotes, setContraceptionNotes] = useState('')

  const [gdmVisitType, setGdmVisitType] = useState<GdmVisitType>(initialGdmVisitType ?? 'new')
  const [gdmFasting, setGdmFasting] = useState('')
  const [gdmPp, setGdmPp] = useState('')
  const [gdmNextVisitDate, setGdmNextVisitDate] = useState('')

  const [otherDescription, setOtherDescription] = useState('')

  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()
    const entryId = crypto.randomUUID()

    await createRecord('opd_entries', {
      id: entryId,
      user_id: userId,
      procedure_type: procedureType,
      patient_name: patientName.trim(),
      patient_ref: patientRef.trim() || null,
      entry_date: entryDate,
      gestational_age: procedureType === 'usg' ? gestationalAge.trim() || null : null,
      usg_findings: procedureType === 'usg' ? usgFindings.trim() || null : null,
      usg_followup_needed: procedureType === 'usg' ? usgFollowupNeeded : null,
      usg_followup_date: procedureType === 'usg' && usgFollowupNeeded ? usgFollowupDate || null : null,
      mtp_method: procedureType === 'mtp' ? mtpMethod.trim() || null : null,
      mtp_complication: procedureType === 'mtp' ? mtpComplication.trim() || null : null,
      contraception_method: procedureType === 'contraception' ? contraceptionMethod.trim() || null : null,
      contraception_notes: procedureType === 'contraception' ? contraceptionNotes.trim() || null : null,
      gdm_visit_type: procedureType === 'gdm' ? gdmVisitType : null,
      gdm_fasting_value: procedureType === 'gdm' && gdmFasting ? Number(gdmFasting) : null,
      gdm_pp_value: procedureType === 'gdm' && gdmPp ? Number(gdmPp) : null,
      gdm_next_visit_date: procedureType === 'gdm' ? gdmNextVisitDate || null : null,
      other_description: procedureType === 'other' ? otherDescription.trim() || null : null,
      fellowship_tag: fellowshipTag.trim() || null,
      updated_at: now,
      created_at: now,
    })

    if (photo) {
      const attachmentId = crypto.randomUUID()
      await db.attachments.add({
        id: attachmentId,
        entry_id: null,
        opd_entry_id: entryId,
        storage_path: `attachments/${attachmentId}`,
        file_type: photo.type,
        uploaded_at: now,
        localBlob: photo,
        uploadStatus: 'pending',
      })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base font-medium text-neutral-900 mb-4">{PROCEDURE_LABELS[procedureType]}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="opd-patient-name" className="block text-sm text-neutral-600 mb-1">
            Patient name
          </label>
          <input
            id="opd-patient-name"
            name="patientName"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="opd-patient-ref" className="block text-sm text-neutral-600 mb-1">
            Patient ref (optional)
          </label>
          <input
            id="opd-patient-ref"
            name="patientRef"
            value={patientRef}
            onChange={(e) => setPatientRef(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="opd-entry-date" className="block text-sm text-neutral-600 mb-1">
            Date
          </label>
          <input
            id="opd-entry-date"
            name="entryDate"
            type="date"
            required
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>

        {procedureType === 'usg' && (
          <>
            <div>
              <label htmlFor="opd-gestational-age" className="block text-sm text-neutral-600 mb-1">
                Gestational age
              </label>
              <input
                id="opd-gestational-age"
                name="gestationalAge"
                value={gestationalAge}
                onChange={(e) => setGestationalAge(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </div>
            <div>
              <label htmlFor="opd-usg-findings" className="block text-sm text-neutral-600 mb-1">
                Findings
              </label>
              <textarea
                id="opd-usg-findings"
                name="usgFindings"
                value={usgFindings}
                onChange={(e) => setUsgFindings(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </div>
            <label htmlFor="opd-usg-followup-needed" className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                id="opd-usg-followup-needed"
                name="usgFollowupNeeded"
                type="checkbox"
                checked={usgFollowupNeeded}
                onChange={(e) => setUsgFollowupNeeded(e.target.checked)}
              />
              Follow-up needed
            </label>
            {usgFollowupNeeded && (
              <div>
                <label htmlFor="opd-usg-followup-date" className="block text-sm text-neutral-600 mb-1">
                  Follow-up date
                </label>
                <input
                  id="opd-usg-followup-date"
                  name="usgFollowupDate"
                  type="date"
                  value={usgFollowupDate}
                  onChange={(e) => setUsgFollowupDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                />
              </div>
            )}
          </>
        )}

        {procedureType === 'mtp' && (
          <>
            <div>
              <label htmlFor="opd-mtp-method" className="block text-sm text-neutral-600 mb-1">
                Method
              </label>
              <input
                id="opd-mtp-method"
                name="mtpMethod"
                value={mtpMethod}
                onChange={(e) => setMtpMethod(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </div>
            <div>
              <label htmlFor="opd-mtp-complication" className="block text-sm text-neutral-600 mb-1">
                Complication (optional)
              </label>
              <input
                id="opd-mtp-complication"
                name="mtpComplication"
                value={mtpComplication}
                onChange={(e) => setMtpComplication(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </div>
          </>
        )}

        {procedureType === 'contraception' && (
          <>
            <div>
              <label htmlFor="opd-contraception-method" className="block text-sm text-neutral-600 mb-1">
                Method
              </label>
              <input
                id="opd-contraception-method"
                name="contraceptionMethod"
                value={contraceptionMethod}
                onChange={(e) => setContraceptionMethod(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </div>
            <div>
              <label htmlFor="opd-contraception-notes" className="block text-sm text-neutral-600 mb-1">
                Notes
              </label>
              <textarea
                id="opd-contraception-notes"
                name="contraceptionNotes"
                value={contraceptionNotes}
                onChange={(e) => setContraceptionNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </div>
          </>
        )}

        {procedureType === 'gdm' && (
          <>
            <fieldset className="space-y-1">
              <legend className="block text-sm text-neutral-600 mb-1">Visit type</legend>
              <div className="flex gap-4 text-sm text-neutral-700">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="gdmVisitType"
                    checked={gdmVisitType === 'new'}
                    onChange={() => setGdmVisitType('new')}
                  />
                  New
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="gdmVisitType"
                    checked={gdmVisitType === 'follow_up'}
                    onChange={() => setGdmVisitType('follow_up')}
                  />
                  Follow-up
                </label>
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="opd-gdm-fasting" className="block text-sm text-neutral-600 mb-1">
                  Fasting
                </label>
                <input
                  id="opd-gdm-fasting"
                  name="gdmFasting"
                  type="number"
                  inputMode="decimal"
                  value={gdmFasting}
                  onChange={(e) => setGdmFasting(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                />
              </div>
              <div>
                <label htmlFor="opd-gdm-pp" className="block text-sm text-neutral-600 mb-1">
                  PP
                </label>
                <input
                  id="opd-gdm-pp"
                  name="gdmPp"
                  type="number"
                  inputMode="decimal"
                  value={gdmPp}
                  onChange={(e) => setGdmPp(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                />
              </div>
            </div>
            <div>
              <label htmlFor="opd-gdm-next-visit" className="block text-sm text-neutral-600 mb-1">
                Next visit date
              </label>
              <input
                id="opd-gdm-next-visit"
                name="gdmNextVisitDate"
                type="date"
                value={gdmNextVisitDate}
                onChange={(e) => setGdmNextVisitDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </div>
          </>
        )}

        {procedureType === 'other' && (
          <div>
            <label htmlFor="opd-other-description" className="block text-sm text-neutral-600 mb-1">
              Description
            </label>
            <textarea
              id="opd-other-description"
              name="otherDescription"
              value={otherDescription}
              onChange={(e) => setOtherDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
        )}

        <div>
          <label htmlFor="opd-fellowship-tag" className="block text-sm text-neutral-600 mb-1">
            Fellowship tag (optional)
          </label>
          <input
            id="opd-fellowship-tag"
            name="fellowshipTag"
            value={fellowshipTag}
            onChange={(e) => setFellowshipTag(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>

        <div>
          <label htmlFor="opd-photo" className="block text-sm text-neutral-600 mb-1">
            Photo (optional)
          </label>
          <input
            id="opd-photo"
            name="photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !patientName.trim()}
          className="w-full rounded-lg bg-neutral-900 text-white py-2.5 font-medium disabled:opacity-50 mt-2"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </BottomSheet>
  )
}
