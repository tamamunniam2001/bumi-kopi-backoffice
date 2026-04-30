import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

async function groq(messages) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + GROQ_API_KEY },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 1024 }),
  })
  if (!res.ok) throw new Error('Groq error: ' + await res.text())
  const data = await res.json()
  return data.choices[0].message.content
}

const fmt = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

export async function POST(req) {
  const { error } = verifyAuth(req)
  if (error) return error
  if (!GROQ_API_KEY) return NextResponse.json({ message: 'GROQ_API_KEY belum dikonfigurasi' }, { status: 500 })

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

    const result = await groq([{ role: 'user', content: context }])
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

    const prevReport = await prisma.dailyReport.findFirst({
      where: { date: { gte: prevDayStart, lte: prevDayEnd } },
    })
    const txData = await prisma.transaction.aggregate({
      where: { createdAt: { gte: dayStart, lte: dayEnd }, status: 'COMPLETED' },
      _count: true, _sum: { total: true },
    })
    const topProducts = await prisma.orderItem.groupBy({
      by: ['name'],
      where: { transaction: { createdAt: { gte: dayStart, lte: dayEnd }, status: 'COMPLETED' } },
      _sum: { qty: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 3,
    })

    const pengeluaran = Array.isArray(report.pengeluaran) ? report.pengeluaran : []
    const totalPengeluaran = pengeluaran.reduce((s, p) => s + (p.nominal || 0), 0)
    const laba = report.penjualan - totalPengeluaran
    const tglStr = new Date(report.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const prevTrendStr = prevReport && prevReport.penjualan > 0
      ? (((report.penjualan - prevReport.penjualan) / prevReport.penjualan) * 100).toFixed(1) + '%'
      : null
    const produkLines = topProducts.map(p => '- ' + p.name + ': ' + p._sum.qty + 'x (' + fmt(p._sum.subtotal) + ')').join('\n') || '- Tidak ada data'
    const expLines = pengeluaran.length > 0 ? pengeluaran.map(p => '- ' + p.nama + ': ' + fmt(p.nominal)).join('\n') : '- Tidak ada pengeluaran'

    const context = 'Kamu adalah asisten manajer kedai kopi "Bumi Kopi". Buat ringkasan laporan harian yang informatif dalam Bahasa Indonesia.\n\n'
      + 'LAPORAN HARIAN — ' + tglStr + '\n'
      + 'Kasir: ' + (report.cashier?.name || '-') + '\n\n'
      + 'KEUANGAN:\n'
      + '- Kas Awal: ' + fmt(report.kasAwal) + '\n'
      + '- Total Penjualan: ' + fmt(report.penjualan) + '\n'
      + '- Uang Disetor: ' + fmt(report.uangDisetor) + '\n'
      + '- QRIS: ' + fmt(report.qris) + '\n'
      + '- Transfer: ' + fmt(report.transfer) + '\n'
      + '- Total Pengeluaran: ' + fmt(totalPengeluaran) + '\n'
      + '- Laba Bersih: ' + fmt(laba) + '\n'
      + (prevTrendStr ? '- Penjualan kemarin: ' + fmt(prevReport.penjualan) + ' (' + prevTrendStr + ')\n' : '')
      + '\nTRANSAKSI: ' + txData._count + ' transaksi, total ' + fmt(txData._sum.total || 0) + '\n\n'
      + 'PRODUK TERLARIS:\n' + produkLines + '\n\n'
      + 'PENGELUARAN:\n' + expLines + '\n\n'
      + 'CATATAN KASIR: ' + (report.catatan || '-') + '\n\n'
      + 'Buat ringkasan dalam format narasi yang natural (bukan bullet point), 3-4 paragraf pendek. Sertakan highlight positif, hal yang perlu diperhatikan, dan saran singkat untuk hari berikutnya.'

    const result = await groq([{ role: 'user', content: context }])
    return NextResponse.json({ result, report: { date: report.date, cashier: report.cashier?.name } })
  }

  // ── 3. CHAT ──
  if (mode === 'chat') {
    const { messages: chatHistory, question } = payload
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const today = new Date(now); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

    const todayTx = await prisma.transaction.aggregate({ where: { createdAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' }, _sum: { total: true }, _count: true })
    const monthTx = await prisma.transaction.aggregate({ where: { createdAt: { gte: monthStart }, status: 'COMPLETED' }, _sum: { total: true }, _count: true })
    const monthExp = await prisma.expense.aggregate({ where: { date: { gte: monthStart } }, _sum: { total: true } })
    const topProducts = await prisma.orderItem.groupBy({ by: ['name'], where: { transaction: { createdAt: { gte: monthStart }, status: 'COMPLETED' } }, _sum: { qty: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 5 })
    const recentExp = await prisma.expenseDetail.findMany({ where: { expense: { date: { gte: monthStart } } }, select: { name: true, category: true, subtotal: true, expenseItem: { select: { category: true } } }, orderBy: { subtotal: 'desc' }, take: 10 })
    const lastReport = await prisma.dailyReport.findFirst({ orderBy: { date: 'desc' }, include: { cashier: { select: { name: true } } } })

    const laba = (monthTx._sum.total || 0) - (monthExp._sum.total || 0)
    const tglStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const bulanStr = now.toLocaleString('id-ID', { month: 'long' })
    const produkLines = topProducts.map((p, i) => (i + 1) + '. ' + p.name + ': ' + p._sum.qty + 'x (' + fmt(p._sum.subtotal) + ')').join('\n')
    const expLines = recentExp.map(e => '- ' + e.name + ' (' + (e.category || e.expenseItem?.category || 'Tanpa Kategori') + '): ' + fmt(e.subtotal)).join('\n')
    const lastReportStr = lastReport ? new Date(lastReport.date).toLocaleDateString('id-ID') + ' oleh ' + lastReport.cashier?.name : 'Tidak ada'

    const systemPrompt = 'Kamu adalah asisten AI untuk kedai kopi "Bumi Kopi". Jawab pertanyaan berdasarkan data berikut. Gunakan Bahasa Indonesia yang ramah dan profesional.\n\n'
      + 'DATA TERKINI (' + tglStr + '):\n\n'
      + 'HARI INI:\n- Penjualan: ' + fmt(todayTx._sum.total || 0) + ' (' + todayTx._count + ' transaksi)\n\n'
      + 'BULAN INI (' + bulanStr + '):\n'
      + '- Total Penjualan: ' + fmt(monthTx._sum.total || 0) + ' (' + monthTx._count + ' transaksi)\n'
      + '- Total Pengeluaran: ' + fmt(monthExp._sum.total || 0) + '\n'
      + '- Laba Bersih: ' + fmt(laba) + '\n\n'
      + 'PRODUK TERLARIS BULAN INI:\n' + produkLines + '\n\n'
      + 'PENGELUARAN TERBESAR BULAN INI:\n' + expLines + '\n\n'
      + 'LAPORAN TERAKHIR: ' + lastReportStr + '\n\n'
      + 'Jawab singkat dan to the point.'

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chatHistory || []),
      { role: 'user', content: question },
    ]

    const result = await groq(messages)
    return NextResponse.json({ result })
  }

  return NextResponse.json({ message: 'Mode tidak valid' }, { status: 400 })
}
