import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase/client'
import { syncNow } from '../../lib/sync'

export function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    void syncNow()
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-white px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-lg font-medium text-neutral-900 text-center mb-6">
          Fellowship Case Logbook
        </h1>
        <div>
          <label htmlFor="email" className="block text-sm text-neutral-600 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-neutral-600 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-neutral-900 text-white py-2.5 font-medium disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
