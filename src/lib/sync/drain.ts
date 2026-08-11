import { supabase } from '../supabase/client'
import { db } from '../db/schema'
import type { SyncQueueItem } from '../db/types'

// Local-only fields that exist in Dexie but have no matching Postgres
// column — stripped before upserting to Supabase.
const LOCAL_ONLY_FIELDS: Partial<Record<string, string[]>> = {
  attachments: ['localBlob', 'uploadStatus'],
}

function remotePayload(item: SyncQueueItem): Record<string, unknown> | undefined {
  if (!item.payload) return undefined
  const strip = LOCAL_ONLY_FIELDS[item.table]
  if (!strip || strip.length === 0) return item.payload
  const clone = { ...item.payload }
  for (const key of strip) delete clone[key]
  return clone
}

async function applyItem(item: SyncQueueItem) {
  if (item.operation === 'delete') {
    const { error } = await supabase.from(item.table).delete().eq('id', item.recordId)
    if (error) throw error
    return
  }
  const payload = remotePayload(item)
  if (!payload) throw new Error(`sync_queue item ${item.id} (${item.operation}) has no payload`)
  const { error } = await supabase.from(item.table).upsert(payload)
  if (error) throw error
}

let draining = false

export async function drainQueue(): Promise<void> {
  if (draining) return
  draining = true
  try {
    for (;;) {
      const next = await db.sync_queue.orderBy('id').first()
      if (!next) break
      try {
        await applyItem(next)
        await db.sync_queue.delete(next.id!)
      } catch (err) {
        await db.sync_queue.update(next.id!, {
          attempts: next.attempts + 1,
          lastError: err instanceof Error ? err.message : String(err),
        })
        break
      }
    }
  } finally {
    draining = false
  }
}
