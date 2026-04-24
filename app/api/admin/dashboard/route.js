import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (6 - i)); return d })

  const [todayTx, monthTx, totalProducts, recentTx, weeklyRaw, topProducts] = await Promise.all([
    prisma.transaction.aggregate({ where: { createdAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.transaction.aggregate({ where: { createdAt: { gte: thisMonth }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.transaction.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { cashier: { select: { name: true } } } }),
    prisma.transaction.groupBy({ by: ['createdAt'], where: { createdAt: { gte: days[0] }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.orderItem.groupBy({ by: ['productId'], _sum: { qty: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 5 }),
  ])

  const chartData = days.map((d) => {
    const dayEnd = new Date(d); dayEnd.setDate(dayEnd.getDate() + 1)
    const dayTx = weeklyRaw.filter((t) => new Date(t.createdAt) >= d && new Date(t.createdAt) < dayEnd)
    return { label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }), revenue: dayTx.reduce((s, t) => s + (t._sum.total || 0), 0), count: dayTx.reduce((s, t) => s + t._count, 0) }
  })

  const productNames = await prisma.product.findMany({ where: { id: { in: topProducts.map((p) => p.productId) } }, select: { id: true, name: true } })

  return NextResponse.json({
    today: { revenue: todayTx._sum.total || 0, transactions: todayTx._count },
    month: { revenue: monthTx._sum.total || 0, transactions: monthTx._count },
    totalProducts, recentTransactions: recentTx, chartData,
    topProducts: topProducts.map((p) => ({ name: productNames.find((n) => n.id === p.productId)?.name || 'Unknown', qty: p._sum.qty || 0, revenue: p._sum.subtotal || 0 })),
  })
}
