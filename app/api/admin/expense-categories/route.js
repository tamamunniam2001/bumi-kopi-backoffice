import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  // Gabungkan dari tabel ExpenseCategory + kategori unik dari ExpenseItem
  const [saved, fromItems] = await Promise.all([
    prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } }),
    prisma.expenseItem.findMany({ where: { isActive: true, category: { not: '' } }, select: { category: true }, distinct: ['category'] }),
  ])
  const savedNames = new Set(saved.map(c => c.name))
  const extra = fromItems.map(i => i.category).filter(c => c && !savedNames.has(c))
  return NextResponse.json([...saved, ...extra.map(name => ({ id: null, name }))])
}

export async function POST(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ message: 'Nama kategori wajib diisi' }, { status: 400 })
  try {
    const cat = await prisma.expenseCategory.create({ data: { name: name.trim() } })
    return NextResponse.json(cat, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ message: 'Kategori sudah ada' }, { status: 400 })
    return NextResponse.json({ message: 'Gagal menyimpan' }, { status: 500 })
  }
}
