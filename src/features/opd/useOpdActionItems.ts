import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/schema'
import { todayISO, daysBetween } from '../../lib/date'
import type { Case, OpdEntry } from '../../lib/db/types'

export interface ActionItem {
  id: string
  type: 'gdm' | 'ectopic' | 'usg' | 'hpe'
  patientName: string
  patientRef: string | null
  detail: string
  dueDate?: string
  daysOverdue?: number
  recordType: 'case' | 'opd'
  originalRecord: Case | OpdEntry
}

export interface OpdActionItemsSummary {
  gdmCount: number
  ectopicCount: number
  usgCount: number
  hpeCount: number
  totalCount: number
  items: ActionItem[]
}

export function useOpdActionItems(userId: string): OpdActionItemsSummary | undefined {
  return useLiveQuery(async () => {
    const today = todayISO()
    const opdEntries = await db.opd_entries.where('user_id').equals(userId).toArray()
    const cases = await db.cases.where('user_id').equals(userId).toArray()

    const items: ActionItem[] = []

    // 1. GDM Follow-ups Due (latest entry per patient)
    const gdmByPatient = new Map<string, OpdEntry>()
    for (const e of opdEntries.filter((x) => x.procedure_type === 'gdm')) {
      const prev = gdmByPatient.get(e.patient_name)
      if (!prev || e.entry_date > prev.entry_date) {
        gdmByPatient.set(e.patient_name, e)
      }
    }
    for (const e of gdmByPatient.values()) {
      if (e.gdm_next_visit_date && e.gdm_next_visit_date <= today) {
        items.push({
          id: e.id,
          type: 'gdm',
          patientName: e.patient_name,
          patientRef: e.patient_ref ?? null,
          detail: `GDM Review due (Last: Fasting ${e.gdm_fasting_value ?? '-'}, PP ${e.gdm_pp_value ?? '-'})`,
          dueDate: e.gdm_next_visit_date,
          daysOverdue: daysBetween(e.gdm_next_visit_date, today),
          recordType: 'opd',
          originalRecord: e,
        })
      }
    }

    // 2. Ectopic hCG Due (latest entry per patient)
    const ectopicByPatient = new Map<string, OpdEntry>()
    for (const e of opdEntries.filter((x) => x.procedure_type === 'ectopic_hcg')) {
      const prev = ectopicByPatient.get(e.patient_name)
      if (!prev || e.entry_date > prev.entry_date) {
        ectopicByPatient.set(e.patient_name, e)
      }
    }
    for (const e of ectopicByPatient.values()) {
      if (e.ectopic_next_hcg_date && e.ectopic_next_hcg_date <= today) {
        items.push({
          id: e.id,
          type: 'ectopic',
          patientName: e.patient_name,
          patientRef: e.patient_ref ?? null,
          detail: `Serial Beta-hCG Due (Day ${e.ectopic_day_num ?? 1}, Last hCG: ${e.ectopic_hcg_value ?? '-'} mIU/mL)`,
          dueDate: e.ectopic_next_hcg_date,
          daysOverdue: daysBetween(e.ectopic_next_hcg_date, today),
          recordType: 'opd',
          originalRecord: e,
        })
      }
    }

    // 3. USG Reviews Due
    for (const e of opdEntries.filter((x) => x.procedure_type === 'usg' && x.usg_followup_needed)) {
      if (e.usg_followup_date && e.usg_followup_date <= today) {
        items.push({
          id: e.id,
          type: 'usg',
          patientName: e.patient_name,
          patientRef: e.patient_ref ?? null,
          detail: `USG Repeat Review Due (${e.usg_scan_type ?? 'Scan'})`,
          dueDate: e.usg_followup_date,
          daysOverdue: daysBetween(e.usg_followup_date, today),
          recordType: 'opd',
          originalRecord: e,
        })
      }
    }

    // 4. HPE Pending (from Cases and OPD entries)
    for (const c of cases.filter((x) => x.hpe_status === 'pending')) {
      items.push({
        id: c.id,
        type: 'hpe',
        patientName: c.patient_name,
        patientRef: c.patient_ref ?? null,
        detail: `Ward HPE Report Pending: ${c.hpe_notes || c.procedure || c.diagnosis || 'Tissue Sample'}`,
        recordType: 'case',
        originalRecord: c,
      })
    }
    for (const e of opdEntries.filter((x) => x.hpe_status === 'pending')) {
      items.push({
        id: e.id,
        type: 'hpe',
        patientName: e.patient_name,
        patientRef: e.patient_ref ?? null,
        detail: `OPD HPE Report Pending: ${e.hpe_notes || e.procedure_type || 'Biopsy'}`,
        recordType: 'opd',
        originalRecord: e,
      })
    }

    const gdmCount = items.filter((x) => x.type === 'gdm').length
    const ectopicCount = items.filter((x) => x.type === 'ectopic').length
    const usgCount = items.filter((x) => x.type === 'usg').length
    const hpeCount = items.filter((x) => x.type === 'hpe').length

    return {
      gdmCount,
      ectopicCount,
      usgCount,
      hpeCount,
      totalCount: items.length,
      items,
    }
  }, [userId])
}
