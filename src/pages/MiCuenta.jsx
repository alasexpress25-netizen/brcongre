import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { supabase } from '../lib/supabaseClient'

const CLAVES_SECCIONES = [
  'predicacion',
  'vida_ministerio_escuela',
  'vida_ministerio_oraciones',
  'reunion_publica',
  'vida_ministerio_tareas',
  'limpieza',
  'anuncios',
  'calendario',
  'secretario',
]

export default function MiCuenta() {
  const { session, perfil, permisos, esAdmin } = useAuth()
  const { t } = useI18n()
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

  const clavesHabilitadas = CLAVES_SECCIONES.filter((k) => !!permisos?.[k])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setOk(false)

    if (password.length < 6) {
      setError(t('miCuenta.contrasenaCorta'))
      return
    }
    if (password !== confirmar) {
      setError(t('miCuenta.contrasenasNoCoinciden'))
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
    <>
      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-2xl font-semibold mb-1">{t('miCuenta.titulo')}</h1>
        <p className="text-sm text-ink-soft mb-6">
          {perfil?.nombre ? `${perfil.nombre} · ` : ''}{t('miCuenta.cambiarContrasena')}
        </p>

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-ink mb-2">{t('miCuenta.seccionesTitulo')}</h2>
          {esAdmin ? (
            <p className="text-sm text-ink-soft bg-petrol/5 border border-petrol/15 rounded-md px-3 py-2">
              {t('miCuenta.esAdmin')}
            </p>
          ) : clavesHabilitadas.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {clavesHabilitadas.map((k) => (
                <li
                  key={k}
                  className="flex items-center gap-2 text-sm text-ink bg-petrol/5 border border-petrol/15 rounded-md px-3 py-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-petrol shrink-0" />
                  {t(`miCuenta.seccion_${k}`)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft bg-ink/5 border border-ink/10 rounded-md px-3 py-2">
              {t('miCuenta.sinSecciones')}
            </p>
          )}
          <p className="text-xs text-ink-soft mt-2">{t('miCuenta.permisosNota')}</p>
        </div>

        {ok ? (
          <div className="border border-petrol/20 bg-petrol/5 rounded-md px-4 py-4 text-center">
            <p className="text-petrol font-medium mb-1">{t('miCuenta.contrasenaActualizada')}</p>
            <p className="text-sm text-ink-soft mb-3">{t('miCuenta.volviendoInicio')}</p>
            <button
              onClick={() => navigate('/')}
              className="text-sm font-medium text-petrol underline underline-offset-2"
            >
              {t('miCuenta.irInicioAhora')}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              required
              placeholder={t('miCuenta.nuevaContrasena')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-ink/15 rounded-md px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            <input
              type="password"
              required
              placeholder={t('miCuenta.repetirContrasena')}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="border border-ink/15 rounded-md px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            {error && <p className="text-sm text-clay">{error}</p>}
            <button
              type="submit"
              disabled={guardando}
              className="bg-petrol text-paper rounded-md py-2 font-medium hover:bg-petrol-dark transition-colors disabled:opacity-50"
            >
              {guardando ? t('miCuenta.guardando') : t('miCuenta.guardarContrasena')}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
