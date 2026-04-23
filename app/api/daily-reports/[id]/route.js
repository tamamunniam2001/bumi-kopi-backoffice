import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  const report = await prisma.dailyReport.findUnique({ where: { id }, include: { cashier: { select: { name: true } } } })
  if (!report) return NextResponse.json({ message: 'Laporan tidak ditemukan' }, { status: 404 })
  return NextResponse.json(report)
}

export async function PUT(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  const { kasAwal, penjualan, uangDisetor, qris, transfer, pengeluaran, piutang, catatan } = await req.json()
  const report = await prisma.dailyReport.update({
    where: { id },
    data: { kasAwal, penjualan, uangDisetor, qris, transfer, pengeluaran, piutang, catatan },
    include: { cashier: { select: { name: true } } },
  })
  return NextResponse.json(report)
}
