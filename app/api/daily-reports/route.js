import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 1)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const where = {}
  if (user.role !== 'ADMIN') where.cashierId = user.id
  if (from && to) where.date = { gte: new Date(from), lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }
  const [reports, total] = await Promise.all([
    prisma.dailyReport.findMany({ where, include: { cashier: { select: { name: true } } }, orderBy: { date: 'desc' }, take: 20, skip: (page - 1) * 20 }),
    prisma.dailyReport.count({ where }),
  ])
  return NextResponse.json({ reports, total, page, totalPages: Math.ceil(total / 20) })
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const { kasAwal, penjualan, uangDisetor, qris, transfer, pengeluaran, piutang, catatan } = await req.json()
  const report = await prisma.dailyReport.create({
    data: { kasAwal, penjualan, uangDisetor, qris, transfer, pengeluaran, piutang, catatan, cashierId: user.id },
    include: { cashier: { select: { name: true } } },
  })
  return NextResponse.json(report, { status: 201 })
}
