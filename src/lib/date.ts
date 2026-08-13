export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysISO(baseISODate: string, days: number): string {
  const date = new Date(baseISODate + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(fromISODate: string, toISODate: string): number {
  const from = new Date(fromISODate + 'T00:00:00Z').getTime()
  const to = new Date(toISODate + 'T00:00:00Z').getTime()
  return Math.round((to - from) / 86_400_000)
}

export function formatRelativeTime(isoTimestamp: string | undefined): string {
  if (!isoTimestamp) return 'never'
  const diffMs = Date.now() - new Date(isoTimestamp).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
