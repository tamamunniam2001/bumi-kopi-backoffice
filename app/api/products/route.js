import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const slim = new URL(req.url).searchParams.get('slim')
  const products = await prisma.product.findMany({
    where: { isActive: true },
    ...(slim ? {
      select: { id: true, code: true, name: true, price: true, stock: true, imageUrl: true, categoryId: true, category: { select: { name: true } } }
    } : {
      include: { category: true, ingredients: { include: { ingredient: true } } }
    }),
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(products)
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  try {
    const { code, name, price, stock, imageUrl, categoryId } = await req.json()
    const product = await prisma.product.create({ data: { code: code || null, name, price, stock, imageUrl: imageUrl || null, categoryId } })
    return NextResponse.json(product, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ message: 'Kode produk sudah digunakan' }, { status: 400 })
    return NextResponse.json({ message: 'Gagal menyimpan produk' }, { status: 500 })
  }
}
