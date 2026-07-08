import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const OPCIONES_CORTAS = { day: 'numeric', month: 'short' }

function lunesDe(fecha) {
  const d = new Date(fecha)
  const dia = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - dia)
  d.setHours(0, 0, 0, 0)
  return d
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha)
  d.setDate(d.getDate() + dias)
  return d
}

function toISO(d) {
  return d.toISOString().slice(0, 10)
}

function formatearRango(lunes, domingo) {
  return `${lunes.toLocaleDateString('es-AR', OPCIONES_CORTAS)} — ${domingo.toLocaleDateString('es-AR', OPCIONES_CORTAS)}`
}

function formatearFechaCorta(f) {
  return new Date(f + 'T00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })
}

function NombreOFranja({ nombre }) {
  if (nombre) return <span>{nombre}</span>
  return <span className="inline-block w-20 h-3 rounded bg-ink/10 align-middle" title="Sin asignar" />
}

function SeccionResumen({ icono, titulo, to, vacio, hayDatos, children }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white overflow-hidden">
      <div className="bg-petrol text-paper px-4 py-2.5 flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-wider flex items-center gap-2 min-w-0">
          <span>{icono}</span>
          <span className="truncate">{titulo}</span>
        </h2>
        <Link to={to} className="font-mono text-[11px] text-paper/70 hover:text-gold-soft transition-colors shrink-0">
          ver más →
        </Link>
      </div>
      <div className="p-4">
        {hayDatos ? children : <p className="text-sm text-ink-soft/70">{vacio}</p>}
      </div>
    </div>
  )
}

