import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

const DEFAULTS = {
  storeName: 'BUMI KOPI',
  tagline: 'Struk Pembayaran',
  footer: 'Terima kasih sudah berkunjung!',
  footer2: 'Bumi Kopi',
  footer3: '',
  footer4: '',
  footer5: '',
  printWidth: 32,
}

// GET boleh diakses semua role (kasir perlu untuk print struk)
export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  let settings = await prisma.receiptSettings.findUnique({ where: { id: 'singleton' } })
  if (!settings) settings = { id: 'singleton', ...DEFAULTS }
  return NextResponse.json(settings)
}

// PUT hanya admin
export async function PUT(req) {
  const { user, error } = verifyAuth(req)
  if (error) return error
  const deny = adminOnly(user)
  if (deny) return deny
  const body = await req.json()
  const data = {
    storeName: body.storeName ?? DEFAULTS.storeName,
    tagline: body.tagline ?? DEFAULTS.tagline,
    footer: body.footer ?? DEFAULTS.footer,
    footer2: body.footer2 ?? DEFAULTS.footer2,
    footer3: body.footer3 ?? DEFAULTS.footer3,
    footer4: body.footer4 ?? DEFAULTS.footer4,
    footer5: body.footer5 ?? DEFAULTS.footer5,
    printWidth: Number(body.printWidth) || DEFAULTS.printWidth,
  }
  const settings = await prisma.receiptSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  })
  return NextResponse.json(settings)
}
