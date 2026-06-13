import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dokuRequest } from '@/lib/doku'

export async function POST(req, { params }) {
  try {
    const { id } = params
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
      },
      payment: {
        payment_due_date: 10, // menit
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
      additional_info: {
        notification_url: `${appUrl}/api/webhooks/doku`,
      },
    }

    const result = await dokuRequest({ method: 'POST', path: '/checkout/v1/payment', body })

    // Simpan data QR ke DB
    const qrisData = result.payment?.qris || {}
    const qrisUrl = qrisData.qr_code_url || result.response?.payment_url || ''
    const qrisString = qrisData.qr_string || ''

    await prisma.selfOrder.update({
      where: { id },
      data: {
        qrisUrl,
        qrisString,
        qrisExpiredAt: expiredAt,
        dokuInvoiceNo: result.order?.invoice_number || order.orderNo,
        dokuPaymentUrl: result.response?.payment_url || '',
      },
    })

    return NextResponse.json({ qrisUrl, qrisString, expiredAt, invoiceNo: order.orderNo, paymentUrl: result.response?.payment_url })
  } catch (e) {
    console.error('DOKU pay error:', e)
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
