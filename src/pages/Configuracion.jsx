import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { supabase } from '../lib/supabaseClient'

const vacio = {
  nombre: '',
  direccion: '',
  telefono_contacto: '',
  dia_reunion_publica: '',
  hora_reunion_publica: '',
  dia_vida_ministerio: '',
  hora_vida_ministerio: '',
}

export default function Configuracion() {
  const { esAdmin } = useAuth()
  const { t } = useI18n()
  const [form, setForm] = useState(vacio)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from('config_congregacion').select('*').eq('id', 1).single()
    if (data) {
      setForm({
        nombre: data.nombre || '',
        direccion: data.direccion || '',
        telefono_contacto: data.telefono_contacto || '',
        dia_reunion_publica: data.dia_reunion_publica || '',
        hora_reunion_publica: data.hora_reunion_publica || '',
        dia_vida_ministerio: data.dia_vida_ministerio || '',
        hora_vida_ministerio: data.hora_vida_ministerio || '',
      })
    }
    setCargando(false)
  }

  useEffect(() => {
    if (esAdmin) cargar()
    else setCargando(false)
  }, [esAdmin])

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setGuardado(false)
    const payload = {}
    Object.keys(form).forEach((k) => (payload[k] = form[k] || null))
    await supabase.from('config_congregacion').update(payload).eq('id', 1)
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  if (!esAdmin) {
    return (
      <>
        <p className="text-ink-soft text-sm">{t('configuracion.soloAdmin')}</p>
      </>
    )
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold mb-1">{t('configuracion.titulo')}</h1>
      <p className="text-sm text-ink-soft mb-6">{t('configuracion.subtitulo')}</p>

      {cargando && <p className="text-ink-soft text-sm">{t('comun.cargando')}</p>}

      {!cargando && (
        <form onSubmit={guardar} className="border border-ink/10 rounded-lg bg-surface p-4 flex flex-col gap-3">
          <div>
            <label className="text-xs text-ink-soft font-mono block mb-1">{t('configuracion.nombreCongregacion')}</label>
            <input
              placeholder={t('configuracion.nombreEjemplo')}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>
          <div>
            <label className="text-xs text-ink-soft font-mono block mb-1">{t('configuracion.direccionSalon')}</label>
            <input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>
          <div>
            <label className="text-xs text-ink-soft font-mono block mb-1">{t('configuracion.telefonoContacto')}</label>
            <input
              value={form.telefono_contacto}
              onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-ink-soft font-mono block mb-1">{t('configuracion.diaReunionPublica')}</label>
              <input
                placeholder={t('configuracion.diaEjemplo')}
                value={form.dia_reunion_publica}
                onChange={(e) => setForm({ ...form, dia_reunion_publica: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-ink-soft font-mono block mb-1">{t('configuracion.horaReunionPublica')}</label>
              <input
                placeholder={t('configuracion.horaEjemplo')}
                value={form.hora_reunion_publica}
                onChange={(e) => setForm({ ...form, hora_reunion_publica: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-ink-soft font-mono block mb-1">{t('configuracion.diaVidaMinisterio')}</label>
              <input
                placeholder={t('configuracion.diaVMEjemplo')}
                value={form.dia_vida_ministerio}
                onChange={(e) => setForm({ ...form, dia_vida_ministerio: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-ink-soft font-mono block mb-1">{t('configuracion.horaVidaMinisterio')}</label>
              <input
                placeholder={t('configuracion.horaVMEjemplo')}
                value={form.hora_vida_ministerio}
                onChange={(e) => setForm({ ...form, hora_vida_ministerio: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={guardando}
              className="font-mono text-xs bg-petrol text-paper px-4 py-2 rounded-md hover:bg-petrol-dark disabled:opacity-50 self-start"
            >
              {guardando ? t('configuracion.guardando') : t('comun.guardar')}
            </button>
            {guardado && <span className="text-xs text-petrol">{t('configuracion.guardadoOk')}</span>}
          </div>
        </form>
      )}
    </>
  )
}
