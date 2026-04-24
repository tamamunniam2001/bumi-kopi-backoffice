import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, adminOnly } from '@/lib/auth'

function parseDate(str) {
  if (!str) return null
  const s = String(str).trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// Parser CSV/TSV yang handle quoted fields dan auto-detect separator
function parseLine(line, sep) {
  if (sep === '\t') return line.split('\t').map(c => c.trim())
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
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
    const clean = text.replace(/^\uFEFF/, '')
    const lines = clean.split(/\r?\n/)
    const dataLines = lines.slice(1) // skip header

    if (dataLines.filter(l => l.trim()).length === 0)
      return NextResponse.json({ message: 'File kosong atau tidak valid' }, { status: 400 })

    // Auto-detect separator dari header: tab, titik koma, atau koma
    const header = lines[0] || ''
    const sep = header.includes('\t') ? '\t' : header.includes(';') ? ';' : ','

    let created = 0, skipped = 0
    const errors = []

    const products = await prisma.product.findMany({ select: { id: true, code: true, name: true, price: true } })
    const productByCode = Object.fromEntries(products.filter(p => p.code).map(p => [p.code.toLowerCase(), p]))
    const productByName = Object.fromEntries(products.map(p => [p.name.toLowerCase(), p]))

    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const validRows = []

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue

      const rowNum = i + 2 // +2 karena header di baris 1
      let cols
      try {
        cols = parseLine(line, sep)
      } catch {
        errors.push(`Baris ${rowNum}: Gagal parse baris`)
        skipped++; continue
      }

      if (cols.length < 5) {
        errors.push(`Baris ${rowNum}: Kolom tidak lengkap (hanya ${cols.length} kolom) — "${line.substring(0, 50)}"`)
        skipped++; continue
      }

      // cols: [tanggal, kode, kategori, nama, qty, total]
      // Jika hanya 5 kolom, kemungkinan tanpa kategori: [tanggal, kode, nama, qty, total]
      let dateStr, code, name, qtyStr, totalStr
      if (cols.length >= 6) {
        [dateStr, code, , name, qtyStr, totalStr] = cols
      } else {
        [dateStr, code, name, qtyStr, totalStr] = cols
      }
      const date = parseDate(dateStr)
      const qty = parseInt(String(qtyStr || '0').replace(/[^0-9]/g, '')) || 0
      const total = parseInt(String(totalStr || '0').replace(/[^0-9]/g, '')) || 0

      if (!date || isNaN(date.getTime())) {
        errors.push(`Baris ${rowNum}: Tanggal tidak valid "${dateStr}" — gunakan format DD/MM/YYYY`)
        skipped++; continue
      }
      if (!name || !name.trim()) {
        errors.push(`Baris ${rowNum}: Nama produk kosong`)
        skipped++; continue
      }
      if (qty <= 0) {
        errors.push(`Baris ${rowNum}: QTY tidak valid "${qtyStr}" (terbaca: ${qty}) — harus angka > 0`)
        skipped++; continue
      }
      if (total < 0) {
        errors.push(`Baris ${rowNum}: Total tidak valid "${totalStr}"`)
        skipped++; continue
      }

      // Cari produk: by kode dulu (jika bukan '-' atau kosong), lalu by nama
      const cleanCode = code ? code.trim() : ''
      let product = (cleanCode && cleanCode !== '-') ? productByCode[cleanCode.toLowerCase()] : null
      if (!product) product = productByName[name.toLowerCase().trim()]

      // Jika produk tidak ditemukan, tetap simpan sebagai item tanpa produk
      validRows.push({
        rowNum, date, qty, total, product,
        price: product ? product.price : (qty > 0 ? Math.round(total / qty) : 0),
        invoiceNo: `HIST-${batchId}-${i}`,
      })
    }

    // Batch insert 20 sekaligus
    const BATCH = 20
    for (let b = 0; b < validRows.length; b += BATCH) {
      const batch = validRows.slice(b, b + BATCH)
      const results = await Promise.allSettled(batch.map(async r => {
        const tx = await prisma.transaction.create({
          data: {
            invoiceNo: r.invoiceNo,
            total: r.total,
            payment: r.total,
            change: 0,
            payMethod: 'CASH',
            status: 'COMPLETED',
            cashierId: user.id,
            createdAt: r.date,
            customerName: '',
            note: 'Import historis',
          },
        })
        // Selalu buat orderItem agar muncul di tabel, meski produk tidak ditemukan
        await prisma.orderItem.create({
          data: {
            transactionId: tx.id,
            productId: r.product?.id || null,
            qty: r.qty,
            price: r.price,
            subtotal: r.total,
          },
        })
        return tx
      }))
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          created++
        } else {
          const r = batch[idx]
          const msg = result.reason?.message || 'error tidak diketahui'
          if (msg.includes('Unique') || msg.includes('unique')) {
            errors.push(`Baris ${r.rowNum}: Dilewati (data sudah ada)`)
          } else {
            errors.push(`Baris ${r.rowNum}: Gagal simpan — ${msg}`)
          }
          skipped++
        }
      })
    }

    return NextResponse.json({ created, skipped, total: created + skipped, errors })
  } catch (err) {
    return NextResponse.json({ message: err.message || 'Gagal import' }, { status: 500 })
  }
}
