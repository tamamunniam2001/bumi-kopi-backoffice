import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const where = {}
  if (search) where.name = { contains: search, mode: 'insensitive' }
  if (category) where.category = category
  const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const body = await req.json()
  const { name, qty, satuan, category, imageUrl, note } = body
  if (!name?.trim()) return NextResponse.json({ message: 'Nama wajib diisi' }, { status: 400 })
  const item = await prisma.inventoryItem.create({
    data: { name: name.trim(), qty: Number(qty) || 0, satuan: satuan || '', category: category || '', imageUrl: imageUrl || null, note: note || '' }
  })
  return NextResponse.json(item, { status: 201 })
}

export async function DELETE(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { ids } = await req.json()
  if (!ids?.length) return NextResponse.json({ message: 'Tidak ada ID' }, { status: 400 })
  await prisma.inventoryItem.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ success: true })
}
