import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 1)
  const limit = 20

  const [opnames, total] = await Promise.all([
    prisma.stockOpname.findMany({
      orderBy: { date: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: { select: { name: true } },
        items: { select: { id: true, qtyActual: true, qtySystem: true, selisih: true } },
      },
    }),
    prisma.stockOpname.count(),
  ])

  return NextResponse.json({
    opnames: opnames.map(o => ({
      ...o,
      totalItems: o.items.length,
      totalSelisih: o.items.reduce((s, i) => s + Math.abs(i.selisih), 0),
      itemsOk: o.items.filter(i => i.selisih === 0).length,
      itemsSelisih: o.items.filter(i => i.selisih !== 0).length,
    })),
    total,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error

  const { note } = await req.json()

  // Ambil semua inventory item sebagai base
  const inventoryItems = await prisma.inventoryItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
  if (!inventoryItems.length) return NextResponse.json({ message: 'Belum ada item inventaris' }, { status: 400 })

  // Cek apakah sudah ada opname hari ini yang masih DRAFT
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const existing = await prisma.stockOpname.findFirst({
    where: { date: { gte: today, lt: tomorrow }, status: 'DRAFT' },
  })
  if (existing) return NextResponse.json({ message: 'Sudah ada opname hari ini yang belum selesai', id: existing.id }, { status: 409 })

  const opname = await prisma.stockOpname.create({
    data: {
      note: note || '',
      userId: user.id,
      items: {
        create: inventoryItems.map(item => ({
          inventoryItemId: item.id,
          qtySystem: item.qty,
          qtyActual: item.qty, // default sama dengan sistem
          selisih: 0,
        })),
      },
    },
    include: {
      user: { select: { name: true } },
      items: {
        include: { inventoryItem: true },
        orderBy: [{ inventoryItem: { category: 'asc' } }, { inventoryItem: { name: 'asc' } }],
      },
    },
  })

  return NextResponse.json(opname, { status: 201 })
}
