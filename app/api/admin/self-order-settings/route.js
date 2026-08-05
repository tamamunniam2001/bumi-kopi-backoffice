import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

// GET — ambil semua produk aktif beserta field self-order
export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, price: true, stock: true,
      isNew: true, isBestSeller: true,
      selfOrderSection: true, selfOrderSort: true, showInSelfOrder: true,
      description: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: [{ selfOrderSort: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(products)
}

// PATCH — update satu atau banyak produk sekaligus
// body: { updates: [{ id, isNew?, isBestSeller?, selfOrderSection?, selfOrderSort?, showInSelfOrder? }] }
export async function PATCH(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  try {
    const { updates } = await req.json()
    await Promise.all(
      updates.map(({ id, ...data }) =>
        prisma.product.update({ where: { id }, data })
      )
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'Gagal menyimpan' }, { status: 500 })
  }
}
