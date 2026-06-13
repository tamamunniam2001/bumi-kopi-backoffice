import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        price: true,
        stock: true,
        imageUrl: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    })
    const res = NextResponse.json(products)
    res.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
