import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const roles = ['publicador', 'siervo_ministerial', 'anciano', 'admin']
const secciones = [
  { key: 'predicacion', label: 'Predicación' },
  { key: 'vida_ministerio', label: 'Vida y Ministerio' },
  { key: 'reunion_publica', label: 'Reunión Pública' },
  { key: 'limpieza', label: 'Limpieza' },
  { key: 'anuncios', label: 'Anuncios' },
  { key: 'calendario', label: 'Calendario' },
]

export default function Admin() {
  const { esAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [grupos, setGrupos] = useState([])
  const [nuevoGrupo, setNuevoGrupo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardandoId, setGuardandoId] = useState(null)

  async function cargar() {
    setCargando(true)
    const [{ data: u }, { data: g }] = await Promise.all([
      supabase.from('profiles').select('*, permisos(*)').order('aprobado', { ascending: true }).order('nombre'),
      supabase.from('grupos').select('*').order('nombre'),
    ])
    setUsuarios(u || [])
    setGrupos(g || [])
    setCargando(false)
  }

  useEffect(() => {
    if (esAdmin) cargar()
  }, [esAdmin])

  async function agregarGrupo(e) {
    e.preventDefault()
    if (!nuevoGrupo.trim()) return
    await supabase.from('grupos').insert({ nombre: nuevoGrupo.trim() })
    setNuevoGrupo('')
    cargar()
  }

  async function eliminarGrupo(id) {
    if (!confirm('¿Eliminar este grupo? Los miembros y turnos que lo tenían asignado quedarán sin grupo.')) return
    await supabase.from('grupos').delete().eq('id', id)
    cargar()
  }

  function actualizarLocal(id, cambios) {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...cambios } : u)))
  }

  function actualizarPermisoLocal(id, seccion, valor) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, permisos: { ...u.permisos, [seccion]: valor } } : u))
    )
  }

  async function guardar(usuario) {
    setGuardandoId(usuario.id)
    await supabase
      .from('profiles')
      .update({ rol: usuario.rol, aprobado: usuario.aprobado, grupo_id: usuario.grupo_id || null })
      .eq('id', usuario.id)
    const permisosPayload = { user_id: usuario.id }
    secciones.forEach((s) => (permisosPayload[s.key] = !!usuario.permisos?.[s.key]))
    await supabase.from('permisos').upsert(permisosPayload)
    setGuardandoId(null)
    cargar()
  }

  if (!esAdmin) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">Esta sección es solo para administradores.</p>
      </Layout>
    )
  }

  const pendientes = usuarios.filter((u) => !u.aprobado)

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold mb-1">Panel de administración</h1>
      <p className="text-sm text-ink-soft mb-6">
        {pendientes.length > 0
          ? `${pendientes.length} cuenta(s) esperando aprobación.`
          : 'No hay cuentas pendientes de aprobación.'}
      </p>

      <details className="mb-6 border border-ink/10 rounded-lg bg-white p-4">
        <summary className="cursor-pointer font-mono text-xs text-ink-soft">gestionar grupos de la congregación ({grupos.length})</summary>
        <ul className="mt-3 flex flex-wrap gap-2">
          {grupos.map((g) => (
            <li key={g.id} className="flex items-center gap-2 text-sm bg-paper-dim rounded-full pl-3 pr-1 py-1">
              {g.nombre}
              <button onClick={() => eliminarGrupo(g.id)} className="text-ink-soft hover:text-clay text-xs px-1">✕</button>
            </li>
          ))}
        </ul>
        <form onSubmit={agregarGrupo} className="mt-3 flex gap-2">
          <input
            placeholder="Nombre del nuevo grupo (ej: Grupo 1)"
            value={nuevoGrupo}
            onChange={(e) => setNuevoGrupo(e.target.value)}
            className="flex-1 border border-ink/15 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <button className="bg-petrol text-paper text-sm rounded-md px-3 hover:bg-petrol-dark">agregar</button>
        </form>
      </details>

      {cargando && <p className="text-ink-soft text-sm">Cargando…</p>}

      <div className="flex flex-col gap-4">
        {usuarios.map((u) => (
          <div key={u.id} className={`border rounded-lg bg-white p-4 ${!u.aprobado ? 'border-gold' : 'border-ink/10'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-display font-semibold">{u.nombre}</p>
                {!u.aprobado && <p className="font-mono text-xs text-gold">pendiente de aprobación</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={u.rol}
                  onChange={(e) => actualizarLocal(u.id, { rol: e.target.value })}
                  className="border border-ink/15 rounded-md px-2 py-1 text-sm"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <select
                  value={u.grupo_id || ''}
                  onChange={(e) => actualizarLocal(u.id, { grupo_id: e.target.value })}
                  className="border border-ink/15 rounded-md px-2 py-1 text-sm"
                >
                  <option value="">Sin grupo</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={u.aprobado}
                    onChange={(e) => actualizarLocal(u.id, { aprobado: e.target.checked })}
                  />
                  aprobado
                </label>
              </div>
            </div>

            {u.rol !== 'admin' && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
                {secciones.map((s) => (
                  <label key={s.key} className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      checked={!!u.permisos?.[s.key]}
                      onChange={(e) => actualizarPermisoLocal(u.id, s.key, e.target.checked)}
                    />
                    puede editar {s.label}
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={() => guardar(u)}
              disabled={guardandoId === u.id}
              className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark disabled:opacity-50"
            >
              {guardandoId === u.id ? 'guardando…' : 'guardar cambios'}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  )
}
