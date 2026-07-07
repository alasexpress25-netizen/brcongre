import { supabase } from './supabaseClient'

/**
 * Envía una notificación por email a una lista de usuarios (por su id de perfil).
 * No lanza error si falla el envío: solo lo registra en consola, para no romper
 * el flujo de guardado si el email no se pudo mandar.
 */
export async function notificar(userIds, asunto, mensaje) {
  const idsValidos = (userIds || []).filter(Boolean)
  if (idsValidos.length === 0) return

  try {
    const { error } = await supabase.functions.invoke('notificar', {
      body: { userIds: idsValidos, asunto, mensaje },
    })
    if (error) console.error('No se pudo enviar la notificación:', error)
  } catch (err) {
    console.error('No se pudo enviar la notificación:', err)
  }
}
