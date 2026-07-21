import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'

export default function Registro() {
  const { registrarse } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const { error } = await registrarse(nombre, email, password)
    setEnviando(false)
    if (error) setError(error.message === 'User already registered' ? t('registro.correoRegistrado') : t('registro.errorGenerico'))
    else setListo(true)
  }

  if (listo) {
    return (
      <>
        <div className="max-w-sm mx-auto text-center">
          <h1 className="font-display text-2xl font-semibold mb-2">{t('registro.cuentaCreadaTitulo')}</h1>
          <p className="text-sm text-ink-soft mb-6">{t('registro.cuentaCreadaTexto')}</p>
          <button onClick={() => navigate('/login')} className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark">
            {t('registro.irAIniciarSesion')}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-2xl font-semibold mb-1">{t('registro.titulo')}</h1>
        <p className="text-sm text-ink-soft mb-6">{t('registro.subtitulo')}</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            required
            placeholder={t('registro.nombreYApellido')}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border border-ink/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="email"
            required
            placeholder={t('registro.correo')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-ink/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder={t('registro.contrasena')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-ink/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          {error && <p className="text-sm text-clay">{error}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="bg-petrol text-paper rounded-md py-2 font-medium hover:bg-petrol-dark transition-colors disabled:opacity-50"
          >
            {enviando ? t('registro.creando') : t('registro.crearCuenta')}
          </button>
        </form>
        <p className="text-sm text-ink-soft mt-4 text-center">
          {t('registro.yaTenesCuenta')} <Link to="/login" className="text-petrol underline">{t('registro.iniciarSesion')}</Link>
        </p>
      </div>
    </>
  )
}
