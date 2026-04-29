import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error

  const now = new Date()
  const TZ_OFFSET = 7 * 60 * 60 * 1000
  const toWIB = (d) => new Date(new Date(d).getTime() + TZ_OFFSET)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  yearStart.setTime(yearStart.getTime() - TZ_OFFSET)
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
  yearEnd.setTime(yearEnd.getTime() - TZ_OFFSET)

  const [salesRaw, expRaw] = await Promise.all([
    prisma.orderItem.findMany({
      where: { transaction: { status: 'COMPLETED', createdAt: { gte: yearStart, lte: yearEnd } } },
      select: {
        category: true, subtotal: true, qty: true,
        transaction: { select: { createdAt: true } },
        product: { select: { category: { select: { name: true } } } },
      },
    }),
    prisma.expenseDetail.findMany({
      where: { expense: { date: { gte: yearStart, lte: yearEnd } } },
      select: {
        category: true, subtotal: true,
        expense: { select: { date: true } },
        expenseItem: { select: { category: true } },
      },
    }),
  ])

  function buildSalesCat(items) {
    const map = {}
    items.forEach(item => {
      const cat = item.product?.category?.name || item.category || 'Lainnya'
      if (!map[cat]) map[cat] = { category: cat, total: 0, qty: 0 }
      map[cat].total += item.subtotal
      map[cat].qty += item.qty
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  function buildExpCat(items) {
    const map = {}
    items.forEach(item => {
      const cat = item.expenseItem?.category || item.category || 'Lainnya'
      if (!map[cat]) map[cat] = { category: cat, total: 0 }
      map[cat].total += item.subtotal
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  const salesByMonth = Array.from({ length: 12 }, (_, m) =>
    buildSalesCat(salesRaw.filter(i => toWIB(i.transaction.createdAt).getUTCMonth() === m))
  )
  const expenseByMonth = Array.from({ length: 12 }, (_, m) =>
    buildExpCat(expRaw.filter(i => toWIB(i.expense.date).getUTCMonth() === m))
  )

  return NextResponse.json({
    salesByMonth,
    expenseByMonth,
    salesByYear: buildSalesCat(salesRaw),
    expenseByYear: buildExpCat(expRaw),
  })
}
