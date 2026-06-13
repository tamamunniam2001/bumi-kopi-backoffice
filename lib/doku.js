import crypto from 'crypto'

const BASE_URL = process.env.DOKU_BASE_URL || 'https://api-sandbox.doku.com'
const CLIENT_ID = process.env.DOKU_CLIENT_ID
const SECRET_KEY = process.env.DOKU_SECRET_KEY

// Generate signature DOKU sesuai spesifikasi
// Signature = HMAC-SHA256(CLIENT_ID + "|" + REQUEST_ID + "|" + REQUEST_TIMESTAMP + "|" + REQUEST_TARGET + "|" + DIGEST, SECRET_KEY)
function generateSignature({ requestId, timestamp, requestTarget, body }) {
  const digest = body
    ? 'SHA-256=' + crypto.createHash('sha256').update(JSON.stringify(body)).digest('base64')
    : ''

  const componentToSign = [
    `Client-Id:${CLIENT_ID}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
    digest ? `Digest:${digest}` : '',
  ].filter(Boolean).join('\n')

  const signature = crypto.createHmac('sha256', SECRET_KEY).update(componentToSign).digest('base64')
  return { signature, digest }
}

export async function dokuRequest({ method = 'POST', path, body }) {
  const requestId = crypto.randomUUID()
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const { signature, digest } = generateSignature({ requestId, timestamp, requestTarget: path, body })

  const headers = {
    'Content-Type': 'application/json',
    'Client-Id': CLIENT_ID,
    'Request-Id': requestId,
    'Request-Timestamp': timestamp,
    'Signature': `HMACSHA256=${signature}`,
  }
  if (digest) headers['Digest'] = digest

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || data?.message || `DOKU error ${res.status}`)
  return data
}

export function verifyDokuWebhook(headers, body) {
  const clientId = headers['client-id']
  const requestId = headers['request-id']
  const timestamp = headers['request-timestamp']
  const signature = headers['signature']?.replace('HMACSHA256=', '')
  const digest = headers['digest']

  if (clientId !== CLIENT_ID) return false

  const componentToVerify = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Digest:${digest}`,
  ].join('\n')

  const expected = crypto.createHmac('sha256', SECRET_KEY).update(componentToVerify).digest('base64')
  return expected === signature
}
