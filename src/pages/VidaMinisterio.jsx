import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { notificar } from '../lib/notificar'

const secciones = [
  { key: 'tesoros', label: 'Tesoros de la Biblia', permiso: 'vida_ministerio_escuela' },
  { key: 'ministerio', label: 'Seamos Mejores Maestros', permiso: 'vida_ministerio_escuela' },
  { key: 'vida_cristiana', label: 'Nuestra Vida Cristiana', permiso: 'vida_ministerio_oraciones' },
]

const tareasCampos = [
  { key: 'audio_id', label: 'Audio' },
  { key: 'video_id', label: 'Video' },
  { key: 'microfono1_inicio_id', label: 'Micrófono 1 inicio' },
  { key: 'microfono2_inicio_id', label: 'Micrófono 2 inicio' },
  { key: 'microfono1_final_id', label: 'Micrófono 1 final' },
  { key: 'microfono2_final_id', label: 'Micrófono 2 final' },
  { key: 'plataforma_inicio_id', label: 'Plataforma inicio' },
  { key: 'plataforma_final_id', label: 'Plataforma final' },
  { key: 'acomodador_entrada1_id', label: 'Acomodador entrada 1' },
  { key: 'acomodador_entrada2_id', label: 'Acomodador entrada 2' },
  { key: 'acomodador_audio_inicio_id', label: 'Acomodador aud. inicio' },
  { key: 'acomodador_audio_final_id', label: 'Acomodador aud. final' },
]

const vacioParte = { seccion: 'tesoros', sala: '', titulo: '', duracion_min: '', asignado_id: '', ayudante_id: '', notas: '' }
const vacioSemana = { fecha_inicio: '', lectura_biblia: '', cantico_inicial: '', oracion_inicial_id: '', cantico_final: '', oracion_final_id: '', presidente_id: '' }

function formatearRango(fechaInicio) {
  const inicio = new Date(fechaInicio + 'T00:00')
  const fin = new Date(inicio)
  fin.setDate(inicio.getDate() + 6)
  const opciones = { day: 'numeric', month: 'short' }
  return `${inicio.toLocaleDateString('es-AR', opciones)} — ${fin.toLocaleDateString('es-AR', opciones)}`
}

function lunesActual() {
  const hoy = new Date()
  const dia = (hoy.getDay() + 6) % 7
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - dia)
  return lunes.toISOString().slice(0, 10)
}

