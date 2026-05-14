import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import PDFDocument from 'pdfkit'

const fmtRp = n => 'Rp ' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })
const fmt = n => Number(n) % 1 !== 0 ? Number(n).toLocaleString('id-ID', { maximumFractionDigits: 4 }) : Number(n).toLocaleString('id-ID')
const fmtDate = d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })

async function generatePDFBuffer(opname, items) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = 515

    doc.rect(40, 40, W, 60).fill('#1E2A3B')
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
      .text('LAPORAN STOCK OPNAME', 55, 52)
    doc.fontSize(9).font('Helvetica')
      .text(`Tanggal: ${fmtDate(opname.date)}  Oleh: ${opname.user?.name}  Status: ${opname.status}`, 55, 74)
    if (opname.note) doc.text(`Catatan: ${opname.note}`, 55, 86)

    const totalNilai = items.reduce((s, i) => s + (i.qtyActual * (i.hargaTerakhir || 0)), 0)

    const tableTop = 120
    const cols = { no: 40, nama: 60, kategori: 200, qty: 310, harga: 380, nilai: 455 }
    const colW = { no: 18, nama: 138, kategori: 108, qty: 68, harga: 73, nilai: 100 }

    const drawTableHeader = (y) => {
      doc.rect(40, y, W, 18).fill('#1E2A3B')
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
      doc.text('No', cols.no + 2, y + 5, { width: colW.no })
      doc.text('Nama Barang', cols.nama, y + 5, { width: colW.nama })
      doc.text('Kategori', cols.kategori, y + 5, { width: colW.kategori })
      doc.text('Qty Aktual', cols.qty, y + 5, { width: colW.qty, align: 'center' })
      doc.text('Harga Satuan', cols.harga, y + 5, { width: colW.harga, align: 'right' })
      doc.text('Nilai Stok', cols.nilai, y + 5, { width: colW.nilai, align: 'right' })
    }

    drawTableHeader(tableTop)
    let y = tableTop + 18

    items.forEach((item, idx) => {
      const rowH = 16
      if (y + rowH > 780) {
        doc.addPage(); y = 40
        drawTableHeader(y); y += 18
      }
      const bg = item.qtyActual === 0 ? '#FFFBEB' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')
      doc.rect(40, y, W, rowH).fill(bg)
      const nama = item.inventoryItem?.name || item.itemName || ''
      const kategori = item.inventoryItem?.category || item.expenseItem?.category || ''
      const satuanTampil = (item.satuanOpname && item.konversi) ? item.satuanOpname : (item.inventoryItem?.satuan || item.satuan || '')
      const qtyTampil = (item.satuanOpname && item.konversi) ? item.qtyActual / item.konversi : item.qtyActual
      const harga = item.hargaTerakhir || 0
      const nilai = item.qtyActual * harga
      doc.fillColor('#1E293B').fontSize(7.5).font('Helvetica')
      doc.text(String(idx + 1), cols.no + 2, y + 4, { width: colW.no })
      doc.font(item.isManual ? 'Helvetica-Oblique' : 'Helvetica')
        .text(nama, cols.nama, y + 4, { width: colW.nama - 4, ellipsis: true })
      doc.font('Helvetica').fillColor('#64748B')
        .text(kategori, cols.kategori, y + 4, { width: colW.kategori - 4, ellipsis: true })
      doc.fillColor(item.qtyActual === 0 ? '#F59E0B' : '#1E293B')
        .text(`${fmt(qtyTampil)} ${satuanTampil}`, cols.qty, y + 4, { width: colW.qty, align: 'center' })
      doc.fillColor('#64748B')
        .text(harga > 0 ? fmtRp(harga) : '-', cols.harga, y + 4, { width: colW.harga, align: 'right' })
      doc.fillColor('#8B5CF6').font('Helvetica-Bold')
        .text(nilai > 0 ? fmtRp(nilai) : '-', cols.nilai, y + 4, { width: colW.nilai, align: 'right' })
      doc.moveTo(40, y + rowH).lineTo(555, y + rowH).strokeColor('#E2E8F0').lineWidth(0.5).stroke()
      y += rowH
    })

    y += 4
    doc.rect(40, y, W, 22).fill('#1E2A3B')
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
      .text('TOTAL NILAI STOK', 55, y + 7)
      .text(fmtRp(totalNilai), cols.nilai, y + 7, { width: colW.nilai, align: 'right' })

    const requested = items.filter(i => i.isRequested)
    if (requested.length > 0) {
      y += 36
      doc.rect(40, y, W, 18).fill('#FFF7ED')
      doc.rect(40, y, 4, 18).fill('#F59E0B')
      doc.fillColor('#92400E').fontSize(9).font('Helvetica-Bold')
        .text(`Perlu Restock (${requested.length} item)`, 52, y + 5)
      y += 18
      requested.forEach((item, idx) => {
        doc.rect(40, y, W, 14).fill(idx % 2 === 0 ? '#FFFBEB' : '#FFF7ED')
        doc.fillColor('#92400E').fontSize(7.5).font('Helvetica')
          .text(`${idx + 1}. ${item.inventoryItem?.name || item.itemName}`, 52, y + 3, { width: W - 20 })
        y += 14
      })
    }

    doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
      .text(`Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`, 40, doc.page.height - 30, { width: W, align: 'right' })

    doc.end()
  })
}

