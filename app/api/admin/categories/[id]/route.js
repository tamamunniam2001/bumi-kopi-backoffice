import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function PUT(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { id } = await params
  try {
    return NextResponse.json(await prisma.category.update({ where: { id }, data: { name: (await req.json()).name } }))
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ message: 'Nama kategori sudah digunakan' }, { status: 400 })
    return NextResponse.json({ message: 'Gagal' }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { id } = await params
  const activeCount = await prisma.product.count({ where: { categoryId: id, isActive: true } })
  if (activeCount > 0) return NextResponse.json({ message: `Kategori masih digunakan oleh ${activeCount} produk aktif` }, { status: 400 })
  await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
  await prisma.category.delete({ where: { id } })
  return NextResponse.json({ message: 'Kategori dihapus' })
}
