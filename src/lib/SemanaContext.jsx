import { createContext, useContext, useMemo, useState } from 'react'
import { lunesDe, sumarDias, toISO } from './semanas'

const SemanaContext = createContext(null)

export function SemanaProvider({ children }) {
  const [offset, setOffset] = useState(0)

  const valor = useMemo(() => {
    const hoyLunes = lunesDe(new Date())
    const lunes = sumarDias(hoyLunes, offset * 7)
    const domingo = sumarDias(lunes, 6)
    return {
      offset,
      esSemanaActual: offset === 0,
      semanaAnterior: () => setOffset((o) => o - 1),
      semanaSiguiente: () => setOffset((o) => o + 1),
      irEstaSemana: () => setOffset(0),
      lunes,
      domingo,
      lunesISO: toISO(lunes),
      domingoISO: toISO(domingo),
    }
  }, [offset])

  return <SemanaContext.Provider value={valor}>{children}</SemanaContext.Provider>
}

export function useSemana() {
  return useContext(SemanaContext)
}
