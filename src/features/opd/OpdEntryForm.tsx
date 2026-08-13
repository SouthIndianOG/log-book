import { useState, type FormEvent } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { db } from '../../lib/db/schema'
import { createRecord } from '../../lib/sync/outbox'
import { todayISO, addDaysISO } from '../../lib/date'
import type {
  OpdProcedureType,
  GdmVisitType,
  EctopicMgmtType,
  ContraceptionAction,
} from '../../lib/db/types'
import { toTitleCase } from '../../lib/db/autocomplete'

const PROCEDURE_LABELS: Record<OpdProcedureType, string> = {
  usg: 'USG (Ultrasound)',
  mtp: 'MTP (Termination)',
  contraception: 'Contraception',
  gdm: 'GDM (Gestational Diabetes)',
  ectopic_hcg: 'Ectopic hCG Tracker',
  other: 'Other OPD Procedure / Consult',
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
  const [patientAge, setPatientAge] = useState('')
  const [patientRef, setPatientRef] = useState(initialPatientRef ?? '')
  const [entryDate, setEntryDate] = useState(todayISO())
  const [fellowshipTag, setFellowshipTag] = useState('')

  // USG fields
  const [usgScanType, setUsgScanType] = useState('Early Viability')
  const [gestationalAge, setGestationalAge] = useState('')
  const [usgFindings, setUsgFindings] = useState('')
  const [usgEfw, setUsgEfw] = useState('')
  const [usgAfi, setUsgAfi] = useState('')
  const [usgFollowupNeeded, setUsgFollowupNeeded] = useState(false)
  const [usgFollowupDate, setUsgFollowupDate] = useState('')

  // MTP fields
  const [mtpMethod, setMtpMethod] = useState('Medical (Mife + Miso)')
  const [mtpIndication, setMtpIndication] = useState('')
  const [mtpComplication, setMtpComplication] = useState('')

  // Contraception fields
  const [contraceptionMethod, setContraceptionMethod] = useState('DMPA (Depo)')
  const [contraceptionAction, setContraceptionAction] = useState<ContraceptionAction>('administration')
  const [contraceptionDueDate, setContraceptionDueDate] = useState('')
  const [contraceptionNotes, setContraceptionNotes] = useState('')

  // GDM fields
  const [gdmVisitType, setGdmVisitType] = useState<GdmVisitType>(initialGdmVisitType ?? 'new')
  const [gdmFasting, setGdmFasting] = useState('')
  const [gdmPp, setGdmPp] = useState('')
  const [gdmManagement, setGdmManagement] = useState('Diet alone')
  const [gdmNextVisitDate, setGdmNextVisitDate] = useState('')

  // Ectopic hCG fields
  const [ectopicMgmtType, setEctopicMgmtType] = useState<EctopicMgmtType>('medical_mtx')
  const [ectopicHcgValue, setEctopicHcgValue] = useState('')
  const [ectopicDayNum, setEctopicDayNum] = useState(1)
  const [ectopicMassSize, setEctopicMassSize] = useState('')
  const [ectopicSymptoms, setEctopicSymptoms] = useState('Asymptomatic')
  const [ectopicNextHcgDate, setEctopicNextHcgDate] = useState('')

  // HPE fields
  const [hpeSent, setHpeSent] = useState(false)
  const [hpeNotes, setHpeNotes] = useState('')

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
      patient_name: toTitleCase(patientName.trim()),
      patient_age: patientAge ? parseInt(patientAge, 10) : null,
      patient_ref: patientRef.trim() || null,
      entry_date: entryDate,
      gestational_age: gestationalAge.trim() || null,

      // USG
      usg_scan_type: procedureType === 'usg' ? usgScanType : null,
      usg_findings: procedureType === 'usg' ? usgFindings.trim() || null : null,
      usg_efw: procedureType === 'usg' && usgEfw ? parseFloat(usgEfw) : null,
      usg_afi: procedureType === 'usg' && usgAfi ? parseFloat(usgAfi) : null,
      usg_followup_needed: procedureType === 'usg' ? usgFollowupNeeded : null,
      usg_followup_date: procedureType === 'usg' && usgFollowupNeeded ? usgFollowupDate || null : null,

      // MTP
      mtp_method: procedureType === 'mtp' ? mtpMethod : null,
      mtp_indication: procedureType === 'mtp' ? mtpIndication.trim() || null : null,
      mtp_complication: procedureType === 'mtp' ? mtpComplication.trim() || null : null,

      // Contraception
      contraception_method: procedureType === 'contraception' ? contraceptionMethod : null,
      contraception_action: procedureType === 'contraception' ? contraceptionAction : null,
      contraception_due_date: procedureType === 'contraception' ? contraceptionDueDate || null : null,
      contraception_notes: procedureType === 'contraception' ? contraceptionNotes.trim() || null : null,

      // GDM
      gdm_visit_type: procedureType === 'gdm' ? gdmVisitType : null,
      gdm_fasting_value: procedureType === 'gdm' && gdmFasting ? Number(gdmFasting) : null,
      gdm_pp_value: procedureType === 'gdm' && gdmPp ? Number(gdmPp) : null,
      gdm_management: procedureType === 'gdm' ? gdmManagement : null,
      gdm_next_visit_date: procedureType === 'gdm' ? gdmNextVisitDate || null : null,

      // Ectopic
      ectopic_mgmt_type: procedureType === 'ectopic_hcg' ? ectopicMgmtType : null,
      ectopic_hcg_value: procedureType === 'ectopic_hcg' && ectopicHcgValue ? parseFloat(ectopicHcgValue) : null,
      ectopic_day_num: procedureType === 'ectopic_hcg' ? ectopicDayNum : null,
      ectopic_mass_size: procedureType === 'ectopic_hcg' ? ectopicMassSize.trim() || null : null,
      ectopic_symptoms: procedureType === 'ectopic_hcg' ? ectopicSymptoms : null,
      ectopic_next_hcg_date: procedureType === 'ectopic_hcg' ? ectopicNextHcgDate || null : null,

      // HPE
      hpe_status: hpeSent ? 'pending' : 'none',
      hpe_notes: hpeSent && hpeNotes.trim() ? hpeNotes.trim() : null,

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
      <h2 className="text-base font-medium text-neutral-900 mb-3">{PROCEDURE_LABELS[procedureType]}</h2>
      <form onSubmit={handleSubmit} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label htmlFor="opd-patient-name" className="block text-xs text-neutral-600 mb-1">
              Patient name
            </label>
            <input
              id="opd-patient-name"
              name="patientName"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Patient Name"
            />
          </div>
          <div>
            <label htmlFor="opd-patient-age" className="block text-xs text-neutral-600 mb-1">
              Age
            </label>
            <input
              id="opd-patient-age"
              name="patientAge"
              type="number"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
              placeholder="Age"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="opd-patient-ref" className="block text-xs text-neutral-600 mb-1">
              Patient Ref / OPD No.
            </label>
            <input
              id="opd-patient-ref"
              name="patientRef"
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="OPD-5501"
            />
          </div>
          <div>
            <label htmlFor="opd-entry-date" className="block text-xs text-neutral-600 mb-1">
              Visit Date
            </label>
            <input
              id="opd-entry-date"
              name="entryDate"
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* 1. USG Form */}
        {procedureType === 'usg' && (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Scan Type</span>
              <div className="flex flex-wrap gap-1">
                {['Early Viability', 'NT Scan', 'Anomaly / TIFFA', 'Growth & Doppler', 'Follicular Study', 'Gynae Pelvic'].map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setUsgScanType(type)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        usgScanType === type
                          ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                          : 'bg-white text-neutral-700 border-neutral-300'
                      }`}
                    >
                      {type}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="usg-ga" className="block text-[11px] text-neutral-600 mb-0.5">
                  GA (wks/days)
                </label>
                <input
                  id="usg-ga"
                  value={gestationalAge}
                  onChange={(e) => setGestationalAge(e.target.value)}
                  placeholder="32w 4d"
                  className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs bg-white"
                />
              </div>
              <div>
                <label htmlFor="usg-efw" className="block text-[11px] text-neutral-600 mb-0.5">
                  EFW (grams)
                </label>
                <input
                  id="usg-efw"
                  type="number"
                  value={usgEfw}
                  onChange={(e) => setUsgEfw(e.target.value)}
                  placeholder="1950"
                  className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs bg-white"
                />
              </div>
              <div>
                <label htmlFor="usg-afi" className="block text-[11px] text-neutral-600 mb-0.5">
                  AFI (cm)
                </label>
                <input
                  id="usg-afi"
                  type="number"
                  step="0.1"
                  value={usgAfi}
                  onChange={(e) => setUsgAfi(e.target.value)}
                  placeholder="12.5"
                  className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <span className="block text-[11px] text-neutral-600 mb-1">Quick Findings Chips</span>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {[
                  'Single live intrauterine pregnancy',
                  'Normal growth',
                  'Oligohydramnios',
                  'FGR / IUGR',
                  'Placenta previa',
                  'Ovarian cyst',
                  'Fibroid uterus',
                  'RPOC seen',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      setUsgFindings((prev) => (prev ? `${prev}, ${chip}` : chip))
                    }
                    className="text-[11px] px-2 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-100"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
              <textarea
                value={usgFindings}
                onChange={(e) => setUsgFindings(e.target.value)}
                placeholder="USG Findings details..."
                rows={2}
                className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs text-neutral-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={usgFollowupNeeded}
                  onChange={(e) => setUsgFollowupNeeded(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900"
                />
                Repeat USG Review Needed
              </label>

              {usgFollowupNeeded && (
                <div className="mt-2 space-y-1.5">
                  <span className="block text-[11px] text-neutral-500">Quick 1-Tap Target Date:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUsgFollowupDate(addDaysISO(entryDate, 7))}
                      className="px-2.5 py-1 text-xs bg-white border border-neutral-300 rounded-lg"
                    >
                      +1 Wk
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsgFollowupDate(addDaysISO(entryDate, 14))}
                      className="px-2.5 py-1 text-xs bg-white border border-neutral-300 rounded-lg"
                    >
                      +2 Wks
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsgFollowupDate(addDaysISO(entryDate, 28))}
                      className="px-2.5 py-1 text-xs bg-white border border-neutral-300 rounded-lg"
                    >
                      +4 Wks
                    </button>
                  </div>
                  <input
                    type="date"
                    value={usgFollowupDate}
                    onChange={(e) => setUsgFollowupDate(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-2.5 py-1 text-xs bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. MTP Form */}
        {procedureType === 'mtp' && (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">MTP Method</span>
              <div className="flex gap-1">
                {['Medical (Mife + Miso)', 'Surgical (MVA)', 'Surgical (D&E)'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setMtpMethod(method)}
                    className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                      mtpMethod === method
                        ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="mtp-ga" className="block text-xs text-neutral-600 mb-1">
                Gestational Age (weeks)
              </label>
              <input
                id="mtp-ga"
                value={gestationalAge}
                onChange={(e) => setGestationalAge(e.target.value)}
                placeholder="e.g. 7w 2d"
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs bg-white"
              />
            </div>

            <div>
              <label htmlFor="mtp-indication" className="block text-xs text-neutral-600 mb-1">
                Indication
              </label>
              <input
                id="mtp-indication"
                value={mtpIndication}
                onChange={(e) => setMtpIndication(e.target.value)}
                placeholder="e.g. Failure of contraception / Congenital anomaly"
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs bg-white"
              />
            </div>

            <div>
              <label htmlFor="mtp-complication" className="block text-xs text-neutral-600 mb-1">
                Outcome / Complication check
              </label>
              <input
                id="mtp-complication"
                value={mtpComplication}
                onChange={(e) => setMtpComplication(e.target.value)}
                placeholder="e.g. Complete expulsion / RPOC watch"
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs bg-white"
              />
            </div>
          </div>
        )}

        {/* 3. Contraception Form */}
        {procedureType === 'contraception' && (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Method</span>
              <div className="flex flex-wrap gap-1">
                {['DMPA (Depo)', 'LNG-IUS (Mirena)', 'Interval Cu-T', 'PPIUCD', 'OCPs', 'Tubectomy', 'Implanon'].map(
                  (m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setContraceptionMethod(m)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        contraceptionMethod === m
                          ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                          : 'bg-white text-neutral-700 border-neutral-300'
                      }`}
                    >
                      {m}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Action</span>
              <div className="flex gap-1">
                {(['insertion', 'administration', 'prescription', 'removal'] as ContraceptionAction[]).map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => setContraceptionAction(act)}
                    className={`flex-1 py-1 text-xs rounded-lg border capitalize transition-colors ${
                      contraceptionAction === act
                        ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>

            {/* 1-Tap Auto Calculated Target Dates */}
            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">
                Next Dose / Expiry Date (1-Tap Auto Calculate)
              </span>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                <button
                  type="button"
                  onClick={() => setContraceptionDueDate(addDaysISO(entryDate, 90))}
                  className="text-xs px-2.5 py-1 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100"
                >
                  +12 Wks (DMPA 90d)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(entryDate)
                    d.setFullYear(d.getFullYear() + 5)
                    setContraceptionDueDate(d.toISOString().slice(0, 10))
                  }}
                  className="text-xs px-2.5 py-1 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100"
                >
                  +5 Yrs (Mirena)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(entryDate)
                    d.setFullYear(d.getFullYear() + 10)
                    setContraceptionDueDate(d.toISOString().slice(0, 10))
                  }}
                  className="text-xs px-2.5 py-1 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100"
                >
                  +10 Yrs (Cu-T 380A)
                </button>
              </div>
              <input
                type="date"
                value={contraceptionDueDate}
                onChange={(e) => setContraceptionDueDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
              />
            </div>

            <div>
              <label htmlFor="contraception-notes" className="block text-xs text-neutral-600 mb-1">
                Notes / Side-effects
              </label>
              <textarea
                id="contraception-notes"
                value={contraceptionNotes}
                onChange={(e) => setContraceptionNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs bg-white"
                placeholder="Batch no, site, tolerability..."
              />
            </div>
          </div>
        )}

        {/* 4. GDM Form */}
        {procedureType === 'gdm' && (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Visit Type</span>
              <div className="flex gap-2">
                {(['new', 'follow_up'] as GdmVisitType[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGdmVisitType(v)}
                    className={`flex-1 py-1 text-xs rounded-lg border capitalize transition-colors ${
                      gdmVisitType === v
                        ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {v.replace('_', '-')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="gdm-fasting" className="block text-xs text-neutral-600 mb-1">
                  Fasting (mg/dL)
                </label>
                <input
                  id="gdm-fasting"
                  type="number"
                  value={gdmFasting}
                  onChange={(e) => setGdmFasting(e.target.value)}
                  placeholder="92"
                  className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm bg-white"
                />
              </div>
              <div>
                <label htmlFor="gdm-pp" className="block text-xs text-neutral-600 mb-1">
                  2hr PPBS (mg/dL)
                </label>
                <input
                  id="gdm-pp"
                  type="number"
                  value={gdmPp}
                  onChange={(e) => setGdmPp(e.target.value)}
                  placeholder="135"
                  className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm bg-white"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Management Mode</span>
              <div className="flex gap-1">
                {['Diet alone', 'Metformin', 'Insulin'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setGdmManagement(m)}
                    className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                      gdmManagement === m
                        ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">1-Tap Next Visit Due Date</span>
              <div className="flex gap-1.5 mb-1.5">
                <button
                  type="button"
                  onClick={() => setGdmNextVisitDate(addDaysISO(entryDate, 7))}
                  className="px-2.5 py-1 text-xs bg-white border border-neutral-300 rounded-lg"
                >
                  +1 Wk
                </button>
                <button
                  type="button"
                  onClick={() => setGdmNextVisitDate(addDaysISO(entryDate, 14))}
                  className="px-2.5 py-1 text-xs bg-white border border-neutral-300 rounded-lg"
                >
                  +2 Wks
                </button>
                <button
                  type="button"
                  onClick={() => setGdmNextVisitDate(addDaysISO(entryDate, 28))}
                  className="px-2.5 py-1 text-xs bg-white border border-neutral-300 rounded-lg"
                >
                  +4 Wks
                </button>
              </div>
              <input
                type="date"
                value={gdmNextVisitDate}
                onChange={(e) => setGdmNextVisitDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
          </div>
        )}

        {/* 5. Ectopic hCG Tracker Form */}
        {procedureType === 'ectopic_hcg' && (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Management Type</span>
              <div className="flex gap-1">
                {(['medical_mtx', 'post_op', 'expectant'] as EctopicMgmtType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEctopicMgmtType(t)}
                    className={`flex-1 py-1 text-xs rounded-lg border capitalize transition-colors ${
                      ectopicMgmtType === t
                        ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="ectopic-hcg-val" className="block text-xs text-neutral-600 mb-1">
                  Beta-hCG (mIU/mL)
                </label>
                <input
                  id="ectopic-hcg-val"
                  type="number"
                  value={ectopicHcgValue}
                  onChange={(e) => setEctopicHcgValue(e.target.value)}
                  placeholder="2450"
                  className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm bg-white"
                />
              </div>
              <div>
                <span className="block text-xs text-neutral-600 mb-1">Day Step</span>
                <div className="flex gap-1">
                  {[1, 4, 7, 14].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setEctopicDayNum(day)
                        if (day === 1) setEctopicNextHcgDate(addDaysISO(entryDate, 3)) // Day 4 (+3d)
                        if (day === 4) setEctopicNextHcgDate(addDaysISO(entryDate, 3)) // Day 7 (+3d)
                        if (day === 7) setEctopicNextHcgDate(addDaysISO(entryDate, 7)) // Day 14 (+7d)
                      }}
                      className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                        ectopicDayNum === day
                          ? 'bg-neutral-900 text-white border-neutral-900 font-bold'
                          : 'bg-white text-neutral-700 border-neutral-300'
                      }`}
                    >
                      D{day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Next hCG Due Date (Auto Suggested)</span>
              <input
                type="date"
                value={ectopicNextHcgDate}
                onChange={(e) => setEctopicNextHcgDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="ectopic-mass" className="block text-xs text-neutral-600 mb-1">
                  Adnexal Mass Size
                </label>
                <input
                  id="ectopic-mass"
                  value={ectopicMassSize}
                  onChange={(e) => setEctopicMassSize(e.target.value)}
                  placeholder="2.5 x 1.8 cm"
                  className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
                />
              </div>
              <div>
                <span className="block text-xs text-neutral-600 mb-1">Symptoms</span>
                <select
                  value={ectopicSymptoms}
                  onChange={(e) => setEctopicSymptoms(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs bg-white"
                >
                  <option value="Asymptomatic">Asymptomatic</option>
                  <option value="Mild Pain">Mild Pain</option>
                  <option value="PV Bleeding">PV Bleeding</option>
                  <option value="Severe Pain">Severe Pain</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 6. Other OPD Procedures Form */}
        {procedureType === 'other' && (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div>
              <label htmlFor="opd-other-desc" className="block text-xs font-semibold text-neutral-700 mb-1">
                Procedure / Consult Description
              </label>
              <textarea
                id="opd-other-desc"
                value={otherDescription}
                onChange={(e) => setOtherDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs bg-white"
                placeholder="e.g. Pap Smear / Cervical Polyp Excision / IUI / Colposcopy & Biopsy..."
              />
            </div>
          </div>
        )}

        {/* Tissue sent for HPE Checkbox (for any OPD procedure) */}
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
                placeholder="Specimen notes (e.g. Endometrial curettage, Polyp)"
                value={hpeNotes}
                onChange={(e) => setHpeNotes(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="opd-fellowship-tag" className="block text-xs text-neutral-600 mb-1">
              Fellowship Tag
            </label>
            <input
              id="opd-fellowship-tag"
              name="fellowshipTag"
              value={fellowshipTag}
              onChange={(e) => setFellowshipTag(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
              placeholder="e.g. F.MAS"
            />
          </div>
          <div>
            <label htmlFor="opd-photo" className="block text-xs text-neutral-600 mb-1">
              Photo (optional)
            </label>
            <input
              id="opd-photo"
              name="photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !patientName.trim()}
          className="w-full rounded-lg bg-neutral-900 text-white py-3 font-medium text-sm disabled:opacity-50 mt-2"
        >
          {saving ? 'Saving…' : 'Save Entry'}
        </button>
      </form>
    </BottomSheet>
  )
}
