import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 1)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const where = {}
  if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(to) }
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where, include: { cashier: { select: { name: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }, take: 20, skip: (page - 1) * 20,
    }),
    prisma.transaction.count({ where }),
  ])
  return NextResponse.json({ transactions, total, page, totalPages: Math.ceil(total / 20) })
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  try {
    const { items, payment, payMethod, payLater } = await req.json()
    if (!items?.length) return NextResponse.json({ message: 'Items tidak boleh kosong' }, { status: 400 })
    if (!payMethod) return NextResponse.json({ message: 'payMethod wajib diisi' }, { status: 400 })
    const products = await prisma.product.findMany({ where: { id: { in: items.filter(i => i.productId).map(i => i.productId) } } })
    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      const price = product ? product.price : (item.price || 0)
      return { productId: item.productId || null, qty: item.qty, price, subtotal: price * item.qty }
    })
    const total = orderItems.reduce((s, i) => s + i.subtotal, 0)
    const actualPayment = payLater ? 0 : (payment || 0)
    const transaction = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.qty } } })
      }
      return tx.transaction.create({
        data: {
          invoiceNo: `BK-${Date.now()}`, total, payment: actualPayment,
          change: actualPayment > 0 ? actualPayment - total : 0,
          payMethod, cashierId: user.id,
          status: payLater ? 'PENDING' : 'COMPLETED',
          items: { create: orderItems.filter(i => i.productId) },
        },
        include: { items: { include: { product: true } }, cashier: true },
      })
    })
    return NextResponse.json(transaction, { status: 201 })
  } catch (err) {
    return NextResponse.json({ message: err.message || 'Gagal menyimpan transaksi' }, { status: 500 })
  }
}
