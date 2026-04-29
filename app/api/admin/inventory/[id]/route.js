import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function PATCH(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  const { name, qty, satuan, category, imageUrl, note } = await req.json()
  if (!name?.trim()) return NextResponse.json({ message: 'Nama wajib diisi' }, { status: 400 })
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: { name: name.trim(), qty: Number(qty) || 0, satuan: satuan || '', category: category || '', imageUrl: imageUrl || null, note: note || '' }
  })
  return NextResponse.json(item)
}

export async function DELETE(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { id } = await params
  await prisma.inventoryItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
