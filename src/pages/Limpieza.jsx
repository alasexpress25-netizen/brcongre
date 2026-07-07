import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { notificar } from '../lib/notificar'

const vacio = { grupo_id: '', fecha_inicio: '', fecha_fin: '', notas: '' }

function formatearRango(inicio, fin) {
  const opciones = { day: 'numeric', month: 'short' }
  return `${new Date(inicio + 'T00:00').toLocaleDateString('es-AR', opciones)} — ${new Date(fin + 'T00:00').toLocaleDateString('es-AR', opciones)}`
}

export default function Limpieza() {
  const { puedeEditar } = useAuth()
  const esEditor = puedeEditar('limpieza')
  const [turnos, setTurnos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function cargar() {
    setCargando(true)
    const [{ data: t }, { data: g }] = await Promise.all([
      supabase
        .from('turnos_limpieza')
        .select('*, grupos(nombre)')
        .gte('fecha_fin', new Date().toISOString().slice(0, 10))
        .order('fecha_inicio', { ascending: true }),
      supabase.from('grupos').select('*').order('nombre'),
    ])
    setTurnos(t || [])
    setGrupos(g || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function editar(t) {
    setForm({ grupo_id: t.grupo_id || '', fecha_inicio: t.fecha_inicio, fecha_fin: t.fecha_fin, notas: t.notas || '' })
    setEditandoId(t.id)
    setMostrarForm(true)
  }

  function nuevo() {
    setForm(vacio)
    setEditandoId(null)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const payload = { ...form, grupo_id: form.grupo_id || null }
    if (editandoId) await supabase.from('turnos_limpieza').update(payload).eq('id', editandoId)
    else await supabase.from('turnos_limpieza').insert(payload)

    if (payload.grupo_id) {
      const { data: miembros } = await supabase.from('profiles').select('id').eq('grupo_id', payload.grupo_id).eq('aprobado', true)
      const grupoNombre = grupos.find((g) => g.id === payload.grupo_id)?.nombre || 'tu grupo'
      notificar(
        miembros?.map((m) => m.id),
        `Turno de limpieza asignado a ${grupoNombre}`,
        `Le corresponde la limpieza del salón del ${new Date(payload.fecha_inicio + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} al ${new Date(payload.fecha_fin + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}.`
      )
    }

    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este turno?')) return
    await supabase.from('turnos_limpieza').delete().eq('id', id)
    cargar()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Limpieza del Salón</h1>
        {esEditor && (
          <button onClick={nuevo} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors">
            + nuevo
          </button>
        )}
      </div>

      {esEditor && grupos.length === 0 && (
        <p className="text-sm text-clay mb-4">
          Todavía no hay grupos creados. Pedile al admin que los cree desde el Panel de administración.
        </p>
      )}

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          <select
            required
            value={form.grupo_id}
            onChange={(e) => setForm({ ...form, grupo_id: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          >
            <option value="">Seleccionar grupo responsable</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-ink-soft">Desde</label>
              <input
                required
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-ink-soft">Hasta</label>
              <input
                required
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
          </div>
          <textarea
            placeholder="Notas (opcional)"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            rows={2}
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark transition-colors">
              Guardar
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando && <p className="text-ink-soft text-sm">Cargando…</p>}
      {!cargando && turnos.length === 0 && <p className="text-ink-soft text-sm">No hay turnos próximos cargados.</p>}

      <div className="flex flex-col gap-3">
        {turnos.map((t) => (
          <div key={t.id} className="border border-ink/10 rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{t.grupos?.nombre || 'Grupo sin asignar'}</h3>
                <p className="font-mono text-xs text-gold mt-0.5">{formatearRango(t.fecha_inicio, t.fecha_fin)}</p>
              </div>
              {esEditor && (
                <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
                  <button onClick={() => editar(t)} className="hover:text-petrol">editar</button>
                  <button onClick={() => eliminar(t.id)} className="hover:text-clay">borrar</button>
                </div>
              )}
            </div>
            {t.notas && <p className="text-sm text-ink-soft mt-1">{t.notas}</p>}
          </div>
        ))}
      </div>
    </Layout>
  )
}
