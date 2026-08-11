import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

// Triggered daily at 5pm IST by a Supabase Cron Job (see
// supabase/migrations/0003_evening_nudge_cron.sql). Uses the service role
// key to read across all users' active cases — this function is not
// reachable with the anon key, only via the cron job's own service-role
// auth header.
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const today = new Date().toISOString().slice(0, 10)

  const { data: cases, error: casesError } = await supabase
    .from('cases')
    .select('id, user_id')
    .eq('status', 'active')
  if (casesError) throw casesError
  if (!cases || cases.length === 0) return new Response('no active cases', { status: 200 })

  const { data: todaysEntries, error: entriesError } = await supabase
    .from('case_entries')
    .select('case_id')
    .eq('entry_date', today)
  if (entriesError) throw entriesError

  const loggedCaseIds = new Set((todaysEntries ?? []).map((e) => e.case_id))
  const unloggedByUser = new Map<string, number>()
  for (const c of cases) {
    if (!loggedCaseIds.has(c.id)) {
      unloggedByUser.set(c.user_id, (unloggedByUser.get(c.user_id) ?? 0) + 1)
    }
  }
  if (unloggedByUser.size === 0) return new Response('all logged', { status: 200 })

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth_key')
  if (subsError) throw subsError

  let sent = 0
  for (const sub of subs ?? []) {
    const count = unloggedByUser.get(sub.user_id)
    if (!count) continue
    const payload = JSON.stringify({
      title: 'Unlogged cases',
      body: `${count} active case${count === 1 ? '' : 's'} not logged today`,
      url: '/',
    })
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload,
      )
      sent++
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | null)?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        // subscription expired/revoked — drop it so future runs stop retrying
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }

  return new Response(`sent ${sent}`, { status: 200 })
})
