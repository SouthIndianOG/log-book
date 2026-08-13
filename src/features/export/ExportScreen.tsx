import { useState } from 'react'
import { useExportRows, type ExportFilters } from './useExportRows'
import { rowsToCsv, downloadCsv } from './csv'
import { todayISO, addDaysISO } from '../../lib/date'

export function ExportScreen({ userId }: { userId: string }) {
  const [filters, setFilters] = useState<ExportFilters>({
    from: '',
    to: '',
    caseType: 'all',
    role: 'all',
    procedureQuery: '',
    fellowshipTag: '',
  })

  const rows = useExportRows(userId, filters)

  function handleExportCsv() {
    if (!rows) return
    downloadCsv(`logbook-export-${todayISO()}.csv`, rowsToCsv(rows))
  }

  function applyPreset(preset: 'this_month' | 'last_3_months' | 'fellowship_year' | 'all') {
    const today = new Date()
    const todayStr = todayISO()

    if (preset === 'all') {
      setFilters((f) => ({ ...f, from: '', to: '' }))
      return
    }

    if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
      setFilters((f) => ({ ...f, from: firstDay, to: todayStr }))
      return
    }

    if (preset === 'last_3_months') {
      const past = addDaysISO(todayStr, -90)
      setFilters((f) => ({ ...f, from: past, to: todayStr }))
      return
    }

    if (preset === 'fellowship_year') {
      const past = addDaysISO(todayStr, -365)
      setFilters((f) => ({ ...f, from: past, to: todayStr }))
      return
    }
  }

  return (
    <div className="min-h-svh bg-white p-4">
      <h1 className="text-base font-semibold text-neutral-900 mb-3">Export & Fellowship Logbook</h1>

      {/* Date Presets */}
      <div className="mb-4">
        <span className="block text-xs text-neutral-600 mb-1 font-medium">Date Presets</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => applyPreset('this_month')}
            className="px-2.5 py-1 text-xs bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last_3_months')}
            className="px-2.5 py-1 text-xs bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200"
          >
            Last 3 Months
          </button>
          <button
            type="button"
            onClick={() => applyPreset('fellowship_year')}
            className="px-2.5 py-1 text-xs bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200"
          >
            Fellowship Year
          </button>
          <button
            type="button"
            onClick={() => applyPreset('all')}
            className="px-2.5 py-1 text-xs bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200"
          >
            All Time
          </button>
        </div>
      </div>

      {/* Date Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="export-from" className="block text-xs text-neutral-600 mb-1">
            From Date
          </label>
          <input
            id="export-from"
            name="from"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs bg-white"
          />
        </div>
        <div>
          <label htmlFor="export-to" className="block text-xs text-neutral-600 mb-1">
            To Date
          </label>
          <input
            id="export-to"
            name="to"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs bg-white"
          />
        </div>
      </div>

      {/* Case Type & Surgical Role */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="export-case-type" className="block text-xs text-neutral-600 mb-1">
            Case Mode
          </label>
          <select
            id="export-case-type"
            name="caseType"
            value={filters.caseType}
            onChange={(e) => setFilters((f) => ({ ...f, caseType: e.target.value as ExportFilters['caseType'] }))}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs bg-white"
          >
            <option value="all">All (Inpatient + OPD)</option>
            <option value="inpatient">Inpatient Ward only</option>
            <option value="opd">OPD Quick Log only</option>
          </select>
        </div>

        <div>
          <label htmlFor="export-role" className="block text-xs text-neutral-600 mb-1">
            Surgical Role
          </label>
          <select
            id="export-role"
            name="role"
            value={filters.role}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as ExportFilters['role'] }))}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs bg-white"
          >
            <option value="all">All Roles</option>
            <option value="performed">Performed (Surgeon)</option>
            <option value="assisted">Assisted</option>
            <option value="observed">Observed</option>
          </select>
        </div>
      </div>

      {/* Procedure & Tag Search */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="export-procedure" className="block text-xs text-neutral-600 mb-1">
            Search Procedure / Diagnosis
          </label>
          <input
            id="export-procedure"
            name="procedureQuery"
            value={filters.procedureQuery}
            onChange={(e) => setFilters((f) => ({ ...f, procedureQuery: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
            placeholder="e.g. Laparoscopic"
          />
        </div>
        <div>
          <label htmlFor="export-fellowship-tag" className="block text-xs text-neutral-600 mb-1">
            Fellowship Tag
          </label>
          <input
            id="export-fellowship-tag"
            name="fellowshipTag"
            value={filters.fellowshipTag}
            onChange={(e) => setFilters((f) => ({ ...f, fellowshipTag: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
            placeholder="e.g. F.MAS"
          />
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-600">Showing {rows?.length ?? 0} entries</p>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!rows || rows.length === 0}
          className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-xs font-semibold disabled:opacity-50 shadow-sm"
        >
          Download CSV
        </button>
      </div>

      {/* Datatable */}
      <div className="overflow-x-auto border border-neutral-200 rounded-xl shadow-sm">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <th className="px-3 py-2 whitespace-nowrap">Date</th>
              <th className="px-3 py-2 whitespace-nowrap">Mode</th>
              <th className="px-3 py-2 whitespace-nowrap">Ref / IPD</th>
              <th className="px-3 py-2 whitespace-nowrap">Patient</th>
              <th className="px-3 py-2 whitespace-nowrap">Age</th>
              <th className="px-3 py-2">Diagnosis / Visit</th>
              <th className="px-3 py-2">Procedure</th>
              <th className="px-3 py-2 whitespace-nowrap">Role</th>
              <th className="px-3 py-2 whitespace-nowrap">Tag</th>
              <th className="px-3 py-2">Findings / Outcome</th>
              <th className="px-3 py-2">HPE Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(rows ?? []).map((r, i) => (
              <tr key={i} className="hover:bg-neutral-50">
                <td className="px-3 py-2 whitespace-nowrap font-medium text-neutral-900">{r.date}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      r.mode === 'Inpatient' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {r.mode}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-neutral-600">{r.patientRef || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap font-medium text-neutral-900">{r.patientName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-neutral-600">{r.patientAge || '-'}</td>
                <td className="px-3 py-2 text-neutral-800">{r.diagnosis || '-'}</td>
                <td className="px-3 py-2 font-medium text-neutral-900">{r.procedure || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap capitalize text-neutral-700">{r.role}</td>
                <td className="px-3 py-2 whitespace-nowrap font-semibold text-purple-700">{r.fellowshipTag || '-'}</td>
                <td className="px-3 py-2 text-neutral-600 max-w-xs truncate">{r.findingsOutcome || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.hpeStatus === 'Pending' ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Pending
                    </span>
                  ) : (
                    <span className="text-neutral-500">{r.hpeStatus}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && rows.length === 0 && (
          <p className="text-xs text-neutral-500 px-3 py-8 text-center">No matching log entries found.</p>
        )}
      </div>
    </div>
  )
}
