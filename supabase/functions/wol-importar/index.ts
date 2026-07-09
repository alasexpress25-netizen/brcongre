// supabase/functions/wol-importar/index.ts
//
// Edge Function que descarga el programa de la reunión "Vida y Ministerio Cristianos"
// (Guía de actividades / mwb) directamente de la fuente oficial usada por JW Library,
// en el idioma que el usuario tenga seleccionado en la app (selector es/pt).
//
// Body esperado (JSON): { "fecha_inicio": "YYYY-MM-DD", "idioma": "es" | "pt" }
//   - fecha_inicio: lunes de la semana que se quiere importar.
//   - idioma: "es" o "pt". Si no se envía, se usa "es" por defecto.
//
// Respuesta: { texto, cantico_inicial, cantico_final }
//   - texto: el bloque de programa de esa semana en texto plano, con el mismo
//     formato que espera `parsearPrograma` en src/pages/VidaMinisterio.jsx
//     (encabezados TESOROS / SEAMOS MEJORES MAESTROS / NUESTRA VIDA CRISTIANA,
//     o sus equivalentes en portugués).
//   - cantico_inicial / cantico_final: número de cántico detectado (si se pudo).
//
// Despliegue:
//   supabase functions deploy wol-importar
//
// IMPORTANTE: este código no pudo probarse contra la red real de jw-cdn.org /
// wol.jw.org desde este entorno (la sandbox de desarrollo no tiene salida a esos
// dominios). Los parámetros de la API pública de JW (GETPUBMEDIALINKS, códigos de
// idioma "S"/"T", esquema de ediciones bimestrales) están documentados y son
// estables, pero conviene desplegar y probar con una semana real, revisando los
// logs (`supabase functions logs wol-importar`) por si el formato exacto de los
// encabezados de semana en el RTF difiere un poco de lo previsto acá.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Código de idioma que usa el sistema de publicaciones de JW ("langwritten").
const CODIGO_IDIOMA: Record<string, string> = { es: 'S', pt: 'T' }

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca tildes para comparar nombres de mes
}

function indiceMes(nombre: string, meses: string[]) {
  const n = normalizar(nombre)
  return meses.findIndex((m) => normalizar(m) === n)
}

// Calcula el "issue" bimestral (YYYYMM00) de la Guía de actividades que contiene
// una fecha dada. Las ediciones empiezan en meses impares: ene, mar, may, jul, sep, nov.
function issueParaFecha(fecha: Date) {
  const anio = fecha.getUTCFullYear()
  const mes = fecha.getUTCMonth() + 1 // 1-12
  const mesEdicion = mes % 2 === 1 ? mes : mes - 1
  return `${anio}${String(mesEdicion).padStart(2, '0')}00`
}

// --- Conversor RTF -> texto plano (suficiente para los documentos simples que
// publica JW: párrafos de texto con \par, negritas, y letras acentuadas como
// escapes hexadecimales \'xx en Windows-1252). ---
const WIN1252_EXTRA: Record<number, string> = {
  0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰',
  0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”',
  0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ',
  0x9e: 'ž', 0x9f: 'Ÿ',
}

function byteAWin1252(byte: number): string {
  if (byte < 0x80) return String.fromCharCode(byte)
  if (WIN1252_EXTRA[byte]) return WIN1252_EXTRA[byte]
  return String.fromCharCode(byte) // 0xA0-0xFF coinciden con Latin-1/Unicode
}

const DESTINOS_IGNORABLES = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'generator', 'pict', 'object',
  'footer', 'header', 'footerf', 'headerf', 'themedata', 'colorschememapping',
  'datastore', 'listtable', 'listoverridetable', 'rsidtbl', 'xmlnstbl',
  'nonshppict', 'shp', 'shpinst', 'field', 'fldinst', 'panose', 'category',
])

