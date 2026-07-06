import Layout from '../components/Layout'
import SeccionCard from '../components/SeccionCard'
import { useAuth } from '../lib/AuthContext'

function rangoSemanaActual() {
  const hoy = new Date()
  const dia = (hoy.getDay() + 6) % 7 // lunes = 0
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - dia)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)

  const opciones = { day: 'numeric', month: 'short' }
  return `${lunes.toLocaleDateString('es-AR', opciones)} — ${domingo.toLocaleDateString('es-AR', opciones)}`
}

const secciones = [
  { to: '/vida-ministerio', titulo: 'Vida y Ministerio', descripcion: 'Programa semanal', icono: '📖' },
  { to: '/reunion-publica', titulo: 'Reunión Pública', descripcion: 'Orador y tema', icono: '🎙️' },
  { to: '/predicacion', titulo: 'Predicación', descripcion: 'Grupos y salidas', icono: '🚪' },
  { to: '/limpieza', titulo: 'Limpieza', descripcion: 'Turnos del Salón', icono: '🧹' },
  { to: '/anuncios', titulo: 'Anuncios', descripcion: 'Avisos de la congregación', icono: '📌' },
  { to: '/calendario', titulo: 'Calendario', descripcion: 'Próximos eventos', icono: '📅' },
]

export default function Index() {
  const { session } = useAuth()

  return (
    <Layout>
      <div className="mb-8">
        <div className="inline-flex items-center gap-3 rounded-full border border-gold/40 bg-gold-soft/20 px-4 py-1.5">
          <span className="font-mono text-xs uppercase tracking-wider text-gold">Semana</span>
          <span className="font-mono text-xs text-ink-soft">{rangoSemanaActual()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {session && (
          <SeccionCard to="/mis-asignaciones" titulo="Mis Asignaciones" descripcion="Tus tareas próximas" icono="✅" />
        )}
        {secciones.map((s) => (
          <SeccionCard key={s.to} {...s} />
        ))}
      </div>
    </Layout>
  )
}
