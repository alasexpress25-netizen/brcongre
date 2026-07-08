import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getIdentidad } from '../lib/identidad'

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
  const identidad = getIdentidad()
  const email = session?.user?.email || identidad?.email
  const nombreMostrar = perfil?.nombre || identidad?.nombre

  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tieneFicha, setTieneFicha] = useState(true)

  useEffect(() => {
    if (email) cargar(email)
  }, [email])

  async function cargar(email) {
    setCargando(true)
    const ahora = new Date()
    const hoy = ahora.toISOString().slice(0, 10)

    // semanas_vida_ministerio guarda fecha_inicio = lunes de esa semana. Si
    // filtramos por fecha_inicio >= hoy, la semana en curso desaparece apenas
    // pasa el lunes (ej. si hoy es jueves, el lunes de esta semana ya quedó
    // "en el pasado" aunque la semana siga vigente). Por eso comparamos
    // contra el lunes de la semana actual, no contra la fecha de hoy.
    const diaSemana = ahora.getDay() // 0 = domingo … 6 = sábado
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana
    const lunesActual = new Date(ahora)
    lunesActual.setDate(ahora.getDate() + diffLunes)
    const inicioSemanaActual = lunesActual.toISOString().slice(0, 10)

    // Todas las asignaciones (Predicación, Vida y Ministerio, Reunión Pública
    // y Limpieza) se guardan contra la ficha de "Publicadores", así que
    // primero buscamos esa ficha por email.
    let publicadorId = null
    let grupoId = null
    if (email) {
      const { data: pub } = await supabase
        .from('publicadores')
        .select('id, grupo_id')
        .ilike('email', email)
        .maybeSingle()
      publicadorId = pub?.id || null
      grupoId = pub?.grupo_id || null
    }
    setTieneFicha(!!publicadorId)

    const sinResultados = Promise.resolve({ data: [] })

    const [salidas, partes, semanasVM, reuniones, limpieza, tareasVM, tareasRP] = await Promise.all([
      publicadorId
        ? supabase.from('salidas_predicacion').select('id, fecha, hora, punto_encuentro, grupos(nombre)').eq('encargado_id', publicadorId).gte('fecha', hoy)
        : sinResultados,
      publicadorId
        ? supabase.from('partes_vida_ministerio').select('id, titulo, seccion, semanas_vida_ministerio(fecha_inicio)').or(`asignado_id.eq.${publicadorId},ayudante_id.eq.${publicadorId}`)
        : sinResultados,
      publicadorId
        ? supabase.from('semanas_vida_ministerio').select('id, fecha_inicio, presidente_id, oracion_inicial_id, oracion_final_id').gte('fecha_inicio', inicioSemanaActual)
        : sinResultados,
      publicadorId
        ? supabase.from('reuniones_publicas').select('id, fecha, tema, orador_id, presidente_id, conductor_atalaya_id, lector_id').gte('fecha', hoy)
        : sinResultados,
      grupoId
        ? supabase.from('turnos_limpieza').select('id, fecha_inicio, fecha_fin, grupos(nombre)').eq('grupo_id', grupoId).gte('fecha_fin', hoy)
        : sinResultados,
      publicadorId
        ? supabase.from('tareas_mecanicas').select('*, semanas_vida_ministerio(fecha_inicio)')
        : sinResultados,
      publicadorId
        ? supabase.from('tareas_mecanicas_reunion_publica').select('*, reuniones_publicas(fecha)')
        : sinResultados,
    ])

    const lista = []

    ;(salidas.data || []).forEach((s) => lista.push({
      tipo: 'Predicación', titulo: s.grupos?.nombre || 'Salida de servicio', fecha: s.fecha,
      detalle: [s.hora?.slice(0, 5), s.punto_encuentro].filter(Boolean).join(' · '),
    }))

    ;(partes.data || [])
      .filter((p) => p.semanas_vida_ministerio?.fecha_inicio >= inicioSemanaActual)
      .forEach((p) => lista.push({
        tipo: 'Vida y Ministerio', titulo: p.titulo, fecha: p.semanas_vida_ministerio?.fecha_inicio, detalle: p.seccion.replace('_', ' '),
      }))

    ;(semanasVM.data || []).forEach((s) => {
      if (s.presidente_id === publicadorId) lista.push({ tipo: 'Vida y Ministerio', titulo: 'Presidente', fecha: s.fecha_inicio, detalle: '' })
      if (s.oracion_inicial_id === publicadorId) lista.push({ tipo: 'Vida y Ministerio', titulo: 'Oración inicial', fecha: s.fecha_inicio, detalle: '' })
      if (s.oracion_final_id === publicadorId) lista.push({ tipo: 'Vida y Ministerio', titulo: 'Oración final', fecha: s.fecha_inicio, detalle: '' })
    })

    ;(reuniones.data || []).forEach((r) => {
      if (r.orador_id === publicadorId) lista.push({ tipo: 'Reunión Pública', titulo: `Discurso público${r.tema ? ' — ' + r.tema : ''}`, fecha: r.fecha, detalle: '' })
      if (r.presidente_id === publicadorId) lista.push({ tipo: 'Reunión Pública', titulo: `Presidente${r.tema ? ' — ' + r.tema : ''}`, fecha: r.fecha, detalle: '' })
      if (r.conductor_atalaya_id === publicadorId) lista.push({ tipo: 'Reunión Pública', titulo: 'Conductor de La Atalaya', fecha: r.fecha, detalle: '' })
      if (r.lector_id === publicadorId) lista.push({ tipo: 'Reunión Pública', titulo: 'Lector de La Atalaya', fecha: r.fecha, detalle: '' })
    })

    ;(limpieza.data || []).forEach((t) => lista.push({
      tipo: 'Limpieza', titulo: t.grupos?.nombre || 'Grupo sin nombre', fecha: t.fecha_inicio,
      detalle: `hasta ${new Date(t.fecha_fin + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
    }))

    ;(tareasVM.data || [])
      .filter((t) => t.semanas_vida_ministerio?.fecha_inicio >= inicioSemanaActual)
      .forEach((t) => {
        Object.keys(tareaLabels).forEach((clave) => {
          if (t[clave] === publicadorId) lista.push({ tipo: 'Vida y Ministerio', titulo: tareaLabels[clave], fecha: t.semanas_vida_ministerio.fecha_inicio, detalle: 'tarea mecánica' })
        })
      })

    ;(tareasRP.data || [])
      .filter((t) => t.reuniones_publicas?.fecha >= hoy)
      .forEach((t) => {
        Object.keys(tareaLabels).forEach((clave) => {
          if (t[clave] === publicadorId) lista.push({ tipo: 'Reunión Pública', titulo: tareaLabels[clave], fecha: t.reuniones_publicas.fecha, detalle: 'tarea mecánica' })
        })
      })

    lista.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
    setItems(lista)
    setCargando(false)
  }

  if (!email) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">Identificate con tu email para ver tus asignaciones personales.</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold mb-1">Mis asignaciones</h1>
      <p className="text-sm text-ink-soft mb-6">Hola{nombreMostrar ? `, ${nombreMostrar}` : ''}. Esto es lo próximo que tenés a cargo.</p>

      {!cargando && !tieneFicha && (
        <p className="text-sm text-clay mb-4 border border-clay/30 bg-clay/5 rounded-md px-3 py-2">
          No encontramos una ficha de publicador con tu email ({email}). Comunicate con el secretario de tu
          congregación para que te pueda agregar como publicador activo y así ver tus asignaciones de
          Predicación, Vida y Ministerio, Reunión Pública y Limpieza.
        </p>
      )}

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
