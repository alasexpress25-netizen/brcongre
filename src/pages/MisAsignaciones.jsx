import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const tareaLabels = {
  audio_id: 'Audio', video_id: 'Video',
  microfono1_inicio_id: 'Micrófono 1 inicio', microfono2_inicio_id: 'Micrófono 2 inicio',
  microfono1_final_id: 'Micrófono 1 final', microfono2_final_id: 'Micrófono 2 final',
  plataforma_inicio_id: 'Plataforma inicio', plataforma_final_id: 'Plataforma final',
  acomodador_entrada1_id: 'Acomodador entrada 1', acomodador_entrada2_id: 'Acomodador entrada 2',
  acomodador_audio_inicio_id: 'Acomodador aud. inicio', acomodador_audio_final_id: 'Acomodador aud. final',
}

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

    const [salidas, partes, semanasVM, reuniones, limpieza, tareasVM, tareasRP] = await Promise.all([
      supabase.from('salidas_predicacion').select('id, fecha, hora, punto_encuentro, grupos(nombre)').eq('encargado_id', uid).gte('fecha', hoy),
      supabase.from('partes_vida_ministerio').select('id, titulo, seccion, semanas_vida_ministerio(fecha_inicio)').or(`asignado_id.eq.${uid},ayudante_id.eq.${uid}`),
      supabase.from('semanas_vida_ministerio').select('id, fecha_inicio, presidente_id, oracion_inicial_id, oracion_final_id').gte('fecha_inicio', hoy),
      supabase.from('reuniones_publicas').select('id, fecha, tema, orador_id, presidente_id, conductor_atalaya_id, lector_id').gte('fecha', hoy),
      supabase.from('turnos_limpieza').select('id, fecha_inicio, fecha_fin, grupo_nombre').eq('responsable_id', uid).gte('fecha_fin', hoy),
      supabase.from('tareas_mecanicas').select('*, semanas_vida_ministerio(fecha_inicio)'),
      supabase.from('tareas_mecanicas_reunion_publica').select('*, reuniones_publicas(fecha)'),
    ])

    const lista = []

    ;(salidas.data || []).forEach((s) => lista.push({
      tipo: 'Predicación', titulo: s.grupos?.nombre || 'Salida de servicio', fecha: s.fecha,
      detalle: [s.hora?.slice(0, 5), s.punto_encuentro].filter(Boolean).join(' · '),
    }))

    ;(partes.data || [])
      .filter((p) => p.semanas_vida_ministerio?.fecha_inicio >= hoy)
      .forEach((p) => lista.push({
        tipo: 'Vida y Ministerio', titulo: p.titulo, fecha: p.semanas_vida_ministerio?.fecha_inicio, detalle: p.seccion.replace('_', ' '),
      }))

    ;(semanasVM.data || []).forEach((s) => {
      if (s.presidente_id === uid) lista.push({ tipo: 'Vida y Ministerio', titulo: 'Presidente', fecha: s.fecha_inicio, detalle: '' })
      if (s.oracion_inicial_id === uid) lista.push({ tipo: 'Vida y Ministerio', titulo: 'Oración inicial', fecha: s.fecha_inicio, detalle: '' })
      if (s.oracion_final_id === uid) lista.push({ tipo: 'Vida y Ministerio', titulo: 'Oración final', fecha: s.fecha_inicio, detalle: '' })
    })

    ;(reuniones.data || []).forEach((r) => {
      if (r.orador_id === uid) lista.push({ tipo: 'Reunión Pública', titulo: `Discurso público${r.tema ? ' — ' + r.tema : ''}`, fecha: r.fecha, detalle: '' })
      if (r.presidente_id === uid) lista.push({ tipo: 'Reunión Pública', titulo: `Presidente${r.tema ? ' — ' + r.tema : ''}`, fecha: r.fecha, detalle: '' })
      if (r.conductor_atalaya_id === uid) lista.push({ tipo: 'Reunión Pública', titulo: 'Conductor de La Atalaya', fecha: r.fecha, detalle: '' })
      if (r.lector_id === uid) lista.push({ tipo: 'Reunión Pública', titulo: 'Lector de La Atalaya', fecha: r.fecha, detalle: '' })
    })

    ;(limpieza.data || []).forEach((t) => lista.push({
      tipo: 'Limpieza', titulo: t.grupo_nombre, fecha: t.fecha_inicio,
      detalle: `hasta ${new Date(t.fecha_fin + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
    }))

    ;(tareasVM.data || [])
      .filter((t) => t.semanas_vida_ministerio?.fecha_inicio >= hoy)
      .forEach((t) => {
        Object.keys(tareaLabels).forEach((clave) => {
          if (t[clave] === uid) lista.push({ tipo: 'Vida y Ministerio', titulo: tareaLabels[clave], fecha: t.semanas_vida_ministerio.fecha_inicio, detalle: 'tarea mecánica' })
        })
      })

    ;(tareasRP.data || [])
      .filter((t) => t.reuniones_publicas?.fecha >= hoy)
      .forEach((t) => {
        Object.keys(tareaLabels).forEach((clave) => {
          if (t[clave] === uid) lista.push({ tipo: 'Reunión Pública', titulo: tareaLabels[clave], fecha: t.reuniones_publicas.fecha, detalle: 'tarea mecánica' })
        })
      })

    lista.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
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
