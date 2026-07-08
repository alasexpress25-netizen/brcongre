import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function MiCuenta() {
  const { session, perfil } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [guardando, setGuardando] = useState(false)

  if (!session) return <Navigate to="/login" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setOk(false)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setGuardando(false)

    if (error) {
      setError(error.message)
      return
    }

    setOk(true)
    setPassword('')
    setConfirmar('')
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-2xl font-semibold mb-1">Mi cuenta</h1>
        <p className="text-sm text-ink-soft mb-6">
          {perfil?.nombre ? `${perfil.nombre} · ` : ''}Cambiá tu contraseña cuando quieras.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            required
            placeholder="Nueva contraseña (mínimo 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-ink/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="password"
            required
            placeholder="Repetir nueva contraseña"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="border border-ink/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          {error && <p className="text-sm text-clay">{error}</p>}
          {ok && <p className="text-sm text-petrol">Contraseña actualizada.</p>}
          <button
            type="submit"
            disabled={guardando}
            className="bg-petrol text-paper rounded-md py-2 font-medium hover:bg-petrol-dark transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
