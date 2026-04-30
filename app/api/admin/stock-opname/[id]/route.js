import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params

  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      items: {
        include: { expenseItem: true },
        orderBy: [{ expenseItem: { category: 'asc' } }, { itemName: 'asc' }],
      },
    },
  })
  if (!opname) return NextResponse.json({ message: 'Opname tidak ditemukan' }, { status: 404 })

  // Ambil harga terakhir & stok opname sebelumnya per expenseItemId
  const expenseItemIds = opname.items.map(i => i.expenseItemId).filter(Boolean)

  const [lastPrices, prevOpname] = await Promise.all([
    // Harga terakhir dari ExpenseDetail per item
    prisma.expenseDetail.findMany({
      where: { expenseItemId: { in: expenseItemIds } },
      orderBy: { expense: { date: 'desc' } },
      distinct: ['expenseItemId'],
      select: { expenseItemId: true, harga: true, satuan: true },
    }),
    // Opname SELESAI terakhir sebelum opname ini
    prisma.stockOpname.findFirst({
      where: { status: 'SELESAI', date: { lt: opname.date } },
      orderBy: { date: 'desc' },
      include: { items: { select: { expenseItemId: true, itemName: true, qtyActual: true } } },
    }),
  ])

  const priceMap = Object.fromEntries(lastPrices.map(p => [p.expenseItemId, p.harga]))
  const prevMap = Object.fromEntries(
    (prevOpname?.items || []).map(i => [i.expenseItemId || i.itemName, i.qtyActual])
  )

  const items = opname.items.map(i => ({
    ...i,
    hargaTerakhir: i.expenseItemId ? (priceMap[i.expenseItemId] ?? null) : null,
    qtySebelumnya: i.expenseItemId
      ? (prevMap[i.expenseItemId] ?? null)
      : (prevMap[i.itemName] ?? null),
    satuanOpname: i.expenseItem?.satuanOpname || null,
    konversi: i.expenseItem?.konversi || null,
  }))

  return NextResponse.json({ ...opname, items })
}

export async function PATCH(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  const body = await req.json()

  // Tambah item manual
  if (body.action === 'add-item') {
    const { itemName, satuan, hargaTerakhir } = body
    if (!itemName?.trim()) return NextResponse.json({ message: 'Nama item wajib diisi' }, { status: 400 })
    const item = await prisma.stockOpnameItem.create({
      data: {
        opnameId: id,
        itemName: itemName.trim(),
        satuan: satuan || '',
        isManual: true,
        qtySystem: 0,
        qtyActual: 0,
        selisih: 0,
      },
      include: { expenseItem: true },
    })
    return NextResponse.json({ ...item, hargaTerakhir: Number(hargaTerakhir) || null, qtySebelumnya: null }, { status: 201 })
  }

  // Buka kembali opname SELESAI untuk diedit
  if (body.action === 'reopen') {
    const opname = await prisma.stockOpname.findUnique({ where: { id }, select: { status: true } })
    if (!opname) return NextResponse.json({ message: 'Opname tidak ditemukan' }, { status: 404 })
    await prisma.stockOpname.update({ where: { id }, data: { status: 'DRAFT' } })
    return NextResponse.json({ success: true })
  }

  // Update satu item opname
  if (body.itemId !== undefined) {
    const { itemId, qtyActual, note } = body
    const updated = await prisma.stockOpnameItem.update({
      where: { id: itemId },
      data: {
        qtyActual: Number(qtyActual),
        selisih: 0,
        note: note ?? '',
      },
    })
    return NextResponse.json(updated)
  }

  // Selesaikan opname
  if (body.action === 'selesai') {
    const opname = await prisma.stockOpname.findUnique({ where: { id }, select: { status: true } })
    if (!opname) return NextResponse.json({ message: 'Opname tidak ditemukan' }, { status: 404 })
    if (opname.status === 'SELESAI') return NextResponse.json({ message: 'Opname sudah selesai' }, { status: 400 })
    await prisma.stockOpname.update({ where: { id }, data: { status: 'SELESAI' } })
    return NextResponse.json({ success: true })
  }

  // Update note opname
  const updated = await prisma.stockOpname.update({
    where: { id },
    data: { note: body.note ?? '' },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params

  // Cek apakah delete item manual (body ada itemId)
  let body = {}
  try { body = await req.json() } catch { }
  if (body.itemId) {
    const item = await prisma.stockOpnameItem.findUnique({ where: { id: body.itemId }, select: { isManual: true, opnameId: true } })
    if (!item || item.opnameId !== id) return NextResponse.json({ message: 'Item tidak ditemukan' }, { status: 404 })
    if (!item.isManual) return NextResponse.json({ message: 'Hanya item manual yang bisa dihapus' }, { status: 400 })
    await prisma.stockOpnameItem.delete({ where: { id: body.itemId } })
    return NextResponse.json({ success: true })
  }

  const opname = await prisma.stockOpname.findUnique({ where: { id }, select: { status: true } })
  if (!opname) return NextResponse.json({ message: 'Opname tidak ditemukan' }, { status: 404 })
  if (opname.status === 'SELESAI') return NextResponse.json({ message: 'Opname yang sudah selesai tidak bisa dihapus' }, { status: 400 })

  await prisma.stockOpname.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
