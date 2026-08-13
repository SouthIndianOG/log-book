export type SurgicalRole = 'performed' | 'assisted' | 'observed'
export type HpeStatus = 'none' | 'pending' | 'received'
export type DischargeCondition = 'stable' | 'fair' | 'guarded' | 'ama'

export interface Case {
  id: string
  user_id: string
  patient_name: string
  patient_age?: number | null
  patient_ref?: string | null
  diagnosis?: string | null
  procedure?: string | null
  role: SurgicalRole
  admit_date: string
  status: 'active' | 'discharged'
  discharge_date?: string | null
  discharge_condition?: DischargeCondition | null
  discharge_outcome?: string | null
  discharge_followup?: string | null
  discharge_followup_date?: string | null
  hpe_status?: HpeStatus | null
  hpe_notes?: string | null
  fellowship_tag?: string | null
  updated_at: string
  created_at: string
}

export type DietStatus = 'nil' | 'sips' | 'soft' | 'full'
export type AmbulationStatus = 'bed_rest' | 'assisted' | 'walking'
export type CatheterStatus = 'in' | 'removed_today'
export type DrainStatus = 'in' | 'removed_today'
export type DrainColour = 'serous' | 'serosanguinous' | 'haemorrhagic'
export type IvStatus = 'in' | 'discontinued'

export interface CaseEntry {
  id: string
  case_id: string
  user_id: string
  entry_date: string
  post_op_day?: number | null
  note?: string | null
  is_stable_quicklog: boolean

  // Structured Vitals
  temp_c?: number | null
  bp_sys?: number | null
  bp_dia?: number | null
  hr?: number | null
  spo2?: number | null
  pain_nrs?: number | null

  // Status toggles
  diet?: DietStatus | null
  ambulation?: AmbulationStatus | null
  catheter?: CatheterStatus | null
  drain_status?: DrainStatus | null
  drain_ml?: number | null
  drain_colour?: DrainColour | null
  iv_status?: IvStatus | null
  flatus_passed?: boolean | null
  bowel_opened?: boolean | null

  complication_type?: string | null
  complication_detail?: string | null
  logged_at: string
  is_backfill: boolean
  updated_at: string
  created_at: string
}

export interface ComplicationType {
  id: string
  user_id: string
  label: string
  is_default: boolean
  usage_count: number
}

export type OpdProcedureType = 'usg' | 'mtp' | 'contraception' | 'gdm' | 'ectopic_hcg' | 'other'
export type GdmVisitType = 'new' | 'follow_up'
export type EctopicMgmtType = 'medical_mtx' | 'post_op' | 'expectant'
export type ContraceptionAction = 'insertion' | 'administration' | 'prescription' | 'removal'

export interface OpdEntry {
  id: string
  user_id: string
  procedure_type: OpdProcedureType
  patient_name: string
  patient_age?: number | null
  patient_ref?: string | null
  entry_date: string
  gestational_age?: string | null

  // USG fields
  usg_scan_type?: string | null
  usg_findings?: string | null
  usg_efw?: number | null
  usg_afi?: number | null
  usg_followup_needed?: boolean | null
  usg_followup_date?: string | null

  // MTP fields
  mtp_method?: string | null
  mtp_indication?: string | null
  mtp_complication?: string | null

  // Contraception fields
  contraception_method?: string | null
  contraception_action?: ContraceptionAction | null
  contraception_due_date?: string | null
  contraception_notes?: string | null

  // GDM fields
  gdm_visit_type?: GdmVisitType | null
  gdm_fasting_value?: number | null
  gdm_pp_value?: number | null
  gdm_management?: string | null
  gdm_next_visit_date?: string | null

  // Ectopic hCG fields
  ectopic_mgmt_type?: EctopicMgmtType | null
  ectopic_hcg_value?: number | null
  ectopic_day_num?: number | null
  ectopic_mass_size?: string | null
  ectopic_symptoms?: string | null
  ectopic_next_hcg_date?: string | null

  // Histopathology (HPE) tracking
  hpe_status?: HpeStatus | null
  hpe_notes?: string | null

  other_description?: string | null
  fellowship_tag?: string | null
  updated_at: string
  created_at: string
}

export interface Attachment {
  id: string
  entry_id?: string | null
  opd_entry_id?: string | null
  storage_path: string
  file_type?: string | null
  uploaded_at: string
  localBlob?: Blob
  uploadStatus: 'pending' | 'uploaded'
}

export interface PushSubscriptionRecord {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  created_at: string
}

export const SYNCED_TABLES = [
  'cases',
  'case_entries',
  'complication_types',
  'opd_entries',
  'attachments',
  'push_subscriptions',
] as const

export type SyncTable = (typeof SYNCED_TABLES)[number]
export type SyncOperation = 'insert' | 'update' | 'delete'

// cases/case_entries/opd_entries carry updated_at for last-write-wins pull
// filtering; complication_types/attachments/push_subscriptions don't.
export const TABLES_WITH_UPDATED_AT: readonly SyncTable[] = ['cases', 'case_entries', 'opd_entries']

// attachments has no user_id column (scoped via its parent entry instead)
// and push_subscriptions is a device-local concern — neither is pulled by
// the generic per-user incremental sync.
export const PULLABLE_TABLES: readonly SyncTable[] = ['cases', 'case_entries', 'opd_entries']

export interface SyncQueueItem {
  id?: number
  table: SyncTable
  operation: SyncOperation
  recordId: string
  payload?: Record<string, unknown>
  createdAt: string
  attempts: number
  lastError?: string
}

export interface SyncMeta {
  table: SyncTable
  lastSyncedAt: string
}
