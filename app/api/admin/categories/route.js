import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const cats = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } }, products: { where: { isActive: true }, select: { id: true } } },
  })
  return NextResponse.json(cats.map((c) => ({ ...c, activeCount: c.products.length, products: undefined })))
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  try {
    const cat = await prisma.category.create({ data: { name: (await req.json()).name } })
    return NextResponse.json(cat, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ message: 'Nama kategori sudah digunakan' }, { status: 400 })
    return NextResponse.json({ message: 'Gagal membuat kategori' }, { status: 500 })
  }
}
