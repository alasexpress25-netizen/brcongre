import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const vacio = {
  numero: '',
  ultima_predicacion: '',
  notas: '',
  link_territorio: '',
  link_mapa: '',
}

function formatearFecha(f) {
  if (!f) return ''
  return new Date(f + 'T00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Territorios() {
  const { puedeEditar } = useAuth()
  const esEditor = puedeEditar('predicacion')

  const [territorios, setTerritorios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from('territorios').select('*').order('numero')
    setTerritorios(data || [])
    setCargando(false)
  }

  useEffect(() => {
    if (esEditor) cargar()
    else setCargando(false)
  }, [esEditor])

  function editar(t) {
    setForm({
      numero: t.numero ?? '',
      ultima_predicacion: t.ultima_predicacion || '',
      notas: t.notas || '',
      link_territorio: t.link_territorio || '',
      link_mapa: t.link_mapa || '',
    })
    setEditandoId(t.id)
    setError('')
    setMostrarForm(true)
  }

  function nuevo() {
    setForm(vacio)
    setEditandoId(null)
    setError('')
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')

    const payload = {
      numero: form.numero === '' ? null : Number(form.numero),
      ultima_predicacion: form.ultima_predicacion || null,
      notas: form.notas || null,
      link_territorio: form.link_territorio || null,
      link_mapa: form.link_mapa || null,
    }

    const { error: err } = editandoId
      ? await supabase.from('territorios').update(payload).eq('id', editandoId)
      : await supabase.from('territorios').insert(payload)

    setGuardando(false)
    if (err) {
      setError(err.message.includes('duplicate') ? 'Ya existe un territorio con ese número.' : err.message)
      return
    }
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar() {
    if (!editandoId) return
    if (!confirm('¿Eliminar este territorio? Se quitará también de las salidas donde esté anexado.')) return
    const { error: err } = await supabase.from('territorios').delete().eq('id', editandoId)
    if (err) {
      alert('No se pudo eliminar: ' + err.message)
      return
    }
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return territorios
    return territorios.filter(
      (t) => String(t.numero).includes(q) || t.notas?.toLowerCase().includes(q)
    )
  }, [territorios, busqueda])

  if (!esEditor) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">Esta sección es solo para quienes tienen el permiso de predicación activo.</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-semibold">Territorios</h1>
        <button onClick={nuevo} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors">
          + nuevo
        </button>
      </div>
      <p className="text-sm text-ink-soft mb-6">{territorios.length} territorio(s) en total</p>

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          {error && <p className="text-sm text-clay">{error}</p>}
          <div className="flex gap-3">
            <input
              required
              type="number"
              placeholder="Número"
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
              className="w-32 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            <div className="flex-1">
              <label className="text-xs text-ink-soft font-mono block mb-1">Última vez predicado</label>
              <input
                type="date"
                value={form.ultima_predicacion}
                onChange={(e) => setForm({ ...form, ultima_predicacion: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
          </div>
          <input
            placeholder="Link del territorio (imagen / tarjeta del territorio)"
            value={form.link_territorio}
            onChange={(e) => setForm({ ...form, link_territorio: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            placeholder="Link del mapa (territorio completo)"
            value={form.link_mapa}
            onChange={(e) => setForm({ ...form, link_mapa: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <textarea
            placeholder="Notas"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            rows={2}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark transition-colors disabled:opacity-50">
              {guardando ? 'guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">
              Cancelar
            </button>
            {editandoId && (
              <button type="button" onClick={eliminar} className="text-clay text-sm px-4 py-2 hover:text-clay/80 ml-auto">
                Borrar territorio
              </button>
            )}
          </div>
        </form>
      )}

      <input
        placeholder="Buscar por número o notas…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-petrol"
      />

      {cargando && <p className="text-ink-soft text-sm">Cargando…</p>}
      {!cargando && filtrados.length === 0 && <p className="text-ink-soft text-sm">No hay territorios para mostrar.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtrados.map((t) => (
          <div key={t.id} className="border border-ink/10 rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">Territorio {t.numero}</h3>
                {t.ultima_predicacion && (
                  <p className="font-mono text-xs text-gold mt-0.5">Última predicación: {formatearFecha(t.ultima_predicacion)}</p>
                )}
              </div>
              <button onClick={() => editar(t)} className="font-mono text-xs text-ink-soft hover:text-petrol shrink-0">
                editar
              </button>
            </div>
            {t.notas && <p className="text-sm text-ink-soft mt-2">{t.notas}</p>}
            <div className="flex gap-3 mt-3 font-mono text-xs">
              {t.link_territorio && (
                <a href={t.link_territorio} target="_blank" rel="noreferrer" className="text-petrol underline hover:text-petrol-dark">
                  ver territorio
                </a>
              )}
              {t.link_mapa && (
                <a href={t.link_mapa} target="_blank" rel="noreferrer" className="text-petrol underline hover:text-petrol-dark">
                  ver mapa
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
