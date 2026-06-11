import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function PATCH(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  const body = await req.json()
  const data = { printed: body.printed, printedAt: body.printed ? new Date() : null }
  if (body.imageUrl) data.imageUrl = body.imageUrl
  const resi = await prisma.resi.update({ where: { id: params.id }, data })
  return NextResponse.json(resi)
}

export async function DELETE(req, { params }) {
  const { error } = verifyAuth(req)
  if (error) return error
  await prisma.resi.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
