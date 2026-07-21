import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n/I18nContext'
import { supabase } from '../lib/supabaseClient'

function mesesDisponibles(locale, cantidad = 4) {
  const opciones = []
  const hoy = new Date()
  for (let i = 0; i < cantidad; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
    opciones.push({
      mes: d.getMonth() + 1,
      anio: d.getFullYear(),
      label: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    })
  }
  return opciones
}

export default function PrecursorAuxiliar() {
  const { t, locale } = useI18n()
  const [publicadores, setPublicadores] = useState([])
  const meses = mesesDisponibles(locale())

  const [form, setForm] = useState({
    publicador_id: '',
    mesAnio: `${meses[0].mes}-${meses[0].anio}`,
    horas: 30,
    mesHastaAnio: '',
    continuo: false,
  })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('publicadores')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setPublicadores(data || []))
  }, [])

  async function enviar(e) {
    e.preventDefault()
    if (!form.publicador_id) {
      setError(t('precursorAuxiliar.elegiNombre'))
      return
    }
    setError('')
    setEnviando(true)
    const [mes, anio] = form.mesAnio.split('-').map(Number)
    let mesHasta = null
    let anioHasta = null
    if (form.mesHastaAnio) {
      const partes = form.mesHastaAnio.split('-').map(Number)
      mesHasta = partes[0]
      anioHasta = partes[1]
    }
    const { error: err } = await supabase.from('solicitudes_precursor_auxiliar').insert({
      publicador_id: form.publicador_id,
      mes,
      anio,
      horas: form.horas,
      mes_hasta: mesHasta,
      anio_hasta: anioHasta,
      continuo: form.continuo,
    })
    setEnviando(false)
    if (err) {
      console.error('Error al enviar solicitud de precursor auxiliar:', err)
      setError(
        err.code === '42501' || err.message?.toLowerCase().includes('row-level security')
          ? t('precursorAuxiliar.sinPermiso')
          : `${t('precursorAuxiliar.errorGenerico')} ${err.message || t('precursorAuxiliar.probaDeNuevo')}`
      )
      return
    }
    setEnviado(true)
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold mb-6">{t('precursorAuxiliar.titulo')}</h1>

      {enviado ? (
        <div className="border border-gold/30 rounded-lg bg-gold-soft/10 p-6 text-center">
          <p className="text-lg mb-2">{t('precursorAuxiliar.enviadoTitulo')}</p>
          <p className="text-sm text-ink-soft">{t('precursorAuxiliar.enviadoTexto')}</p>
          <button
            onClick={() => setEnviado(false)}
            className="mt-4 font-mono text-xs text-petrol underline decoration-petrol/40 hover:text-petrol-dark"
          >
            {t('precursorAuxiliar.enviarOtra')}
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="border border-ink/10 rounded-lg bg-surface p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1">{t('precursorAuxiliar.nombre')}</label>
            <select
              required
              value={form.publicador_id}
              onChange={(e) => setForm({ ...form, publicador_id: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            >
              <option value="">{t('precursorAuxiliar.seleccione')}</option>
              {publicadores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-1">{t('precursorAuxiliar.mes')}</label>
            <select
              value={form.mesAnio}
              onChange={(e) => setForm({ ...form, mesAnio: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol capitalize"
            >
              {meses.map((m) => (
                <option key={`${m.mes}-${m.anio}`} value={`${m.mes}-${m.anio}`} className="capitalize">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-2">{t('precursorAuxiliar.opciones')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, horas: 15 })}
                className={`rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                  form.horas === 15 ? 'border-petrol bg-petrol/10 text-petrol' : 'border-ink/15 text-ink-soft hover:border-ink/30'
                }`}
              >
                {t('precursorAuxiliar.horas15')}
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, horas: 30 })}
                className={`rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                  form.horas === 30 ? 'border-petrol bg-petrol/10 text-petrol' : 'border-ink/15 text-ink-soft hover:border-ink/30'
                }`}
              >
                {t('precursorAuxiliar.horas30')}
              </button>
            </div>
            <p className="text-xs text-ink-soft mt-2">{t('precursorAuxiliar.notaHoras')}</p>
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-1">{t('precursorAuxiliar.mesHastaOpcional')}</label>
            <select
              value={form.mesHastaAnio}
              onChange={(e) => setForm({ ...form, mesHastaAnio: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol capitalize"
            >
              <option value="">{t('precursorAuxiliar.seleccione')}</option>
              {meses.map((m) => (
                <option key={`${m.mes}-${m.anio}`} value={`${m.mes}-${m.anio}`} className="capitalize">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm">{t('precursorAuxiliar.marqueSiContinuo')}</span>
            <input
              type="checkbox"
              checked={form.continuo}
              onChange={(e) => setForm({ ...form, continuo: e.target.checked })}
              className="w-5 h-5 accent-petrol shrink-0"
            />
          </label>

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="bg-petrol text-crema rounded-md px-4 py-2.5 text-sm font-medium hover:bg-petrol-dark transition-colors disabled:opacity-60"
          >
            {enviando ? t('precursorAuxiliar.enviando') : t('precursorAuxiliar.enviar')}
          </button>
        </form>
      )}
    </>
  )
}
