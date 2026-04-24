import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(employees)
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { name } = await req.json()
  const employee = await prisma.employee.create({ data: { name } })
  return NextResponse.json(employee, { status: 201 })
}
