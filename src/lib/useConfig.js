import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useConfig() {
  const [config, setConfig] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase
      .from('config_congregacion')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        setConfig(data)
        setCargando(false)
      })
  }, [])

  return { config, cargando }
}
