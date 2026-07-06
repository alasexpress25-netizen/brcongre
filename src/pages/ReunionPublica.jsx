import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const vacio = { fecha: '', tema: '', orador_nombre: '', congregacion_visitante: '', notas: '' }

function formatearFecha(f) {
  return new Date(f + 'T00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ReunionPublica() {
  const { puedeEditar } = useAuth()
  const esEditor = puedeEditar('reunion_publica')
  const [reuniones, setReuniones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('reuniones_publicas')
      .select('*')
      .gte('fecha', new Date().toISOString().slice(0, 10))
      .order('fecha', { ascending: true })
    setReuniones(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function editar(r) {
    setForm({
      fecha: r.fecha,
      tema: r.tema || '',
      orador_nombre: r.orador_nombre || '',
      congregacion_visitante: r.congregacion_visitante || '',
      notas: r.notas || '',
    })
    setEditandoId(r.id)
    setMostrarForm(true)
  }

  function nueva() {
    setForm(vacio)
    setEditandoId(null)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    if (editandoId) await supabase.from('reuniones_publicas').update(form).eq('id', editandoId)
    else await supabase.from('reuniones_publicas').insert(form)
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta reunión?')) return
    await supabase.from('reuniones_publicas').delete().eq('id', id)
    cargar()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Reunión Pública</h1>
        {esEditor && (
          <button onClick={nueva} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors">
            + nueva
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          <input
            required
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            placeholder="Tema del discurso"
            value={form.tema}
            onChange={(e) => setForm({ ...form, tema: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            placeholder="Orador"
            value={form.orador_nombre}
            onChange={(e) => setForm({ ...form, orador_nombre: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            placeholder="Congregación visitante (si aplica)"
            value={form.congregacion_visitante}
            onChange={(e) => setForm({ ...form, congregacion_visitante: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <textarea
            placeholder="Notas (presidente, conductor de Atalaya, lector)"
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
      {!cargando && reuniones.length === 0 && <p className="text-ink-soft text-sm">No hay reuniones públicas cargadas.</p>}

      <div className="flex flex-col gap-3">
        {reuniones.map((r) => (
          <div key={r.id} className="border border-ink/10 rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{r.tema || 'Tema a confirmar'}</h3>
                <p className="font-mono text-xs text-gold mt-0.5">{formatearFecha(r.fecha)}</p>
              </div>
              {esEditor && (
                <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
                  <button onClick={() => editar(r)} className="hover:text-petrol">editar</button>
                  <button onClick={() => eliminar(r.id)} className="hover:text-clay">borrar</button>
                </div>
              )}
            </div>
            {r.orador_nombre && (
              <p className="text-sm text-ink-soft mt-1">
                🎙️ {r.orador_nombre}
                {r.congregacion_visitante && ` — ${r.congregacion_visitante}`}
              </p>
            )}
            {r.notas && <p className="text-sm text-ink-soft mt-1">{r.notas}</p>}
          </div>
        ))}
      </div>
    </Layout>
  )
}
