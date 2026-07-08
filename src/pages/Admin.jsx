import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const roles = ['publicador', 'siervo_ministerial', 'admin']
const secciones = [
  { key: 'predicacion', label: 'Predicación' },
  { key: 'vida_ministerio_escuela', label: 'Vida y Ministerio: Escuela (Tesoros + Seamos Mejores Maestros)' },
  { key: 'vida_ministerio_oraciones', label: 'Vida y Ministerio: Oraciones y discursos' },
  { key: 'reunion_publica', label: 'Reunión Pública' },
  { key: 'vida_ministerio_tareas', label: 'Tareas mecánicas (Vida y Ministerio + Reunión Pública)' },
  { key: 'limpieza', label: 'Limpieza' },
  { key: 'anuncios', label: 'Anuncios' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'secretario', label: 'Publicadores e Informes (datos de la congregación, incluye email de contacto)' },
]

const nuevaCuentaInicial = { nombre: '', email: '', password: '' }

export default function Admin() {
  const { esAdmin, session } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardandoId, setGuardandoId] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [nuevaCuenta, setNuevaCuenta] = useState(nuevaCuentaInicial)
  const [creandoCuenta, setCreandoCuenta] = useState(false)
  const [errorCuenta, setErrorCuenta] = useState('')
  const [reseteandoId, setReseteandoId] = useState(null)

  async function cargar() {
    setCargando(true)
    const { data: u } = await supabase
      .from('profiles')
      .select('*, permisos(*)')
      .order('aprobado', { ascending: true })
      .order('nombre')
    setUsuarios(u || [])
    setCargando(false)
  }

  useEffect(() => {
    if (esAdmin) cargar()
  }, [esAdmin])

  async function extraerError(error, data) {
    if (data?.error) return data.error
    if (error?.context?.json) {
      try {
        const body = await error.context.json()
        if (body?.error) return body.error
      } catch {
        // no era JSON, seguimos con el mensaje genérico
      }
    }
    return error?.message || null
  }

  async function crearCuenta(e) {
    e.preventDefault()
    setErrorCuenta('')
    if (!nuevaCuenta.nombre.trim() || !nuevaCuenta.email.trim() || !nuevaCuenta.password) {
      setErrorCuenta('Completá nombre, correo y contraseña.')
      return
    }
    if (nuevaCuenta.password.length < 6) {
      setErrorCuenta('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setCreandoCuenta(true)
    const { data, error } = await supabase.functions.invoke('gestionar-cuentas', {
      body: { accion: 'crear', ...nuevaCuenta },
    })
    setCreandoCuenta(false)
    const err = await extraerError(error, data)
    if (err) {
      setErrorCuenta(err)
      return
    }

    // Le avisamos al usuario por mail que ya tiene una cuenta creada,
    // con sus credenciales provisorias. Si el envío falla no bloqueamos
    // el alta de la cuenta, solo lo dejamos en consola.
    if (data?.id) {
      supabase.functions
        .invoke('notificar', {
          body: {
            userIds: [data.id],
            asunto: 'Tu cuenta en Mi Congregación',
            mensaje:
              `Hola ${nuevaCuenta.nombre.trim()},\n\n` +
              `Ya tenés una cuenta creada en la app de la congregación.\n\n` +
              `Correo: ${nuevaCuenta.email.trim()}\n` +
              `Contraseña provisoria: ${nuevaCuenta.password}\n\n` +
              `Te recomendamos cambiar la contraseña la primera vez que entres.`,
          },
        })
        .catch((e) => console.error('No se pudo notificar al nuevo usuario:', e))
    }

    setNuevaCuenta(nuevaCuentaInicial)
    cargar()
  }

  async function eliminarCuenta(usuario) {
    if (usuario.id === session?.user?.id) return
    if (!confirm(`¿Eliminar la cuenta de ${usuario.nombre}? Esta acción no se puede deshacer.`)) return
    setEliminandoId(usuario.id)
    const { data, error } = await supabase.functions.invoke('gestionar-cuentas', {
      body: { accion: 'eliminar', userId: usuario.id },
    })
    setEliminandoId(null)
    const err = await extraerError(error, data)
    if (err) {
      alert(err)
      return
    }
    cargar()
  }

  function generarPasswordProvisoria() {
    // 8 caracteres alfanuméricos, fáciles de leer y dictar por teléfono.
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let pass = ''
    for (let i = 0; i < 8; i++) pass += alfabeto[Math.floor(Math.random() * alfabeto.length)]
    return pass
  }

  async function restablecerPassword(usuario) {
    const nuevaPassword = generarPasswordProvisoria()
    if (
      !confirm(
        `¿Restablecer la contraseña de ${usuario.nombre}?\n\nNueva contraseña provisoria: ${nuevaPassword}\n\nSe la vamos a enviar por correo y te la mostramos de nuevo al terminar por si tenés que dictársela.`
      )
    )
      return

    setReseteandoId(usuario.id)
    const { data, error } = await supabase.functions.invoke('gestionar-cuentas', {
      body: { accion: 'resetear_password', userId: usuario.id, password: nuevaPassword },
    })
    setReseteandoId(null)
    const err = await extraerError(error, data)
    if (err) {
      alert(err)
      return
    }

    supabase.functions
      .invoke('notificar', {
        body: {
          userIds: [usuario.id],
          asunto: 'Tu contraseña fue restablecida',
          mensaje:
            `Hola ${usuario.nombre},\n\n` +
            `Un administrador restableció tu contraseña en la app de la congregación.\n\n` +
            `Contraseña provisoria: ${nuevaPassword}\n\n` +
            `Te recomendamos cambiarla apenas entres, desde "Mi cuenta".`,
        },
      })
      .catch((e) => console.error('No se pudo notificar el cambio de contraseña:', e))

    alert(`Contraseña restablecida.\n\nContraseña provisoria de ${usuario.nombre}: ${nuevaPassword}`)
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
      .update({ rol: usuario.rol, aprobado: usuario.aprobado })
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
      <p className="text-sm text-ink-soft mb-1">
        {pendientes.length > 0
          ? `${pendientes.length} cuenta(s) esperando aprobación.`
          : 'No hay cuentas pendientes de aprobación.'}
      </p>
      <p className="text-xs text-ink-soft mb-6">
        El estatus de anciano y el grupo de cada persona se cargan desde{' '}
        <a href="/publicadores" className="underline hover:text-petrol">Publicadores</a> (campos "servicio" y "grupo").
        Los grupos de la congregación se crean desde <a href="/predicacion" className="underline hover:text-petrol">Predicación</a>.
        Acá solo se maneja el rol de acceso a la app y los permisos de edición.
      </p>

      <details className="mb-6 border border-ink/10 rounded-lg bg-white p-4" open={usuarios.length === 0}>
        <summary className="cursor-pointer font-mono text-xs text-ink-soft">agregar cuenta nueva</summary>
        <p className="text-xs text-ink-soft mt-2">
          Creá la cuenta con nombre, correo y una contraseña provisoria; después compartísela a la persona.
          Queda aprobada automáticamente — le podés ajustar el rol y los permisos abajo.
        </p>
        <form onSubmit={crearCuenta} className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            placeholder="Nombre y apellido"
            value={nuevaCuenta.nombre}
            onChange={(e) => setNuevaCuenta((v) => ({ ...v, nombre: e.target.value }))}
            className="flex-1 border border-ink/15 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={nuevaCuenta.email}
            onChange={(e) => setNuevaCuenta((v) => ({ ...v, email: e.target.value }))}
            className="flex-1 border border-ink/15 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="text"
            placeholder="Contraseña (mín. 6 caracteres)"
            value={nuevaCuenta.password}
            onChange={(e) => setNuevaCuenta((v) => ({ ...v, password: e.target.value }))}
            className="flex-1 border border-ink/15 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <button
            disabled={creandoCuenta}
            className="bg-petrol text-paper text-sm rounded-md px-3 py-1.5 hover:bg-petrol-dark disabled:opacity-50 shrink-0"
          >
            {creandoCuenta ? 'creando…' : 'crear cuenta'}
          </button>
        </form>
        {errorCuenta && <p className="text-sm text-clay mt-2">{errorCuenta}</p>}
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

            <div className="flex items-center gap-3">
              <button
                onClick={() => guardar(u)}
                disabled={guardandoId === u.id}
                className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark disabled:opacity-50"
              >
                {guardandoId === u.id ? 'guardando…' : 'guardar cambios'}
              </button>
              <button
                onClick={() => restablecerPassword(u)}
                disabled={reseteandoId === u.id}
                className="font-mono text-xs text-gold border border-gold/40 px-3 py-1.5 rounded-md hover:bg-gold/10 disabled:opacity-50"
              >
                {reseteandoId === u.id ? 'restableciendo…' : 'restablecer contraseña'}
              </button>
              {u.id !== session?.user?.id && (
                <button
                  onClick={() => eliminarCuenta(u)}
                  disabled={eliminandoId === u.id}
                  className="font-mono text-xs text-clay border border-clay/30 px-3 py-1.5 rounded-md hover:bg-clay/10 disabled:opacity-50"
                >
                  {eliminandoId === u.id ? 'eliminando…' : 'eliminar cuenta'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
