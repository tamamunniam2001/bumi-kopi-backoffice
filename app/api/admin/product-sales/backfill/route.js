import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

// GET — preview: berapa banyak data null dan bisa diperbaiki
export async function GET(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied

  const nullItems = await prisma.orderItem.findMany({
    where: { OR: [{ name: null }, { name: '' }] },
    select: { id: true, productId: true },
  })

  const withProduct = nullItems.filter(i => i.productId).length
  const withoutProduct = nullItems.length - withProduct

  return NextResponse.json({
    total: nullItems.length,
    withProduct,    // bisa diisi dari master produk
    withoutProduct, // akan diisi 'Item Manual'
  })
}

// POST — jalankan backfill
export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied

  // Ambil semua OrderItem null beserta relasi produknya
  const nullItems = await prisma.orderItem.findMany({
    where: { OR: [{ name: null }, { name: '' }] },
    select: {
      id: true,
      productId: true,
      product: { select: { name: true, code: true, category: { select: { name: true } } } },
    },
  })

  if (nullItems.length === 0) {
    return NextResponse.json({ fixed: 0, message: 'Tidak ada data null yang perlu diperbaiki' })
  }

  // Update semua sekaligus dengan Promise.all
  await Promise.all(nullItems.map(item =>
    prisma.orderItem.update({
      where: { id: item.id },
      data: {
        name: item.product?.name || 'Item Manual',
        code: item.product?.code || '',
        category: item.product?.category?.name || '',
      },
    })
  ))

  return NextResponse.json({
    fixed: nullItems.length,
    message: `${nullItems.length} data berhasil diperbaiki`,
  })
}
