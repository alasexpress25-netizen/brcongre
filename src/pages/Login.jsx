import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'

export default function Login() {
  const { iniciarSesion, session } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (session) {
    navigate('/')
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const { error } = await iniciarSesion(email, password)
    setEnviando(false)
    if (error) setError(t('login.errorCredenciales'))
    else navigate('/')
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-2xl font-semibold mb-1">{t('login.titulo')}</h1>
        <p className="text-sm text-ink-soft mb-6">{t('login.subtitulo')}</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder={t('login.correo')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-ink/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="password"
            required
            placeholder={t('login.contrasena')}
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
            {enviando ? t('login.entrando') : t('login.entrar')}
          </button>
        </form>
        <p className="text-sm text-ink-soft mt-4 text-center">
          {t('login.sinCuenta')} <Link to="/registro" className="text-petrol underline">{t('login.crearCuenta')}</Link>
        </p>
      </div>
    </Layout>
  )
}
