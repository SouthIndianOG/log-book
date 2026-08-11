import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/schema'
import { todayISO, daysBetween } from '../../lib/date'
import type { OpdEntry } from '../../lib/db/types'

export interface GdmFollowUpDue {
  patientName: string
  patientRef: string | null
  dueDate: string
  daysOverdue: number
}

// No hard FK for GDM follow-up tracking — "due" is derived from each
// patient's most recent GDM entry (by entry_date): if its
// gdm_next_visit_date has passed, it's due. Logging the follow-up creates
// a newer entry that naturally supersedes it — see CLAUDE.md's OPD spec
// ("linked loosely by patient_name, no hard FK needed at this scale").
export function useGdmFollowUpsDue(userId: string): GdmFollowUpDue[] | undefined {
  return useLiveQuery(async () => {
    const entries = await db.opd_entries
      .where('procedure_type')
      .equals('gdm')
      .filter((e) => e.user_id === userId)
      .toArray()

    const latestByPatient = new Map<string, OpdEntry>()
    for (const e of entries) {
      const prev = latestByPatient.get(e.patient_name)
      if (!prev || e.entry_date > prev.entry_date) {
        latestByPatient.set(e.patient_name, e)
      }
    }

    const today = todayISO()
    const due: GdmFollowUpDue[] = []
    for (const e of latestByPatient.values()) {
      if (e.gdm_next_visit_date && e.gdm_next_visit_date <= today) {
        due.push({
          patientName: e.patient_name,
          patientRef: e.patient_ref ?? null,
          dueDate: e.gdm_next_visit_date,
          daysOverdue: daysBetween(e.gdm_next_visit_date, today),
        })
      }
    }
    due.sort((a, b) => b.daysOverdue - a.daysOverdue)
    return due
  }, [userId])
}
