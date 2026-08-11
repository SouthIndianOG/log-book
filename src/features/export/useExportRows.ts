import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/schema'
import type { OpdEntry } from '../../lib/db/types'

export interface ExportRow {
  date: string
  caseType: 'inpatient' | 'opd'
  patientRef: string
  diagnosisProcedure: string
  findingsOutcome: string
  complications: string
  fellowshipTag: string
}

export interface ExportFilters {
  from: string
  to: string
  caseType: 'all' | 'inpatient' | 'opd'
  procedureQuery: string
  fellowshipTag: string
}

const OPD_LABELS: Record<string, string> = {
  usg: 'USG',
  mtp: 'MTP',
  contraception: 'Contraception',
  gdm: 'GDM',
  other: 'Other',
}

function opdFindings(entry: OpdEntry): string {
  switch (entry.procedure_type) {
    case 'usg':
      return entry.usg_findings ?? ''
    case 'mtp':
      return entry.mtp_method ?? ''
    case 'contraception':
      return [entry.contraception_method, entry.contraception_notes].filter(Boolean).join(' — ')
    case 'gdm':
      return [
        entry.gdm_visit_type,
        entry.gdm_fasting_value != null ? `F:${entry.gdm_fasting_value}` : null,
        entry.gdm_pp_value != null ? `PP:${entry.gdm_pp_value}` : null,
      ]
        .filter(Boolean)
        .join(' ')
    case 'other':
      return entry.other_description ?? ''
    default:
      return ''
  }
}

// Unifies case_entries (joined to their parent case) and opd_entries into
// one exportable row shape per CLAUDE.md's Export column spec. "Procedure
// contains" matches against the same displayed diagnosis/procedure text
// for both sources — inpatient's procedure is free text, OPD's is a clean
// enum, so a substring filter works uniformly for both instead of needing
// separate filter UIs.
export function useExportRows(userId: string, filters: ExportFilters): ExportRow[] | undefined {
  return useLiveQuery(async () => {
    const rows: ExportRow[] = []

    if (filters.caseType !== 'opd') {
      const cases = await db.cases.where('user_id').equals(userId).toArray()
      const casesById = new Map(cases.map((c) => [c.id, c]))
      const entries = await db.case_entries.where('user_id').equals(userId).toArray()
      for (const entry of entries) {
        const parent = casesById.get(entry.case_id)
        if (!parent) continue
        rows.push({
          date: entry.entry_date,
          caseType: 'inpatient',
          patientRef: parent.patient_ref ?? '',
          diagnosisProcedure: parent.diagnosis || parent.procedure || '',
          findingsOutcome: entry.is_stable_quicklog ? 'Stable, no complaints' : (entry.note ?? ''),
          complications: entry.complication_type
            ? `${entry.complication_type}${entry.complication_detail ? ': ' + entry.complication_detail : ''}`
            : '',
          fellowshipTag: parent.fellowship_tag ?? '',
        })
      }
    }

    if (filters.caseType !== 'inpatient') {
      const opdEntries = await db.opd_entries.where('user_id').equals(userId).toArray()
      for (const entry of opdEntries) {
        rows.push({
          date: entry.entry_date,
          caseType: 'opd',
          patientRef: entry.patient_ref ?? '',
          diagnosisProcedure: OPD_LABELS[entry.procedure_type] ?? entry.procedure_type,
          findingsOutcome: opdFindings(entry),
          complications: entry.procedure_type === 'mtp' ? (entry.mtp_complication ?? '') : '',
          fellowshipTag: entry.fellowship_tag ?? '',
        })
      }
    }

    const procedureQuery = filters.procedureQuery.trim().toLowerCase()
    const fellowshipTag = filters.fellowshipTag.trim().toLowerCase()

    const filtered = rows.filter((r) => {
      if (filters.from && r.date < filters.from) return false
      if (filters.to && r.date > filters.to) return false
      if (procedureQuery && !r.diagnosisProcedure.toLowerCase().includes(procedureQuery)) return false
      if (fellowshipTag && !r.fellowshipTag.toLowerCase().includes(fellowshipTag)) return false
      return true
    })

    filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    return filtered
  }, [userId, filters.from, filters.to, filters.caseType, filters.procedureQuery, filters.fellowshipTag])
}
