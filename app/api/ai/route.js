import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

async function groq(messages) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 1024 }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error: ${err}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

const fmt = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

export async function POST(req) {
  const { error } = verifyAuth(req)
  if (error) return error

  if (!GROQ_API_KEY) return NextResponse.json({ message: 'GROQ_API_KEY belum dikonfigurasi' }, { status: 500 })

  const { mode, payload } = await req.json()

  // ── 1. ANALYZE: Analisis pengeluaran ──
  if (mode === 'analyze') {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
    const lastMonthStart = new Date(year, month - 1, 1)
    const lastMonthEnd = new Date(year, month, 0, 23, 59, 59)

    const [currentDetails, lastDetails, byKategori] = await Promise.all([
      prisma.expenseDetail.findMany({
        where: { expense: { date: { gte: monthStart, lte: monthEnd } } },
        select: { name: true, category: true, harga: true, qty: true, subtotal: true, expenseItem: { select: { category: true } } },
      }),
      prisma.expenseDetail.findMany({
        where: { expense: { date: { gte: lastMonthStart, lte: lastMonthEnd } } },
        select: { category: true, subtotal: true, expenseItem: { select: { category: true } } },
      }),
      prisma.expenseDetail.findMany({
        where: { expense: { date: { gte: new Date(year, 0, 1) } } },
        select: { category: true, subtotal: true, expenseItem: { select: { category: true } } },
      ]),
    ])

    const totalCurrent = currentDetails.reduce((s, d) => s + d.subtotal, 0)
    const totalLast = lastDetails.reduce((s, d) => s + d.subtotal, 0)

    const catMap = {}
    currentDetails.forEach(d => {
      const cat = d.category || d.expenseItem?.category || 'Tanpa Kategori'
      catMap[cat] = (catMap[cat] || 0) + d.subtotal
    })
    const topItems = [...currentDetails].sort((a, b) => b.subtotal - a.subtotal).slice(0, 5)

    const catYearMap = {}
    byKategori.forEach(d => {
      const cat = d.category || d.expenseItem?.category || 'Tanpa Kategori'
      catYearMap[cat] = (catYearMap[cat] || 0) + d.subtotal
    })

    const context = `
Kamu adalah asisten keuangan untuk kedai kopi "Bumi Kopi". Analisis data pengeluaran berikut dan berikan insight yang actionable dalam Bahasa Indonesia.

DATA PENGELUARAN BULAN INI (${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}):
- Total: ${fmt(totalCurrent)}
- Bulan lalu: ${fmt(totalLast)} (${totalLast > 0 ? (((totalCurrent - totalLast) / totalLast) * 100).toFixed(1) + '%' : 'N/A'})

PER KATEGORI BULAN INI:
${Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${fmt(v)} (${totalCurrent > 0 ? ((v / totalCurrent) * 100).toFixed(1) : 0}%)`).join('\n')}

5 ITEM TERBESAR BULAN INI:
${topItems.map(d => `- ${d.name}: ${fmt(d.subtotal)} (${d.qty}x ${fmt(d.harga)})`).join('\n')}

