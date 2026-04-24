import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

// Parse tanggal format DD/MM/YYYY
function parseDate(str) {
  if (!str) return null
  const s = String(str).trim()
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  // YYYY-MM-DD
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export async function POST(req) {
  const { error, user } = verifyAuth(req)
  if (error) return error
  const denied = adminOnly(user)
  if (denied) return denied

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ message: 'File tidak ditemukan' }, { status: 400 })

    const text = await file.text()
    // Hapus BOM jika ada
    const clean = text.replace(/^\uFEFF/, '')
    const lines = clean.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return NextResponse.json({ message: 'File kosong atau tidak valid' }, { status: 400 })

    // Skip header
    const rows = lines.slice(1)
    let created = 0, skipped = 0
    const errors = []

    // Cache produk dan kategori
    const products = await prisma.product.findMany({ select: { id: true, code: true, name: true, price: true } })
    const productByCode = Object.fromEntries(products.filter(p => p.code).map(p => [p.code.toLowerCase(), p]))
    const productByName = Object.fromEntries(products.map(p => [p.name.toLowerCase(), p]))

    for (let i = 0; i < rows.length; i++) {
      const line = rows[i].trim()
      if (!line) continue

      // Parse CSV (handle quoted fields)
      const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || line.split(',').map(c => c.trim())

      const [dateStr, code, , name, qtyStr, totalStr] = cols
      const date = parseDate(dateStr)
      const qty = parseInt(qtyStr) || 0
      const total = parseInt(String(totalStr).replace(/[^0-9]/g, '')) || 0

      if (!date || isNaN(date.getTime())) {
        errors.push(`Baris ${i + 2}: Format tanggal tidak valid "${dateStr}"`)
        skipped++; continue
      }
      if (!name) { errors.push(`Baris ${i + 2}: Nama produk kosong`); skipped++; continue }
      if (qty <= 0) { errors.push(`Baris ${i + 2}: QTY tidak valid`); skipped++; continue }

      // Cari produk by kode dulu, lalu by nama
      let product = code && code !== '-' ? productByCode[code.toLowerCase()] : null
      if (!product) product = productByName[name.toLowerCase()]

      const price = product ? product.price : Math.round(total / qty)
      const productId = product?.id || null

      // Buat transaksi historis
      const invoiceNo = `HIST-${date.getTime()}-${i}`
      await prisma.transaction.create({
        data: {
          invoiceNo,
          total,
          payment: total,
          change: 0,
          payMethod: 'CASH',
          status: 'COMPLETED',
          cashierId: user.id,
          createdAt: date,
          customerName: '',
          note: 'Import historis',
          items: productId ? {
            create: [{ productId, qty, price, subtotal: total }]
          } : undefined,
        },
      })
      created++
    }

    return NextResponse.json({ created, skipped, errors: errors.slice(0, 10) })
  } catch (err) {
    return NextResponse.json({ message: err.message || 'Gagal import' }, { status: 500 })
  }
}
