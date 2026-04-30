import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function PATCH(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { id } = await params
  const { name, category, code, qty, total } = await req.json()
  const item = await prisma.orderItem.update({
    where: { id },
    data: {
      name: name ?? undefined,
      category: category ?? undefined,
      code: code ?? undefined,
      qty: qty != null ? Number(qty) : undefined,
      subtotal: total != null ? Number(total) : undefined,
      price: qty != null && total != null ? Math.round(Number(total) / Number(qty)) : undefined,
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied

  const { id } = await params

  const item = await prisma.orderItem.findUnique({ where: { id }, select: { transactionId: true } })
  if (!item) return NextResponse.json({ message: 'Item tidak ditemukan' }, { status: 404 })

  const { transactionId } = item

  // Hapus semua OrderItem milik transaksi ini, lalu hapus transaksinya
  await prisma.orderItem.deleteMany({ where: { transactionId } })
  await prisma.transaction.delete({ where: { id: transactionId } })

  return NextResponse.json({ message: 'Transaksi dihapus' })
}
