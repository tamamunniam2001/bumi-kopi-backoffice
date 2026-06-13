import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(req, { params }) {
  try {
    const { id } = params
    const { status } = await req.json()
    if (!['APPROVED', 'REJECTED', 'COMPLETED'].includes(status))
      return NextResponse.json({ message: 'Status tidak valid' }, { status: 400 })

    const order = await prisma.selfOrder.update({
      where: { id },
      data: { status },
      include: { items: true },
    })
    return NextResponse.json(order)
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}

export async function GET(req, { params }) {
  try {
    const order = await prisma.selfOrder.findUnique({
      where: { id: params.id },
      include: { items: true },
    })
    if (!order) return NextResponse.json({ message: 'Tidak ditemukan' }, { status: 404 })
    return NextResponse.json(order)
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
