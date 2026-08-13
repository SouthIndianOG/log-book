import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BottomSheet } from '../../components/BottomSheet'
import { db } from '../../lib/db/schema'
import { createRecord } from '../../lib/sync/outbox'
import { upsertComplicationType } from './complicationTypes'
import { daysBetween, todayISO } from '../../lib/date'
import type {
  Case,
  DietStatus,
  AmbulationStatus,
  CatheterStatus,
  DrainStatus,
  DrainColour,
  IvStatus,
} from '../../lib/db/types'

export function QuickLogSheet({
  activeCase,
  userId,
  entryDate,
  onClose,
  onDischarge,
}: {
  activeCase: Case
  userId: string
  entryDate?: string
  onClose: () => void
  onDischarge: () => void
}) {
  const date = entryDate ?? todayISO()
  const isBackfill = date !== todayISO()
  const [expanded, setExpanded] = useState(false)

  // Structured Vitals
  const [tempC, setTempC] = useState('')
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [hr, setHr] = useState('')
  const [spo2, setSpo2] = useState('')
  const [painNrs, setPainNrs] = useState<number | null>(null)

  // Status Toggles
  const [diet, setDiet] = useState<DietStatus>('full')
  const [ambulation, setAmbulation] = useState<AmbulationStatus>('walking')
  const [catheter, setCatheter] = useState<CatheterStatus>('removed_today')
  const [drainStatus, setDrainStatus] = useState<DrainStatus>('removed_today')
  const [drainMl, setDrainMl] = useState('')
  const [drainColour, setDrainColour] = useState<DrainColour>('serous')
  const [ivStatus, setIvStatus] = useState<IvStatus>('discontinued')
  const [flatusPassed, setFlatusPassed] = useState(true)
  const [bowelOpened, setBowelOpened] = useState(true)

  // Notes & Complications
  const [note, setNote] = useState('')
  const [complication, setComplication] = useState('')
  const [complicationDetail, setComplicationDetail] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const complicationTypes = useLiveQuery(
    () => db.complication_types.where('user_id').equals(userId).toArray(),
    [userId],
  )
  const suggestions = (complicationTypes ?? []).slice().sort((a, b) => b.usage_count - a.usage_count)

  const isFever = tempC ? parseFloat(tempC) >= 38.0 : false

  async function logEntry(stableQuicklog: boolean) {
    setSaving(true)
    const now = new Date().toISOString()
    const entryId = crypto.randomUUID()
    const postOpDay = daysBetween(activeCase.admit_date, date)
    const trimmedComplication = complication.trim()

    await createRecord('case_entries', {
      id: entryId,
      case_id: activeCase.id,
      user_id: userId,
      entry_date: date,
      post_op_day: postOpDay,
      note: stableQuicklog ? null : note.trim() || null,
      is_stable_quicklog: stableQuicklog,

      // Vitals & Status toggles
      temp_c: !stableQuicklog && tempC ? parseFloat(tempC) : null,
      bp_sys: !stableQuicklog && bpSys ? parseInt(bpSys, 10) : null,
      bp_dia: !stableQuicklog && bpDia ? parseInt(bpDia, 10) : null,
      hr: !stableQuicklog && hr ? parseInt(hr, 10) : null,
      spo2: !stableQuicklog && spo2 ? parseInt(spo2, 10) : null,
      pain_nrs: !stableQuicklog ? painNrs : null,

      diet: !stableQuicklog ? diet : null,
      ambulation: !stableQuicklog ? ambulation : null,
      catheter: !stableQuicklog ? catheter : null,
      drain_status: !stableQuicklog ? drainStatus : null,
      drain_ml: !stableQuicklog && drainMl ? parseInt(drainMl, 10) : null,
      drain_colour: !stableQuicklog && drainStatus === 'in' ? drainColour : null,
      iv_status: !stableQuicklog ? ivStatus : null,
      flatus_passed: !stableQuicklog ? flatusPassed : null,
      bowel_opened: !stableQuicklog ? bowelOpened : null,

      complication_type: stableQuicklog ? null : trimmedComplication || null,
      complication_detail: stableQuicklog ? null : complicationDetail.trim() || null,
      logged_at: now,
      is_backfill: isBackfill,
      updated_at: now,
      created_at: now,
    })

    if (!stableQuicklog && trimmedComplication) {
      await upsertComplicationType(userId, trimmedComplication)
    }

    if (!stableQuicklog && photo) {
      const attachmentId = crypto.randomUUID()
      await db.attachments.add({
        id: attachmentId,
        entry_id: entryId,
        opd_entry_id: null,
        storage_path: `attachments/${attachmentId}`,
        file_type: photo.type,
        uploaded_at: now,
        localBlob: photo,
        uploadStatus: 'pending',
      })
    }

    setSaving(false)
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base font-medium text-neutral-900">{activeCase.patient_name}</h2>
      <p className="text-sm text-neutral-500 mb-4">
        {activeCase.diagnosis || activeCase.procedure || ''} · POD{daysBetween(activeCase.admit_date, date)}
        {isBackfill && ` · backfill for ${date}`}
      </p>

      <button
        type="button"
        disabled={saving}
        onClick={() => logEntry(true)}
        className="w-full rounded-lg bg-neutral-900 text-white py-3.5 font-medium text-base disabled:opacity-50"
      >
        Stable, no complaints
      </button>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full text-sm text-neutral-500 underline mt-3"
        >
          Add vitals / status toggles / note / complication / photo
        </button>
      ) : (
        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Vitals Section */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Vitals & Pain</h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="vital-temp" className="block text-[11px] text-neutral-600 mb-0.5">
                  Temp (°C)
                </label>
                <input
                  id="vital-temp"
                  type="number"
                  step="0.1"
                  placeholder="37.0"
                  value={tempC}
                  onChange={(e) => setTempC(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-sm ${
                    isFever ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-neutral-300'
                  }`}
                />
              </div>
              <div>
                <label htmlFor="vital-bp-sys" className="block text-[11px] text-neutral-600 mb-0.5">
                  BP Sys/Dia
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="vital-bp-sys"
                    type="number"
                    placeholder="120"
                    value={bpSys}
                    onChange={(e) => setBpSys(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-1.5 py-1.5 text-sm text-center"
                  />
                  <span className="text-neutral-400">/</span>
                  <input
                    id="vital-bp-dia"
                    type="number"
                    placeholder="80"
                    value={bpDia}
                    onChange={(e) => setBpDia(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-1.5 py-1.5 text-sm text-center"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="vital-hr" className="block text-[11px] text-neutral-600 mb-0.5">
                  HR (bpm)
                </label>
                <input
                  id="vital-hr"
                  type="number"
                  placeholder="76"
                  value={hr}
                  onChange={(e) => setHr(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="vital-spo2" className="block text-[11px] text-neutral-600 mb-0.5">
                  SpO₂ (%)
                </label>
                <input
                  id="vital-spo2"
                  type="number"
                  placeholder="99"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm"
                />
              </div>

              <div>
                <span className="block text-[11px] text-neutral-600 mb-0.5">Pain Score (NRS 0-10)</span>
                <div className="flex gap-1 overflow-x-auto pb-0.5">
                  {[0, 2, 4, 6, 8, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setPainNrs(score)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        painNrs === score
                          ? 'bg-neutral-900 text-white border-neutral-900 font-bold'
                          : 'bg-white text-neutral-700 border-neutral-300'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status Toggles Section */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Status Toggles</h3>

            {/* Diet */}
            <div>
              <span className="block text-[11px] text-neutral-600 mb-1 font-medium">Diet</span>
              <div className="flex gap-1">
                {(['nil', 'sips', 'soft', 'full'] as DietStatus[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiet(d)}
                    className={`flex-1 py-1 text-xs rounded-lg border capitalize transition-colors ${
                      diet === d
                        ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Ambulation */}
            <div>
              <span className="block text-[11px] text-neutral-600 mb-1 font-medium">Ambulation</span>
              <div className="flex gap-1">
                {(['bed_rest', 'assisted', 'walking'] as AmbulationStatus[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmbulation(a)}
                    className={`flex-1 py-1 text-xs rounded-lg border capitalize transition-colors ${
                      ambulation === a
                        ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {a.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Catheter & IV */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] text-neutral-600 mb-1 font-medium">Catheter</span>
                <div className="flex gap-1">
                  {(['in', 'removed_today'] as CatheterStatus[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatheter(c)}
                      className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                        catheter === c
                          ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                          : 'bg-white text-neutral-700 border-neutral-300'
                      }`}
                    >
                      {c === 'in' ? 'In' : 'Removed'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-neutral-600 mb-1 font-medium">IV Access</span>
                <div className="flex gap-1">
                  {(['in', 'discontinued'] as IvStatus[]).map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIvStatus(i)}
                      className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                        ivStatus === i
                          ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                          : 'bg-white text-neutral-700 border-neutral-300'
                      }`}
                    >
                      {i === 'in' ? 'In' : 'Stopped'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Drain */}
            <div>
              <span className="block text-[11px] text-neutral-600 mb-1 font-medium">Drain</span>
              <div className="flex gap-1 mb-1.5">
                {(['in', 'removed_today'] as DrainStatus[]).map((ds) => (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => setDrainStatus(ds)}
                    className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                      drainStatus === ds
                        ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {ds === 'in' ? 'In' : 'Removed'}
                  </button>
                ))}
              </div>

              {drainStatus === 'in' && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-200">
                  <div>
                    <label htmlFor="drain-output" className="block text-[10px] text-neutral-500 mb-0.5">
                      Output (ml)
                    </label>
                    <input
                      id="drain-output"
                      type="number"
                      placeholder="50"
                      value={drainMl}
                      onChange={(e) => setDrainMl(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-500 mb-0.5">Colour</span>
                    <select
                      value={drainColour}
                      onChange={(e) => setDrainColour(e.target.value as DrainColour)}
                      className="w-full rounded-lg border border-neutral-300 px-1.5 py-1 text-xs bg-white"
                    >
                      <option value="serous">Serous</option>
                      <option value="serosanguinous">Serosanguinous</option>
                      <option value="haemorrhagic">Haemorrhagic</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Bowel & Flatus Checkboxes */}
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flatusPassed}
                  onChange={(e) => setFlatusPassed(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                />
                Flatus passed ✓
              </label>

              <label className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bowelOpened}
                  onChange={(e) => setBowelOpened(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                />
                Bowel opened ✓
              </label>
            </div>
          </div>

          {/* Notes & Complication */}
          <div>
            <label htmlFor="quicklog-note" className="block text-xs font-semibold text-neutral-700 mb-1">
              Free-Text Note
            </label>
            <textarea
              id="quicklog-note"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Any additional observations..."
            />
          </div>

          <div>
            <label htmlFor="quicklog-complication" className="block text-xs font-semibold text-neutral-700 mb-1">
              Complication Flag (optional)
            </label>
            <input
              id="quicklog-complication"
              name="complication"
              list="complication-suggestions"
              value={complication}
              onChange={(e) => setComplication(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="e.g. Fever, Bleeding, Wound issue"
            />
            <datalist id="complication-suggestions">
              {suggestions.map((c) => (
                <option key={c.id} value={c.label} />
              ))}
            </datalist>
          </div>

          {complication.trim() && (
            <div>
              <label htmlFor="quicklog-complication-detail" className="block text-xs text-neutral-600 mb-1">
                Complication Detail
              </label>
              <textarea
                id="quicklog-complication-detail"
                name="complicationDetail"
                value={complicationDetail}
                onChange={(e) => setComplicationDetail(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label htmlFor="quicklog-photo" className="block text-xs font-semibold text-neutral-700 mb-1">
              Photo Attachment
            </label>
            <input
              id="quicklog-photo"
              name="photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full text-xs"
            />
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => logEntry(false)}
            className="w-full rounded-lg bg-neutral-900 text-white py-3 font-medium text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Detailed Log'}
          </button>
        </div>
      )}

      {!isBackfill && (
        <button type="button" onClick={onDischarge} className="w-full text-sm text-red-600 underline mt-6">
          Discharge this case
        </button>
      )}
    </BottomSheet>
  )
}
