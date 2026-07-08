import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const secciones = [
  { key: 'predicacion', label: 'Predicación' },
  { key: 'vida_ministerio_escuela', label: 'Vida y Ministerio: Escuela (Tesoros + Seamos Mejores Maestros)' },
  { key: 'vida_ministerio_oraciones', label: 'Vida y Ministerio: Oraciones y discursos' },
  { key: 'reunion_publica', label: 'Reunión Pública' },
  { key: 'vida_ministerio_tareas', label: 'Tareas mecánicas (Vida y Ministerio + Reunión Pública)' },
  { key: 'limpieza', label: 'Limpieza' },
  { key: 'anuncios', label: 'Anuncios' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'secretario', label: 'Publicadores (datos de la congregación, incluye email de contacto)' },
]

export default function MiCuenta() {
  const { session, perfil, permisos, esAdmin } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [guardando, setGuardando] = useState(false)

  if (!session) return <Navigate to="/login" replace />

  // Cuando la contraseña se actualiza con éxito, mostramos el cartel de
  // confirmación y a los pocos segundos volvemos sola al dashboard.
  useEffect(() => {
    if (!ok) return
    const timer = setTimeout(() => navigate('/'), 2500)
    return () => clearTimeout(timer)
  }, [ok, navigate])

  const seccionesHabilitadas = secciones.filter((s) => !!permisos?.[s.key])

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

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-ink mb-2">Secciones que podés editar</h2>
          {esAdmin ? (
            <p className="text-sm text-ink-soft bg-petrol/5 border border-petrol/15 rounded-md px-3 py-2">
              Sos administrador: tenés acceso para editar todas las secciones.
            </p>
          ) : seccionesHabilitadas.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {seccionesHabilitadas.map((s) => (
                <li
                  key={s.key}
                  className="flex items-center gap-2 text-sm text-ink bg-petrol/5 border border-petrol/15 rounded-md px-3 py-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-petrol shrink-0" />
                  {s.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft bg-ink/5 border border-ink/10 rounded-md px-3 py-2">
              Todavía no tenés secciones habilitadas para editar. Si creés que deberías tener acceso,
              consultá con un administrador.
            </p>
          )}
          <p className="text-xs text-ink-soft mt-2">
            Estos permisos los asigna un administrador. Si necesitás que se agregue o quite alguno, pedíselo a él.
          </p>
        </div>

        {ok ? (
          <div className="border border-petrol/20 bg-petrol/5 rounded-md px-4 py-4 text-center">
            <p className="text-petrol font-medium mb-1">Contraseña actualizada correctamente</p>
            <p className="text-sm text-ink-soft mb-3">Te llevamos al inicio en un momento…</p>
            <button
              onClick={() => navigate('/')}
              className="text-sm font-medium text-petrol underline underline-offset-2"
            >
              Ir al inicio ahora
            </button>
          </div>
        ) : (
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
            <button
              type="submit"
              disabled={guardando}
              className="bg-petrol text-paper rounded-md py-2 font-medium hover:bg-petrol-dark transition-colors disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </Layout>
  )
}
