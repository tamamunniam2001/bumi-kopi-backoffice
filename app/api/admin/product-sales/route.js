import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function GET(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Number(searchParams.get('page') || 1)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const limit = 50

  // Mode monthly summary
  if (searchParams.get('monthly') === '1') {
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31, 23, 59, 59, 999)
    const items = await prisma.orderItem.findMany({
      where: { transaction: { status: 'COMPLETED', createdAt: { gte: start, lte: end } } },
      select: { subtotal: true, qty: true, transaction: { select: { createdAt: true } } },
    })
    // Group by bulan
    const monthly = Array.from({ length: 12 }, (_, m) => ({ month: m + 1, total: 0, qty: 0 }))
    for (const item of items) {
      const m = new Date(item.transaction.createdAt).getMonth()
      monthly[m].total += item.subtotal
      monthly[m].qty += item.qty
    }
    return NextResponse.json({ monthly, year })
  }

  const txWhere = { status: 'COMPLETED' }
  if (from && to) txWhere.createdAt = { gte: new Date(from), lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }

  const [rows, total] = await Promise.all([
    prisma.orderItem.findMany({
      where: { transaction: txWhere },
      include: {
        product: { select: { code: true, name: true, category: { select: { name: true } } } },
        transaction: { select: { createdAt: true } },
      },
      orderBy: { transaction: { createdAt: 'desc' } },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.orderItem.count({ where: { transaction: txWhere } }),
  ])

  return NextResponse.json({
    rows: rows.map(r => ({
      id: r.id,
      transactionId: r.transactionId,
      date: r.transaction.createdAt,
      code: r.product?.code || '-',
      category: r.product?.category?.name || '-',
      name: r.product?.name || r.name || 'Item Manual',
      qty: r.qty,
      total: r.subtotal,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
