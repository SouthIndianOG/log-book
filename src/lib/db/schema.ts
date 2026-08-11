import Dexie, { type Table } from 'dexie'
import type {
  Case,
  CaseEntry,
  ComplicationType,
  OpdEntry,
  Attachment,
  PushSubscriptionRecord,
  SyncQueueItem,
  SyncMeta,
} from './types'

export class LogbookDB extends Dexie {
  cases!: Table<Case, string>
  case_entries!: Table<CaseEntry, string>
  complication_types!: Table<ComplicationType, string>
  opd_entries!: Table<OpdEntry, string>
  attachments!: Table<Attachment, string>
  push_subscriptions!: Table<PushSubscriptionRecord, string>
  sync_queue!: Table<SyncQueueItem, number>
  sync_meta!: Table<SyncMeta, string>

  constructor() {
    super('logbook')
    this.version(1).stores({
      cases: 'id, user_id, status, admit_date, updated_at',
      case_entries: 'id, case_id, user_id, entry_date, logged_at, updated_at',
      complication_types: 'id, user_id, label',
      opd_entries: 'id, user_id, procedure_type, entry_date, gdm_next_visit_date, updated_at',
      attachments: 'id, entry_id, opd_entry_id, uploadStatus',
      push_subscriptions: 'id, user_id, endpoint',
      sync_queue: '++id, table, createdAt',
      sync_meta: 'table',
    })
  }
}

export const db = new LogbookDB()
