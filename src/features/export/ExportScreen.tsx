import { useState } from 'react'
import { useExportRows, type ExportFilters } from './useExportRows'
import { rowsToCsv, downloadCsv } from './csv'
import { todayISO } from '../../lib/date'

export function ExportScreen({ userId }: { userId: string }) {
  const [filters, setFilters] = useState<ExportFilters>({
    from: '',
    to: '',
    caseType: 'all',
    procedureQuery: '',
    fellowshipTag: '',
  })

  const rows = useExportRows(userId, filters)

  function handleExportCsv() {
    if (!rows) return
    downloadCsv(`logbook-export-${todayISO()}.csv`, rowsToCsv(rows))
  }

  return (
    <div className="min-h-svh bg-white p-4">
      <h1 className="text-base font-medium text-neutral-900 mb-4">Export</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="export-from" className="block text-sm text-neutral-600 mb-1">
            From
          </label>
          <input
            id="export-from"
            name="from"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="export-to" className="block text-sm text-neutral-600 mb-1">
            To
          </label>
          <input
            id="export-to"
            name="to"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="export-case-type" className="block text-sm text-neutral-600 mb-1">
          Case type
        </label>
        <select
          id="export-case-type"
          name="caseType"
          value={filters.caseType}
          onChange={(e) => setFilters((f) => ({ ...f, caseType: e.target.value as ExportFilters['caseType'] }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
        >
          <option value="all">All</option>
          <option value="inpatient">Inpatient (Ward)</option>
          <option value="opd">OPD</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="export-procedure" className="block text-sm text-neutral-600 mb-1">
            Procedure contains
          </label>
          <input
            id="export-procedure"
            name="procedureQuery"
            value={filters.procedureQuery}
            onChange={(e) => setFilters((f) => ({ ...f, procedureQuery: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="export-fellowship-tag" className="block text-sm text-neutral-600 mb-1">
            Fellowship tag
          </label>
          <input
            id="export-fellowship-tag"
            name="fellowshipTag"
            value={filters.fellowshipTag}
            onChange={(e) => setFilters((f) => ({ ...f, fellowshipTag: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-neutral-500">{rows?.length ?? 0} rows</p>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!rows || rows.length === 0}
          className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-neutral-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left text-neutral-600">
              <th className="px-3 py-2 whitespace-nowrap">Date</th>
              <th className="px-3 py-2 whitespace-nowrap">Ref</th>
              <th className="px-3 py-2">Diagnosis/Procedure</th>
              <th className="px-3 py-2">Findings/Outcome</th>
              <th className="px-3 py-2">Complications</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.patientRef}</td>
                <td className="px-3 py-2">{r.diagnosisProcedure}</td>
                <td className="px-3 py-2">{r.findingsOutcome}</td>
                <td className="px-3 py-2">{r.complications}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && rows.length === 0 && (
          <p className="text-sm text-neutral-500 px-3 py-8 text-center">No matching entries.</p>
        )}
      </div>
    </div>
  )
}
