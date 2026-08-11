import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BottomSheet } from '../../components/BottomSheet'
import { db } from '../../lib/db/schema'
import { createRecord } from '../../lib/sync/outbox'
import { upsertComplicationType } from './complicationTypes'
import { daysBetween, todayISO } from './helpers'
import type { Case } from '../../lib/db/types'

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
          Add note / complication / photo
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Complication</label>
            <input
              list="complication-suggestions"
              value={complication}
              onChange={(e) => setComplication(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
            <datalist id="complication-suggestions">
              {suggestions.map((c) => (
                <option key={c.id} value={c.label} />
              ))}
            </datalist>
          </div>
          {complication.trim() && (
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Complication detail</label>
              <textarea
                value={complicationDetail}
                onChange={(e) => setComplicationDetail(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => logEntry(false)}
            className="w-full rounded-lg bg-neutral-900 text-white py-2.5 font-medium disabled:opacity-50"
          >
            Save
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
