import type { Table } from 'dexie'
import { supabase } from '../supabase/client'
import { db } from '../db/schema'
import { PULLABLE_TABLES } from '../db/types'
import type { SyncTable } from '../db/types'

const EPOCH = '1970-01-01T00:00:00.000Z'

function tableOf(name: SyncTable): Table<Record<string, unknown>, string> {
  return db[name] as unknown as Table<Record<string, unknown>, string>
}

async function pullTable(table: SyncTable, userId: string) {
  const meta = await db.sync_meta.get(table)
  const since = meta?.lastSyncedAt ?? EPOCH

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true })
  if (error) throw error
  if (!data || data.length === 0) return

  const dexieTable = tableOf(table)
  await db.transaction('rw', dexieTable, async () => {
    for (const remote of data) {
      const local = await dexieTable.get(remote.id as string)
      const localUpdatedAt = local && 'updated_at' in local ? (local.updated_at as string) : undefined
      if (!localUpdatedAt || localUpdatedAt <= (remote.updated_at as string)) {
        await dexieTable.put(remote)
      }
    }
  })

  const latest = data[data.length - 1].updated_at as string
  await db.sync_meta.put({ table, lastSyncedAt: latest })
}

// complication_types is seeded locally on first login and this is a
// single-device app, so it doesn't need incremental pulling; attachments
// (no user_id column) and push_subscriptions (device-local) are excluded
// too — see PULLABLE_TABLES.
export async function pullRemoteChanges(userId: string): Promise<void> {
  for (const table of PULLABLE_TABLES) {
    await pullTable(table, userId)
  }
}
