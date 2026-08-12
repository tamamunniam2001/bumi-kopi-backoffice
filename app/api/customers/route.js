import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST — cari atau buat customer by phone
export async function POST(req) {
  try {
    const { phone, name } = await req.json()
    if (!phone) return NextResponse.json({ message: 'Nomor telepon wajib diisi' }, { status: 400 })

    const normalized = phone.replace(/\D/g, '').replace(/^0/, '62')

    let customer = await prisma.customer.findUnique({ where: { phone: normalized } })
    if (!customer) {
      customer = await prisma.customer.create({
        data: { phone: normalized, name: name || '' },
      })
    } else if (name && !customer.name) {
      customer = await prisma.customer.update({
        where: { phone: normalized },
        data: { name },
      })
    }

    return NextResponse.json(customer)
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
