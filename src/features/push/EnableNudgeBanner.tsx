import { useEffect, useState } from 'react'
import { isPushSubscribed, subscribeToPush } from '../../lib/push/subscribe'

export function EnableNudgeBanner({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') return
    isPushSubscribed().then((subscribed) => setVisible(!subscribed))
  }, [])

  if (!visible) return null

  async function handleEnable() {
    setSubscribing(true)
    try {
      await subscribeToPush(userId)
    } finally {
      setSubscribing(false)
      setVisible(false)
    }
  }

  return (
    <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span className="text-neutral-600">Get a reminder at 5pm for unlogged cases?</span>
      <div className="flex gap-3 shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          disabled={subscribing}
          className="text-neutral-900 font-medium underline"
        >
          Enable
        </button>
        <button type="button" onClick={() => setVisible(false)} className="text-neutral-400">
          Not now
        </button>
      </div>
    </div>
  )
}
