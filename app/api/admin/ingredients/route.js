import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  return NextResponse.json(await prisma.ingredient.findMany({ orderBy: { name: 'asc' } }))
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { name, unit, code } = await req.json()
  return NextResponse.json(await prisma.ingredient.create({ data: { name, unit, code: code || null } }), { status: 201 })
}
