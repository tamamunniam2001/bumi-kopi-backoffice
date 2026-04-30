import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

async function gemini(messages) {
  // Pisah system prompt dari messages
  const systemMsg = messages.find(m => m.role === 'system')
  const chatMsgs = messages.filter(m => m.role !== 'system')

  const contents = chatMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  }
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }

  const res = await fetch(GEMINI_URL + '?key=' + GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('Gemini error:', errText)
    throw new Error('Gemini error: ' + errText)
  }
  const data = await res.json()
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error('Gemini response unexpected:', JSON.stringify(data))
    throw new Error('Gemini response kosong atau diblokir')
  }
  return data.candidates[0].content.parts[0].text
}

const fmt = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

async function buildFullContext() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
  const lastMonthStart = new Date(year, month - 1, 1)
  const lastMonthEnd = new Date(year, month, 0, 23, 59, 59)
  const yearStart = new Date(year, 0, 1)
  const last7 = new Date(today); last7.setDate(last7.getDate() - 6)
  const last30 = new Date(today); last30.setDate(last30.getDate() - 29)

  // Semua query paralel
  const [
    todayTx, monthTx, lastMonthTx, yearTx,
    todayExp, monthExp, lastMonthExp, yearExp,
    topProductsMonth, topProductsYear,
    allProducts, allIngredients,
    monthExpDetails, yearExpDetails,
    recentTransactions, last7DaysTx,
    dailyReports, employees, users,
    payMethodMonth, absensiMonth,
    monthExpByCategory,
  ] = await Promise.all([
    // Transaksi
    prisma.transaction.aggregate({ where: { createdAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.transaction.aggregate({ where: { createdAt: { gte: monthStart, lte: monthEnd }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.transaction.aggregate({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    prisma.transaction.aggregate({ where: { createdAt: { gte: yearStart }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    // Pengeluaran
    prisma.expense.aggregate({ where: { date: { gte: today, lt: tomorrow } }, _sum: { total: true } }),
    prisma.expense.aggregate({ where: { date: { gte: monthStart, lte: monthEnd } }, _sum: { total: true } }),
    prisma.expense.aggregate({ where: { date: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { total: true } }),
    prisma.expense.aggregate({ where: { date: { gte: yearStart } }, _sum: { total: true } }),
    // Produk terlaris bulan ini
    prisma.orderItem.groupBy({ by: ['name'], where: { name: { not: null }, transaction: { createdAt: { gte: monthStart, lte: monthEnd }, status: 'COMPLETED' } }, _sum: { qty: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 10 }),
    // Produk terlaris tahun ini
    prisma.orderItem.groupBy({ by: ['name'], where: { name: { not: null }, transaction: { createdAt: { gte: yearStart }, status: 'COMPLETED' } }, _sum: { qty: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 10 }),
    // Master data
    prisma.product.findMany({ where: { isActive: true }, select: { name: true, price: true, category: { select: { name: true } } }, orderBy: { name: 'asc' } }),
    prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
    // Detail pengeluaran bulan ini
    prisma.expenseDetail.findMany({ where: { expense: { date: { gte: monthStart, lte: monthEnd } } }, select: { name: true, category: true, harga: true, qty: true, subtotal: true, expenseItem: { select: { category: true } } }, orderBy: { subtotal: 'desc' } }),
    // Detail pengeluaran tahun ini per kategori
    prisma.expenseDetail.findMany({ where: { expense: { date: { gte: yearStart } } }, select: { category: true, subtotal: true, expenseItem: { select: { category: true } } } }),
    // 10 transaksi terakhir
    prisma.transaction.findMany({ where: { status: 'COMPLETED' }, take: 10, orderBy: { createdAt: 'desc' }, select: { invoiceNo: true, total: true, createdAt: true, payMethod: true, cashier: { select: { name: true } } } }),
    // 7 hari terakhir per hari
    prisma.orderItem.findMany({ where: { transaction: { createdAt: { gte: last7 }, status: 'COMPLETED' } }, select: { subtotal: true, transaction: { select: { createdAt: true } } } }),
    // Laporan harian 7 terakhir
    prisma.dailyReport.findMany({ take: 7, orderBy: { date: 'desc' }, include: { cashier: { select: { name: true } } } }),
    // Karyawan
    prisma.employee.findMany({ where: { isActive: true }, select: { name: true } }),
    // Users/kasir
    prisma.user.findMany({ where: { isActive: true }, select: { name: true, role: true } }),
    // Metode bayar bulan ini
    prisma.transaction.groupBy({ by: ['payMethod'], where: { createdAt: { gte: monthStart, lte: monthEnd }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
    // Absensi bulan ini
    prisma.attendance.findMany({ where: { date: { gte: monthStart, lte: monthEnd } }, include: { employee: { select: { name: true } } }, orderBy: { date: 'desc' }, take: 30 }),
    // Pengeluaran bulan ini per kategori
    prisma.expenseDetail.groupBy({ by: ['category'], where: { expense: { date: { gte: monthStart, lte: monthEnd } } }, _sum: { subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } } }),
  ])

  // Hitung data turunan
  const labaHariIni = (todayTx._sum.total || 0) - (todayExp._sum.total || 0)
  const labaBulanIni = (monthTx._sum.total || 0) - (monthExp._sum.total || 0)
  const labaBulanLalu = (lastMonthTx._sum.total || 0) - (lastMonthExp._sum.total || 0)
  const labaTahunIni = (yearTx._sum.total || 0) - (yearExp._sum.total || 0)

  const trendPenjualan = lastMonthTx._sum.total > 0
    ? (((monthTx._sum.total || 0) - lastMonthTx._sum.total) / lastMonthTx._sum.total * 100).toFixed(1) + '%'
    : 'N/A'
  const trendPengeluaran = lastMonthExp._sum.total > 0
    ? (((monthExp._sum.total || 0) - lastMonthExp._sum.total) / lastMonthExp._sum.total * 100).toFixed(1) + '%'
    : 'N/A'

  // 7 hari terakhir per hari
  const last7Map = {}
  last7DaysTx.forEach(t => {
    const d = new Date(t.transaction.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    last7Map[d] = (last7Map[d] || 0) + t.subtotal
  })

  // Kategori pengeluaran tahun ini
  const yearExpCatMap = {}
  yearExpDetails.forEach(d => {
    const cat = d.category || d.expenseItem?.category || 'Tanpa Kategori'
    yearExpCatMap[cat] = (yearExpCatMap[cat] || 0) + d.subtotal
  })

  // Metode bayar
  const payStr = payMethodMonth.map(p => p.payMethod + ': ' + fmt(p._sum.total || 0) + ' (' + p._count + 'x)').join(', ')

  // Absensi bulan ini ringkasan
  const absensiOpening = absensiMonth.filter(a => a.type === 'OPENING').length
  const absensiClosing = absensiMonth.filter(a => a.type === 'CLOSING').length

  const bulanIniStr = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  const bulanLaluStr = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  let ctx = '=== DATA LENGKAP KEDAI KOPI "BUMI KOPI" ===\n'
  ctx += 'Tanggal sekarang: ' + fmtDate(now) + '\n\n'

  ctx += '--- RINGKASAN HARI INI ---\n'
  ctx += 'Penjualan: ' + fmt(todayTx._sum.total || 0) + ' (' + todayTx._count + ' transaksi)\n'
  ctx += 'Pengeluaran: ' + fmt(todayExp._sum.total || 0) + '\n'
  ctx += 'Laba bersih hari ini: ' + fmt(labaHariIni) + '\n\n'

  ctx += '--- BULAN INI (' + bulanIniStr + ') ---\n'
  ctx += 'Total Penjualan: ' + fmt(monthTx._sum.total || 0) + ' (' + monthTx._count + ' transaksi) | Trend vs bulan lalu: ' + trendPenjualan + '\n'
  ctx += 'Total Pengeluaran: ' + fmt(monthExp._sum.total || 0) + ' | Trend vs bulan lalu: ' + trendPengeluaran + '\n'
  ctx += 'Laba Bersih: ' + fmt(labaBulanIni) + '\n'
  ctx += 'Metode Bayar: ' + (payStr || '-') + '\n\n'

  ctx += '--- BULAN LALU (' + bulanLaluStr + ') ---\n'
  ctx += 'Penjualan: ' + fmt(lastMonthTx._sum.total || 0) + ' (' + lastMonthTx._count + ' transaksi)\n'
  ctx += 'Pengeluaran: ' + fmt(lastMonthExp._sum.total || 0) + '\n'
  ctx += 'Laba Bersih: ' + fmt(labaBulanLalu) + '\n\n'

  ctx += '--- TAHUN INI (' + year + ') ---\n'
  ctx += 'Total Penjualan: ' + fmt(yearTx._sum.total || 0) + ' (' + yearTx._count + ' transaksi)\n'
  ctx += 'Total Pengeluaran: ' + fmt(yearExp._sum.total || 0) + '\n'
  ctx += 'Laba Bersih: ' + fmt(labaTahunIni) + '\n\n'

  ctx += '--- PENJUALAN 7 HARI TERAKHIR ---\n'
  ctx += Object.entries(last7Map).map(([d, v]) => d + ': ' + fmt(v)).join(' | ') + '\n\n'

  ctx += '--- PRODUK TERLARIS BULAN INI (TOP 10) ---\n'
  ctx += topProductsMonth.map((p, i) => (i + 1) + '. ' + p.name + ' — ' + p._sum.qty + 'x terjual, pendapatan ' + fmt(p._sum.subtotal)).join('\n') + '\n\n'

  ctx += '--- PRODUK TERLARIS TAHUN INI (TOP 10) ---\n'
  ctx += topProductsYear.map((p, i) => (i + 1) + '. ' + p.name + ' — ' + p._sum.qty + 'x terjual, pendapatan ' + fmt(p._sum.subtotal)).join('\n') + '\n\n'

  ctx += '--- PENGELUARAN BULAN INI PER KATEGORI ---\n'
  ctx += monthExpByCategory.map(c => (c.category || 'Tanpa Kategori') + ': ' + fmt(c._sum.subtotal || 0)).join('\n') + '\n\n'

  ctx += '--- DETAIL PENGELUARAN BULAN INI (TOP 15) ---\n'
  ctx += monthExpDetails.slice(0, 15).map(d => '- ' + d.name + ' (' + (d.category || d.expenseItem?.category || 'Tanpa Kategori') + '): ' + fmt(d.subtotal) + ' (' + d.qty + 'x ' + fmt(d.harga) + ')').join('\n') + '\n\n'

  ctx += '--- PENGELUARAN TAHUN INI PER KATEGORI ---\n'
  ctx += Object.entries(yearExpCatMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ': ' + fmt(v)).join('\n') + '\n\n'

  ctx += '--- 10 TRANSAKSI TERAKHIR ---\n'
  ctx += recentTransactions.map(t => fmtDate(t.createdAt) + ' | ' + t.invoiceNo + ' | ' + fmt(t.total) + ' | ' + t.payMethod + ' | Kasir: ' + (t.cashier?.name || '-')).join('\n') + '\n\n'

  ctx += '--- LAPORAN HARIAN 7 TERAKHIR ---\n'
  ctx += dailyReports.map(r => {
    const exp = Array.isArray(r.pengeluaran) ? r.pengeluaran.reduce((s, p) => s + (p.nominal || 0), 0) : 0
    return fmtDate(r.date) + ' | Kasir: ' + (r.cashier?.name || '-') + ' | Penjualan: ' + fmt(r.penjualan) + ' | Pengeluaran: ' + fmt(exp) + ' | Laba: ' + fmt(r.penjualan - exp)
  }).join('\n') + '\n\n'

  ctx += '--- DAFTAR PRODUK AKTIF (' + allProducts.length + ' produk) ---\n'
  ctx += allProducts.map(p => p.name + ' (' + (p.category?.name || 'Tanpa Kategori') + ') — Harga: ' + fmt(p.price)).join('\n') + '\n\n'

  ctx += '--- BAHAN BAKU (' + allIngredients.length + ' bahan) ---\n'
  ctx += allIngredients.map(i => i.name + ' (' + i.unit + ')' + (i.code ? ' [' + i.code + ']' : '')).join(', ') + '\n\n'

  ctx += '--- KARYAWAN AKTIF (' + employees.length + ' orang) ---\n'
  ctx += employees.map(e => e.name).join(', ') + '\n\n'

  ctx += '--- PENGGUNA SISTEM ---\n'
  ctx += users.map(u => u.name + ' (' + u.role + ')').join(', ') + '\n\n'

  ctx += '--- ABSENSI BULAN INI ---\n'
  ctx += 'Opening: ' + absensiOpening + 'x | Closing: ' + absensiClosing + 'x\n'

  return ctx
}

export async function POST(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  if (!GEMINI_API_KEY) return NextResponse.json({ message: 'GEMINI_API_KEY belum dikonfigurasi' }, { status: 500 })

  const { mode, payload } = await req.json()

  // ── 1. ANALYZE ──
  if (mode === 'analyze') {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
    const lastMonthStart = new Date(year, month - 1, 1)
    const lastMonthEnd = new Date(year, month, 0, 23, 59, 59)
    const yearStart = new Date(year, 0, 1)

    const currentDetails = await prisma.expenseDetail.findMany({
      where: { expense: { date: { gte: monthStart, lte: monthEnd } } },
      select: { name: true, category: true, harga: true, qty: true, subtotal: true, expenseItem: { select: { category: true } } },
    })
    const lastDetails = await prisma.expenseDetail.findMany({
      where: { expense: { date: { gte: lastMonthStart, lte: lastMonthEnd } } },
      select: { category: true, subtotal: true, expenseItem: { select: { category: true } } },
    })
    const yearDetails = await prisma.expenseDetail.findMany({
      where: { expense: { date: { gte: yearStart } } },
      select: { category: true, subtotal: true, expenseItem: { select: { category: true } } },
    })

    const totalCurrent = currentDetails.reduce((s, d) => s + d.subtotal, 0)
    const totalLast = lastDetails.reduce((s, d) => s + d.subtotal, 0)
    const trendStr = totalLast > 0 ? (((totalCurrent - totalLast) / totalLast) * 100).toFixed(1) + '%' : 'N/A'

    const catMap = {}
    currentDetails.forEach(d => {
      const cat = d.category || d.expenseItem?.category || 'Tanpa Kategori'
      catMap[cat] = (catMap[cat] || 0) + d.subtotal
    })
    const catYearMap = {}
    yearDetails.forEach(d => {
      const cat = d.category || d.expenseItem?.category || 'Tanpa Kategori'
      catYearMap[cat] = (catYearMap[cat] || 0) + d.subtotal
    })
    const topItems = [...currentDetails].sort((a, b) => b.subtotal - a.subtotal).slice(0, 5)

    const catLines = Object.entries(catMap).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => '- ' + k + ': ' + fmt(v) + ' (' + (totalCurrent > 0 ? ((v / totalCurrent) * 100).toFixed(1) : 0) + '%)')
      .join('\n')
    const topLines = topItems.map(d => '- ' + d.name + ': ' + fmt(d.subtotal) + ' (' + d.qty + 'x ' + fmt(d.harga) + ')').join('\n')
    const yearLines = Object.entries(catYearMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => '- ' + k + ': ' + fmt(v)).join('\n')
    const bulanIni = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

    const context = 'Kamu adalah asisten keuangan untuk kedai kopi "Bumi Kopi". Analisis data pengeluaran berikut dan berikan insight yang actionable dalam Bahasa Indonesia.\n\n'
      + 'DATA PENGELUARAN BULAN INI (' + bulanIni + '):\n'
      + '- Total: ' + fmt(totalCurrent) + '\n'
      + '- Bulan lalu: ' + fmt(totalLast) + ' (' + trendStr + ')\n\n'
      + 'PER KATEGORI BULAN INI:\n' + catLines + '\n\n'
      + '5 ITEM TERBESAR BULAN INI:\n' + topLines + '\n\n'
      + 'AKUMULASI TAHUN INI PER KATEGORI:\n' + yearLines + '\n\n'
      + 'Berikan analisis dalam format:\n'
      + '1. **Ringkasan** (2-3 kalimat)\n'
      + '2. **Temuan Utama** (3-4 poin bullet)\n'
      + '3. **Rekomendasi** (3-4 saran konkret)\n'
      + '4. **Peringatan** (jika ada anomali atau pengeluaran yang perlu diperhatikan)'

    const result = await gemini([{ role: 'user', content: context }])
    return NextResponse.json({ result })
  }

  // ── 2. SUMMARY ──
  if (mode === 'summary') {
    const { reportId } = payload || {}
    const report = reportId
      ? await prisma.dailyReport.findUnique({ where: { id: reportId }, include: { cashier: { select: { name: true } } } })
      : await prisma.dailyReport.findFirst({ orderBy: { date: 'desc' }, include: { cashier: { select: { name: true } } } })

    if (!report) return NextResponse.json({ message: 'Laporan tidak ditemukan' }, { status: 404 })

    const reportDate = new Date(report.date)
    const dayStart = new Date(reportDate); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(reportDate); dayEnd.setHours(23, 59, 59, 999)
    const prevDayStart = new Date(dayStart); prevDayStart.setDate(prevDayStart.getDate() - 1)
    const prevDayEnd = new Date(dayEnd); prevDayEnd.setDate(prevDayEnd.getDate() - 1)

    const prevReport = await prisma.dailyReport.findFirst({ where: { date: { gte: prevDayStart, lte: prevDayEnd } } })
    const txData = await prisma.transaction.aggregate({ where: { createdAt: { gte: dayStart, lte: dayEnd }, status: 'COMPLETED' }, _count: true, _sum: { total: true } })
    const topProducts = await prisma.orderItem.groupBy({
      by: ['name'], where: { name: { not: null }, transaction: { createdAt: { gte: dayStart, lte: dayEnd }, status: 'COMPLETED' } },
      _sum: { qty: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 3,
    })

    const pengeluaran = Array.isArray(report.pengeluaran) ? report.pengeluaran : []
    const totalPengeluaran = pengeluaran.reduce((s, p) => s + (p.nominal || 0), 0)
    const laba = report.penjualan - totalPengeluaran
    const tglStr = fmtDate(report.date)
    const prevTrendStr = prevReport && prevReport.penjualan > 0
      ? (((report.penjualan - prevReport.penjualan) / prevReport.penjualan) * 100).toFixed(1) + '%' : null
    const produkLines = topProducts.map(p => '- ' + p.name + ': ' + p._sum.qty + 'x (' + fmt(p._sum.subtotal) + ')').join('\n') || '- Tidak ada data'
    const expLines = pengeluaran.length > 0 ? pengeluaran.map(p => '- ' + p.nama + ': ' + fmt(p.nominal)).join('\n') : '- Tidak ada pengeluaran'

    const context = 'Kamu adalah asisten manajer kedai kopi "Bumi Kopi". Buat ringkasan laporan harian yang informatif dalam Bahasa Indonesia.\n\n'
      + 'LAPORAN HARIAN — ' + tglStr + '\nKasir: ' + (report.cashier?.name || '-') + '\n\n'
      + 'KEUANGAN:\n- Kas Awal: ' + fmt(report.kasAwal) + '\n- Total Penjualan: ' + fmt(report.penjualan) + '\n'
      + '- Uang Disetor: ' + fmt(report.uangDisetor) + '\n- QRIS: ' + fmt(report.qris) + '\n- Transfer: ' + fmt(report.transfer) + '\n'
      + '- Total Pengeluaran: ' + fmt(totalPengeluaran) + '\n- Laba Bersih: ' + fmt(laba) + '\n'
      + (prevTrendStr ? '- Penjualan kemarin: ' + fmt(prevReport.penjualan) + ' (' + prevTrendStr + ')\n' : '')
      + '\nTRANSAKSI: ' + txData._count + ' transaksi, total ' + fmt(txData._sum.total || 0) + '\n\n'
      + 'PRODUK TERLARIS:\n' + produkLines + '\n\nPENGELUARAN:\n' + expLines + '\n\n'
      + 'CATATAN KASIR: ' + (report.catatan || '-') + '\n\n'
      + 'Buat ringkasan dalam format narasi yang natural (bukan bullet point), 3-4 paragraf pendek. Sertakan highlight positif, hal yang perlu diperhatikan, dan saran singkat untuk hari berikutnya.'

    const result = await gemini([{ role: 'user', content: context }])
    return NextResponse.json({ result, report: { date: report.date, cashier: report.cashier?.name } })
  }

  // ── 3. CHAT ──
  if (mode === 'chat') {
    const { messages: chatHistory, question } = payload
    if (!question?.trim()) return NextResponse.json({ message: 'Pertanyaan tidak boleh kosong' }, { status: 400 })

    const fullContext = await buildFullContext()

    const systemPrompt = 'Kamu adalah asisten AI yang sangat pintar dan helpful untuk kedai kopi "Bumi Kopi". '
      + 'Kamu memiliki akses ke SEMUA data operasional kedai secara real-time. '
      + 'Jawab pertanyaan dengan akurat berdasarkan data di bawah. '
      + 'Gunakan Bahasa Indonesia yang ramah, natural, dan profesional. '
      + 'Jika diminta perbandingan, hitung dan tampilkan angkanya. '
      + 'Jika diminta rekomendasi, berikan saran yang konkret dan actionable. '
      + 'Format jawaban dengan rapi menggunakan bullet point atau tabel jika perlu.\n\n'
      + fullContext

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chatHistory || []).slice(-10), // ambil 10 pesan terakhir agar tidak overflow token
      { role: 'user', content: question },
    ]

    try {
      const result = await gemini(messages)
      return NextResponse.json({ result })
    } catch (e) {
      console.error('Chat error:', e.message)
      return NextResponse.json({ message: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ message: 'Mode tidak valid' }, { status: 400 })
}
