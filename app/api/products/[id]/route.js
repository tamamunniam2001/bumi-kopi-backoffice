import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function PUT(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  try {
    const { code, name, price, stock, imageUrl, categoryId } = await req.json()
    const product = await prisma.product.update({ where: { id: params.id }, data: { code: code || null, name, price, stock, imageUrl: imageUrl || null, categoryId } })
    return NextResponse.json(product)
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ message: 'Kode produk sudah digunakan' }, { status: 400 })
    return NextResponse.json({ message: 'Gagal mengupdate produk' }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  await prisma.product.update({ where: { id: params.id }, data: { isActive: false } })
  return NextResponse.json({ message: 'Produk dihapus' })
}
