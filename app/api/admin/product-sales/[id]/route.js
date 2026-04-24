import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function DELETE(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied

  const { id } = await params

  const item = await prisma.orderItem.findUnique({ where: { id }, select: { transactionId: true } })
  if (!item) return NextResponse.json({ message: 'Item tidak ditemukan' }, { status: 404 })

  await prisma.orderItem.delete({ where: { id } })

  // Jika transaksi tidak punya item lagi, hapus transaksinya juga
  const remaining = await prisma.orderItem.count({ where: { transactionId: item.transactionId } })
  if (remaining === 0) await prisma.transaction.delete({ where: { id: item.transactionId } })

  return NextResponse.json({ message: 'Item dihapus' })
}
