import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

function isCsrfSafe(req) {
  // Must carry the custom header (browsers block cross-origin scripts from setting this)
  if (req.headers.get('x-requested-with') !== 'XMLHttpRequest') return false
  const host = req.headers.get('host')
  if (!host) return false
  const origin = req.headers.get('origin')
  if (origin) {
    try { return new URL(origin).host === host } catch { return false }
  }
  const referer = req.headers.get('referer')
  if (referer) {
    try { return new URL(referer).host === host } catch { return false }
  }
  // No origin/referer but custom header present — allow (server-side same-origin calls)
  return true
}

export async function GET(req, { params }) {
  if (!isCsrfSafe(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
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
  if (!isCsrfSafe(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
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
  if (!isCsrfSafe(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  await prisma.orderItem.deleteMany({ where: { transactionId: id } })
  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
