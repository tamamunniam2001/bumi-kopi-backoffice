// SSE endpoint — kasir subscribe ke sini untuk dapat notifikasi real-time
// Polling setiap 3 detik cek order baru, kirim event jika ada
export const dynamic = 'force-dynamic'

export async function GET() {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const send = (data) => {
    try { writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
  }

  // Dynamically import prisma agar tidak di-bundle di edge
  const { default: prisma } = await import('@/lib/prisma')

  let lastCheck = new Date()
  let alive = true

  const interval = setInterval(async () => {
    if (!alive) { clearInterval(interval); return }
    try {
      const newPaid = await prisma.selfOrder.findMany({
        where: { paidAt: { gt: lastCheck }, status: 'COMPLETED' },
        include: { items: true },
        orderBy: { paidAt: 'asc' },
      })
      lastCheck = new Date()
      if (newPaid.length > 0) send({ type: 'PAID_ORDERS', orders: newPaid })
      else send({ type: 'PING' })
    } catch {
      send({ type: 'PING' })
    }
  }, 3000)

  // Kirim ping awal
  send({ type: 'CONNECTED' })

  // Cleanup saat client disconnect
  readable.cancel = () => { alive = false; clearInterval(interval) }

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
