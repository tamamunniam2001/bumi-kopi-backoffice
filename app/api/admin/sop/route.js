import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const items = await prisma.sopItem.findMany({ where: { isActive: true }, orderBy: [{ type: 'asc' }, { order: 'asc' }] })
  return NextResponse.json(items)
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { text, type, order } = await req.json()
  const item = await prisma.sopItem.create({ data: { text, type, order: order || 0 } })
  return NextResponse.json(item, { status: 201 })
}
