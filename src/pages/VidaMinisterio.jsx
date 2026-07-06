import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const secciones = [
  { key: 'tesoros', label: 'Tesoros de la Biblia' },
  { key: 'ministerio', label: 'Seamos Mejores Maestros' },
  { key: 'vida_cristiana', label: 'Nuestra Vida Cristiana' },
]

const vacioParte = { seccion: 'tesoros', titulo: '', duracion_min: '', asignado_id: '', ayudante_id: '', notas: '' }

function lunesActual() {
  const hoy = new Date()
  const dia = (hoy.getDay() + 6) % 7
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - dia)
  return lunes.toISOString().slice(0, 10)
}

export default function VidaMinisterio() {
  const { puedeEditar } = useAuth()
  const esEditor = puedeEditar('vida_ministerio')
  const [semana, setSemana] = useState(null)
  const [partes, setPartes] = useState([])
  const [personas, setPersonas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacioParte)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function cargar() {
    setCargando(true)
    const { data: sem } = await supabase
      .from('semanas_vida_ministerio')
      .select('*')
      .gte('fecha_inicio', lunesActual())
      .order('fecha_inicio', { ascending: true })
      .limit(1)
      .maybeSingle()

    setSemana(sem)

    if (sem) {
      const { data: p } = await supabase
        .from('partes_vida_ministerio')
        .select('*, asignado:asignado_id(nombre), ayudante:ayudante_id(nombre)')
        .eq('semana_id', sem.id)
        .order('orden', { ascending: true })
      setPartes(p || [])
    } else {
      setPartes([])
    }

    const { data: perfiles } = await supabase.from('profiles').select('id, nombre').order('nombre')
    setPersonas(perfiles || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crearSemana() {
    const { data } = await supabase
      .from('semanas_vida_ministerio')
      .insert({ fecha_inicio: lunesActual() })
      .select()
      .single()
    setSemana(data)
  }

  function nuevaParte(seccionKey) {
    setForm({ ...vacioParte, seccion: seccionKey })
    setEditandoId(null)
    setMostrarForm(true)
  }

  function editarParte(p) {
    setForm({
      seccion: p.seccion,
      titulo: p.titulo,
      duracion_min: p.duracion_min || '',
      asignado_id: p.asignado_id || '',
      ayudante_id: p.ayudante_id || '',
      notas: p.notas || '',
    })
    setEditandoId(p.id)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const payload = {
      ...form,
      semana_id: semana.id,
      duracion_min: form.duracion_min ? Number(form.duracion_min) : null,
      asignado_id: form.asignado_id || null,
      ayudante_id: form.ayudante_id || null,
      orden: partes.filter((p) => p.seccion === form.seccion).length,
    }
    if (editandoId) await supabase.from('partes_vida_ministerio').update(payload).eq('id', editandoId)
    else await supabase.from('partes_vida_ministerio').insert(payload)
    setMostrarForm(false)
    cargar()
  }

  async function eliminarParte(id) {
    if (!confirm('¿Eliminar esta parte?')) return
    await supabase.from('partes_vida_ministerio').delete().eq('id', id)
    cargar()
  }

  if (cargando) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">Cargando…</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold mb-1">Vida y Ministerio</h1>

      {!semana && (
        <div className="mt-4">
          <p className="text-ink-soft text-sm mb-3">Todavía no hay programa cargado para esta semana.</p>
          {esEditor && (
            <button onClick={crearSemana} className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark">
              Crear semana
            </button>
          )}
        </div>
      )}

      {semana && (
        <>
          <p className="font-mono text-xs text-gold mb-6">
            Semana del {new Date(semana.fecha_inicio + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
          </p>

          {mostrarForm && (
            <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
              <input
                required
                placeholder="Título de la parte"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Minutos"
                  value={form.duracion_min}
                  onChange={(e) => setForm({ ...form, duracion_min: e.target.value })}
                  className="w-28 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
                />
                <select
                  value={form.asignado_id}
                  onChange={(e) => setForm({ ...form, asignado_id: e.target.value })}
                  className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
                >
                  <option value="">Asignado a…</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <select
                  value={form.ayudante_id}
                  onChange={(e) => setForm({ ...form, ayudante_id: e.target.value })}
                  className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
                >
                  <option value="">Ayudante (opcional)</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Notas"
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
                rows={2}
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark">
                  Guardar
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-6">
            {secciones.map((s) => {
              const partesSeccion = partes.filter((p) => p.seccion === s.key)
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-mono text-xs uppercase tracking-wider text-petrol">{s.label}</h2>
                    {esEditor && (
                      <button onClick={() => nuevaParte(s.key)} className="font-mono text-xs text-ink-soft hover:text-petrol">
                        + parte
                      </button>
                    )}
                  </div>
                  {partesSeccion.length === 0 ? (
                    <p className="text-sm text-ink-soft/70">Sin partes cargadas.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {partesSeccion.map((p) => (
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
                              <button onClick={() => editarParte(p)} className="hover:text-petrol">editar</button>
                              <button onClick={() => eliminarParte(p.id)} className="hover:text-clay">borrar</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Layout>
  )
}
