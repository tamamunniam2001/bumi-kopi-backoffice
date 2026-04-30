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

  // Pisah: item dengan produk vs tanpa produk
  const withProduct = nullItems.filter(i => i.product)
  const withoutProduct = nullItems.filter(i => !i.product)

  // Update dalam batch kecil (10 per batch) agar tidak overload koneksi
  const BATCH = 10
  const batches = []
  for (let i = 0; i < withProduct.length; i += BATCH) {
    batches.push(withProduct.slice(i, i + BATCH))
  }

  for (const batch of batches) {
    await prisma.$transaction(
      batch.map(item =>
        prisma.orderItem.update({
          where: { id: item.id },
          data: {
            name: item.product.name,
            code: item.product.code || '',
            category: item.product.category?.name || '',
          },
        })
      )
    )
  }

  // Item tanpa productId → 'Item Manual' sekaligus pakai updateMany
  if (withoutProduct.length > 0) {
    await prisma.orderItem.updateMany({
      where: { id: { in: withoutProduct.map(i => i.id) } },
      data: { name: 'Item Manual', code: '', category: '' },
    })
  }

  return NextResponse.json({
    fixed: nullItems.length,
    message: `${nullItems.length} data berhasil diperbaiki`,
  })
}
