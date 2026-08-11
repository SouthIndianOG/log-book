import type { Table } from 'dexie'
import { db } from '../db/schema'
import { TABLES_WITH_UPDATED_AT } from '../db/types'
import type { SyncOperation, SyncTable } from '../db/types'

function tableOf(name: SyncTable): Table<Record<string, unknown>, string> {
  return db[name] as unknown as Table<Record<string, unknown>, string>
}

async function enqueue(
  table: SyncTable,
  operation: SyncOperation,
  recordId: string,
  payload?: Record<string, unknown>,
) {
  await db.sync_queue.add({
    table,
    operation,
    recordId,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  })
}

export async function createRecord(table: SyncTable, data: Record<string, unknown> & { id: string }) {
  const dexieTable = tableOf(table)
  await db.transaction('rw', dexieTable, db.sync_queue, async () => {
    await dexieTable.add(data)
    await enqueue(table, 'insert', data.id, data)
  })
}

export async function updateRecord(table: SyncTable, id: string, patch: Record<string, unknown>) {
  const dexieTable = tableOf(table)
  const stamped = TABLES_WITH_UPDATED_AT.includes(table)
    ? { ...patch, updated_at: new Date().toISOString() }
    : patch
  await db.transaction('rw', dexieTable, db.sync_queue, async () => {
    await dexieTable.update(id, stamped)
    const full = await dexieTable.get(id)
    await enqueue(table, 'update', id, full)
  })
}

export async function deleteRecord(table: SyncTable, id: string) {
  const dexieTable = tableOf(table)
  await db.transaction('rw', dexieTable, db.sync_queue, async () => {
    await dexieTable.delete(id)
    await enqueue(table, 'delete', id)
  })
}

export async function pendingSyncCount(): Promise<number> {
  return db.sync_queue.count()
}
