import type { ExportRow } from './useExportRows'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function rowsToCsv(rows: ExportRow[]): string {
  const header = [
    'Date',
    'Mode',
    'Patient Ref',
    'Patient Name',
    'Age',
    'Diagnosis',
    'Procedure Performed',
    'Surgical Role',
    'Fellowship Tag',
    'Findings / Outcome',
    'Complications',
    'HPE Status / Notes',
  ]

  const lines = [header.map(csvEscape).join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.date,
        r.mode,
        r.patientRef,
        r.patientName,
        r.patientAge,
        r.diagnosis,
        r.procedure,
        r.role,
        r.fellowshipTag,
        r.findingsOutcome,
        r.complications,
        r.hpeStatus,
      ]
        .map(csvEscape)
        .join(','),
    )
  }
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
