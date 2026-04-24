import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function PUT(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { id } = await params
  const { text, type, order } = await req.json()
  const item = await prisma.sopItem.update({ where: { id }, data: { text, type, order } })
  return NextResponse.json(item)
}

export async function DELETE(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { id } = await params
  await prisma.sopItem.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ message: 'SOP dihapus' })
}
