import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { useSemana } from '../lib/SemanaContext'
import { supabase } from '../lib/supabaseClient'
import { notificar } from '../lib/notificar'

const CLAVES_SECCIONES = [
  { key: 'tesoros', permiso: null, color: 'text-teal-700', icono: '💎' },
  { key: 'ministerio', permiso: 'vida_ministerio_escuela', color: 'text-amber-700', icono: '🛡️' },
  { key: 'vida_cristiana', permiso: 'vida_ministerio_oraciones', color: 'text-red-700', icono: '🏛️' },
]

const CLAVES_TAREAS = [
  'audio_id',
  'video_id',
  'microfono1_inicio_id',
  'microfono2_inicio_id',
  'microfono1_final_id',
  'microfono2_final_id',
  'plataforma_inicio_id',
  'plataforma_final_id',
  'acomodador_entrada1_id',
  'acomodador_entrada2_id',
  'acomodador_audio_inicio_id',
  'acomodador_audio_final_id',
]

const vacioParte = { seccion: 'tesoros', sala: '', es_lectura_biblia: false, titulo: '', duracion_min: '', asignado_id: '', ayudante_id: '', notas: '' }
const vacioSemana = { fecha_inicio: '', lectura_biblia: '', cantico_inicial: '', oracion_inicial_id: '', cantico_final: '', oracion_final_id: '', presidente_id: '' }

function formatearRango(fechaInicio, locale) {
  const inicio = new Date(fechaInicio + 'T00:00')
  const fin = new Date(inicio)
  fin.setDate(inicio.getDate() + 6)
  const opciones = { day: 'numeric', month: 'short' }
  return `${inicio.toLocaleDateString(locale, opciones)} — ${fin.toLocaleDateString(locale, opciones)}`
}

const MESES = [
  // Español
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
  // Português
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
]

// Encabezados de sección en español y portugués (la Guía de actividades se puede
// importar en cualquiera de los dos idiomas, según el selector de idioma de la app).
const ENCABEZADOS_SECCION = {
  tesoros: ['TESOROS', 'TESOUROS'],
  ministerio: ['SEAMOS MEJORES MAESTROS', 'SEJAMOS MELHORES MESTRES', 'FAÇA SEU MELHOR NO MINISTÉRIO'],
  vida_cristiana: ['NUESTRA VIDA CRISTIANA', 'NOSSA VIDA CRISTÃ'],
}

const FRASES_LECTURA_BIBLIA = ['lectura de la biblia', 'leitura da bíblia']

function esFechaCabecera(mayus) {
  // Detecta encabezados tipo "6-12 DE JULIO" / "6-12 DE JULHO" o "29 DE JUNIO A 5 DE JULIO"
  // para no confundirlos con la cita de la lectura bíblica (ej: "JEREMÍAS 13-15").
  return MESES.some((m) => mayus.includes(m))
}

function parsearPrograma(texto) {
  const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  let lecturaBiblia = ''
  const partes = []
  let seccionActual = 'tesoros'

  for (const linea of lineas) {
    const mayus = linea.toUpperCase()
    if (ENCABEZADOS_SECCION.tesoros.some((e) => mayus.includes(e))) { seccionActual = 'tesoros'; continue }
    if (ENCABEZADOS_SECCION.ministerio.some((e) => mayus.includes(e))) { seccionActual = 'ministerio'; continue }
    if (ENCABEZADOS_SECCION.vida_cristiana.some((e) => mayus.includes(e))) { seccionActual = 'vida_cristiana'; continue }
    if (esFechaCabecera(mayus)) continue
    if (/^[A-ZÁÉÍÓÚÑÃÕÇ0-9,\s-]+$/.test(linea) && linea.length < 40 && !/^\d+\./.test(linea)) {
      if (!lecturaBiblia) lecturaBiblia = linea
      continue
    }

    const match = linea.match(/^\d+\.\s*[""]?(.+?)[""]?\s*\((\d+)\s*mins?\.?\)(.*)$/i)
    if (match) {
      const titulo = match[1].trim()
      const duracion = Number(match[2])
      const resto = match[3].trim()
      const esLectura = FRASES_LECTURA_BIBLIA.some((f) => titulo.toLowerCase().includes(f))
      partes.push({
        seccion: esLectura ? 'tesoros' : seccionActual,
        es_lectura_biblia: esLectura,
        titulo,
        duracion_min: duracion,
        notas: resto || '',
      })
    }
  }

  return { lecturaBiblia, partes }
}

