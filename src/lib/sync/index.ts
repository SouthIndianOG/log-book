import { supabase } from '../supabase/client'
import { drainQueue } from './drain'
import { pullRemoteChanges } from './pull'

export { drainQueue } from './drain'
export { pullRemoteChanges } from './pull'
export { createRecord, updateRecord, deleteRecord, pendingSyncCount } from './outbox'

const PERIODIC_INTERVAL_MS = 5 * 60 * 1000

export async function syncNow(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return
  await drainQueue()
  await pullRemoteChanges(userId)
}

let started = false

// Safe to call before login — syncNow() no-ops without a session. Wired
// from app startup once; auth code can also call syncNow() directly right
// after login for an immediate first sync instead of waiting on the next
// trigger.
export function startSyncEngine(): void {
  if (started) return
  started = true

  void syncNow()
  window.addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
  })
  setInterval(() => void syncNow(), PERIODIC_INTERVAL_MS)
}
