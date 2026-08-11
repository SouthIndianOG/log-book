import { db } from '../../lib/db/schema'
import { createRecord, updateRecord } from '../../lib/sync/outbox'

export async function upsertComplicationType(userId: string, label: string): Promise<void> {
  const existing = await db.complication_types
    .where('user_id')
    .equals(userId)
    .filter((c) => c.label.toLowerCase() === label.toLowerCase())
    .first()

  if (existing) {
    await updateRecord('complication_types', existing.id, { usage_count: existing.usage_count + 1 })
    return
  }

  await createRecord('complication_types', {
    id: crypto.randomUUID(),
    user_id: userId,
    label,
    is_default: false,
    usage_count: 1,
  })
}
