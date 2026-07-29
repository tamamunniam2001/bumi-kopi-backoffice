import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dokuRequest } from '@/lib/doku'

export async function GET(req, { params }) {
  try {
    const { id } = await params

    const invoiceNo = order.dokuInvoiceNo || order.orderNo
    const result = await dokuRequest({ method: 'GET', path: `/checkout/v1/payment/${invoiceNo}`, body: null })

    const paid = result.transaction?.status === 'SUCCESS' || result.order?.status === 'PAID'
    if (paid && order.status !== 'COMPLETED') {
      await prisma.selfOrder.update({ where: { id }, data: { status: 'COMPLETED', paidAt: new Date() } })
    }

    return NextResponse.json({ paid, status: result.transaction?.status || result.order?.status, order: { ...order, status: paid ? 'COMPLETED' : order.status } })
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
