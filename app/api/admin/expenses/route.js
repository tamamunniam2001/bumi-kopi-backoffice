import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Number(searchParams.get('page') || 1)
  const monthly = searchParams.get('monthly')
  const year = Number(searchParams.get('year') || new Date().getFullYear())

  const where = {}
  if (from && to) where.date = { gte: new Date(from), lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }

  if (monthly) {
    const rows = await prisma.expense.findMany({
      where: { date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31T23:59:59`) } },
      select: { date: true, total: true },
    })
    const months = Array.from({ length: 12 }, (_, m) => ({ month: m + 1, total: 0 }))
    rows.forEach(r => { months[new Date(r.date).getMonth()].total += r.total })
    return NextResponse.json({ monthly: months })
  }

  const LIMIT = 50
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where, orderBy: { date: 'desc' }, take: LIMIT, skip: (page - 1) * LIMIT,
      include: { cashier: { select: { name: true } }, items: { include: { expenseItem: { select: { code: true, category: true } } } } },
    }),
    prisma.expense.count({ where }),
  ])

  // Flatten ke per-item rows
  const rows = []
  expenses.forEach(e => {
    e.items.forEach(item => {
      rows.push({
        expenseId: e.id,
        detailId: item.id,
        date: e.date,
        cashier: e.cashier?.name || '',
        catatan: e.catatan || '',
        category: item.expenseItem?.category || '',
        name: item.name,
        satuan: item.satuan || '',
        code: item.expenseItem?.code || '',
        keterangan: item.keterangan || '',
        harga: item.harga,
        qty: item.qty,
        subtotal: item.subtotal,
        expenseItemId: item.expenseItemId,
      })
    })
  })

  return NextResponse.json({ rows, total, page, totalPages: Math.ceil(total / LIMIT), expenses })
}
