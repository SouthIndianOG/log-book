import { supabase } from '../supabase/client'
import { createRecord } from '../sync/outbox'
import { db } from './schema'

const DEFAULT_COMPLICATION_LABELS = ['Bleeding', 'Infection', 'Fever', 'Wound issue', 'Other']

// Runs after login. If this device already has local complication_types,
// it's already seeded (or pulled) — no-op. Otherwise check Supabase first
// (covers reinstall-on-same-account) before seeding the defaults, so a
// fresh install never duplicates them.
export async function ensureComplicationTypesSeeded(userId: string): Promise<void> {
  const localCount = await db.complication_types.where('user_id').equals(userId).count()
  if (localCount > 0) return

  try {
    const { data: remote, error } = await supabase
      .from('complication_types')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error

    if (remote && remote.length > 0) {
      await db.complication_types.bulkPut(remote)
      return
    }

    for (const label of DEFAULT_COMPLICATION_LABELS) {
      await createRecord('complication_types', {
        id: crypto.randomUUID(),
        user_id: userId,
        label,
        is_default: true,
        usage_count: 0,
      })
    }
  } catch {
    // Offline on a fresh install with nothing local yet — skip for now,
    // retried on next login/foreground once online.
  }
}
