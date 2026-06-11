import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const rows = await prisma.resi.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(rows)
}

export async function POST(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const { nama, imageUrl } = await req.json()
  if (!imageUrl) return NextResponse.json({ message: 'imageUrl required' }, { status: 400 })
  const resi = await prisma.resi.create({ data: { nama: nama || '', imageUrl } })
  return NextResponse.json(resi, { status: 201 })
}
