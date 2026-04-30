import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 1)
  const limit = 20

  // Ambil semua kategori ExpenseItem yang tersedia
  if (searchParams.get('categories') === '1') {
    const cats = await prisma.expenseItem.findMany({
      where: { isActive: true, category: { not: '' } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })
    return NextResponse.json(cats.map(c => c.category))
  }

  const [opnames, total] = await Promise.all([
    prisma.stockOpname.findMany({
      orderBy: { date: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: { select: { name: true } },
        items: { select: { id: true, selisih: true } },
      },
    }),
    prisma.stockOpname.count(),
  ])

  return NextResponse.json({
    opnames: opnames.map(o => ({
      ...o,
      totalItems: o.items.length,
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

  const { note, categories } = await req.json()
  // categories: array string kategori yang dipilih, misal ['Persediaan', 'Bahan Baku']

  if (!categories?.length) return NextResponse.json({ message: 'Pilih minimal satu kategori' }, { status: 400 })

  const expenseItems = await prisma.expenseItem.findMany({
    where: { isActive: true, category: { in: categories } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  if (!expenseItems.length) return NextResponse.json({ message: 'Tidak ada item pada kategori yang dipilih' }, { status: 400 })

  // Cek opname hari ini yang masih DRAFT
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const existing = await prisma.stockOpname.findFirst({
    where: { date: { gte: today, lt: tomorrow }, status: 'DRAFT' },
  })
  if (existing) return NextResponse.json({ message: 'Sudah ada opname hari ini yang belum selesai', id: existing.id }, { status: 409 })

  const opname = await prisma.stockOpname.create({
    data: {
      note: note || '',
      categories: categories.join(', '),
      userId: user.id,
      items: {
        create: expenseItems.map(item => ({
          expenseItemId: item.id,
          itemName: item.name,
          satuan: item.satuan || '',
          qtySystem: 0,
          qtyActual: 0,
          selisih: 0,
        })),
      },
    },
    include: {
      user: { select: { name: true } },
      items: {
        include: { expenseItem: true },
        orderBy: [{ expenseItem: { category: 'asc' } }, { expenseItem: { name: 'asc' } }],
      },
    },
  })

  return NextResponse.json(opname, { status: 201 })
}
