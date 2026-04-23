import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

// POST /api/setup — buat admin pertama jika belum ada
// Body: { email, password, name, secret }
export async function POST(req) {
  const { email, password, name, secret } = await req.json()

  // Proteksi dengan secret key dari env
  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (existing) {
    return NextResponse.json({ message: 'Admin sudah ada', email: existing.email }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name: name || 'Admin', email, password: hashed, role: 'ADMIN', isActive: true },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json({ message: 'Admin berhasil dibuat', user }, { status: 201 })
}

// GET /api/setup — cek apakah admin sudah ada
export async function GET() {
  const count = await prisma.user.count({ where: { role: 'ADMIN' } })
  return NextResponse.json({ hasAdmin: count > 0, count })
}
