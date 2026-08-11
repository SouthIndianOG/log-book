import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/schema'
import { daysBetween, todayISO } from './helpers'
import type { Case, CaseEntry } from '../../lib/db/types'

export interface ActiveCaseRow {
  case: Case
  lastEntry: CaseEntry | null
  lastLoggedAt: string | null
  postOpDay: number | null
  hasEntryToday: boolean
  flagged: boolean
}

// Staleness sort: oldest last-logged-at first (never-logged cases fall
// back to admit_date so a same-day admission isn't treated as infinitely
// stale). "Zero-entries-today sorts above logged-today" falls out of this
// automatically — an unlogged-today case's lastLoggedAt is always older.
export function useActiveCases(): ActiveCaseRow[] | undefined {
  return useLiveQuery(async () => {
    const cases = await db.cases.where('status').equals('active').toArray()
    const today = todayISO()

    const rows: ActiveCaseRow[] = await Promise.all(
      cases.map(async (c) => {
        const entries = await db.case_entries.where('case_id').equals(c.id).sortBy('logged_at')
        const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null
        const lastLoggedAt = lastEntry?.logged_at ?? null
        const postOpDay = lastEntry?.post_op_day ?? daysBetween(c.admit_date, today)
        const hasEntryToday = entries.some((e) => e.entry_date === today)
        const flagged = Boolean(lastEntry?.complication_type)
        return { case: c, lastEntry, lastLoggedAt, postOpDay, hasEntryToday, flagged }
      }),
    )

    rows.sort((a, b) => {
      const aTime = new Date(a.lastLoggedAt ?? a.case.admit_date).getTime()
      const bTime = new Date(b.lastLoggedAt ?? b.case.admit_date).getTime()
      return aTime - bTime
    })

    return rows
  }, [])
}
