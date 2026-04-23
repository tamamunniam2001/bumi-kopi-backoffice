import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

function isSameOrigin(req) {
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
  return req.headers.get('x-requested-with') === 'XMLHttpRequest'
}

export async function GET(req) {
  if (!isSameOrigin(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const { error } = verifyAuth(req)
  if (error) return error
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 1)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const slim = searchParams.get('slim')
  const where = {}
  if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(to) }
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      ...(slim ? {
        select: {
          id: true, invoiceNo: true, customerName: true, note: true, total: true,
          payment: true, change: true, payMethod: true, status: true, servedAt: true, createdAt: true,
          cashier: { select: { name: true } },
          items: { select: { id: true, qty: true, price: true, subtotal: true, productId: true, product: { select: { name: true, imageUrl: true } } } },
        }
      } : {
        include: { cashier: { select: { name: true } }, items: { include: { product: true } } }
      }),
      orderBy: { createdAt: 'desc' }, take: 20, skip: (page - 1) * 20,
    }),
    prisma.transaction.count({ where }),
  ])
  return NextResponse.json({ transactions, total, page, totalPages: Math.ceil(total / 20) })
}

export async function POST(req) {
  if (!isSameOrigin(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const { error, user } = verifyAuth(req)
  if (error) return error
  try {
    const { items, payment, payMethod, payLater, customerName, note } = await req.json()
    if (!items?.length) return NextResponse.json({ message: 'Items tidak boleh kosong' }, { status: 400 })
    if (!payMethod) return NextResponse.json({ message: 'payMethod wajib diisi' }, { status: 400 })

    const productIds = items.filter(i => i.productId).map(i => i.productId)
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, price: true } })
      : []

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      const price = product ? product.price : (item.price || 0)
      return { productId: item.productId || null, qty: item.qty, price, subtotal: price * item.qty, name: item.name }
    })
    const total = orderItems.reduce((s, i) => s + i.subtotal, 0)
    const actualPayment = payLater ? 0 : (payment || 0)
    const invoiceNo = `BK-${Date.now()}`

    const txSelect = {
      id: true, invoiceNo: true, total: true, change: true, payment: true, payMethod: true,
      status: true, servedAt: true, createdAt: true, customerName: true, note: true,
      cashier: { select: { name: true } },
      items: { select: { id: true, qty: true, price: true, subtotal: true, productId: true, product: { select: { name: true, imageUrl: true } } } },
    }

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          invoiceNo, total, payment: actualPayment,
          change: actualPayment > 0 ? actualPayment - total : 0,
          payMethod, cashierId: user.id,
          status: payLater ? 'PENDING' : 'COMPLETED',
          customerName: customerName || '',
          note: note || '',
          items: { create: orderItems.filter(i => i.productId).map(({ name: _n, ...i }) => i) },
        },
        select: txSelect,
      }),
      ...productIds.map(id => {
        const item = items.find(i => i.productId === id)
        return prisma.product.update({ where: { id }, data: { stock: { decrement: item.qty } } })
      }),
    ])
    return NextResponse.json(transaction, { status: 201 })
  } catch (err) {
    return NextResponse.json({ message: err.message || 'Gagal menyimpan transaksi' }, { status: 500 })
  }
}
