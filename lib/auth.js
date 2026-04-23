import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export function verifyAuth(request) {
  const token = request.headers.get('authorization')?.split(' ')[1]
  if (!token) return { error: NextResponse.json({ message: 'Token tidak ada' }, { status: 401 }) }
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)
    return { user }
  } catch {
    return { error: NextResponse.json({ message: 'Token tidak valid' }, { status: 401 }) }
  }
}

export function adminOnly(user) {
  if (user.role !== 'ADMIN') return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 })
  return null
}
