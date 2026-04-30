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
        include: { inventoryItem: true },
        orderBy: [{ inventoryItem: { category: 'asc' } }, { inventoryItem: { name: 'asc' } }],
      },
    },
  })
  if (!opname) return NextResponse.json({ message: 'Opname tidak ditemukan' }, { status: 404 })
  return NextResponse.json(opname)
}

export async function PATCH(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  const body = await req.json()

  // Update satu item opname
  if (body.itemId !== undefined) {
    const { itemId, qtyActual, note } = body
    const item = await prisma.stockOpnameItem.findUnique({
      where: { id: itemId },
      select: { qtySystem: true },
    })
    if (!item) return NextResponse.json({ message: 'Item tidak ditemukan' }, { status: 404 })

    const updated = await prisma.stockOpnameItem.update({
      where: { id: itemId },
      data: {
        qtyActual: Number(qtyActual),
        selisih: Number(qtyActual) - item.qtySystem,
        note: note ?? '',
      },
    })
    return NextResponse.json(updated)
  }

  // Selesaikan opname — update status + sync qty inventaris
  if (body.action === 'selesai') {
    const opname = await prisma.stockOpname.findUnique({
      where: { id },
      include: { items: { include: { inventoryItem: true } } },
    })
    if (!opname) return NextResponse.json({ message: 'Opname tidak ditemukan' }, { status: 404 })
    if (opname.status === 'SELESAI') return NextResponse.json({ message: 'Opname sudah selesai' }, { status: 400 })

    // Update status opname + sync semua qty inventaris ke qtyActual
    await prisma.$transaction([
      prisma.stockOpname.update({ where: { id }, data: { status: 'SELESAI' } }),
      ...opname.items.map(item =>
        prisma.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { qty: item.qtyActual },
        })
      ),
    ])

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

  const opname = await prisma.stockOpname.findUnique({ where: { id }, select: { status: true } })
  if (!opname) return NextResponse.json({ message: 'Opname tidak ditemukan' }, { status: 404 })
  if (opname.status === 'SELESAI') return NextResponse.json({ message: 'Opname yang sudah selesai tidak bisa dihapus' }, { status: 400 })

  await prisma.stockOpname.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
