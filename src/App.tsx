import { useEffect } from 'react'
import { AuthScreen } from './features/auth/AuthScreen'
import { useSession } from './features/auth/useSession'
import { supabase } from './lib/supabase/client'
import { ensureComplicationTypesSeeded } from './lib/db/seed'
import { CasesHome } from './features/cases/CasesHome'

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

  return <CasesHome userId={session.user.id} onSignOut={() => supabase.auth.signOut()} />
}

export default App
