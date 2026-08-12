import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyDokuWebhook } from '@/lib/doku'

export async function POST(req) {
  try {
    const body = await req.text()
    const headers = Object.fromEntries(req.headers.entries())

    // Log semua header dan body untuk debug
    console.log('DOKU webhook headers:', JSON.stringify(Object.fromEntries(req.headers.entries())))
    console.log('DOKU webhook body:', body)

    // Verifikasi signature DOKU (sementara di-log dulu, tidak reject)
    const sigValid = verifyDokuWebhook(headers, body)
    console.log('DOKU webhook signature valid:', sigValid)
    if (!sigValid) {
      console.warn('DOKU webhook signature invalid — tetap diproses untuk debug')
    }

    const data = JSON.parse(body)
    const invoiceNo = data.order?.invoice_number
    const status = data.transaction?.status || data.order?.status

    if (!invoiceNo) return NextResponse.json({ message: 'No invoice' }, { status: 400 })

    const isPaid = status === 'SUCCESS' || status === 'PAID'

    if (isPaid) {
      const updated = await prisma.selfOrder.updateMany({
        where: { OR: [{ orderNo: invoiceNo }, { dokuInvoiceNo: invoiceNo }] },
        data: { status: 'COMPLETED', paidAt: new Date() },
      })
      console.log(`✅ DOKU webhook: order ${invoiceNo} PAID`)

      // Buat Transaction agar masuk ke Order Hari Ini di kasir
      if (updated.count > 0) {
        try {
          const selfOrder = await prisma.selfOrder.findFirst({
            where: { OR: [{ orderNo: invoiceNo }, { dokuInvoiceNo: invoiceNo }] },
            include: { items: true },
          })
          if (selfOrder) {
            // Cari cashier default (admin pertama)
            const cashier = await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
            if (cashier) {
              await prisma.transaction.create({
                data: {
                  invoiceNo: `BK-SO-${selfOrder.orderNo}`,
                  total: selfOrder.total,
                  payment: selfOrder.total,
                  change: 0,
                  payMethod: 'QRIS',
                  cashierId: cashier.id,
                  status: 'COMPLETED',
                  customerName: selfOrder.customerName || '',
                  note: selfOrder.note || '',
                  items: {
                    create: selfOrder.items.map(i => ({
                      productId: i.productId || null,
                      name: i.name,
                      qty: i.qty,
                      price: i.price,
                      subtotal: i.subtotal,
                    })),
                  },
                },
              })
              console.log(`✅ Transaction created for self-order ${selfOrder.orderNo}`)
            }
          }
        } catch (e) {
          console.error('Failed to create transaction from self-order:', e)
        }
      }
    }

    return NextResponse.json({ message: 'OK' })
  } catch (e) {
    console.error('DOKU webhook error:', e)
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
