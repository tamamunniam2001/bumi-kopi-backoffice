import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return NextResponse.json({ message: 'File tidak ditemukan' }, { status: 400 })

  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ message: 'File kosong atau tidak valid' }, { status: 400 })

  const results = { created: 0, skipped: 0, total: 0, errors: [] }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim())
    const [code, name, category, satuan] = cols
    if (!name) { results.errors.push(`Baris ${i + 1}: Nama kosong`); results.skipped++; results.total++; continue }
    try {
      await prisma.expenseItem.create({
        data: { code: code || null, name, category: category || '', satuan: satuan || '' },
      })
      results.created++
    } catch (e) {
      if (e.code === 'P2002') results.errors.push(`Baris ${i + 1}: Kode "${code}" sudah ada`)
      else results.errors.push(`Baris ${i + 1}: ${e.message}`)
      results.skipped++
    }
    results.total++
  }

  return NextResponse.json(results, { status: 201 })
}
