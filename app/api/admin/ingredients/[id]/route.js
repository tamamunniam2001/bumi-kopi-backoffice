import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function PUT(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { name, unit, code } = await req.json()
  return NextResponse.json(await prisma.ingredient.update({ where: { id: params.id }, data: { name, unit, code: code || null } }))
}

export async function DELETE(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  await prisma.ingredient.delete({ where: { id: params.id } })
  return NextResponse.json({ message: 'Bahan baku dihapus' })
}
