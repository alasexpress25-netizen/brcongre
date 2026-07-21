import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { useSemana } from '../lib/SemanaContext'
import { supabase } from '../lib/supabaseClient'
import { notificar } from '../lib/notificar'

const vacio = {
  fecha: '', numero_discurso: '', tema: '', orador_nombre: '', orador_id: '', oradorEsPropio: false,
  congregacion_visitante: '', presidente_id: '', conductor_atalaya_id: '', lector_id: '', notas: '',
}

const CLAVES_TAREAS = [
  'audio_id', 'video_id',
  'microfono1_inicio_id', 'microfono2_inicio_id',
  'microfono1_final_id', 'microfono2_final_id',
  'plataforma_inicio_id', 'plataforma_final_id',
  'acomodador_entrada1_id', 'acomodador_entrada2_id',
  'acomodador_audio_inicio_id', 'acomodador_audio_final_id',
]

function formatearFecha(f, locale) {
  return new Date(f + 'T00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

function NombreOFranja({ nombre }) {
  const { t } = useI18n()
  if (nombre) return <span>{nombre}</span>
  return <span className="inline-block w-24 h-3.5 rounded bg-ink/10 align-middle" title={t('comun.sinAsignar')} />
}

export default function ReunionPublica() {
  const { puedeEditar } = useAuth()
  const { t, locale } = useI18n()
  const semana = useSemana()
  const esEditor = puedeEditar('reunion_publica')
  const esEditorTareas = puedeEditar('vida_ministerio_tareas')

  const tareasCampos = CLAVES_TAREAS.map((key) => ({ key, label: t(`misAsignaciones.tarea_${key}`) }))

  const [reuniones, setReuniones] = useState([])
  const [personas, setPersonas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const [formTareas, setFormTareas] = useState(null)
  const [reunionTareasActivaId, setReunionTareasActivaId] = useState(null)

  async function cargar() {
    setCargando(true)
    // Igual que en Vida y Ministerio: mostramos la reunión de la semana elegida
    // con las flechas del encabezado, no "las próximas desde hoy".
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase
        .from('reuniones_publicas')
        .select('*, presidente:presidente_id(nombre), conductor_atalaya:conductor_atalaya_id(nombre), lector:lector_id(nombre), orador:orador_id(nombre), tareas_mecanicas_reunion_publica(*)')
        .gte('fecha', semana.lunesISO)
        .lte('fecha', semana.domingoISO)
        .order('fecha', { ascending: true }),
      supabase.from('publicadores').select('id, nombre').eq('activo', true).order('nombre'),
    ])
    setReuniones(r || [])
    setPersonas(p || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [semana.lunesISO, semana.domingoISO])

  function editar(r) {
    setForm({
      fecha: r.fecha,
      numero_discurso: r.numero_discurso || '',
      tema: r.tema || '',
      orador_nombre: r.orador_nombre || '',
      orador_id: r.orador_id || '',
      oradorEsPropio: !!r.orador_id,
      congregacion_visitante: r.congregacion_visitante || '',
      presidente_id: r.presidente_id || '',
      conductor_atalaya_id: r.conductor_atalaya_id || '',
      lector_id: r.lector_id || '',
      notas: r.notas || '',
    })
    setEditandoId(r.id)
    setMostrarForm(true)
  }

  function nueva() {
    setForm({ ...vacio, fecha: semana.domingoISO })
    setEditandoId(null)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const payload = { ...form }
    delete payload.oradorEsPropio
    if (form.oradorEsPropio) {
      payload.orador_nombre = null
    } else {
      payload.orador_id = null
    }
    Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null })
    if (editandoId) await supabase.from('reuniones_publicas').update(payload).eq('id', editandoId)
    else await supabase.from('reuniones_publicas').insert(payload)

    const fechaTexto = formatearFecha(payload.fecha, locale())
    if (payload.orador_id) notificar([payload.orador_id], t('reunionPublica.notifDiscursoTitulo'), t('reunionPublica.notifDiscursoCuerpo', { tema: payload.tema || '', fecha: fechaTexto }))
    if (payload.presidente_id) notificar([payload.presidente_id], t('reunionPublica.notifPresidenteTitulo'), t('reunionPublica.notifPresidenteCuerpo', { fecha: fechaTexto }))
    if (payload.conductor_atalaya_id) notificar([payload.conductor_atalaya_id], t('reunionPublica.notifConductorTitulo'), t('reunionPublica.notifConductorCuerpo', { fecha: fechaTexto }))
    if (payload.lector_id) notificar([payload.lector_id], t('reunionPublica.notifLectorTitulo'), t('reunionPublica.notifLectorCuerpo', { fecha: fechaTexto }))

    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm(t('reunionPublica.confirmarEliminar'))) return
    await supabase.from('reuniones_publicas').delete().eq('id', id)
    cargar()
  }

  function abrirTareas(reunion) {
    const actuales = reunion.tareas_mecanicas_reunion_publica || {}
    const f = {}
    tareasCampos.forEach((c) => { f[c.key] = actuales[c.key] || '' })
    setFormTareas(f)
    setReunionTareasActivaId(reunion.id)
  }

  async function guardarTareas(e) {
    e.preventDefault()
    const reunion = reuniones.find((r) => r.id === reunionTareasActivaId)
    const payload = { reunion_id: reunionTareasActivaId }
    tareasCampos.forEach((c) => { payload[c.key] = formTareas[c.key] || null })
    await supabase.from('tareas_mecanicas_reunion_publica').upsert(payload)

    const fechaTexto = formatearFecha(reunion.fecha, locale())
    tareasCampos.forEach((c) => {
      if (payload[c.key]) notificar([payload[c.key]], t('reunionPublica.notifTareaTitulo', { tarea: c.label }), t('reunionPublica.notifTareaCuerpo', { tarea: c.label, fecha: fechaTexto }))
    })

    setReunionTareasActivaId(null)
    cargar()
  }

  const selectorPersona = (label, value, onChange) => (
    <select value={value} onChange={onChange} className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol">
      <option value="">{label}</option>
      {personas.map((p) => (
        <option key={p.id} value={p.id}>{p.nombre}</option>
      ))}
    </select>
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">{t('reunionPublica.titulo')}</h1>
        {esEditor && (
          <button onClick={nueva} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors">
            {t('reunionPublica.nueva')}
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol" />
            <input placeholder={t('reunionPublica.numeroDiscurso')} value={form.numero_discurso} onChange={(e) => setForm({ ...form, numero_discurso: e.target.value })}
              className="w-40 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol" />
          </div>
          <input placeholder={t('reunionPublica.temaDiscurso')} value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol" />
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={form.oradorEsPropio}
                onChange={(e) => setForm({ ...form, oradorEsPropio: e.target.checked })}
              />
              {t('reunionPublica.oradorPropio')}
            </label>
            <div className="flex gap-3">
              {form.oradorEsPropio ? (
                selectorPersona(t('reunionPublica.orador'), form.orador_id, (e) => setForm({ ...form, orador_id: e.target.value }))
              ) : (
                <input placeholder={t('reunionPublica.oradorNombre')} value={form.orador_nombre} onChange={(e) => setForm({ ...form, orador_nombre: e.target.value })}
                  className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol" />
              )}
            </div>
          </div>
          <input placeholder={t('reunionPublica.congregacionVisitante')} value={form.congregacion_visitante} onChange={(e) => setForm({ ...form, congregacion_visitante: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol" />
          <div className="flex gap-3">
            {selectorPersona(t('reunionPublica.presidente'), form.presidente_id, (e) => setForm({ ...form, presidente_id: e.target.value }))}
            {selectorPersona(t('reunionPublica.conductorAtalaya'), form.conductor_atalaya_id, (e) => setForm({ ...form, conductor_atalaya_id: e.target.value }))}
            {selectorPersona(t('reunionPublica.lector'), form.lector_id, (e) => setForm({ ...form, lector_id: e.target.value }))}
          </div>
          <textarea placeholder={t('reunionPublica.notas')} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol" rows={2} />
          <div className="flex gap-2">
            <button type="submit" className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark transition-colors">{t('comun.guardar')}</button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">{t('comun.cancelar')}</button>
          </div>
        </form>
      )}

      {cargando && <p className="text-ink-soft text-sm">{t('comun.cargando')}</p>}
      {!cargando && reuniones.length === 0 && <p className="text-ink-soft text-sm">{t('reunionPublica.sinReuniones')}</p>}

      <div className="flex flex-col gap-4">
        {reuniones.map((r) => (
          <div key={r.id} className="border border-ink/10 rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  {r.tema || t('reunionPublica.temaAConfirmar')} {r.numero_discurso && <span className="font-mono text-xs text-ink-soft">[{r.numero_discurso}]</span>}
                </h3>
                <p className="font-mono text-xs text-gold mt-0.5">{formatearFecha(r.fecha, locale())}</p>
              </div>
              {esEditor && (
                <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
                  <button onClick={() => editar(r)} className="hover:text-petrol">{t('comun.editar')}</button>
                  <button onClick={() => eliminar(r.id)} className="hover:text-clay">{t('comun.borrar')}</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 font-mono text-xs">
              <div><p className="text-ink-soft">{t('reunionPublica.orador')}</p><p className="text-ink text-sm">{r.orador?.nombre || r.orador_nombre || '—'}{r.congregacion_visitante && ` (${r.congregacion_visitante})`}</p></div>
              <div><p className="text-ink-soft">{t('reunionPublica.presidente')}</p><p className="text-sm"><NombreOFranja nombre={r.presidente?.nombre} /></p></div>
              <div><p className="text-ink-soft">{t('reunionPublica.conductorAtalaya')}</p><p className="text-sm"><NombreOFranja nombre={r.conductor_atalaya?.nombre} /></p></div>
              <div><p className="text-ink-soft">{t('reunionPublica.lector')}</p><p className="text-sm"><NombreOFranja nombre={r.lector?.nombre} /></p></div>
            </div>

            {r.notas && <p className="text-sm text-ink-soft mt-2">{r.notas}</p>}

            <div className="border-t border-ink/10 mt-4 pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-mono text-xs uppercase tracking-wider text-petrol">{t('reunionPublica.tareasMecanicas')}</h4>
                {esEditorTareas && (
                  <button onClick={() => abrirTareas(r)} className="font-mono text-xs text-ink-soft hover:text-petrol">
                    {r.tareas_mecanicas_reunion_publica ? t('comun.editar') : t('reunionPublica.cargarTareas')}
                  </button>
                )}
              </div>

              {reunionTareasActivaId === r.id ? (
                <form onSubmit={guardarTareas} className="border border-ink/10 rounded-lg bg-paper p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {tareasCampos.map((c) => (
                    <div key={c.key}>
                      <label className="text-[10px] font-mono uppercase text-ink-soft">{c.label}</label>
                      <select value={formTareas[c.key]} onChange={(e) => setFormTareas({ ...formTareas, [c.key]: e.target.value })}
                        className="w-full border border-ink/15 rounded-md px-2 py-1 text-xs">
                        <option value="">—</option>
                        {personas.map((p) => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                      </select>
                    </div>
                  ))}
                  <div className="col-span-2 sm:col-span-3 flex gap-2 mt-2">
                    <button type="submit" className="bg-petrol text-paper rounded-md px-3 py-1.5 text-xs hover:bg-petrol-dark">{t('comun.guardar')}</button>
                    <button type="button" onClick={() => setReunionTareasActivaId(null)} className="text-ink-soft text-xs px-3 py-1.5 hover:text-ink">{t('comun.cancelar')}</button>
                  </div>
                </form>
              ) : r.tareas_mecanicas_reunion_publica ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {tareasCampos.map((c) => (
                    <div key={c.key} className="border border-ink/10 rounded-md p-2">
                      <p className="text-[10px] font-mono uppercase text-ink-soft">{c.label}</p>
                      <p className="text-sm"><NombreOFranja nombre={personas.find((p) => p.id === r.tareas_mecanicas_reunion_publica[c.key])?.nombre} /></p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-soft/70">{t('reunionPublica.sinTareas')}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
