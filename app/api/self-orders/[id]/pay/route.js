import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dokuRequest } from '@/lib/doku'

export async function POST(req, { params }) {
  try {
    const { id } = await params
    const order = await prisma.selfOrder.findUnique({ where: { id }, include: { items: true } })
    if (!order) return NextResponse.json({ message: 'Order tidak ditemukan' }, { status: 404 })
    if (order.qrisExpiredAt && new Date(order.qrisExpiredAt) > new Date() && order.qrisUrl) {
      // Masih valid, kembalikan QR yang sudah ada
      return NextResponse.json({ qrisUrl: order.qrisUrl, qrisString: order.qrisString, expiredAt: order.qrisExpiredAt, invoiceNo: order.orderNo })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bumi-kopi-backend.vercel.app'
    const expiredAt = new Date(Date.now() + 10 * 60 * 1000) // 10 menit

    const body = {
      order: {
        invoice_number: order.orderNo,
        line_items: order.items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.qty,
        })),
        amount: order.total,
        currency: 'IDR',
        callback_url: `${appUrl}/self-order`,
        language: 'ID',
        auto_redirect: false,
        session_id: order.id,
        notification_url: `${appUrl}/api/webhooks/doku`,
      },
      payment: {
        payment_due_date: 10,
        payment_method_types: ['QRIS'],
      },
      customer: {
        id: order.id,
        name: order.customerName || 'Pelanggan',
        email: 'customer@bumikopi.com',
        phone: '08000000000',
        address: '-',
        country: 'ID',
      },
    }

    let result
    try {
      result = await dokuRequest({ method: 'POST', path: '/checkout/v1/payment', body })
    } catch (e) {
      console.error('DOKU API error:', e.message)
      throw e
    }

    console.log('DOKU response:', JSON.stringify(result))

    // DOKU Checkout V1 mengembalikan payment URL, bukan QR langsung
    const paymentUrl = result.response?.payment?.url || ''
    const invoiceNo = result.response?.order?.invoice_number || order.orderNo
    const expiredDatetime = result.response?.payment?.expired_datetime
    const actualExpiredAt = expiredDatetime ? new Date(expiredDatetime) : expiredAt

    if (!paymentUrl) {
      console.error('DOKU: tidak ada payment URL di response:', JSON.stringify(result))
      return NextResponse.json({ message: 'DOKU tidak mengembalikan payment URL.' }, { status: 502 })
    }

    await prisma.selfOrder.update({
      where: { id },
      data: {
        qrisUrl: '',
        qrisString: '',
        qrisExpiredAt: actualExpiredAt,
        dokuInvoiceNo: invoiceNo,
        dokuPaymentUrl: paymentUrl,
      },
    })

    return NextResponse.json({ paymentUrl, expiredAt: actualExpiredAt, invoiceNo })
  } catch (e) {
    console.error('DOKU pay error:', e)
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
