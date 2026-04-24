import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

export async function PUT(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { id } = await params
  const { name, isActive } = await req.json()
  const employee = await prisma.employee.update({ where: { id }, data: { name, isActive } })
  return NextResponse.json(employee)
}

export async function DELETE(req, { params }) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied
  const { id } = await params
  await prisma.employee.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ message: 'Karyawan dinonaktifkan' })
}
