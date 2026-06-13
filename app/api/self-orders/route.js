import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // PENDING | APPROVED | REJECTED | COMPLETED | all
  try {
    const where = status && status !== 'all' ? { status } : { status: { in: ['PENDING', 'APPROVED'] } }
    const orders = await prisma.selfOrder.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(orders)
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { tableNo, customerName, note, items } = body
    if (!items?.length) return NextResponse.json({ message: 'Items kosong' }, { status: 400 })

    const total = items.reduce((s, i) => s + i.price * i.qty, 0)
    const orderNo = `SO-${Date.now().toString(36).toUpperCase()}`

    const order = await prisma.selfOrder.create({
      data: {
        orderNo,
        tableNo: tableNo || '',
        customerName: customerName || '',
        note: note || '',
        total,
        items: {
          create: items.map((i) => ({
            productId: i.productId || null,
            name: i.name,
            price: i.price,
            qty: i.qty,
            subtotal: i.price * i.qty,
            imageUrl: i.imageUrl || null,
          })),
        },
      },
      include: { items: true },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
