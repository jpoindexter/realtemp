import { describe, expect, it } from 'vitest'

import { vapidAuthHeader } from './push'

// Throwaway keypair for the test — never the production key. Node ≥18 exposes
// the same WebCrypto global the Workers runtime does.
async function makeKeys() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  const privateJwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey
  return { pair, privateJwk }
}

const b64uToBytes = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

describe('vapidAuthHeader', () => {
  it('produces a JWT that verifies against the public key, with correct aud/sub/exp', async () => {
    const { pair, privateJwk } = await makeKeys()
    const header = await vapidAuthHeader('https://fcm.googleapis.com/fcm/send/abc123', {
      privateJwk,
      publicKeyB64u: 'test-pub',
      subject: 'mailto:jason@theft.studio',
    })

    expect(header).toMatch(/^vapid t=.+, k=test-pub$/)
    const jwt = header.slice('vapid t='.length, header.indexOf(', k='))
    const [h, p, s] = jwt.split('.')
    expect(JSON.parse(new TextDecoder().decode(b64uToBytes(h!)))).toEqual({ typ: 'JWT', alg: 'ES256' })

    const payload = JSON.parse(new TextDecoder().decode(b64uToBytes(p!)))
    expect(payload.aud).toBe('https://fcm.googleapis.com')
    expect(payload.sub).toBe('mailto:jason@theft.studio')
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000)
    expect(payload.exp).toBeLessThanOrEqual(Date.now() / 1000 + 12 * 3600 + 5)

    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      b64uToBytes(s!),
      new TextEncoder().encode(`${h}.${p}`),
    )
    expect(ok).toBe(true)
  })
})
