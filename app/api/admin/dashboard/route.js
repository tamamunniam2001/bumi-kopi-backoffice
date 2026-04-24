import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (6 - i)); return d })

  const [
    todayTx, monthTx, lastMonthTx,
    totalProducts, totalEmployees,
    recentTx, topProducts,
    payMethodToday, absensiToday,
    weeklyItems,
  ] = await Promise.all([
    // Transaksi hari ini
    prisma.transaction.aggregate({ where: { createdAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    // Transaksi bulan ini
    prisma.transaction.aggregate({ where: { createdAt: { gte: thisMonth }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    // Transaksi bulan lalu (untuk perbandingan)
    prisma.transaction.aggregate({ where: { createdAt: { gte: lastMonth, lte: lastMonthEnd }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    // Total produk aktif
    prisma.product.count({ where: { isActive: true } }),
    // Total karyawan aktif
    prisma.employee.count({ where: { isActive: true } }),
    // Transaksi terbaru
    prisma.transaction.findMany({
      where: { status: 'COMPLETED' },
      take: 6, orderBy: { createdAt: 'desc' },
      include: { cashier: { select: { name: true } } }
    }),
    // Top produk berdasarkan orderItem (include null productId untuk item manual)
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { transaction: { status: 'COMPLETED' } },
      _sum: { qty: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 5,
    }),
    // Metode pembayaran hari ini
    prisma.transaction.groupBy({
      by: ['payMethod'],
      where: { createdAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' },
      _sum: { total: true }, _count: true,
    }),
    // Absensi hari ini
    prisma.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { employee: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
    // Data 7 hari untuk chart (dari orderItem agar sinkron dengan produk terjual)
    prisma.transaction.findMany({
      where: { createdAt: { gte: days[0] }, status: 'COMPLETED' },
      select: { total: true, createdAt: true },
    }),
  ])

  // Chart data 7 hari
  const chartData = days.map((d) => {
    const dayEnd = new Date(d); dayEnd.setDate(dayEnd.getDate() + 1)
    const dayTx = weeklyItems.filter(t => new Date(t.createdAt) >= d && new Date(t.createdAt) < dayEnd)
    return {
      label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      revenue: dayTx.reduce((s, t) => s + t.total, 0),
      count: dayTx.length,
    }
  })

  // Top produk dengan nama
  const productIds = topProducts.filter(p => p.productId).map(p => p.productId)
  const productNames = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })

  // Hitung trend bulan ini vs bulan lalu
  const monthRevenue = monthTx._sum.total || 0
  const lastMonthRevenue = lastMonthTx._sum.total || 0
  const monthTrend = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : null

  // Metode pembayaran summary
  const payMethods = { CASH: 0, QRIS: 0, TRANSFER: 0, NONTUNAI: 0 }
  payMethodToday.forEach(p => { payMethods[p.payMethod] = p._sum.total || 0 })

  return NextResponse.json({
    today: { revenue: todayTx._sum.total || 0, transactions: todayTx._count },
    month: { revenue: monthRevenue, transactions: monthTx._count, trend: monthTrend },
    totalProducts,
    totalEmployees,
    chartData,
    recentTransactions: recentTx,
    topProducts: topProducts.map(p => ({
      name: productNames.find(n => n.id === p.productId)?.name || 'Item Manual',
      qty: p._sum.qty || 0,
      revenue: p._sum.subtotal || 0,
    })),
    payMethods,
    absensiToday: absensiToday.map(a => ({
      id: a.id,
      type: a.type,
      name: a.employee?.name || '-',
      kasAwal: a.kasAwal,
      time: a.date,
    })),
  })
}
