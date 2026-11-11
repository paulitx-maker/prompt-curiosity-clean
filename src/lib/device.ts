// src/lib/device.ts - VERSÃO FINAL COMPATÍVEL COM SEUS COMPONENTES
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('device_id')
  if (id) {
    document.cookie = `device_id=${id}; path=/; max-age=31536000; SameSite=Lax`
    return id
  }
  const cookieMatch = document.cookie.match(/device_id=([^;]+)/)
  if (cookieMatch && cookieMatch[1]) {
    localStorage.setItem('device_id', cookieMatch[1])
    return cookieMatch[1]
  }
  id = crypto.randomUUID()
  localStorage.setItem('device_id', id)
  document.cookie = `device_id=${id}; path=/; max-age=31536000; SameSite=Lax`
  return id
}

// alias pro nome novo que te mandei antes - mantém compatível
export const getOrCreateDeviceIdClient = getDeviceId

export function getDeviceIdFromRequest(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/device_id=([^;]+)/)
  return match?.[1]?? null
}