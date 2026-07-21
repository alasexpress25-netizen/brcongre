import { createContext, useContext, useEffect, useState } from 'react'

const CLAVE_STORAGE = 'tema'

const TemaContext = createContext(null)

function detectarTemaInicial() {
  const guardado = localStorage.getItem(CLAVE_STORAGE)
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  const prefiereOscuro = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefiereOscuro ? 'oscuro' : 'claro'
}

export function TemaProvider({ children }) {
  const [tema, setTemaState] = useState(detectarTemaInicial)

  useEffect(() => {
    localStorage.setItem(CLAVE_STORAGE, tema)
    document.documentElement.classList.toggle('dark', tema === 'oscuro')
  }, [tema])

  function alternarTema() {
    setTemaState((t) => (t === 'oscuro' ? 'claro' : 'oscuro'))
  }

  return (
    <TemaContext.Provider value={{ tema, alternarTema }}>
      {children}
    </TemaContext.Provider>
  )
}

export function useTema() {
  return useContext(TemaContext)
}
