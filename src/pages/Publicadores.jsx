import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const servicios = [
  { value: 'publicador', label: 'Publicador' },
  { value: 'precursor_auxiliar', label: 'Precursor auxiliar' },
  { value: 'precursor_regular', label: 'Precursor regular' },
  { value: 'precursor_especial', label: 'Precursor especial' },
  { value: 'siervo_ministerial', label: 'Siervo ministerial' },
  { value: 'anciano', label: 'Anciano' },
]

const vacio = {
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
  numero_documento: '',
  cpf: '',
  servicio: 'publicador',
  grupo_id: '',
  activo: true,
  notas: '',
}

function etiquetaServicio(valor) {
  return servicios.find((s) => s.value === valor)?.label || valor
}

export default function Publicadores() {
  const { puedeEditar } = useAuth()
  const esEditor = puedeEditar('secretario')

  const [publicadores, setPublicadores] = useState([])
  const [grupos, setGrupos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    setCargando(true)
    const [{ data }, { data: g }] = await Promise.all([
      supabase.from('publicadores').select('*, grupos!publicadores_grupo_id_fkey(nombre)').order('nombre'),
      supabase.from('grupos').select('*').order('nombre'),
    ])
    setPublicadores(data || [])
    setGrupos(g || [])
    setCargando(false)
  }

  useEffect(() => {
    if (esEditor) cargar()
  }, [esEditor])

  function editar(p) {
    setForm({
      nombre: p.nombre || '',
      email: p.email || '',
      telefono: p.telefono || '',
      direccion: p.direccion || '',
      numero_documento: p.numero_documento || '',
      cpf: p.cpf || '',
      servicio: p.servicio || 'publicador',
      grupo_id: p.grupo_id || '',
      activo: p.activo,
      notas: p.notas || '',
    })
    setEditandoId(p.id)
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
    const payload = { ...form }
    Object.keys(payload).forEach((k) => {
      if (payload[k] === '') payload[k] = null
    })
    payload.activo = !!form.activo

    const { error: err } = editandoId
      ? await supabase.from('publicadores').update(payload).eq('id', editandoId)
      : await supabase.from('publicadores').insert(payload)

    setGuardando(false)
    if (err) {
      setError(err.message)
      return
    }
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar() {
    if (!editandoId) return
    if (!confirm('¿Eliminar este publicador? Si tiene asignaciones o tareas vinculadas puede que la base de datos rechace el borrado.')) return
    const { error: err } = await supabase.from('publicadores').delete().eq('id', editandoId)
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
    return publicadores
      .filter((p) => mostrarInactivos || p.activo)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
      .filter((p) => {
        if (!grupoFiltro) return true
        if (grupoFiltro === 'sin_grupo') return !p.grupo_id
        return p.grupo_id === grupoFiltro
      })
  }, [publicadores, busqueda, mostrarInactivos, grupoFiltro])

  const sinEmail = publicadores.filter((p) => p.activo && !p.email).length

  const nombreGrupoFiltro = grupoFiltro === 'sin_grupo'
    ? 'Sin grupo'
    : grupos.find((g) => g.id === grupoFiltro)?.nombre || ''

  function imprimir() {
    window.print()
  }

  if (!esEditor) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">Esta sección es solo para quienes gestionan los datos de la congregación (secretario).</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-1 no-print">
        <h1 className="font-display text-2xl font-semibold">Publicadores</h1>
        <div className="flex gap-2">
          <button onClick={imprimir} className="font-mono text-xs border border-petrol/30 text-petrol px-3 py-1.5 rounded-md hover:bg-petrol/10 transition-colors">
            imprimir
          </button>
          <button onClick={nuevo} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors">
            + nuevo
          </button>
        </div>
      </div>
      <p className="text-sm text-ink-soft mb-6 no-print">
        {publicadores.length} en total{sinEmail > 0 && ` · ${sinEmail} activo(s) sin email cargado (no recibirán notificaciones)`}
      </p>

      <div className="print-only mb-6">
        <h1 className="font-display text-2xl font-semibold">Publicadores{nombreGrupoFiltro && ` — ${nombreGrupoFiltro}`}</h1>
        <p className="text-sm text-ink-soft">
          {filtrados.length} publicador(es) · {new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="no-print mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          {error && <p className="text-sm text-clay">{error}</p>}
          <input
            required
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="Email (para notificaciones)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            <input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>
          <input
            placeholder="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <div className="flex gap-3">
            <input
              placeholder="N° de documento"
              value={form.numero_documento}
              onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            <input
              placeholder="CPF"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={form.servicio}
              onChange={(e) => setForm({ ...form, servicio: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            >
              {servicios.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select
              value={form.grupo_id}
              onChange={(e) => setForm({ ...form, grupo_id: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            >
              <option value="">Sin grupo</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-ink-soft shrink-0">
              <input type="checkbox" checked={!form.activo} onChange={(e) => setForm({ ...form, activo: !e.target.checked })} />
              inactivo
            </label>
          </div>
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
                Borrar publicador
              </button>
            )}
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4 no-print">
        <input
          placeholder="Buscar por nombre o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 min-w-[200px] border border-ink/15 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
        />
        <select
          value={grupoFiltro}
          onChange={(e) => setGrupoFiltro(e.target.value)}
          className="border border-ink/15 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
        >
          <option value="">Todos los grupos</option>
          <option value="sin_grupo">Sin grupo</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>{g.nombre}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-soft shrink-0">
          <input type="checkbox" checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)} />
          mostrar inactivos
        </label>
      </div>

      {cargando && <p className="text-ink-soft text-sm no-print">Cargando…</p>}
      {!cargando && filtrados.length === 0 && <p className="text-ink-soft text-sm">No hay publicadores para mostrar.</p>}

      <div className="flex flex-col gap-3">
        {filtrados.map((p) => (
          <div key={p.id} className={`border rounded-lg bg-white p-4 ${p.activo ? 'border-ink/10' : 'border-ink/10 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display font-semibold">
                  {p.nombre} <span className="font-mono text-xs text-ink-soft">· {etiquetaServicio(p.servicio)}</span>
                </p>
                <p className="text-sm text-ink-soft mt-0.5">
                  {p.email || <span className="text-clay">sin email</span>}
                  {p.telefono && ` · ${p.telefono}`}
                  {p.grupos?.nombre && ` · ${p.grupos.nombre}`}
                </p>
                {!p.activo && <p className="font-mono text-xs text-gold mt-0.5">inactivo</p>}
              </div>
              <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0 no-print">
                <button onClick={() => editar(p)} className="hover:text-petrol">editar</button>
              </div>
            </div>
            {p.notas && <p className="text-sm text-ink-soft mt-2">{p.notas}</p>}
          </div>
        ))}
      </div>
    </Layout>
  )
}