export default function VidaMinisterio() {
  const { t, locale, idioma } = useI18n()
  const { puedeEditar } = useAuth()
  const semana = useSemana()
  const esEditorEscuela = puedeEditar('vida_ministerio_escuela')
  const esEditorOraciones = puedeEditar('vida_ministerio_oraciones')
  const esEditorTareas = puedeEditar('vida_ministerio_tareas')
  const esEditorAlguno = esEditorEscuela || esEditorOraciones || esEditorTareas

  const secciones = CLAVES_SECCIONES.map((s) => ({ ...s, label: t(`vidaMinisterio.seccion_${s.key}`) }))
  const tareasCampos = CLAVES_TAREAS.map((key) => ({ key, label: t(`misAsignaciones.tarea_${key}`) }))

  const [semanas, setSemanas] = useState([])
  const [personas, setPersonas] = useState([])
  const [cargando, setCargando] = useState(true)

  const [formSemana, setFormSemana] = useState(vacioSemana)
  const [mostrarFormSemana, setMostrarFormSemana] = useState(false)

  const [formParte, setFormParte] = useState(vacioParte)
  const [semanaActivaId, setSemanaActivaId] = useState(null)
  const [editandoParteId, setEditandoParteId] = useState(null)

  const [formTareas, setFormTareas] = useState(null)
  const [semanaTareasActivaId, setSemanaTareasActivaId] = useState(null)

  const [partesDetectadas, setPartesDetectadas] = useState([])
  const [importandoWol, setImportandoWol] = useState(false)

  const [formCabecera, setFormCabecera] = useState({ presidente_id: '', oracion_inicial_id: '', oracion_final_id: '' })
  const [cabeceraActivaId, setCabeceraActivaId] = useState(null)

  async function cargar() {
    setCargando(true)
    // Mostramos solo la semana elegida con las flechas del encabezado (semana.lunesISO),
    // no una ventana fija "desde hoy": así navegar hacia atrás/adelante muestra la
    // semana correspondiente aunque ya haya pasado.
    const { data: sem } = await supabase
      .from('semanas_vida_ministerio')
      .select('*, partes_vida_ministerio(*, asignado:asignado_id(nombre), ayudante:ayudante_id(nombre)), presidente:presidente_id(nombre), oracion_inicial:oracion_inicial_id(nombre), oracion_final:oracion_final_id(nombre), tareas_mecanicas(*)')
      .eq('fecha_inicio', semana.lunesISO)
      .maybeSingle()

    setSemanas(sem ? [sem] : [])

    const { data: perfiles } = await supabase.from('publicadores').select('id, nombre').eq('activo', true).order('nombre')
    setPersonas(perfiles || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [esEditorAlguno, semana.lunesISO])

  async function crearSemana(e) {
    e.preventDefault()
    const payload = { ...formSemana }
    Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null })

    // ¿Ya existe una semana con esta fecha_inicio? (fecha_inicio es UNIQUE en la
    // base). Si existe -- típicamente porque se está reimportando la misma semana
    // en otro idioma, o corrigiendo un dato -- actualizamos esa fila en vez de
    // intentar insertar una nueva (eso fallaría por el constraint único y, antes
    // de este fix, fallaba en silencio dejando el contenido viejo sin reemplazar).
    const { data: semanaExistente } = await supabase
      .from('semanas_vida_ministerio')
      .select('id')
      .eq('fecha_inicio', payload.fecha_inicio)
      .maybeSingle()

    let semana
    let esReemplazo = false

    if (semanaExistente) {
      esReemplazo = true
      const { data: actualizada, error: errorUpdate } = await supabase
        .from('semanas_vida_ministerio')
        .update(payload)
        .eq('id', semanaExistente.id)
        .select()
        .single()
      if (errorUpdate) {
        alert(t('vidaMinisterio.errorGuardarSemana') + errorUpdate.message)
        return
      }
      semana = actualizada
    } else {
      const { data: nuevaSemana, error: errorInsert } = await supabase
        .from('semanas_vida_ministerio')
        .insert(payload)
        .select()
        .single()
      if (errorInsert) {
        alert(t('vidaMinisterio.errorGuardarSemana') + errorInsert.message)
        return
      }
      semana = nuevaSemana
    }

    if (semana && partesDetectadas.length > 0) {
      // Si estamos reemplazando una semana existente, primero borramos sus
      // partes viejas (por ejemplo, las que quedaron en español) para que no
      // convivan mezcladas con las nuevas del idioma recién importado.
      if (esReemplazo) {
        await supabase.from('partes_vida_ministerio').delete().eq('semana_id', semana.id)
      }
      const conteo = {}
      const partesPayload = partesDetectadas.map((p) => {
        conteo[p.seccion] = (conteo[p.seccion] || 0)
        const orden = conteo[p.seccion]++
        return { ...p, semana_id: semana.id, orden }
      })
      await supabase.from('partes_vida_ministerio').insert(partesPayload)
    }

    const fechaTexto = new Date(payload.fecha_inicio + 'T00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' })
    if (payload.presidente_id) notificar([payload.presidente_id], t('vidaMinisterio.notifPresidenteTitulo'), t('vidaMinisterio.notifPresidenteCuerpo', { fecha: fechaTexto }))
    if (payload.oracion_inicial_id) notificar([payload.oracion_inicial_id], t('vidaMinisterio.notifOracionInicialTitulo'), t('vidaMinisterio.notifOracionInicialCuerpo', { fecha: fechaTexto }))
    if (payload.oracion_final_id) notificar([payload.oracion_final_id], t('vidaMinisterio.notifOracionFinalTitulo'), t('vidaMinisterio.notifOracionFinalCuerpo', { fecha: fechaTexto }))

    setMostrarFormSemana(false)
    setFormSemana(vacioSemana)
    setPartesDetectadas([])
    cargar()
  }

  async function importarDeWol() {
    if (!formSemana.fecha_inicio) {
      alert(t('vidaMinisterio.elegiFechaPrimeroAlerta'))
      return
    }
    setImportandoWol(true)
    try {
      const { data, error } = await supabase.functions.invoke('wol-importar', {
        body: { fecha_inicio: formSemana.fecha_inicio, idioma },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      const { lecturaBiblia, partes } = parsearPrograma(data.texto || '')
      setFormSemana((f) => ({
        ...f,
        ...(lecturaBiblia ? { lectura_biblia: lecturaBiblia } : {}),
        ...(data.cantico_inicial ? { cantico_inicial: data.cantico_inicial } : {}),
        ...(data.cantico_final ? { cantico_final: data.cantico_final } : {}),
      }))
      setPartesDetectadas(partes)
    } catch (err) {
      alert(t('vidaMinisterio.errorImportarWol') + (err.message || err))
    } finally {
      setImportandoWol(false)
    }
  }

  function nuevaParte(semanaId, seccionKey, esLectura = false, tituloPrellenado = '') {
    setFormParte({ ...vacioParte, seccion: seccionKey, es_lectura_biblia: esLectura, titulo: tituloPrellenado })
    setSemanaActivaId(semanaId)
    setEditandoParteId(null)
  }

  function editarParte(semanaId, p) {
    setFormParte({
      seccion: p.seccion,
      sala: p.sala || '',
      es_lectura_biblia: p.es_lectura_biblia || false,
      titulo: p.titulo,
      duracion_min: p.duracion_min || '',
      asignado_id: p.asignado_id || '',
      ayudante_id: p.ayudante_id || '',
      notas: p.notas || '',
    })
    setSemanaActivaId(semanaId)
    setEditandoParteId(p.id)
  }

  async function guardarParte(e) {
    e.preventDefault()
    const semana = semanas.find((s) => s.id === semanaActivaId)
    const payload = {
      ...formParte,
      semana_id: semanaActivaId,
      sala: formParte.seccion === 'ministerio' ? formParte.sala || null : null,
      es_lectura_biblia: formParte.seccion === 'tesoros' ? formParte.es_lectura_biblia : false,
      duracion_min: formParte.duracion_min ? Number(formParte.duracion_min) : null,
      asignado_id: formParte.asignado_id || null,
      ayudante_id: formParte.ayudante_id || null,
      orden: semana.partes_vida_ministerio.filter((p) => p.seccion === formParte.seccion).length,
    }
    if (editandoParteId) await supabase.from('partes_vida_ministerio').update(payload).eq('id', editandoParteId)
    else await supabase.from('partes_vida_ministerio').insert(payload)

    const fechaTexto = new Date(semana.fecha_inicio + 'T00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' })
    if (payload.asignado_id) notificar([payload.asignado_id], t('vidaMinisterio.notifParteTitulo', { titulo: payload.titulo }), t('vidaMinisterio.notifParteCuerpo', { titulo: payload.titulo, fecha: fechaTexto }))
    if (payload.ayudante_id) notificar([payload.ayudante_id], t('vidaMinisterio.notifAyudanteTitulo', { titulo: payload.titulo }), t('vidaMinisterio.notifAyudanteCuerpo', { titulo: payload.titulo, fecha: fechaTexto }))

    setSemanaActivaId(null)
    setEditandoParteId(null)
    cargar()
  }

  async function eliminarParte(id) {
    if (!confirm(t('vidaMinisterio.confirmarEliminarParte'))) return
    await supabase.from('partes_vida_ministerio').delete().eq('id', id)
    cargar()
  }

  function abrirCabecera(semana) {
    setFormCabecera({
      presidente_id: semana.presidente_id || '',
      oracion_inicial_id: semana.oracion_inicial_id || '',
      oracion_final_id: semana.oracion_final_id || '',
    })
    setCabeceraActivaId(semana.id)
  }

  async function guardarCabecera(e) {
    e.preventDefault()
    const semana = semanas.find((s) => s.id === cabeceraActivaId)
    const payload = {
      presidente_id: formCabecera.presidente_id || null,
      oracion_inicial_id: formCabecera.oracion_inicial_id || null,
      oracion_final_id: formCabecera.oracion_final_id || null,
    }
    await supabase.from('semanas_vida_ministerio').update(payload).eq('id', cabeceraActivaId)

    const fechaTexto = new Date(semana.fecha_inicio + 'T00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' })
    if (payload.presidente_id && payload.presidente_id !== semana.presidente_id) {
      notificar([payload.presidente_id], t('vidaMinisterio.notifPresidenteTitulo'), t('vidaMinisterio.notifPresidenteCuerpo', { fecha: fechaTexto }))
    }
    if (payload.oracion_inicial_id && payload.oracion_inicial_id !== semana.oracion_inicial_id) {
      notificar([payload.oracion_inicial_id], t('vidaMinisterio.notifOracionInicialTitulo'), t('vidaMinisterio.notifOracionInicialCuerpo', { fecha: fechaTexto }))
    }
    if (payload.oracion_final_id && payload.oracion_final_id !== semana.oracion_final_id) {
      notificar([payload.oracion_final_id], t('vidaMinisterio.notifOracionFinalTitulo'), t('vidaMinisterio.notifOracionFinalCuerpo', { fecha: fechaTexto }))
    }

    setCabeceraActivaId(null)
    cargar()
  }

  function abrirTareas(semana) {
    const actuales = semana.tareas_mecanicas || {}
    const form = {}
    tareasCampos.forEach((c) => { form[c.key] = actuales[c.key] || '' })
    setFormTareas(form)
    setSemanaTareasActivaId(semana.id)
  }

  async function guardarTareas(e) {
    e.preventDefault()
    const semana = semanas.find((s) => s.id === semanaTareasActivaId)
    const payload = { semana_id: semanaTareasActivaId }
    tareasCampos.forEach((c) => { payload[c.key] = formTareas[c.key] || null })
    await supabase.from('tareas_mecanicas').upsert(payload)

    const fechaTexto = new Date(semana.fecha_inicio + 'T00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' })
    tareasCampos.forEach((c) => {
      if (payload[c.key]) {
        notificar([payload[c.key]], t('vidaMinisterio.notifTareaTitulo', { tarea: c.label }), t('vidaMinisterio.notifTareaCuerpo', { tarea: c.label, fecha: fechaTexto }))
      }
    })

    setSemanaTareasActivaId(null)
    cargar()
  }

  const selectorPersona = (label, value, onChange) => (
    <select value={value} onChange={onChange} className="border border-ink/15 rounded-md px-2 py-1 text-xs flex-1">
      <option value="">{label}</option>
      {personas.map((p) => (
        <option key={p.id} value={p.id}>{p.nombre}</option>
      ))}
    </select>
  )

  if (cargando) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">{t('comun.cargando')}</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">{t('vidaMinisterio.titulo')}</h1>
        {(esEditorEscuela || esEditorOraciones) && (
          <button onClick={() => { setFormSemana((f) => ({ ...f, fecha_inicio: f.fecha_inicio || semana.lunesISO })); setMostrarFormSemana(true) }} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark">
            {t('vidaMinisterio.crearSemana')}
          </button>
        )}
      </div>

      {mostrarFormSemana && (
        <div className="mb-8 flex flex-col gap-3">
          <div className="border border-ink/10 rounded-lg bg-paper-dim p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={importarDeWol}
                disabled={importandoWol || !formSemana.fecha_inicio}
                className="font-mono text-xs bg-gold text-ink px-3 py-1.5 rounded-md hover:bg-gold-dark disabled:opacity-50"
              >
                {importandoWol ? t('vidaMinisterio.importando') : t('vidaMinisterio.importarWol')}
              </button>
            </div>
            {!formSemana.fecha_inicio && (
              <p className="text-xs text-ink-soft mt-2">{t('vidaMinisterio.elegiFechaPrimero')}</p>
            )}
            {formSemana.fecha_inicio && (
              <p className="text-xs text-ink-soft mt-2">{t('vidaMinisterio.importarWolDescripcion')}</p>
            )}
            {partesDetectadas.length > 0 && (
              <div className="mt-3 border border-gold/40 bg-gold-soft/10 rounded-md p-3">
                <p className="font-mono text-xs text-gold mb-2">{t('vidaMinisterio.partesDetectadas', { n: partesDetectadas.length })}</p>
                <ul className="text-sm flex flex-col gap-1">
                  {partesDetectadas.map((p, i) => (
                    <li key={i} className="text-ink-soft">
                      <span className="text-ink">{p.titulo}</span> ({p.duracion_min} min) — {p.seccion}
                      {p.es_lectura_biblia && ` · ${t('vidaMinisterio.lecturaBibliaSufijo')}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <form onSubmit={crearSemana} className="border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              required
              type="date"
              value={formSemana.fecha_inicio}
              onChange={(e) => setFormSemana({ ...formSemana, fecha_inicio: e.target.value })}
              className="border border-ink/15 rounded-md px-3 py-2 text-sm flex-1"
            />
            {esEditorEscuela && (
              <input
                placeholder={t('vidaMinisterio.lecturaBiblicaPlaceholder')}
                value={formSemana.lectura_biblia}
                onChange={(e) => setFormSemana({ ...formSemana, lectura_biblia: e.target.value })}
                className="border border-ink/15 rounded-md px-3 py-2 text-sm flex-1"
              />
            )}
          </div>
          {esEditorOraciones && (
            <>
              <div className="flex gap-3">
                {selectorPersona(t('vidaMinisterio.presidente'), formSemana.presidente_id, (e) => setFormSemana({ ...formSemana, presidente_id: e.target.value }))}
              </div>
              <div className="flex gap-3">
                <input
                  placeholder={t('vidaMinisterio.canticoInicialPlaceholder')}
                  value={formSemana.cantico_inicial}
                  onChange={(e) => setFormSemana({ ...formSemana, cantico_inicial: e.target.value })}
                  className="border border-ink/15 rounded-md px-3 py-2 text-sm w-32"
                />
                {selectorPersona(t('vidaMinisterio.oracionInicial'), formSemana.oracion_inicial_id, (e) => setFormSemana({ ...formSemana, oracion_inicial_id: e.target.value }))}
              </div>
              <div className="flex gap-3">
                <input
                  placeholder={t('vidaMinisterio.canticoFinalPlaceholder')}
                  value={formSemana.cantico_final}
                  onChange={(e) => setFormSemana({ ...formSemana, cantico_final: e.target.value })}
                  className="border border-ink/15 rounded-md px-3 py-2 text-sm w-32"
                />
                {selectorPersona(t('vidaMinisterio.oracionFinal'), formSemana.oracion_final_id, (e) => setFormSemana({ ...formSemana, oracion_final_id: e.target.value }))}
              </div>
            </>
          )}
          <div className="flex gap-2">
            <button type="submit" className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark">{t('vidaMinisterio.crearSemanaBoton')}</button>
            <button type="button" onClick={() => { setMostrarFormSemana(false); setPartesDetectadas([]) }} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">{t('comun.cancelar')}</button>
          </div>
          </form>
        </div>
      )}

      {semanas.length === 0 && <p className="text-ink-soft text-sm">{t('vidaMinisterio.noHaySemanas')}</p>}

      <div className="flex flex-col gap-8">
        {semanas.map((semana) => (
          <div key={semana.id} className="border border-ink/10 rounded-lg bg-white overflow-hidden">
            <div className="bg-paper-dim px-4 py-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-display font-semibold">{formatearRango(semana.fecha_inicio, locale())}</p>
                  {semana.lectura_biblia && <p className="font-mono text-xs text-ink-soft uppercase">{semana.lectura_biblia}</p>}
                </div>
                <div className="font-mono text-xs text-ink-soft flex flex-wrap gap-3 items-center">
                  <span>{t('vidaMinisterio.presidente')} <b className="text-ink"><NombreOFranja nombre={semana.presidente?.nombre} /></b></span>
                  {semana.cantico_inicial && <span>🎵{semana.cantico_inicial}</span>}
                  <span>{t('vidaMinisterio.oracionInicial')} <b className="text-ink"><NombreOFranja nombre={semana.oracion_inicial?.nombre} /></b></span>
                  {esEditorOraciones && cabeceraActivaId !== semana.id && (
                    <button onClick={() => abrirCabecera(semana)} className="hover:text-petrol">{t('comun.editar')}</button>
                  )}
                </div>
              </div>

              {cabeceraActivaId === semana.id && (
                <form onSubmit={guardarCabecera} className="border border-ink/10 rounded-lg bg-white p-3 flex flex-wrap gap-2 items-center">
                  {selectorPersona(t('vidaMinisterio.presidente'), formCabecera.presidente_id, (e) => setFormCabecera({ ...formCabecera, presidente_id: e.target.value }))}
                  {selectorPersona(t('vidaMinisterio.oracionInicial'), formCabecera.oracion_inicial_id, (e) => setFormCabecera({ ...formCabecera, oracion_inicial_id: e.target.value }))}
                  {selectorPersona(t('vidaMinisterio.oracionFinal'), formCabecera.oracion_final_id, (e) => setFormCabecera({ ...formCabecera, oracion_final_id: e.target.value }))}
                  <div className="flex gap-2">
                    <button type="submit" className="bg-petrol text-paper rounded-md px-3 py-1.5 text-xs hover:bg-petrol-dark">{t('comun.guardar')}</button>
                    <button type="button" onClick={() => setCabeceraActivaId(null)} className="text-ink-soft text-xs px-3 py-1.5 hover:text-ink">{t('comun.cancelar')}</button>
                  </div>
                </form>
              )}
            </div>

            <div className="p-4 flex flex-col gap-5">
              {secciones.map((s) => {
                const esTesoros = s.key === 'tesoros'
                const puedeEditarSeccion = esTesoros ? (esEditorEscuela || esEditorOraciones) : puedeEditar(s.permiso)
                const partesSeccion = semana.partes_vida_ministerio.filter((p) => p.seccion === s.key)
                const salaA = partesSeccion.filter((p) => p.sala === 'A')
                const salaB = partesSeccion.filter((p) => p.sala === 'B')
                const sinSala = partesSeccion.filter((p) => !p.sala)

                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className={`font-mono text-xs uppercase tracking-wider ${s.color}`}>{s.icono} {s.label}</h2>
                      {!esTesoros && puedeEditarSeccion && (
                        <button onClick={() => nuevaParte(semana.id, s.key)} className="font-mono text-xs text-ink-soft hover:text-petrol">
                          {t('vidaMinisterio.crearParte')}
                        </button>
                      )}
                    </div>

                    {semanaActivaId === semana.id && formParte.seccion === s.key && (
                      <form onSubmit={guardarParte} className="mb-3 border border-ink/10 rounded-lg bg-paper p-3 flex flex-col gap-2">
                        {esTesoros && (
                          <p className="font-mono text-[10px] uppercase text-gold">
                            {formParte.es_lectura_biblia ? t('vidaMinisterio.lecturaDeLaBiblia') : t('vidaMinisterio.discursoDeTesoros')}
                          </p>
                        )}
                        <input
                          required
                          placeholder={t('vidaMinisterio.tituloPartePlaceholder')}
                          value={formParte.titulo}
                          onChange={(e) => setFormParte({ ...formParte, titulo: e.target.value })}
                          className="border border-ink/15 rounded-md px-2 py-1.5 text-sm"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder={t('vidaMinisterio.minPlaceholder')}
                            value={formParte.duracion_min}
                            onChange={(e) => setFormParte({ ...formParte, duracion_min: e.target.value })}
                            className="w-20 border border-ink/15 rounded-md px-2 py-1.5 text-sm"
                          />
                          {s.key === 'ministerio' && (
                            <select
                              value={formParte.sala}
                              onChange={(e) => setFormParte({ ...formParte, sala: e.target.value })}
                              className="border border-ink/15 rounded-md px-2 py-1.5 text-sm"
                            >
                              <option value="">{t('vidaMinisterio.sinSala')}</option>
                              <option value="A">{t('vidaMinisterio.salaA')}</option>
                              <option value="B">{t('vidaMinisterio.salaB')}</option>
                            </select>
                          )}
                          {selectorPersona(t('vidaMinisterio.asignadoA'), formParte.asignado_id, (e) => setFormParte({ ...formParte, asignado_id: e.target.value }))}
                          {selectorPersona(t('vidaMinisterio.ayudante'), formParte.ayudante_id, (e) => setFormParte({ ...formParte, ayudante_id: e.target.value }))}
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-petrol text-paper rounded-md px-3 py-1.5 text-xs hover:bg-petrol-dark">{t('comun.guardar')}</button>
                          <button type="button" onClick={() => setSemanaActivaId(null)} className="text-ink-soft text-xs px-3 py-1.5 hover:text-ink">{t('comun.cancelar')}</button>
                        </div>
                      </form>
                    )}

                    {partesSeccion.length === 0 ? (
                      <p className="text-sm text-ink-soft/70">{t('vidaMinisterio.sinPartesCargadas')}</p>
                    ) : s.key === 'ministerio' && (salaA.length > 0 || salaB.length > 0) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="font-mono text-xs text-gold mb-1">{t('vidaMinisterio.salaA')}</p>
                          <PartesLista partes={salaA} esEditor={puedeEditarSeccion} onEditar={(p) => editarParte(semana.id, p)} onEliminar={eliminarParte} />
                        </div>
                        <div>
                          <p className="font-mono text-xs text-gold mb-1">{t('vidaMinisterio.salaB')}</p>
                          <PartesLista partes={salaB} esEditor={puedeEditarSeccion} onEditar={(p) => editarParte(semana.id, p)} onEliminar={eliminarParte} />
                        </div>
                        {sinSala.length > 0 && (
                          <div className="sm:col-span-2">
                            <PartesLista partes={sinSala} esEditor={puedeEditarSeccion} onEditar={(p) => editarParte(semana.id, p)} onEliminar={eliminarParte} />
                          </div>
                        )}
                      </div>
                    ) : esTesoros ? (
                      <PartesLista
                        partes={partesSeccion}
                        esEditor={true}
                        puedeEditarParte={(p) => (p.es_lectura_biblia ? esEditorEscuela : esEditorOraciones)}
                        onEditar={(p) => editarParte(semana.id, p)}
                        onEliminar={eliminarParte}
                      />
                    ) : (
                      <PartesLista partes={partesSeccion} esEditor={puedeEditarSeccion} onEditar={(p) => editarParte(semana.id, p)} onEliminar={eliminarParte} />
                    )}
                  </div>
                )
              })}

              {(semana.cantico_final || semana.oracion_final !== undefined) && (
                <div className="font-mono text-xs text-ink-soft flex gap-3 border-t border-ink/10 pt-3">
                  {semana.cantico_final && <span>🎵{semana.cantico_final}</span>}
                  <span>{t('vidaMinisterio.oracionFinal')} <b className="text-ink"><NombreOFranja nombre={semana.oracion_final?.nombre} /></b></span>
                </div>
              )}

              <div className="border-t border-ink/10 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-mono text-xs uppercase tracking-wider text-petrol">{t('vidaMinisterio.tareasMecanicas')}</h2>
                  {esEditorTareas && (
                    <button onClick={() => abrirTareas(semana)} className="font-mono text-xs text-ink-soft hover:text-petrol">
                      {semana.tareas_mecanicas ? t('comun.editar') : t('vidaMinisterio.cargarTareas')}
                    </button>
                  )}
                </div>

                {semanaTareasActivaId === semana.id ? (
                  <form onSubmit={guardarTareas} className="border border-ink/10 rounded-lg bg-paper p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tareasCampos.map((c) => (
                      <div key={c.key}>
                        <label className="text-[10px] font-mono uppercase text-ink-soft">{c.label}</label>
                        <select
                          value={formTareas[c.key]}
                          onChange={(e) => setFormTareas({ ...formTareas, [c.key]: e.target.value })}
                          className="w-full border border-ink/15 rounded-md px-2 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {personas.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <div className="col-span-2 sm:col-span-3 flex gap-2 mt-2">
                      <button type="submit" className="bg-petrol text-paper rounded-md px-3 py-1.5 text-xs hover:bg-petrol-dark">{t('comun.guardar')}</button>
                      <button type="button" onClick={() => setSemanaTareasActivaId(null)} className="text-ink-soft text-xs px-3 py-1.5 hover:text-ink">{t('comun.cancelar')}</button>
                    </div>
                  </form>
                ) : semana.tareas_mecanicas ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tareasCampos.map((c) => (
                      <div key={c.key} className="border border-ink/10 rounded-md p-2">
                        <p className="text-[10px] font-mono uppercase text-ink-soft">{c.label}</p>
                        <p className="text-sm"><NombreOFranja nombre={personas.find((p) => p.id === semana.tareas_mecanicas[c.key])?.nombre} /></p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft/70">{t('vidaMinisterio.sinTareasCargadas')}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}

function NombreOFranja({ nombre }) {
  const { t } = useI18n()
  if (nombre) return <span>{nombre}</span>
  return <span className="inline-block w-24 h-3.5 rounded bg-ink/10 align-middle" title={t('comun.sinAsignar')} />
}

function PartesLista({ partes, esEditor, puedeEditarParte, onEditar, onEliminar }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-2">
      {partes.map((p) => {
        const mostrarBotones = puedeEditarParte ? puedeEditarParte(p) : esEditor
        return (
          <div key={p.id} className="border border-ink/10 rounded-lg bg-white p-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-sm">
                {p.titulo} {p.duracion_min && <span className="text-ink-soft font-normal">({p.duracion_min} min)</span>}
              </p>
              <p className="text-xs text-ink-soft mt-1 flex items-center gap-2">
                <NombreOFranja nombre={p.asignado?.nombre} />
                {p.seccion === 'ministerio' && (
                  <>
                    <span>·</span>
                    <NombreOFranja nombre={p.ayudante?.nombre} />
                  </>
                )}
              </p>
              {p.notas && <p className="text-xs text-ink-soft mt-0.5">{p.notas}</p>}
            </div>
            {mostrarBotones && (
              <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
                <button onClick={() => onEditar(p)} className="hover:text-petrol">{t('comun.editar')}</button>
                <button onClick={() => onEliminar(p.id)} className="hover:text-clay">{t('comun.borrar')}</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
