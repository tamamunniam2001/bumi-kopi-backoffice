import crypto from 'crypto'

const BASE_URL = process.env.DOKU_BASE_URL || 'https://api-sandbox.doku.com'
const CLIENT_ID = process.env.DOKU_CLIENT_ID
const SECRET_KEY = process.env.DOKU_SECRET_KEY

function generateSignature({ requestId, timestamp, requestTarget, bodyStr, method }) {
  const noBodyMethods = ['GET', 'DELETE', 'HEAD']

  const parts = [
    `CLIENT_ID:${CLIENT_ID}`,
    `REQUEST_ID:${requestId}`,
    `REQUEST_TIMESTAMP:${timestamp}`,
    `REQUEST_TARGET:${requestTarget}`,
  ]

  if (!noBodyMethods.includes(method) && bodyStr) {
    const digest = crypto.createHash('sha256').update(bodyStr).digest('base64')
    parts.push(`DIGEST:${digest}`)
  }

  const componentToSign = parts.join('\n')
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(componentToSign).digest('hex')

  console.log('componentToSign:', JSON.stringify(componentToSign))
  console.log('signature:', signature)

  return signature
}

export async function dokuRequest({ method = 'POST', path, body }) {
  const requestId = crypto.randomUUID()
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const timestamp = now.toISOString().replace(/\.\d{3}Z$/, '+07:00')
  const bodyStr = body ? JSON.stringify(body) : null
  const signature = generateSignature({ requestId, timestamp, requestTarget: path, bodyStr, method })

  const headers = {
    'Content-Type': 'application/json',
    'Client-Id': CLIENT_ID,
    'Request-Id': requestId,
    'Request-Timestamp': timestamp,
    'Signature': `HMACSHA256=${signature}`,
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(bodyStr ? { body: bodyStr } : {}),
  })

  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { message: text } }

  if (!res.ok) {
    console.error('DOKU error response:', text)
    throw new Error(data?.error?.message || data?.message || `DOKU error ${res.status}`)
  }
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
