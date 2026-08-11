import { useEffect } from 'react'
import { AuthScreen } from './features/auth/AuthScreen'
import { useSession } from './features/auth/useSession'
import { supabase } from './lib/supabase/client'
import { ensureComplicationTypesSeeded } from './lib/db/seed'

function App() {
  const { session, loading } = useSession()

  useEffect(() => {
    if (session) void ensureComplicationTypesSeeded(session.user.id)
  }, [session])

  if (loading) {
    return <div className="min-h-svh bg-white" />
  }

  if (!session) {
    return <AuthScreen />
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-4 bg-white text-neutral-900">
      <p className="text-lg">Fellowship Case Logbook</p>
      <p className="text-sm text-neutral-500">{session.user.email}</p>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="text-sm text-neutral-500 underline"
      >
        Sign out
      </button>
    </div>
  )
}

export default App
