import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const items = await prisma.expenseItem.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { code, name, category } = await req.json()
  try {
    const item = await prisma.expenseItem.create({ data: { code: code || null, name, category: category || '' } })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ message: 'Kode sudah digunakan' }, { status: 400 })
    return NextResponse.json({ message: 'Gagal menyimpan' }, { status: 500 })
  }
}
