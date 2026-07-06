import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function MisAsignaciones() {
  const { session, perfil } = useAuth()
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (session) cargar(session.user.id)
  }, [session])

  async function cargar(uid) {
    setCargando(true)
    const hoy = new Date().toISOString().slice(0, 10)

    const [salidas, partes, reuniones, limpieza] = await Promise.all([
      supabase.from('salidas_predicacion').select('id, fecha, hora, punto_encuentro, grupos_predicacion(nombre)').eq('encargado_id', uid).gte('fecha', hoy),
      supabase.from('partes_vida_ministerio').select('id, titulo, seccion, semanas_vida_ministerio(fecha_inicio)').or(`asignado_id.eq.${uid},ayudante_id.eq.${uid}`),
      supabase.from('reuniones_publicas').select('id, fecha, tema').or(`presidente_id.eq.${uid},conductor_atalaya_id.eq.${uid},lector_id.eq.${uid}`).gte('fecha', hoy),
      supabase.from('turnos_limpieza').select('id, fecha_inicio, fecha_fin, grupo_nombre').eq('responsable_id', uid).gte('fecha_fin', hoy),
    ])

    const lista = [
      ...(salidas.data || []).map((s) => ({
        tipo: 'Predicación',
        titulo: s.grupos_predicacion?.nombre || 'Salida de servicio',
        fecha: s.fecha,
        detalle: [s.hora?.slice(0, 5), s.punto_encuentro].filter(Boolean).join(' · '),
      })),
      ...(partes.data || [])
        .filter((p) => p.semanas_vida_ministerio?.fecha_inicio >= hoy)
        .map((p) => ({
          tipo: 'Vida y Ministerio',
          titulo: p.titulo,
          fecha: p.semanas_vida_ministerio?.fecha_inicio,
          detalle: p.seccion.replace('_', ' '),
        })),
      ...(reuniones.data || []).map((r) => ({
        tipo: 'Reunión Pública',
        titulo: r.tema || 'Reunión pública',
        fecha: r.fecha,
        detalle: '',
      })),
      ...(limpieza.data || []).map((t) => ({
        tipo: 'Limpieza',
        titulo: t.grupo_nombre,
        fecha: t.fecha_inicio,
        detalle: `hasta ${new Date(t.fecha_fin + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
      })),
    ].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))

    setItems(lista)
    setCargando(false)
  }

  if (!session) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">Iniciá sesión para ver tus asignaciones personales.</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold mb-1">Mis asignaciones</h1>
      <p className="text-sm text-ink-soft mb-6">Hola, {perfil?.nombre}. Esto es lo próximo que tenés a cargo.</p>

      {cargando && <p className="text-ink-soft text-sm">Cargando…</p>}
      {!cargando && items.length === 0 && <p className="text-ink-soft text-sm">No tenés asignaciones próximas cargadas.</p>}

      <div className="flex flex-col gap-3">
        {items.map((it, i) => (
          <div key={i} className="border border-ink/10 rounded-lg bg-white p-4">
            <p className="font-mono text-xs text-gold">{it.tipo}</p>
            <h3 className="font-display text-lg font-semibold mt-0.5">{it.titulo}</h3>
            <p className="text-sm text-ink-soft mt-0.5">
              {it.fecha && new Date(it.fecha + 'T00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
              {it.detalle && ` · ${it.detalle}`}
            </p>
          </div>
        ))}
      </div>
    </Layout>
  )
}
