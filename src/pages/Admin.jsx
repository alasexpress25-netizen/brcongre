import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { supabase } from '../lib/supabaseClient'

const roles = ['publicador', 'siervo_ministerial', 'admin']
const CLAVES_SECCIONES = [
  'predicacion',
  'vida_ministerio_escuela',
  'vida_ministerio_oraciones',
  'reunion_publica',
  'vida_ministerio_tareas',
  'limpieza',
  'anuncios',
  'calendario',
  'secretario',
]

const nuevaCuentaInicial = { nombre: '', email: '', password: '' }

export default function Admin() {
  const { esAdmin, session } = useAuth()
  const { t } = useI18n()
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
      setErrorCuenta(t('admin.completaCampos'))
      return
    }
    if (nuevaCuenta.password.length < 6) {
      setErrorCuenta(t('admin.contrasenaCorta'))
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
            asunto: t('admin.emailBienvenidaAsunto'),
            mensaje: t('admin.emailBienvenidaCuerpo', {
              nombre: nuevaCuenta.nombre.trim(),
              email: nuevaCuenta.email.trim(),
              password: nuevaCuenta.password,
            }),
          },
        })
        .catch((e) => console.error('No se pudo notificar al nuevo usuario:', e))
    }

    setNuevaCuenta(nuevaCuentaInicial)
    cargar()
  }

  async function eliminarCuenta(usuario) {
    if (usuario.id === session?.user?.id) return
    if (!confirm(t('admin.confirmarEliminarCuenta', { nombre: usuario.nombre }))) return
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
    if (!confirm(t('admin.confirmarResetPassword', { nombre: usuario.nombre, password: nuevaPassword }))) return

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
          asunto: t('admin.emailResetAsunto'),
          mensaje: t('admin.emailResetCuerpo', { nombre: usuario.nombre, password: nuevaPassword }),
        },
      })
      .catch((e) => console.error('No se pudo notificar el cambio de contraseña:', e))

    alert(t('admin.passwordRestablecida', { nombre: usuario.nombre, password: nuevaPassword }))
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
    CLAVES_SECCIONES.forEach((k) => (permisosPayload[k] = !!usuario.permisos?.[k]))
    await supabase.from('permisos').upsert(permisosPayload)
    setGuardandoId(null)
    cargar()
  }

  if (!esAdmin) {
    return (
      <>
        <p className="text-ink-soft text-sm">{t('admin.soloAdmin')}</p>
      </>
    )
  }

  const pendientes = usuarios.filter((u) => !u.aprobado)

  return (
    <>
      <h1 className="font-display text-2xl font-semibold mb-1">{t('admin.titulo')}</h1>
      <p className="text-sm text-ink-soft mb-1">
        {pendientes.length > 0
          ? `${pendientes.length} ${t('admin.cuentasPendientes')}`
          : t('admin.sinPendientes')}
      </p>
      <p className="text-xs text-ink-soft mb-6">
        {t('admin.notaEstatus')}{' '}
        <a href="/publicadores" className="underline hover:text-petrol">{t('publicadores.titulo')}</a> {t('admin.campoServicioGrupo')}{' '}
        <a href="/predicacion" className="underline hover:text-petrol">{t('predicacion.titulo')}</a>.
        {' '}{t('admin.notaFinal')}
      </p>

      <details className="mb-6 border border-ink/10 rounded-lg bg-white p-4" open={usuarios.length === 0}>
        <summary className="cursor-pointer font-mono text-xs text-ink-soft">{t('admin.agregarCuentaNueva')}</summary>
        <p className="text-xs text-ink-soft mt-2">{t('admin.ayudaCrearCuenta')}</p>
        <form onSubmit={crearCuenta} className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            placeholder={t('admin.nombreYApellido')}
            value={nuevaCuenta.nombre}
            onChange={(e) => setNuevaCuenta((v) => ({ ...v, nombre: e.target.value }))}
            className="flex-1 border border-ink/15 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="email"
            placeholder={t('admin.correoElectronico')}
            value={nuevaCuenta.email}
            onChange={(e) => setNuevaCuenta((v) => ({ ...v, email: e.target.value }))}
            className="flex-1 border border-ink/15 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            type="text"
            placeholder={t('admin.contrasenaMinima')}
            value={nuevaCuenta.password}
            onChange={(e) => setNuevaCuenta((v) => ({ ...v, password: e.target.value }))}
            className="flex-1 border border-ink/15 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <button
            disabled={creandoCuenta}
            className="bg-petrol text-paper text-sm rounded-md px-3 py-1.5 hover:bg-petrol-dark disabled:opacity-50 shrink-0"
          >
            {creandoCuenta ? t('admin.creando') : t('admin.crearCuenta')}
          </button>
        </form>
        {errorCuenta && <p className="text-sm text-clay mt-2">{errorCuenta}</p>}
      </details>

      {cargando && <p className="text-ink-soft text-sm">{t('comun.cargando')}</p>}

      <div className="flex flex-col gap-4">
        {usuarios.map((u) => (
          <div key={u.id} className={`border rounded-lg bg-white p-4 ${!u.aprobado ? 'border-gold' : 'border-ink/10'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-display font-semibold">{u.nombre}</p>
                {!u.aprobado && <p className="font-mono text-xs text-gold">{t('admin.pendienteAprobacion')}</p>}
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
                  {t('admin.aprobado')}
                </label>
              </div>
            </div>

            {u.rol !== 'admin' && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
                {CLAVES_SECCIONES.map((clave) => (
                  <label key={clave} className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      checked={!!u.permisos?.[clave]}
                      onChange={(e) => actualizarPermisoLocal(u.id, clave, e.target.checked)}
                    />
                    {t('admin.puedeEditar')} {t(`miCuenta.seccion_${clave}`)}
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
                {guardandoId === u.id ? t('admin.guardando') : t('admin.guardarCambios')}
              </button>
              <button
                onClick={() => restablecerPassword(u)}
                disabled={reseteandoId === u.id}
                className="font-mono text-xs text-gold border border-gold/40 px-3 py-1.5 rounded-md hover:bg-gold/10 disabled:opacity-50"
              >
                {reseteandoId === u.id ? t('admin.restableciendo') : t('admin.restablecerContrasena')}
              </button>
              {u.id !== session?.user?.id && (
                <button
                  onClick={() => eliminarCuenta(u)}
                  disabled={eliminandoId === u.id}
                  className="font-mono text-xs text-clay border border-clay/30 px-3 py-1.5 rounded-md hover:bg-clay/10 disabled:opacity-50"
                >
                  {eliminandoId === u.id ? t('admin.eliminando') : t('admin.eliminarCuenta')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
