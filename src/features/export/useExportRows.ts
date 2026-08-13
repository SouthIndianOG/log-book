import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/schema'
import type { OpdEntry, SurgicalRole } from '../../lib/db/types'

export interface ExportRow {
  date: string
  mode: 'Inpatient' | 'OPD'
  patientRef: string
  patientName: string
  patientAge: string
  diagnosis: string
  procedure: string
  role: SurgicalRole | 'n/a'
  fellowshipTag: string
  findingsOutcome: string
  complications: string
  hpeStatus: string
}

export interface ExportFilters {
  from: string
  to: string
  caseType: 'all' | 'inpatient' | 'opd'
  role: 'all' | SurgicalRole
  procedureQuery: string
  fellowshipTag: string
}

const OPD_LABELS: Record<string, string> = {
  usg: 'USG',
  mtp: 'MTP',
  contraception: 'Contraception',
  gdm: 'GDM',
  ectopic_hcg: 'Ectopic hCG Tracker',
  other: 'Other OPD Consult',
}

function opdFindings(entry: OpdEntry): string {
  switch (entry.procedure_type) {
    case 'usg':
      return [
        entry.usg_scan_type,
        entry.gestational_age ? `GA: ${entry.gestational_age}` : null,
        entry.usg_efw ? `EFW: ${entry.usg_efw}g` : null,
        entry.usg_afi ? `AFI: ${entry.usg_afi}cm` : null,
        entry.usg_findings,
      ]
        .filter(Boolean)
        .join(' | ')
    case 'mtp':
      return [entry.mtp_method, entry.mtp_indication ? `Indication: ${entry.mtp_indication}` : null]
        .filter(Boolean)
        .join(' — ')
    case 'contraception':
      return [
        entry.contraception_method,
        entry.contraception_action,
        entry.contraception_due_date ? `Due: ${entry.contraception_due_date}` : null,
        entry.contraception_notes,
      ]
        .filter(Boolean)
        .join(' — ')
    case 'gdm':
      return [
        entry.gdm_visit_type,
        entry.gdm_fasting_value != null ? `Fasting: ${entry.gdm_fasting_value}` : null,
        entry.gdm_pp_value != null ? `PP: ${entry.gdm_pp_value}` : null,
        entry.gdm_management,
      ]
        .filter(Boolean)
        .join(' | ')
    case 'ectopic_hcg':
      return [
        `Day ${entry.ectopic_day_num ?? 1}`,
        entry.ectopic_hcg_value != null ? `hCG: ${entry.ectopic_hcg_value} mIU/mL` : null,
        entry.ectopic_mgmt_type,
        entry.ectopic_symptoms,
      ]
        .filter(Boolean)
        .join(' | ')
    case 'other':
      return entry.other_description ?? ''
    default:
      return ''
  }
}

export function useExportRows(userId: string, filters: ExportFilters): ExportRow[] | undefined {
  return useLiveQuery(async () => {
    const rows: ExportRow[] = []

    if (filters.caseType !== 'opd') {
      const cases = await db.cases.where('user_id').equals(userId).toArray()

      for (const c of cases) {
        // If filtering by surgical role
        if (filters.role !== 'all' && c.role !== filters.role) continue

        rows.push({
          date: c.admit_date,
          mode: 'Inpatient',
          patientRef: c.patient_ref ?? '',
          patientName: c.patient_name,
          patientAge: c.patient_age ? `${c.patient_age}` : '',
          diagnosis: c.diagnosis ?? '',
          procedure: c.procedure ?? '',
          role: c.role ?? 'performed',
          fellowshipTag: c.fellowship_tag ?? '',
          findingsOutcome: [
            c.discharge_condition ? `Discharged (${c.discharge_condition})` : c.status,
            c.discharge_outcome,
            c.discharge_followup ? `Followup: ${c.discharge_followup}` : null,
          ]
            .filter(Boolean)
            .join(' — '),
          complications: '',
          hpeStatus: c.hpe_status === 'pending' ? 'Pending' : c.hpe_status === 'received' ? c.hpe_notes || 'Received' : 'N/A',
        })
      }
    }

    if (filters.caseType !== 'inpatient' && filters.role === 'all') {
      const opdEntries = await db.opd_entries.where('user_id').equals(userId).toArray()
      for (const entry of opdEntries) {
        rows.push({
          date: entry.entry_date,
          mode: 'OPD',
          patientRef: entry.patient_ref ?? '',
          patientName: entry.patient_name,
          patientAge: entry.patient_age ? `${entry.patient_age}` : '',
          diagnosis: OPD_LABELS[entry.procedure_type] ?? entry.procedure_type,
          procedure: entry.procedure_type === 'other' ? entry.other_description || 'Consult' : OPD_LABELS[entry.procedure_type],
          role: 'n/a',
          fellowshipTag: entry.fellowship_tag ?? '',
          findingsOutcome: opdFindings(entry),
          complications: entry.procedure_type === 'mtp' ? entry.mtp_complication ?? '' : '',
          hpeStatus: entry.hpe_status === 'pending' ? 'Pending' : entry.hpe_status === 'received' ? entry.hpe_notes || 'Received' : 'N/A',
        })
      }
    }

    const procedureQuery = filters.procedureQuery.trim().toLowerCase()
    const fellowshipTag = filters.fellowshipTag.trim().toLowerCase()

    const filtered = rows.filter((r) => {
      if (filters.from && r.date < filters.from) return false
      if (filters.to && r.date > filters.to) return false
      if (procedureQuery) {
        const combined = `${r.diagnosis} ${r.procedure}`.toLowerCase()
        if (!combined.includes(procedureQuery)) return false
      }
      if (fellowshipTag && !r.fellowshipTag.toLowerCase().includes(fellowshipTag)) return false
      return true
    })

    filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    return filtered
  }, [userId, filters.from, filters.to, filters.caseType, filters.role, filters.procedureQuery, filters.fellowshipTag])
}
