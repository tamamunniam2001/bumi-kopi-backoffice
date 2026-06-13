import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyDokuWebhook } from '@/lib/doku'

export async function POST(req) {
  try {
    const body = await req.text()
    const headers = Object.fromEntries(req.headers.entries())

    // Verifikasi signature DOKU
    if (!verifyDokuWebhook(headers, body)) {
      console.warn('DOKU webhook signature invalid')
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(body)
    const invoiceNo = data.order?.invoice_number
    const status = data.transaction?.status || data.order?.status

    if (!invoiceNo) return NextResponse.json({ message: 'No invoice' }, { status: 400 })

    const isPaid = status === 'SUCCESS' || status === 'PAID'

    if (isPaid) {
      await prisma.selfOrder.updateMany({
        where: { OR: [{ orderNo: invoiceNo }, { dokuInvoiceNo: invoiceNo }] },
        data: { status: 'COMPLETED', paidAt: new Date() },
      })
      console.log(`✅ DOKU webhook: order ${invoiceNo} PAID`)
    }

    return NextResponse.json({ message: 'OK' })
  } catch (e) {
    console.error('DOKU webhook error:', e)
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
