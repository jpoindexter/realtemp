/**
 * Payload-free Web Push (card L8): an empty POST wakes the service worker,
 * which shows the warning locally — no RFC 8291 payload encryption needed.
 * Only VAPID (RFC 8292) auth is required: an ES256 JWT per push endpoint origin.
 */

const b64u = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const enc = (s: string): Uint8Array => new TextEncoder().encode(s)

export interface VapidConfig {
  privateJwk: JsonWebKey
  publicKeyB64u: string
  subject: string
}

export async function vapidAuthHeader(endpoint: string, vapid: VapidConfig): Promise<string> {
  const aud = new URL(endpoint).origin
  const header = b64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).buffer as ArrayBuffer)
  const payload = b64u(
    enc(
      JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject }),
    ).buffer as ArrayBuffer,
  )
  const key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ])
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc(`${header}.${payload}`).buffer as ArrayBuffer,
  )
  return `vapid t=${header}.${payload}.${b64u(sig)}, k=${vapid.publicKeyB64u}`
}

/** Empty-body push. 201 = queued; 404/410 = subscription gone (caller should delete). */
export async function sendEmptyPush(endpoint: string, vapid: VapidConfig): Promise<number> {
  const auth = await vapidAuthHeader(endpoint, vapid)
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: auth, TTL: '43200', Urgency: 'normal' },
  })
  return r.status
}