export default function VidaMinisterio() {
  const { puedeEditar } = useAuth()
  const esEditorEscuela = puedeEditar('vida_ministerio_escuela')
  const esEditorOraciones = puedeEditar('vida_ministerio_oraciones')
  const esEditorTareas = puedeEditar('vida_ministerio_tareas')
  const esEditorAlguno = esEditorEscuela || esEditorOraciones || esEditorTareas

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

  async function cargar() {
    setCargando(true)
    const { data: sems } = await supabase
      .from('semanas_vida_ministerio')
      .select('*, partes_vida_ministerio(*, asignado:asignado_id(nombre), ayudante:ayudante_id(nombre)), presidente:presidente_id(nombre), oracion_inicial:oracion_inicial_id(nombre), oracion_final:oracion_final_id(nombre), tareas_mecanicas(*)')
      .gte('fecha_inicio', lunesActual())
      .order('fecha_inicio', { ascending: true })
      .limit(esEditorAlguno ? 16 : 4)

    setSemanas(sems || [])

    const { data: perfiles } = await supabase.from('profiles').select('id, nombre').order('nombre')
    setPersonas(perfiles || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [esEditorAlguno])

  async function crearSemana(e) {
    e.preventDefault()
    const payload = { ...formSemana }
    Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null })
    await supabase.from('semanas_vida_ministerio').insert(payload)

    const fechaTexto = new Date(payload.fecha_inicio + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
    if (payload.presidente_id) notificar([payload.presidente_id], 'Te asignaron presidir Vida y Ministerio', `Vas a presidir el programa del ${fechaTexto}.`)
    if (payload.oracion_inicial_id) notificar([payload.oracion_inicial_id], 'Te asignaron la oración inicial', `Tenés la oración inicial del ${fechaTexto}.`)
    if (payload.oracion_final_id) notificar([payload.oracion_final_id], 'Te asignaron la oración final', `Tenés la oración final del ${fechaTexto}.`)

    setMostrarFormSemana(false)
    setFormSemana(vacioSemana)
    cargar()
  }

  function nuevaParte(semanaId, seccionKey) {
    setFormParte({ ...vacioParte, seccion: seccionKey })
    setSemanaActivaId(semanaId)
    setEditandoParteId(null)
  }

  function editarParte(semanaId, p) {
    setFormParte({
      seccion: p.seccion,
      sala: p.sala || '',
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
      duracion_min: formParte.duracion_min ? Number(formParte.duracion_min) : null,
      asignado_id: formParte.asignado_id || null,
      ayudante_id: formParte.ayudante_id || null,
      orden: semana.partes_vida_ministerio.filter((p) => p.seccion === formParte.seccion).length,
    }
    if (editandoParteId) await supabase.from('partes_vida_ministerio').update(payload).eq('id', editandoParteId)
    else await supabase.from('partes_vida_ministerio').insert(payload)

    const fechaTexto = new Date(semana.fecha_inicio + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
    if (payload.asignado_id) notificar([payload.asignado_id], `Te asignaron una parte: ${payload.titulo}`, `Tenés la parte "${payload.titulo}" del ${fechaTexto}.`)
    if (payload.ayudante_id) notificar([payload.ayudante_id], `Sos ayudante en: ${payload.titulo}`, `Ayudás en la parte "${payload.titulo}" del ${fechaTexto}.`)

    setSemanaActivaId(null)
    setEditandoParteId(null)
    cargar()
  }

  async function eliminarParte(id) {
    if (!confirm('¿Eliminar esta parte?')) return
    await supabase.from('partes_vida_ministerio').delete().eq('id', id)
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

    const fechaTexto = new Date(semana.fecha_inicio + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
    tareasCampos.forEach((c) => {
      if (payload[c.key]) {
        notificar([payload[c.key]], `Tarea asignada: ${c.label}`, `Tenés la tarea "${c.label}" el ${fechaTexto}.`)
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
        <p className="text-ink-soft text-sm">Cargando…</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Vida y Ministerio</h1>
        {(esEditorEscuela || esEditorOraciones) && (
          <button onClick={() => setMostrarFormSemana(true)} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark">
            + crear semana
          </button>
        )}
      </div>

      {mostrarFormSemana && (
        <form onSubmit={crearSemana} className="mb-8 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
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
                placeholder="Lectura bíblica (ej: Jeremías 13-15)"
                value={formSemana.lectura_biblia}
                onChange={(e) => setFormSemana({ ...formSemana, lectura_biblia: e.target.value })}
                className="border border-ink/15 rounded-md px-3 py-2 text-sm flex-1"
              />
            )}
          </div>
          {esEditorOraciones && (
            <>
              <div className="flex gap-3">
                {selectorPersona('Presidente', formSemana.presidente_id, (e) => setFormSemana({ ...formSemana, presidente_id: e.target.value }))}
              </div>
              <div className="flex gap-3">
                <input
                  placeholder="N° cántico inicial"
                  value={formSemana.cantico_inicial}
                  onChange={(e) => setFormSemana({ ...formSemana, cantico_inicial: e.target.value })}
                  className="border border-ink/15 rounded-md px-3 py-2 text-sm w-32"
                />
                {selectorPersona('Oración inicial', formSemana.oracion_inicial_id, (e) => setFormSemana({ ...formSemana, oracion_inicial_id: e.target.value }))}
              </div>
              <div className="flex gap-3">
                <input
                  placeholder="N° cántico final"
                  value={formSemana.cantico_final}
                  onChange={(e) => setFormSemana({ ...formSemana, cantico_final: e.target.value })}
                  className="border border-ink/15 rounded-md px-3 py-2 text-sm w-32"
                />
                {selectorPersona('Oración final', formSemana.oracion_final_id, (e) => setFormSemana({ ...formSemana, oracion_final_id: e.target.value }))}
              </div>
            </>
          )}
          <div className="flex gap-2">
            <button type="submit" className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark">Guardar</button>
            <button type="button" onClick={() => setMostrarFormSemana(false)} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">Cancelar</button>
          </div>
        </form>
      )}

      {semanas.length === 0 && <p className="text-ink-soft text-sm">No hay semanas próximas cargadas.</p>}

      <div className="flex flex-col gap-8">
        {semanas.map((semana) => (
          <div key={semana.id} className="border border-ink/10 rounded-lg bg-white overflow-hidden">
            <div className="bg-paper-dim px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display font-semibold">{formatearRango(semana.fecha_inicio)}</p>
                {semana.lectura_biblia && <p className="font-mono text-xs text-ink-soft uppercase">{semana.lectura_biblia}</p>}
              </div>
              <div className="font-mono text-xs text-ink-soft flex flex-wrap gap-3 items-center">
                {semana.presidente?.nombre && <span>Presidente <b className="text-ink">{semana.presidente.nombre}</b></span>}
                {semana.cantico_inicial && <span>🎵{semana.cantico_inicial}</span>}
                {semana.oracion_inicial?.nombre && <span>Oración <b className="text-ink">{semana.oracion_inicial.nombre}</b></span>}
              </div>
            </div>

            <div className="p-4 flex flex-col gap-5">
              {secciones.map((s) => {
                const puedeEditarSeccion = puedeEditar(s.permiso)
                const partesSeccion = semana.partes_vida_ministerio.filter((p) => p.seccion === s.key)
                const salaA = partesSeccion.filter((p) => p.sala === 'A')
                const salaB = partesSeccion.filter((p) => p.sala === 'B')
                const sinSala = partesSeccion.filter((p) => !p.sala)

                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-mono text-xs uppercase tracking-wider text-petrol">{s.label}</h2>
                      {puedeEditarSeccion && (
                        <button onClick={() => nuevaParte(semana.id, s.key)} className="font-mono text-xs text-ink-soft hover:text-petrol">
                          + parte
                        </button>
                      )}
                    </div>

                    {semanaActivaId === semana.id && formParte.seccion === s.key && (
                      <form onSubmit={guardarParte} className="mb-3 border border-ink/10 rounded-lg bg-paper p-3 flex flex-col gap-2">
                        <input
                          required
                          placeholder="Título de la parte"
                          value={formParte.titulo}
                          onChange={(e) => setFormParte({ ...formParte, titulo: e.target.value })}
                          className="border border-ink/15 rounded-md px-2 py-1.5 text-sm"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min"
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
                              <option value="">Sin sala</option>
                              <option value="A">Sala A</option>
                              <option value="B">Sala B</option>
                            </select>
                          )}
                          {selectorPersona('Asignado a…', formParte.asignado_id, (e) => setFormParte({ ...formParte, asignado_id: e.target.value }))}
                          {selectorPersona('Ayudante', formParte.ayudante_id, (e) => setFormParte({ ...formParte, ayudante_id: e.target.value }))}
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-petrol text-paper rounded-md px-3 py-1.5 text-xs hover:bg-petrol-dark">Guardar</button>
                          <button type="button" onClick={() => setSemanaActivaId(null)} className="text-ink-soft text-xs px-3 py-1.5 hover:text-ink">Cancelar</button>
                        </div>
                      </form>
                    )}

                    {partesSeccion.length === 0 ? (
                      <p className="text-sm text-ink-soft/70">Sin partes cargadas.</p>
                    ) : s.key === 'ministerio' && (salaA.length > 0 || salaB.length > 0) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="font-mono text-xs text-gold mb-1">Sala A</p>
                          <PartesLista partes={salaA} esEditor={puedeEditarSeccion} onEditar={(p) => editarParte(semana.id, p)} onEliminar={eliminarParte} />
                        </div>
                        <div>
                          <p className="font-mono text-xs text-gold mb-1">Sala B</p>
                          <PartesLista partes={salaB} esEditor={puedeEditarSeccion} onEditar={(p) => editarParte(semana.id, p)} onEliminar={eliminarParte} />
                        </div>
                        {sinSala.length > 0 && (
                          <div className="sm:col-span-2">
                            <PartesLista partes={sinSala} esEditor={puedeEditarSeccion} onEditar={(p) => editarParte(semana.id, p)} onEliminar={eliminarParte} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <PartesLista partes={partesSeccion} esEditor={puedeEditarSeccion} onEditar={(p) => editarParte(semana.id, p)} onEliminar={eliminarParte} />
                    )}
                  </div>
                )
              })}

              {(semana.cantico_final || semana.oracion_final?.nombre) && (
                <div className="font-mono text-xs text-ink-soft flex gap-3 border-t border-ink/10 pt-3">
                  {semana.cantico_final && <span>🎵{semana.cantico_final}</span>}
                  {semana.oracion_final?.nombre && <span>Oración final <b className="text-ink">{semana.oracion_final.nombre}</b></span>}
                </div>
              )}

              <div className="border-t border-ink/10 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-mono text-xs uppercase tracking-wider text-petrol">Tareas mecánicas</h2>
                  {esEditorTareas && (
                    <button onClick={() => abrirTareas(semana)} className="font-mono text-xs text-ink-soft hover:text-petrol">
                      {semana.tareas_mecanicas ? 'editar' : '+ cargar'}
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
                      <button type="submit" className="bg-petrol text-paper rounded-md px-3 py-1.5 text-xs hover:bg-petrol-dark">Guardar</button>
                      <button type="button" onClick={() => setSemanaTareasActivaId(null)} className="text-ink-soft text-xs px-3 py-1.5 hover:text-ink">Cancelar</button>
                    </div>
                  </form>
                ) : semana.tareas_mecanicas ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tareasCampos.map((c) => (
                      <div key={c.key} className="border border-ink/10 rounded-md p-2">
                        <p className="text-[10px] font-mono uppercase text-ink-soft">{c.label}</p>
                        <p className="text-sm">{personas.find((p) => p.id === semana.tareas_mecanicas[c.key])?.nombre || '—'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft/70">Sin tareas cargadas.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}

function PartesLista({ partes, esEditor, onEditar, onEliminar }) {
  return (
    <div className="flex flex-col gap-2">
      {partes.map((p) => (
        <div key={p.id} className="border border-ink/10 rounded-lg bg-white p-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-sm">
              {p.titulo} {p.duracion_min && <span className="text-ink-soft font-normal">({p.duracion_min} min)</span>}
            </p>
            {(p.asignado?.nombre || p.ayudante?.nombre) && (
              <p className="text-xs text-ink-soft mt-0.5">
                {p.asignado?.nombre}
                {p.ayudante?.nombre && ` · ${p.ayudante.nombre}`}
              </p>
            )}
            {p.notas && <p className="text-xs text-ink-soft mt-0.5">{p.notas}</p>}
          </div>
          {esEditor && (
            <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
              <button onClick={() => onEditar(p)} className="hover:text-petrol">editar</button>
              <button onClick={() => onEliminar(p.id)} className="hover:text-clay">borrar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