AKUMULASI TAHUN INI PER KATEGORI:
${Object.entries(catYearMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${fmt(v)}`).join('\n')}

Berikan analisis dalam format:
1. **Ringkasan** (2-3 kalimat)
2. **Temuan Utama** (3-4 poin bullet)
3. **Rekomendasi** (3-4 saran konkret)
4. **Peringatan** (jika ada anomali atau pengeluaran yang perlu diperhatikan)
`
    const result = await groq([{ role: 'user', content: context }])
    return NextResponse.json({ result })
  }

  // ── 2. SUMMARY: Ringkasan laporan harian ──
  if (mode === 'summary') {
    const { reportId } = payload || {}
    let report
    if (reportId) {
      report = await prisma.dailyReport.findUnique({ where: { id: reportId }, include: { cashier: { select: { name: true } } } })
    } else {
      report = await prisma.dailyReport.findFirst({ orderBy: { date: 'desc' }, include: { cashier: { select: { name: true } } } })
    }
    if (!report) return NextResponse.json({ message: 'Laporan tidak ditemukan' }, { status: 404 })

    const date = new Date(report.date)
    const prevDate = new Date(date); prevDate.setDate(prevDate.getDate() - 1)
    const prevReport = await prisma.dailyReport.findFirst({
      where: { date: { gte: new Date(prevDate.setHours(0, 0, 0, 0)), lte: new Date(prevDate.setHours(23, 59, 59, 999)) } },
    })

    const txData = await prisma.transaction.aggregate({
      where: { createdAt: { gte: new Date(date.setHours(0, 0, 0, 0)), lte: new Date(date.setHours(23, 59, 59, 999)) }, status: 'COMPLETED' },
      _count: true, _sum: { total: true },
    })
    const topProducts = await prisma.orderItem.groupBy({
      by: ['name'], where: { transaction: { createdAt: { gte: new Date(new Date(report.date).setHours(0, 0, 0, 0)), lte: new Date(new Date(report.date).setHours(23, 59, 59, 999)) }, status: 'COMPLETED' } },
      _sum: { qty: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 3,
    })

    const pengeluaran = Array.isArray(report.pengeluaran) ? report.pengeluaran : []
    const totalPengeluaran = pengeluaran.reduce((s, p) => s + (p.nominal || 0), 0)
    const laba = report.penjualan - totalPengeluaran

    const context = `
Kamu adalah asisten manajer kedai kopi "Bumi Kopi". Buat ringkasan laporan harian yang informatif dan mudah dipahami dalam Bahasa Indonesia.

LAPORAN HARIAN — ${new Date(report.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
Kasir: ${report.cashier?.name || '-'}

KEUANGAN:
- Kas Awal: ${fmt(report.kasAwal)}
- Total Penjualan: ${fmt(report.penjualan)}
- Uang Disetor: ${fmt(report.uangDisetor)}
- QRIS: ${fmt(report.qris)}
- Transfer: ${fmt(report.transfer)}
- Total Pengeluaran: ${fmt(totalPengeluaran)}
- Laba Bersih: ${fmt(laba)}
${prevReport ? `- Penjualan kemarin: ${fmt(prevReport.penjualan)} (${prevReport.penjualan > 0 ? (((report.penjualan - prevReport.penjualan) / prevReport.penjualan) * 100).toFixed(1) + '%' : 'N/A'})` : ''}

TRANSAKSI: ${txData._count} transaksi, total ${fmt(txData._sum.total || 0)}

PRODUK TERLARIS:
${topProducts.map(p => `- ${p.name}: ${p._sum.qty}x (${fmt(p._sum.subtotal)})`).join('\n') || '- Tidak ada data'}

PENGELUARAN:
${pengeluaran.length > 0 ? pengeluaran.map(p => `- ${p.nama}: ${fmt(p.nominal)}`).join('\n') : '- Tidak ada pengeluaran'}

CATATAN KASIR: ${report.catatan || '-'}

Buat ringkasan dalam format narasi yang natural (bukan bullet point), 3-4 paragraf pendek. Sertakan highlight positif, hal yang perlu diperhatikan, dan saran singkat untuk hari berikutnya.
`
    const result = await groq([{ role: 'user', content: context }])
    return NextResponse.json({ result, report: { date: report.date, cashier: report.cashier?.name } })
  }

  // ── 3. CHAT: Tanya data ──
  if (mode === 'chat') {
    const { messages: chatHistory, question } = payload

    // Ambil context data ringkas
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const today = new Date(now); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

    const [todayTx, monthTx, monthExp, topProducts, recentExp, lastReport] = await Promise.all([
      prisma.transaction.aggregate({ where: { createdAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
      prisma.transaction.aggregate({ where: { createdAt: { gte: monthStart }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
      prisma.expense.aggregate({ where: { date: { gte: monthStart } }, _sum: { total: true } }),
      prisma.orderItem.groupBy({ by: ['name'], where: { transaction: { createdAt: { gte: monthStart }, status: 'COMPLETED' } }, _sum: { qty: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 5 }),
      prisma.expenseDetail.findMany({ where: { expense: { date: { gte: monthStart } } }, select: { name: true, category: true, subtotal: true, expenseItem: { select: { category: true } } }, orderBy: { subtotal: 'desc' }, take: 10 }),
      prisma.dailyReport.findFirst({ orderBy: { date: 'desc' }, include: { cashier: { select: { name: true } } } }),
    ])

    const systemPrompt = `Kamu adalah asisten AI untuk kedai kopi "Bumi Kopi". Jawab pertanyaan berdasarkan data berikut. Gunakan Bahasa Indonesia yang ramah dan profesional. Jika data tidak tersedia, katakan dengan jujur.

DATA TERKINI (${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}):

HARI INI:
- Penjualan: ${fmt(todayTx._sum.total || 0)} (${todayTx._count} transaksi)

BULAN INI (${now.toLocaleString('id-ID', { month: 'long' })}):
- Total Penjualan: ${fmt(monthTx._sum.total || 0)} (${monthTx._count} transaksi)
- Total Pengeluaran: ${fmt(monthExp._sum.total || 0)}
- Laba Bersih: ${fmt((monthTx._sum.total || 0) - (monthExp._sum.total || 0))}

PRODUK TERLARIS BULAN INI:
${topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p._sum.qty}x (${fmt(p._sum.subtotal)})`).join('\n')}

PENGELUARAN TERBESAR BULAN INI:
${recentExp.map(e => `- ${e.name} (${e.category || e.expenseItem?.category || 'Tanpa Kategori'}): ${fmt(e.subtotal)}`).join('\n')}

LAPORAN TERAKHIR: ${lastReport ? new Date(lastReport.date).toLocaleDateString('id-ID') + ' oleh ' + lastReport.cashier?.name : 'Tidak ada'}

Jawab dengan singkat dan to the point. Jika ditanya hal di luar data yang tersedia, arahkan ke menu yang relevan di aplikasi.`

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
