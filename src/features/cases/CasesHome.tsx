import { useState } from 'react'
import { useActiveCases } from './useActiveCases'
import { QuickLogSheet } from './QuickLogSheet'
import { DischargeSheet } from './DischargeSheet'
import { NewCaseSheet } from './NewCaseSheet'
import { RecallSheet } from './RecallSheet'
import { formatRelativeTime } from '../../lib/date'
import type { Case } from '../../lib/db/types'

type SheetState =
  | { type: 'quicklog'; case: Case; entryDate?: string }
  | { type: 'discharge'; case: Case }
  | { type: 'new' }
  | { type: 'recall' }
  | null

export function CasesHome({ userId }: { userId: string }) {
  const rows = useActiveCases()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [unloggedOnly, setUnloggedOnly] = useState(false)

  const visibleRows = (rows ?? []).filter((r) => !unloggedOnly || !r.hasEntryToday)
  const loggedCount = (rows ?? []).filter((r) => r.hasEntryToday).length
  const totalCount = rows?.length ?? 0

  return (
    <div className="min-h-svh bg-white pb-24">
      <header className="border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-neutral-900">Active Cases</h1>
          <p className="text-sm text-neutral-500">
            {loggedCount}/{totalCount} logged today
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUnloggedOnly((v) => !v)}
          className={`text-sm px-3 py-1.5 rounded-full border ${
            unloggedOnly
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'border-neutral-300 text-neutral-600'
          }`}
        >
          Unlogged only
        </button>
      </header>

      <ul>
        {visibleRows.map((row) => (
          <li key={row.case.id}>
            <button
              type="button"
              onClick={() => setSheet({ type: 'quicklog', case: row.case })}
              className="w-full text-left px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-neutral-900 truncate">
                  {row.case.patient_name}
                  <span className="text-neutral-500">
                    {' — '}
                    {row.case.diagnosis || row.case.procedure || ''}, POD{row.postOpDay}
                  </span>
                </p>
                <p className="text-sm text-neutral-500">
                  last logged {formatRelativeTime(row.lastLoggedAt ?? undefined)}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                  row.flagged
                    ? 'bg-red-100 text-red-700'
                    : row.hasEntryToday
                      ? 'bg-green-100 text-green-700'
                      : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {row.flagged ? 'flagged' : row.hasEntryToday ? 'logged ✓' : 'not logged'}
              </span>
            </button>
          </li>
        ))}
        {rows && visibleRows.length === 0 && (
          <p className="text-sm text-neutral-500 px-4 py-8 text-center">
            {unloggedOnly ? 'All caught up.' : 'No active cases yet.'}
          </p>
        )}
      </ul>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 px-4 py-3 flex gap-3">
        <button
          type="button"
          onClick={() => setSheet({ type: 'recall' })}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700"
        >
          Log earlier visit
        </button>
        <button
          type="button"
          onClick={() => setSheet({ type: 'new' })}
          className="flex-1 rounded-lg bg-neutral-900 text-white py-2.5 text-sm font-medium"
        >
          + New case
        </button>
      </div>

      {sheet?.type === 'quicklog' && (
        <QuickLogSheet
          activeCase={sheet.case}
          userId={userId}
          entryDate={sheet.entryDate}
          onClose={() => setSheet(null)}
          onDischarge={() => setSheet({ type: 'discharge', case: sheet.case })}
        />
      )}
      {sheet?.type === 'discharge' && (
        <DischargeSheet activeCase={sheet.case} onClose={() => setSheet(null)} />
      )}
      {sheet?.type === 'new' && <NewCaseSheet userId={userId} onClose={() => setSheet(null)} />}
      {sheet?.type === 'recall' && (
        <RecallSheet
          onClose={() => setSheet(null)}
          onPick={(patientCase, entryDate) => setSheet({ type: 'quicklog', case: patientCase, entryDate })}
        />
      )}
    </div>
  )
}
