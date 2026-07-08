import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { getIdentidad, setIdentidad } from '../lib/identidad'

// Rutas que un publicador sin cuenta debe poder ver igual (login/registro de
// quienes sí tienen cuenta de administrador o editor).
const RUTAS_SIN_GATE = ['/login', '/registro']

export default function GateIdentificacion({ children }) {
  const { session, cargando: cargandoAuth } = useAuth()
  const location = useLocation()
  const [identidad, setIdentidadLocal] = useState(() => getIdentidad())
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState('idle') // idle | buscando | no_encontrado
  const [listo, setListo] = useState(false)

  useEffect(() => {
    setListo(true)
  }, [])

  const rutaLibre = RUTAS_SIN_GATE.includes(location.pathname)

  async function onSubmit(e) {
    e.preventDefault()
    const correo = email.trim()
    if (!correo) return
    setEstado('buscando')

    const { data } = await supabase.rpc('identificar_publicador', { p_email: correo })
    const encontrado = Array.isArray(data) ? data[0] : data

    if (encontrado && encontrado.activo) {
      const nueva = { id: encontrado.id, nombre: encontrado.nombre, email: encontrado.email }
      setIdentidad(nueva)
      setIdentidadLocal(nueva)
      setEstado('idle')
    } else {
      setEstado('no_encontrado')
    }
  }

  // Esperamos a saber si hay sesión (cuenta de admin/editor) antes de decidir
  // si hace falta pedir el email.
  if (!listo || cargandoAuth) return null

  if (session || identidad || rutaLibre) return children

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-5">
      <div className="w-full max-w-sm border border-ink/10 rounded-lg bg-white p-6">
        <h1 className="font-display text-xl font-semibold mb-1">Identificate</h1>
        <p className="text-sm text-ink-soft mb-5">
          Ingresá tu email para ver el programa y tus asignaciones.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoFocus
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <button
            type="submit"
            disabled={estado === 'buscando'}
            className="bg-petrol text-paper rounded-md py-2 font-medium hover:bg-petrol-dark transition-colors disabled:opacity-50"
          >
            {estado === 'buscando' ? 'Buscando…' : 'Continuar'}
          </button>
          {estado === 'no_encontrado' && (
            <p className="text-sm text-clay border border-clay/30 bg-clay/5 rounded-md px-3 py-2">
              No encontramos ese email entre los publicadores. Comunicate con el secretario de tu
              congregación para que te pueda agregar como publicador activo.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
