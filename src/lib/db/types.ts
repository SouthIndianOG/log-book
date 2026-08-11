export interface Case {
  id: string
  user_id: string
  patient_name: string
  patient_ref?: string | null
  diagnosis?: string | null
  procedure?: string | null
  admit_date: string
  status: 'active' | 'discharged'
  discharge_date?: string | null
  discharge_outcome?: string | null
  discharge_followup?: string | null
  fellowship_tag?: string | null
  updated_at: string
  created_at: string
}

export interface CaseEntry {
  id: string
  case_id: string
  user_id: string
  entry_date: string
  post_op_day?: number | null
  note?: string | null
  is_stable_quicklog: boolean
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

export type OpdProcedureType = 'usg' | 'mtp' | 'contraception' | 'gdm' | 'other'
export type GdmVisitType = 'new' | 'follow_up'

export interface OpdEntry {
  id: string
  user_id: string
  procedure_type: OpdProcedureType
  patient_name: string
  patient_ref?: string | null
  entry_date: string
  gestational_age?: string | null
  usg_findings?: string | null
  usg_followup_needed?: boolean | null
  usg_followup_date?: string | null
  mtp_method?: string | null
  mtp_complication?: string | null
  contraception_method?: string | null
  contraception_notes?: string | null
  gdm_visit_type?: GdmVisitType | null
  gdm_fasting_value?: number | null
  gdm_pp_value?: number | null
  gdm_next_visit_date?: string | null
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
