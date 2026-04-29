import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params

  const report = await prisma.dailyReport.findUnique({ where: { id }, select: { date: true } })
  if (!report) return NextResponse.json({ message: 'Laporan tidak ditemukan' }, { status: 404 })

  const TZ_OFFSET = 7 * 60 * 60 * 1000
  const dateWIB = new Date(new Date(report.date).getTime() + TZ_OFFSET)
  const y = dateWIB.getUTCFullYear(), m = dateWIB.getUTCMonth(), d = dateWIB.getUTCDate()
  const dayStart = new Date(Date.UTC(y, m, d) - TZ_OFFSET)
  const dayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - TZ_OFFSET)

  const transactions = await prisma.transaction.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } },
    select: {
      id: true, invoiceNo: true, total: true, payMethod: true, createdAt: true,
      customerName: true,
      items: { select: { name: true, qty: true, price: true, subtotal: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(transactions)
}