function rtfATexto(rtf: string): string {
  let salida = ''
  let i = 0
  const n = rtf.length
  // pila de si el grupo actual (y sus hijos) debe ignorarse
  const pilaIgnorar: boolean[] = [false]

  function ignorandoAhora() {
    return pilaIgnorar[pilaIgnorar.length - 1]
  }

  while (i < n) {
    const c = rtf[i]

    if (c === '{') {
      pilaIgnorar.push(ignorandoAhora())
      i++
      continue
    }
    if (c === '}') {
      pilaIgnorar.pop()
      if (pilaIgnorar.length === 0) pilaIgnorar.push(false)
      i++
      continue
    }
    if (c === '\\') {
      // \'xx -> byte en hex (Windows-1252)
      if (rtf[i + 1] === "'") {
        const hex = rtf.slice(i + 2, i + 4)
        i += 4
        if (!ignorandoAhora()) salida += byteAWin1252(parseInt(hex, 16))
        continue
      }
      // \uNNNN (unicode, con signo opcional) + carácter de reemplazo (se descarta 1)
      if (rtf[i + 1] === 'u') {
        let j = i + 2
        let num = ''
        if (rtf[j] === '-') { num += '-'; j++ }
        while (/[0-9]/.test(rtf[j])) { num += rtf[j]; j++ }
        if (!ignorandoAhora() && num) {
          const code = parseInt(num, 10)
          salida += String.fromCharCode(code < 0 ? code + 65536 : code)
        }
        // se descarta el carácter de reemplazo ascii que sigue (según \ucN, normalmente 1)
        if (rtf[j] === ' ') j++
        if (/[A-Za-z0-9?.,;:]/.test(rtf[j] || '')) j++
        i = j
        continue
      }
      // control word alfabético, con parámetro numérico opcional
      const m = /^\\([a-zA-Z]+)(-?\d+)?(\s?)/.exec(rtf.slice(i))
      if (m) {
        const palabra = m[1]
        i += m[0].length
        if (palabra === 'par' || palabra === 'line') {
          if (!ignorandoAhora()) salida += '\n'
        } else if (palabra === 'tab') {
          if (!ignorandoAhora()) salida += '\t'
        } else if (palabra === '*') {
          // grupo destino "ignorable"; se marca al abrir el próximo grupo
        } else if (DESTINOS_IGNORABLES.has(palabra)) {
          pilaIgnorar[pilaIgnorar.length - 1] = true
        }
        continue
      }
      // \* (destino ignorable) u otro escape no reconocido: se descarta el símbolo
      if (rtf[i + 1] === '*') {
        pilaIgnorar[pilaIgnorar.length - 1] = true
        i += 2
        continue
      }
      // escape de un solo carácter (\{, \}, \\, etc.)
      const literal = rtf[i + 1]
      if (!ignorandoAhora() && literal) salida += literal
      i += 2
      continue
    }

    // texto literal
    if (!ignorandoAhora()) salida += c
    i++
  }

  return salida
}

