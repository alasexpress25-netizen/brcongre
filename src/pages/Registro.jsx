import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'

export default function Registro() {
  const { registrarse } = useAuth()
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
    if (error) setError(error.message === 'User already registered' ? 'Ese correo ya está registrado.' : 'No se pudo crear la cuenta. Probá de nuevo.')
    else setListo(true)
  }

  if (listo) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto text-center">
          <h1 className="font-display text-2xl font-semibold mb-2">Cuenta creada</h1>
          <p className="text-sm text-ink-soft mb-6">
            Ya podés iniciar sesión. Un administrador tiene que habilitar tu acceso antes de que puedas editar contenido —
            mientras tanto podés ver todo el sitio con normalidad.
          </p>
          <button onClick={() => navigate('/login')} className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark">
            Ir a iniciar sesión
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-2xl font-semibold mb-1">Crear cuenta</h1>
        <p className="text-sm text-ink-soft mb-6">
          Para ver tus asignaciones personales y, si te habilitan, editar contenido.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            required
            placeholder="Nombre y apellido"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border border-ink/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="email"
            required
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-ink/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Contraseña (mínimo 6 caracteres)"
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
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="text-sm text-ink-soft mt-4 text-center">
          ¿Ya tenés cuenta? <Link to="/login" className="text-petrol underline">Iniciar sesión</Link>
        </p>
      </div>
    </Layout>
  )
}
