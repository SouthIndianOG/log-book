import { useEffect, useState } from 'react'
import { AuthScreen } from './features/auth/AuthScreen'
import { useSession } from './features/auth/useSession'
import { supabase } from './lib/supabase/client'
import { ensureComplicationTypesSeeded } from './lib/db/seed'
import { CasesHome } from './features/cases/CasesHome'
import { OpdHome } from './features/opd/OpdHome'
import { ExportScreen } from './features/export/ExportScreen'

type Mode = 'cases' | 'opd' | 'export'

function App() {
  const { session, loading } = useSession()
  const [mode, setMode] = useState<Mode>('cases')

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
    <div className="min-h-svh bg-white">
      <nav className="sticky top-0 z-40 bg-white border-b border-neutral-200 flex items-center">
        <button
          type="button"
          onClick={() => setMode('cases')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 ${
            mode === 'cases' ? 'text-neutral-900 border-neutral-900' : 'text-neutral-400 border-transparent'
          }`}
        >
          Ward
        </button>
        <button
          type="button"
          onClick={() => setMode('opd')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 ${
            mode === 'opd' ? 'text-neutral-900 border-neutral-900' : 'text-neutral-400 border-transparent'
          }`}
        >
          OPD
        </button>
        <button
          type="button"
          onClick={() => setMode('export')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 ${
            mode === 'export' ? 'text-neutral-900 border-neutral-900' : 'text-neutral-400 border-transparent'
          }`}
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="px-3 text-xs text-neutral-400 underline shrink-0"
        >
          Sign out
        </button>
      </nav>
      {mode === 'cases' && <CasesHome userId={session.user.id} />}
      {mode === 'opd' && <OpdHome userId={session.user.id} />}
      {mode === 'export' && <ExportScreen userId={session.user.id} />}
    </div>
  )
}

export default App
