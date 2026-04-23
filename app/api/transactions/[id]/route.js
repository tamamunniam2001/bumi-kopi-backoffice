import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const transaction = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { cashier: { select: { name: true } }, items: { include: { product: true } } },
  })
  if (!transaction) return NextResponse.json({ message: 'Transaksi tidak ditemukan' }, { status: 404 })
  return NextResponse.json(transaction)
}

export async function PATCH(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { servedAt } = await req.json()
  const transaction = await prisma.transaction.update({
    where: { id: params.id },
    data: { servedAt: servedAt ? new Date(servedAt) : null },
    include: { cashier: { select: { name: true } }, items: { include: { product: true } } },
  })
  return NextResponse.json(transaction)
}