export async function POST(req, { params }) {
  try {
    const { error } = verifyAuth(req)
    if (error) return error

    const { id } = await params
    const { targets, caption } = await req.json()

    if (!targets?.length) return NextResponse.json({ message: 'Pilih minimal satu tujuan' }, { status: 400 })

    const token = process.env.FONNTE_TOKEN
    if (!token) return NextResponse.json({ message: 'FONNTE_TOKEN belum diset' }, { status: 500 })

    const opname = await prisma.stockOpname.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        items: { include: { expenseItem: true, inventoryItem: true } },
      },
    })
    if (!opname) return NextResponse.json({ message: 'Opname tidak ditemukan' }, { status: 404 })

    const expenseItemIds = opname.items.map(i => i.expenseItemId).filter(Boolean)
    const lastPrices = await prisma.expenseDetail.findMany({
      where: { expenseItemId: { in: expenseItemIds } },
      orderBy: { expense: { date: 'desc' } },
      distinct: ['expenseItemId'],
      select: { expenseItemId: true, harga: true },
    })
    const priceMap = Object.fromEntries(lastPrices.map(p => [p.expenseItemId, Number(p.harga)]))

    const items = opname.items.map(i => ({
      ...i,
      hargaTerakhir: i.isManual ? (i.hargaManual ?? null) : (i.expenseItemId ? (priceMap[i.expenseItemId] ?? null) : null),
      satuanOpname: i.expenseItem?.satuanOpname || null,
      konversi: i.expenseItem?.konversi || null,
    })).sort((a, b) => (a.inventoryItem?.name || a.itemName || '').localeCompare(b.inventoryItem?.name || b.itemName || ''))

    // Generate PDF
    let pdfBuffer
    try {
      pdfBuffer = await generatePDFBuffer(opname, items)
    } catch (pdfErr) {
      console.error('PDF error:', pdfErr)
      return NextResponse.json({ message: `Gagal generate PDF: ${pdfErr.message}` }, { status: 500 })
    }

    // Kirim via Fonnte
    const results = []
    for (const target of targets) {
      try {
        const form = new FormData()
        form.append('target', target)
        form.append('message', caption || '')
        form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), `opname-${id}.pdf`)

        const res = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { Authorization: token },
          body: form,
        })
        const result = await res.json()
        console.log('Fonnte response:', JSON.stringify(result))
        results.push({ target, success: result.status === true, detail: result })
      } catch (sendErr) {
        console.error('Fonnte send error:', sendErr)
        results.push({ target, success: false, detail: { reason: sendErr.message } })
      }
    }

    const allFailed = results.every(r => !r.success)
    if (allFailed) {
      return NextResponse.json({
        message: results[0]?.detail?.reason || results[0]?.detail?.message || 'Gagal mengirim',
        debug: results
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, results })
  } catch (e) {
    console.error('send-wa error:', e)
    return NextResponse.json({ message: e.message || 'Internal server error' }, { status: 500 })
  }
}
