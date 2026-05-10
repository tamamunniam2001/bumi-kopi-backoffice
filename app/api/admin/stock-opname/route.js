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

  const { note, date } = await req.json()

  const [expenseItems, prevManualItems] = await Promise.all([
    prisma.expenseItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.stockOpname.findFirst({
      where: { status: 'SELESAI' },
      orderBy: { date: 'desc' },
      include: { items: { where: { isManual: true }, select: { itemName: true, satuan: true, hargaManual: true } } },
    }),
  ])
  if (!expenseItems.length) return NextResponse.json({ message: 'Belum ada item persediaan. Tambahkan dulu di menu Item Pengeluaran.' }, { status: 400 })

  const manualItems = prevManualItems?.items || []

  // Parse tanggal sebagai WIB (UTC+7) — simpan sebagai noon WIB agar tidak geser hari
  const opnameDate = date
    ? new Date(`${date}T12:00:00+07:00`)
    : new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))

  // Cek duplikat: bandingkan dalam rentang hari WIB
  const startOfDay = new Date(`${date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })}T00:00:00+07:00`)
  const endOfDay = new Date(`${date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })}T23:59:59+07:00`)
  const existing = await prisma.stockOpname.findFirst({
    where: { date: { gte: startOfDay, lte: endOfDay }, status: 'DRAFT' },
  })
  if (existing) return NextResponse.json({ message: 'Sudah ada opname hari ini yang belum selesai', id: existing.id }, { status: 409 })

  const opname = await prisma.stockOpname.create({
    data: {
      date: opnameDate,
      note: note || '',
      categories: '',
      userId: user.id,
      items: {
        create: [
          ...expenseItems.map(item => ({
            expenseItemId: item.id,
            itemName: item.name,
            satuan: item.satuan || '',
            qtySystem: 0,
            qtyActual: 0,
            selisih: 0,
          })),
          ...manualItems.map(item => ({
            itemName: item.itemName,
            satuan: item.satuan || '',
            isManual: true,
            hargaManual: item.hargaManual,
            qtySystem: 0,
            qtyActual: 0,
            selisih: 0,
          })),
        ],
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
