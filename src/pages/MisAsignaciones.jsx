import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { supabase } from '../lib/supabaseClient'
import { getIdentidad } from '../lib/identidad'

const CLAVES_TAREAS = [
  'audio_id', 'video_id',
  'microfono1_inicio_id', 'microfono2_inicio_id',
  'microfono1_final_id', 'microfono2_final_id',
  'plataforma_inicio_id', 'plataforma_final_id',
  'acomodador_entrada1_id', 'acomodador_entrada2_id',
  'acomodador_audio_inicio_id', 'acomodador_audio_final_id',
]

function CompartirApp() {
  const { t } = useI18n()
  const [copiado, setCopiado] = useState(false)
  const url = window.location.origin
  const mensaje = t('index.mensajeWhatsapp', { url })

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Si falla el clipboard (ej. sin permisos), no rompemos nada.
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-petrol/20 bg-petrol/5 px-4 py-3">
      <p className="text-sm font-medium mb-2">{t('index.compartirApp')}</p>
      <p className="text-xs text-ink-soft mb-3">
        {t('index.compartirAppDescripcion')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 truncate font-mono text-xs bg-white border border-ink/10 rounded px-2 py-1.5">
          {url}
        </code>
        <button
          onClick={copiarLink}
          className="font-mono text-xs border border-petrol/30 text-petrol rounded px-2.5 py-1.5 hover:bg-petrol/10 transition-colors shrink-0"
        >
          {copiado ? t('index.copiado') : t('index.copiar')}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-xs bg-[#25D366] text-white rounded px-2.5 py-1.5 hover:opacity-90 transition-opacity shrink-0"
        >
          WhatsApp
        </a>
      </div>
    </div>
  )
}

export default function MisAsignaciones() {
  const { session, perfil, puedeEditar } = useAuth()
  const { t, locale } = useI18n()
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
      const { data } = await supabase.rpc('identificar_publicador', { p_email: email })
      const pub = Array.isArray(data) ? data[0] : data
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
      tipo: t('misAsignaciones.tipo_predicacion'), titulo: s.grupos?.nombre || t('misAsignaciones.salidaServicio'), fecha: s.fecha,
      detalle: [s.hora?.slice(0, 5), s.punto_encuentro].filter(Boolean).join(' · '),
    }))

    ;(partes.data || [])
      .filter((p) => p.semanas_vida_ministerio?.fecha_inicio >= inicioSemanaActual)
      .forEach((p) => lista.push({
        tipo: t('misAsignaciones.tipo_vidaMinisterio'), titulo: p.titulo, fecha: p.semanas_vida_ministerio?.fecha_inicio, detalle: p.seccion.replace('_', ' '),
      }))

    ;(semanasVM.data || []).forEach((s) => {
      if (s.presidente_id === publicadorId) lista.push({ tipo: t('misAsignaciones.tipo_vidaMinisterio'), titulo: t('misAsignaciones.presidente'), fecha: s.fecha_inicio, detalle: '' })
      if (s.oracion_inicial_id === publicadorId) lista.push({ tipo: t('misAsignaciones.tipo_vidaMinisterio'), titulo: t('misAsignaciones.oracionInicial'), fecha: s.fecha_inicio, detalle: '' })
      if (s.oracion_final_id === publicadorId) lista.push({ tipo: t('misAsignaciones.tipo_vidaMinisterio'), titulo: t('misAsignaciones.oracionFinal'), fecha: s.fecha_inicio, detalle: '' })
    })

    ;(reuniones.data || []).forEach((r) => {
      if (r.orador_id === publicadorId) lista.push({ tipo: t('misAsignaciones.tipo_reunionPublica'), titulo: `${t('misAsignaciones.discursoPublico')}${r.tema ? ' — ' + r.tema : ''}`, fecha: r.fecha, detalle: '' })
      if (r.presidente_id === publicadorId) lista.push({ tipo: t('misAsignaciones.tipo_reunionPublica'), titulo: `${t('misAsignaciones.presidente')}${r.tema ? ' — ' + r.tema : ''}`, fecha: r.fecha, detalle: '' })
      if (r.conductor_atalaya_id === publicadorId) lista.push({ tipo: t('misAsignaciones.tipo_reunionPublica'), titulo: t('misAsignaciones.conductorAtalaya'), fecha: r.fecha, detalle: '' })
      if (r.lector_id === publicadorId) lista.push({ tipo: t('misAsignaciones.tipo_reunionPublica'), titulo: t('misAsignaciones.lectorAtalaya'), fecha: r.fecha, detalle: '' })
    })

    ;(limpieza.data || []).forEach((tr) => lista.push({
      tipo: t('misAsignaciones.tipo_limpieza'), titulo: tr.grupos?.nombre || t('misAsignaciones.grupoSinNombre'), fecha: tr.fecha_inicio,
      detalle: `${t('misAsignaciones.hasta')} ${new Date(tr.fecha_fin + 'T00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}`,
    }))

    ;(tareasVM.data || [])
      .filter((tr) => tr.semanas_vida_ministerio?.fecha_inicio >= inicioSemanaActual)
      .forEach((tr) => {
        CLAVES_TAREAS.forEach((clave) => {
          if (tr[clave] === publicadorId) lista.push({ tipo: t('misAsignaciones.tipo_vidaMinisterio'), titulo: t(`misAsignaciones.tarea_${clave}`), fecha: tr.semanas_vida_ministerio.fecha_inicio, detalle: t('misAsignaciones.tareaMecanica') })
        })
      })

    ;(tareasRP.data || [])
      .filter((tr) => tr.reuniones_publicas?.fecha >= hoy)
      .forEach((tr) => {
        CLAVES_TAREAS.forEach((clave) => {
          if (tr[clave] === publicadorId) lista.push({ tipo: t('misAsignaciones.tipo_reunionPublica'), titulo: t(`misAsignaciones.tarea_${clave}`), fecha: tr.reuniones_publicas.fecha, detalle: t('misAsignaciones.tareaMecanica') })
        })
      })

    lista.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
    setItems(lista)
    setCargando(false)
  }

  if (!email) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">{t('misAsignaciones.identificate')}</p>
      </Layout>
    )
  }

  return (
    <Layout>
      {puedeEditar('secretario') && <CompartirApp />}

      <h1 className="font-display text-2xl font-semibold mb-1">{t('misAsignaciones.titulo')}</h1>
      <p className="text-sm text-ink-soft mb-6">{t('misAsignaciones.hola')}{nombreMostrar ? `, ${nombreMostrar}` : ''}. {t('misAsignaciones.proximoACargo')}</p>

      {!cargando && !tieneFicha && (
        <p className="text-sm text-clay mb-4 border border-clay/30 bg-clay/5 rounded-md px-3 py-2">
          {t('misAsignaciones.sinFicha', { email })}
        </p>
      )}

      {cargando && <p className="text-ink-soft text-sm">{t('misAsignaciones.cargando')}</p>}
      {!cargando && items.length === 0 && <p className="text-ink-soft text-sm">{t('misAsignaciones.sinAsignaciones')}</p>}

      <div className="flex flex-col gap-3">
        {items.map((it, i) => (
          <div key={i} className="border border-ink/10 rounded-lg bg-white p-4">
            <p className="font-mono text-xs text-gold">{it.tipo}</p>
            <h3 className="font-display text-lg font-semibold mt-0.5">{it.titulo}</h3>
            <p className="text-sm text-ink-soft mt-0.5">
              {it.fecha && new Date(it.fecha + 'T00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' })}
              {it.detalle && ` · ${it.detalle}`}
            </p>
          </div>
        ))}
      </div>
    </Layout>
  )
}
