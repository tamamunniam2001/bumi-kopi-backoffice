import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { cashier: { select: { name: true } }, items: { include: { product: true } } },
  })
  if (!transaction) return NextResponse.json({ message: 'Transaksi tidak ditemukan' }, { status: 404 })
  return NextResponse.json(transaction)
}

export async function PATCH(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  const body = await req.json()
  const data = {}
  if ('servedAt' in body) data.servedAt = body.servedAt ? new Date(body.servedAt) : null
  if ('payment' in body) {
    data.payment = body.payment
    data.change = body.payment - body.total
    data.payMethod = body.payMethod
    data.status = 'COMPLETED'
  }
  const transaction = await prisma.transaction.update({
    where: { id },
    data,
    select: {
      id: true, servedAt: true, status: true, payment: true, change: true, payMethod: true,
      invoiceNo: true, total: true, createdAt: true, customerName: true, note: true,
      cashier: { select: { name: true } },
      items: { include: { product: { select: { name: true, imageUrl: true } } } },
    },
  })
  return NextResponse.json(transaction)
}

export async function DELETE(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  await prisma.orderItem.deleteMany({ where: { transactionId: id } })
  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
