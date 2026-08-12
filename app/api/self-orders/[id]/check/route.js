import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dokuRequest } from '@/lib/doku'

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const order = await prisma.selfOrder.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ message: 'Order tidak ditemukan' }, { status: 404 })

    // Sudah COMPLETED di DB
    if (order.status === 'COMPLETED') {
      return NextResponse.json({ paid: true, status: 'COMPLETED', order })
    }

    // Belum COMPLETED — tanya langsung ke DOKU sebagai fallback
    try {
      const invoiceNo = order.dokuInvoiceNo || order.orderNo
      const result = await dokuRequest({
        method: 'GET',
        path: `/orders/v1/status/${invoiceNo}`,
        body: null,
      })
      console.log('DOKU check status result:', JSON.stringify(result))

      const dokuStatus = result.transaction?.status || result.order?.status || ''
      const paid = dokuStatus === 'SUCCESS' || dokuStatus === 'PAID' || dokuStatus === 'SETTLEMENT'

      if (paid) {
        await prisma.selfOrder.update({ where: { id }, data: { status: 'COMPLETED', paidAt: new Date() } })
        return NextResponse.json({ paid: true, status: 'COMPLETED', order: { ...order, status: 'COMPLETED' } })
      }

      return NextResponse.json({ paid: false, status: order.status, dokuStatus, order })
    } catch (dokuErr) {
      console.error('DOKU check error:', dokuErr.message)
      // Kalau DOKU error, tetap return status dari DB
      return NextResponse.json({ paid: false, status: order.status, order })
    }
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
