import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const order = await prisma.selfOrder.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ message: 'Order tidak ditemukan' }, { status: 404 })

    const paid = order.status === 'COMPLETED'
    return NextResponse.json({ paid, status: order.status, order })
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