function PartesResumen({ partes }) {
  const grupos = [
    { key: 'tesoros', label: 'Tesoros de la Biblia' },
    { key: 'ministerio', label: 'Seamos Mejores Maestros' },
    { key: 'vida_cristiana', label: 'Nuestra Vida Cristiana' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {grupos.map((g) => {
        const items = partes.filter((p) => p.seccion === g.key).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        if (items.length === 0) return null
        return (
          <div key={g.key}>
            <p className="font-mono text-[11px] uppercase tracking-wider text-petrol mb-1">{g.label}</p>
            <div className="flex flex-col gap-1">
              {items.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{p.titulo}</span>
                  <span className="font-mono text-xs text-ink-soft shrink-0">
                    <NombreOFranja nombre={p.asignado?.nombre} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PredicacionResumen() {
  const [diaOffset, setDiaOffset] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [salidas, setSalidas] = useState([])

  const dia = sumarDias(new Date(), diaOffset)
  const diaISO = toISO(dia)

  useEffect(() => {
    let activo = true

    async function cargar() {
      setCargando(true)
      const { data } = await supabase
        .from('salidas_predicacion')
        .select('*, grupos(nombre), profiles!salidas_predicacion_encargado_id_fkey(nombre)')
        .eq('fecha', diaISO)
        .order('hora', { ascending: true })
      if (!activo) return
      setSalidas(data || [])
      setCargando(false)
    }

    cargar()
    return () => {
      activo = false
    }
  }, [diaISO])

  return (
    <div className="rounded-lg border border-ink/10 bg-white overflow-hidden">
      <div className="bg-petrol text-paper px-4 py-2.5 flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-wider flex items-center gap-2 min-w-0">
          <span>🚪</span>
          <span className="truncate">Predicación</span>
        </h2>
        <Link to="/predicacion" className="font-mono text-[11px] text-paper/70 hover:text-gold-soft transition-colors shrink-0">
          ver más →
        </Link>
      </div>

      <div className="flex items-center justify-center gap-3 border-b border-ink/10 bg-paper-dim px-4 py-2">
        <button
          onClick={() => setDiaOffset((o) => o - 1)}
          aria-label="Día anterior"
          className="text-gold hover:text-petrol transition-colors font-mono text-sm px-1"
        >
          ‹
        </button>
        <span className="font-mono text-xs text-ink-soft capitalize">{formatearFechaCorta(diaISO)}</span>
        <button
          onClick={() => setDiaOffset((o) => o + 1)}
          aria-label="Día siguiente"
          className="text-gold hover:text-petrol transition-colors font-mono text-sm px-1"
        >
          ›
        </button>
        {diaOffset !== 0 && (
          <button
            onClick={() => setDiaOffset(0)}
            className="font-mono text-[11px] text-ink-soft underline decoration-gold/50 hover:text-petrol transition-colors ml-1"
          >
            hoy
          </button>
        )}
      </div>

      <div className="p-4">
        {cargando ? (
          <p className="text-sm text-ink-soft/70">Cargando…</p>
        ) : salidas.length === 0 ? (
          <p className="text-sm text-ink-soft/70">No hay salidas programadas este día.</p>
        ) : (
          <div className="flex flex-col divide-y divide-ink/10">
            {salidas.map((s) => (
              <div key={s.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium">{s.hora ? s.hora.slice(0, 5) : 'Sin horario'}</p>
                  <p className="text-xs text-ink-soft">
                    {s.grupos?.nombre || 'Grupo general'}
                    {s.punto_encuentro && ` · 📍 ${s.punto_encuentro}`}
                  </p>
                </div>
                {s.profiles?.nombre && <p className="font-mono text-xs text-ink-soft shrink-0">🚗 {s.profiles.nombre}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Index() {
  const { session } = useAuth()
  const [offset, setOffset] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [datos, setDatos] = useState({
    vidaMinisterio: null,
    reunionPublica: null,
    limpieza: null,
    anuncios: [],
    eventos: [],
  })

  const hoyLunes = lunesDe(new Date())
  const lunes = sumarDias(hoyLunes, offset * 7)
  const domingo = sumarDias(lunes, 6)
  const lunesISO = toISO(lunes)
  const domingoISO = toISO(domingo)

  useEffect(() => {
    let activo = true

    async function cargar() {
      setCargando(true)
      const [{ data: vm }, { data: rp }, { data: lim }, { data: anu }, { data: ev }] = await Promise.all([
        supabase
          .from('semanas_vida_ministerio')
          .select(
            '*, partes_vida_ministerio(*, asignado:asignado_id(nombre), ayudante:ayudante_id(nombre)), presidente:presidente_id(nombre), oracion_inicial:oracion_inicial_id(nombre), oracion_final:oracion_final_id(nombre)'
          )
          .eq('fecha_inicio', lunesISO)
          .limit(1),
        supabase
          .from('reuniones_publicas')
          .select('*, presidente:presidente_id(nombre), conductor_atalaya:conductor_atalaya_id(nombre), lector:lector_id(nombre), orador:orador_id(nombre)')
          .gte('fecha', lunesISO)
          .lte('fecha', domingoISO)
          .order('fecha', { ascending: true })
          .limit(1),
        supabase
          .from('turnos_limpieza')
          .select('*, grupos(nombre)')
          .lte('fecha_inicio', domingoISO)
          .gte('fecha_fin', lunesISO)
          .order('fecha_inicio', { ascending: true })
          .limit(1),
        supabase.from('anuncios').select('*').eq('activo', true).order('orden', { ascending: true }).order('fecha_publicacion', { ascending: false }).limit(3),
        supabase.from('eventos_calendario').select('*').gte('fecha_inicio', new Date().toISOString()).order('fecha_inicio', { ascending: true }).limit(3),
      ])

      if (!activo) return
      setDatos({
        vidaMinisterio: vm?.[0] || null,
        reunionPublica: rp?.[0] || null,
        limpieza: lim?.[0] || null,
        anuncios: anu || [],
        eventos: ev || [],
      })
      setCargando(false)
    }

    cargar()
    return () => {
      activo = false
    }
  }, [lunesISO, domingoISO])

  return (
    <Layout>
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/informe-predicacion"
          className="flex items-center justify-between gap-3 rounded-lg border border-petrol/20 bg-petrol/5 px-4 py-3 hover:border-petrol transition-colors"
        >
          <span className="text-sm font-medium">📝 Informe de Predicación</span>
          <span className="font-mono text-xs text-petrol">enviar →</span>
        </Link>
        <Link
          to="/precursor-auxiliar"
          className="flex items-center justify-between gap-3 rounded-lg border border-gold/30 bg-gold-soft/10 px-4 py-3 hover:border-gold transition-colors"
        >
          <span className="text-sm font-medium">🙋 Precursorado Auxiliar</span>
          <span className="font-mono text-xs text-gold">solicitar →</span>
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-3 rounded-full border border-gold/40 bg-gold-soft/20 px-4 py-1.5">
          <button
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Semana anterior"
            className="text-gold hover:text-petrol transition-colors font-mono text-sm px-1"
          >
            ‹
          </button>
          <span className="font-mono text-xs uppercase tracking-wider text-gold">Semana</span>
          <span className="font-mono text-xs text-ink-soft">{formatearRango(lunes, domingo)}</span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Semana siguiente"
            className="text-gold hover:text-petrol transition-colors font-mono text-sm px-1"
          >
            ›
          </button>
        </div>
        {offset !== 0 && (
          <button
            onClick={() => setOffset(0)}
            className="font-mono text-xs text-ink-soft underline decoration-gold/50 hover:text-petrol transition-colors"
          >
            volver a esta semana
          </button>
        )}
      </div>

      {session && (
        <Link
          to="/mis-asignaciones"
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3 hover:border-petrol transition-colors"
        >
          <span className="text-sm font-medium">✅ Mis asignaciones</span>
          <span className="font-mono text-xs text-ink-soft">ver →</span>
        </Link>
      )}

      {cargando ? (
        <p className="text-ink-soft text-sm">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <SeccionResumen
            icono="📖"
            titulo="Vida y Ministerio"
            to="/vida-ministerio"
            vacio="Sin programa cargado para esta semana."
            hayDatos={!!datos.vidaMinisterio}
          >
            {datos.vidaMinisterio && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-ink-soft">
                  {datos.vidaMinisterio.lectura_biblia && <span className="text-ink font-medium">{datos.vidaMinisterio.lectura_biblia}</span>}
                  <span>
                    Presidente <b className="text-ink"><NombreOFranja nombre={datos.vidaMinisterio.presidente?.nombre} /></b>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs border-y border-ink/10 py-3">
                  <div>
                    <p className="text-ink-soft">🎵 Cántico inicial</p>
                    <p className="text-sm text-ink">{datos.vidaMinisterio.cantico_inicial || '—'}</p>
                  </div>
                  <div>
                    <p className="text-ink-soft">Oración inicial</p>
                    <p className="text-sm"><NombreOFranja nombre={datos.vidaMinisterio.oracion_inicial?.nombre} /></p>
                  </div>
                  <div>
                    <p className="text-ink-soft">🎵 Cántico final</p>
                    <p className="text-sm text-ink">{datos.vidaMinisterio.cantico_final || '—'}</p>
                  </div>
                  <div>
                    <p className="text-ink-soft">Oración final</p>
                    <p className="text-sm"><NombreOFranja nombre={datos.vidaMinisterio.oracion_final?.nombre} /></p>
                  </div>
                </div>
                <PartesResumen partes={datos.vidaMinisterio.partes_vida_ministerio || []} />
              </div>
            )}
          </SeccionResumen>

          <SeccionResumen
            icono="🎙️"
            titulo="Reunión Pública"
            to="/reunion-publica"
            vacio="Sin reunión pública cargada para esta semana."
            hayDatos={!!datos.reunionPublica}
          >
            {datos.reunionPublica && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-medium text-sm">
                    {datos.reunionPublica.tema || 'Tema a confirmar'}{' '}
                    {datos.reunionPublica.numero_discurso && (
                      <span className="font-mono text-xs text-ink-soft">[{datos.reunionPublica.numero_discurso}]</span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-gold mt-0.5">{formatearFechaCorta(datos.reunionPublica.fecha)}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div>
                    <p className="text-ink-soft">Orador</p>
                    <p className="text-sm text-ink">
                      {datos.reunionPublica.orador?.nombre || datos.reunionPublica.orador_nombre || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-soft">Presidente</p>
                    <p className="text-sm"><NombreOFranja nombre={datos.reunionPublica.presidente?.nombre} /></p>
                  </div>
                  <div>
                    <p className="text-ink-soft">Conductor Atalaya</p>
                    <p className="text-sm"><NombreOFranja nombre={datos.reunionPublica.conductor_atalaya?.nombre} /></p>
                  </div>
                  <div>
                    <p className="text-ink-soft">Lector</p>
                    <p className="text-sm"><NombreOFranja nombre={datos.reunionPublica.lector?.nombre} /></p>
                  </div>
                </div>
              </div>
            )}
          </SeccionResumen>

          <PredicacionResumen />

          <SeccionResumen
            icono="🧹"
            titulo="Limpieza"
            to="/limpieza"
            vacio="Sin turno de limpieza para esta semana."
            hayDatos={!!datos.limpieza}
          >
            {datos.limpieza && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{datos.limpieza.grupos?.nombre || 'Grupo sin asignar'}</p>
                <p className="font-mono text-xs text-gold">
                  {formatearRango(new Date(datos.limpieza.fecha_inicio + 'T00:00'), new Date(datos.limpieza.fecha_fin + 'T00:00'))}
                </p>
              </div>
            )}
          </SeccionResumen>

          <SeccionResumen
            icono="📌"
            titulo="Anuncios"
            to="/anuncios"
            vacio="No hay anuncios publicados por el momento."
            hayDatos={datos.anuncios.length > 0}
          >
            <div className="flex flex-col gap-3">
              {datos.anuncios.map((a) => (
                <div key={a.id}>
                  <p className="text-sm font-medium">{a.titulo}</p>
                  {a.descripcion && <p className="text-xs text-ink-soft mt-0.5">{a.descripcion}</p>}
                </div>
              ))}
            </div>
          </SeccionResumen>

          <SeccionResumen
            icono="📅"
            titulo="Calendario"
            to="/calendario"
            vacio="No hay próximos eventos."
            hayDatos={datos.eventos.length > 0}
          >
            <div className="flex flex-col gap-2">
              {datos.eventos.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3">
                  <p className="text-sm">{e.titulo}</p>
                  <p className="font-mono text-xs text-ink-soft shrink-0">
                    {new Date(e.fecha_inicio).toLocaleDateString('es-AR', OPCIONES_CORTAS)}
                  </p>
                </div>
              ))}
            </div>
          </SeccionResumen>
        </div>
      )}
    </Layout>
  )
}