function limpiarTexto(texto: string): string {
  return texto
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

// Intenta reconocer el encabezado de semana (ej: "6-12 DE JULIO" o
// "29 DE JUNIO A 5 DE JULIO" / "6-12 de julho") y devuelve el lunes de esa semana.
function lunesDeEncabezado(linea: string, meses: string[], anioAprox: number): string | null {
  const l = normalizar(linea)

  // "D1 [de] MES1 a D2 [de] MES2" (cruza de mes)
  let m = l.match(/(\d{1,2})\s*(?:de)?\s*([a-z]+)\s*a\s*(\d{1,2})\s*(?:de)?\s*([a-z]+)/)
  if (m) {
    const d1 = Number(m[1])
    const mes1 = indiceMes(m[2], meses)
    if (mes1 === -1) return null
    const fecha = new Date(Date.UTC(anioAprox, mes1, d1))
    return fecha.toISOString().slice(0, 10)
  }

  // "D1-D2 de MES" o "D1 a D2 de MES"
  m = l.match(/(\d{1,2})\s*[-a]\s*(\d{1,2})\s*(?:de)?\s*([a-z]+)/)
  if (m) {
    const d1 = Number(m[1])
    const mes = indiceMes(m[3], meses)
    if (mes === -1) return null
    const fecha = new Date(Date.UTC(anioAprox, mes, d1))
    return fecha.toISOString().slice(0, 10)
  }

  return null
}

function extraerSemana(textoCompleto: string, fechaInicioISO: string, idioma: string) {
  const meses = idioma === 'pt' ? MESES_PT : MESES_ES
  const anio = Number(fechaInicioISO.slice(0, 4))
  const lineas = textoCompleto.split('\n')

  // Ubicamos todas las líneas que parecen encabezado de semana, con su índice y fecha
  const encabezados: { indice: number; lunes: string }[] = []
  for (let idx = 0; idx < lineas.length; idx++) {
    const lunes = lunesDeEncabezado(lineas[idx], meses, anio)
    if (lunes) encabezados.push({ indice: idx, lunes })
  }

  const objetivo = encabezados.find((e) => e.lunes === fechaInicioISO)
  if (!objetivo) return null

  const posicion = encabezados.indexOf(objetivo)
  const finIndice = posicion + 1 < encabezados.length ? encabezados[posicion + 1].indice : lineas.length

  return lineas.slice(objetivo.indice + 1, finIndice).join('\n')
}

function extraerCantico(bloque: string, inicio: boolean): number | null {
  const lineas = bloque.split('\n')
  const rango = inicio ? lineas.slice(0, 6) : lineas.slice(-6)
  for (const linea of rango) {
    const m = linea.match(/(?:c[aá]ntico|canci[oó]n|m[uú]sica)\s*(\d{1,3})/i)
    if (m) return Number(m[1])
  }
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { fecha_inicio, idioma = 'es' } = await req.json()

    if (!fecha_inicio || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio)) {
      return new Response(JSON.stringify({ error: 'fecha_inicio inválida (se espera YYYY-MM-DD)' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const idiomaNormalizado = idioma === 'pt' ? 'pt' : 'es'
    const codigo = CODIGO_IDIOMA[idiomaNormalizado]
    const fecha = new Date(`${fecha_inicio}T00:00:00Z`)
    const issue = issueParaFecha(fecha)

    // 1) Pedimos el link de descarga del RTF de la Guía de actividades (mwb) para
    //    ese bimestre e idioma, usando la API pública de medios de jw.org.
    const urlLinks =
      `https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS` +
      `?output=json&pub=mwb&fileformat=RTF&alllangs=0&langwritten=${codigo}&txtCMSLang=${codigo}&issue=${issue}`

    const respLinks = await fetch(urlLinks)
    if (!respLinks.ok) {
      throw new Error(`No se pudo obtener el enlace de la Guía de actividades (HTTP ${respLinks.status})`)
    }
    const dataLinks = await respLinks.json()
    const archivos = dataLinks?.files?.[codigo]?.RTF
    const urlRtf: string | undefined = Array.isArray(archivos) ? archivos[0]?.file?.url : undefined
    if (!urlRtf) {
      throw new Error('La respuesta de jw.org no incluyó un archivo RTF para ese idioma/edición')
    }

    // 2) Descargamos el RTF y lo convertimos a texto plano
    const respRtf = await fetch(urlRtf)
    if (!respRtf.ok) {
      throw new Error(`No se pudo descargar el archivo RTF (HTTP ${respRtf.status})`)
    }
    const rtf = await respRtf.text()
    const textoCompleto = limpiarTexto(rtfATexto(rtf))

    // 3) Recortamos el bloque correspondiente a la semana pedida
    const bloqueSemana = extraerSemana(textoCompleto, fecha_inicio, idiomaNormalizado)
    if (!bloqueSemana) {
      throw new Error('No se encontró el encabezado de esa semana dentro de la Guía de actividades descargada')
    }

    const cantico_inicial = extraerCantico(bloqueSemana, true)
    const cantico_final = extraerCantico(bloqueSemana, false)

    return new Response(
      JSON.stringify({
        texto: bloqueSemana,
        cantico_inicial: cantico_inicial ?? undefined,
        cantico_final: cantico_final ?? undefined,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
