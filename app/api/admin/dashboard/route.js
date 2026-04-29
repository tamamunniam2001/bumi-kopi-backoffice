import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error

  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const [
    todayTx, monthTx, lastMonthTx,
    totalProducts, totalEmployees,
    recentTx, topProducts,
    payMethodToday, absensiToday,
    // Data bulan ini per hari (pendapatan)
    monthlyTx,
    // Data bulan ini pengeluaran per hari
    monthlyExp,
    // Data 12 bulan pendapatan
    yearlyTx,
    // Data 12 bulan pengeluaran
    yearlyExpenses,
    // Rekap penjualan per kategori bulan ini
    salesByCategory,
    // Rekap pengeluaran per kategori bulan ini
    expenseByCategory,
  ] = await Promise.all([
    prisma.transaction.aggregate({ where: { createdAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.transaction.aggregate({ where: { createdAt: { gte: thisMonthStart }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.transaction.aggregate({ where: { createdAt: { gte: lastMonth, lte: lastMonthEnd }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.transaction.findMany({ where: { status: 'COMPLETED' }, take: 5, orderBy: { createdAt: 'desc' }, include: { cashier: { select: { name: true } } } }),
    prisma.orderItem.groupBy({ by: ['productId'], where: { transaction: { status: 'COMPLETED' } }, _sum: { qty: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 5 }),
    prisma.transaction.groupBy({ by: ['payMethod'], where: { createdAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.attendance.findMany({ where: { date: { gte: today, lt: tomorrow } }, include: { employee: { select: { name: true } } }, orderBy: { date: 'desc' } }),
    // Transaksi bulan ini per hari
    prisma.transaction.findMany({ where: { createdAt: { gte: thisMonthStart, lte: thisMonthEnd }, status: 'COMPLETED' }, select: { total: true, createdAt: true } }),
    // Pengeluaran bulan ini per hari
    prisma.expense.findMany({ where: { date: { gte: thisMonthStart, lte: thisMonthEnd } }, select: { total: true, date: true } }),
    // Transaksi 12 bulan
    prisma.transaction.findMany({ where: { createdAt: { gte: yearStart }, status: 'COMPLETED' }, select: { total: true, createdAt: true } }),
    // Pengeluaran 12 bulan
    prisma.expense.findMany({ where: { date: { gte: yearStart } }, select: { total: true, date: true } }),
    // Penjualan per kategori bulan ini
    prisma.orderItem.findMany({ where: { transaction: { status: 'COMPLETED', createdAt: { gte: thisMonthStart, lte: thisMonthEnd } } }, select: { category: true, subtotal: true, qty: true, product: { select: { category: { select: { name: true } } } } } }),
    // Pengeluaran per kategori bulan ini
    prisma.expenseDetail.findMany({ where: { expense: { date: { gte: thisMonthStart, lte: thisMonthEnd } } }, select: { category: true, subtotal: true, expenseItem: { select: { category: true } } } }),
  ])

  // Chart pendapatan vs pengeluaran bulan ini (per hari)
  const daysInMonth = thisMonthEnd.getDate()
  const dailyChart = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const rev = monthlyTx.filter(t => new Date(t.createdAt).getDate() === d).reduce((s, t) => s + t.total, 0)
    const exp = monthlyExp.filter(e => new Date(e.date).getDate() === d).reduce((s, e) => s + e.total, 0)
    return { day: d, label: `${d}`, revenue: rev, expense: exp }
  })

  // Chart 12 bulan pendapatan vs pengeluaran
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const monthlyChart = Array.from({ length: 12 }, (_, m) => {
    const rev = yearlyTx.filter(t => new Date(t.createdAt).getMonth() === m).reduce((s, t) => s + t.total, 0)
    const exp = yearlyExpenses.filter(e => new Date(e.date).getMonth() === m).reduce((s, e) => s + e.total, 0)
    return { month: MONTHS[m], revenue: rev, expense: exp }
  })

  // Rekap penjualan per kategori
  const salesCatMap = {}
  salesByCategory.forEach(item => {
    const cat = item.product?.category?.name || item.category || 'Lainnya'
    if (!salesCatMap[cat]) salesCatMap[cat] = { category: cat, total: 0, qty: 0 }
    salesCatMap[cat].total += item.subtotal
    salesCatMap[cat].qty += item.qty
  })
  const salesCategories = Object.values(salesCatMap).sort((a, b) => b.total - a.total)

  // Rekap pengeluaran per kategori
  const expCatMap = {}
  expenseByCategory.forEach(item => {
    const cat = item.expenseItem?.category || item.category || 'Lainnya'
    if (!expCatMap[cat]) expCatMap[cat] = { category: cat, total: 0 }
    expCatMap[cat].total += item.subtotal
  })
  const expenseCategories = Object.values(expCatMap).sort((a, b) => b.total - a.total)

  // Top produk
  const productIds = topProducts.filter(p => p.productId).map(p => p.productId)
  const productNames = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })

  const monthRevenue = monthTx._sum.total || 0
  const lastMonthRevenue = lastMonthTx._sum.total || 0
  const monthTrend = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : null
  const payMethods = { CASH: 0, QRIS: 0, TRANSFER: 0, NONTUNAI: 0 }
  payMethodToday.forEach(p => { payMethods[p.payMethod] = p._sum.total || 0 })

  return NextResponse.json({
    today: { revenue: todayTx._sum.total || 0, transactions: todayTx._count },
    month: { revenue: monthRevenue, transactions: monthTx._count, trend: monthTrend },
    totalProducts, totalEmployees,
    recentTransactions: recentTx,
    topProducts: topProducts.map(p => ({ name: productNames.find(n => n.id === p.productId)?.name || 'Item Manual', qty: p._sum.qty || 0, revenue: p._sum.subtotal || 0 })),
    payMethods,
    absensiToday: absensiToday.map(a => ({ id: a.id, type: a.type, name: a.employee?.name || '-', kasAwal: a.kasAwal, time: a.date })),
    dailyChart,
    monthlyChart,
    salesCategories,
    expenseCategories,
    currentMonth: MONTHS[now.getMonth()],
  })
}
