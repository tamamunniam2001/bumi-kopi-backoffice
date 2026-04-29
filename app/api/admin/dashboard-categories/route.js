import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(req) {
  const { error } = verifyAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const TZ_OFFSET = 7 * 60 * 60 * 1000
  const toWIB = (d) => new Date(new Date(d).getTime() + TZ_OFFSET)

  // Ambil parameter bulan/tahun dari query, default bulan ini
  const reqMonth = searchParams.get('month') // 0-11 atau null
  const reqYear = searchParams.get('year')   // tahun atau null
  const mode = searchParams.get('mode') || 'month' // 'month' | 'year'

  const year = reqYear ? Number(reqYear) : now.getFullYear()
  const month = reqMonth !== null ? Number(reqMonth) : now.getMonth()

  const yearStart = new Date(year, 0, 1); yearStart.setTime(yearStart.getTime() - TZ_OFFSET)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999); yearEnd.setTime(yearEnd.getTime() - TZ_OFFSET)
  const monthStart = new Date(year, month, 1); monthStart.setTime(monthStart.getTime() - TZ_OFFSET)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999); monthEnd.setTime(monthEnd.getTime() - TZ_OFFSET)

  const rangeStart = mode === 'year' ? yearStart : monthStart
  const rangeEnd = mode === 'year' ? yearEnd : monthEnd

  const [salesRaw, expRaw] = await Promise.all([
    prisma.orderItem.findMany({
      where: { transaction: { status: 'COMPLETED', createdAt: { gte: rangeStart, lte: rangeEnd } } },
      select: {
        category: true, subtotal: true, qty: true,
        transaction: { select: { createdAt: true } },
        product: { select: { category: { select: { name: true } } } },
      },
    }),
    prisma.expenseDetail.findMany({
      where: { expense: { date: { gte: rangeStart, lte: rangeEnd } } },
      select: {
        category: true, subtotal: true,
        expense: { select: { date: true } },
        expenseItem: { select: { category: true } },
      },
    }),
  ])

  // Tentukan minggu ke-berapa dalam bulan (1-4+)
  function getWeekOfMonth(dateWIB) {
    const day = dateWIB.getUTCDate()
    return Math.min(Math.ceil(day / 7), 4) // max 4 minggu
  }

  // Untuk mode year: kolom = bulan (Jan-Des), untuk mode month: kolom = minggu (Mg1-Mg4)
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const cols = mode === 'year'
    ? Array.from({ length: 12 }, (_, i) => ({ key: i, label: MONTHS[i] }))
    : [{ key: 1, label: 'Mg1' }, { key: 2, label: 'Mg2' }, { key: 3, label: 'Mg3' }, { key: 4, label: 'Mg4' }]

  function getColKey(dateWIB) {
    if (mode === 'year') return dateWIB.getUTCMonth()
    return getWeekOfMonth(dateWIB)
  }

  // Build tabel: { [category]: { [colKey]: total } }
  function buildTable(items, getCat) {
    const map = {} // cat -> { colKey -> total }
    items.forEach(item => {
      const cat = getCat(item)
      const dateWIB = toWIB(item._date)
      const col = getColKey(dateWIB)
      if (!map[cat]) map[cat] = {}
      map[cat][col] = (map[cat][col] || 0) + item.subtotal
    })
    // Urutkan berdasarkan total keseluruhan
    return Object.entries(map)
      .map(([cat, cols]) => ({ cat, cols, total: Object.values(cols).reduce((s, v) => s + v, 0) }))
      .sort((a, b) => b.total - a.total)
  }

  const salesItems = salesRaw.map(i => ({
    ...i,
    subtotal: i.subtotal,
    _date: i.transaction.createdAt,
  }))
  const expItems = expRaw.map(i => ({
    ...i,
    subtotal: i.subtotal,
    _date: i.expense.date,
  }))

  const salesTable = buildTable(salesItems, i => i.product?.category?.name || i.category || 'Lainnya')
  const expTable = buildTable(expItems, i => i.expenseItem?.category || i.category || 'Lainnya')

  // Hitung total per kolom
  function colTotals(table) {
    const totals = {}
    table.forEach(({ cols }) => {
      Object.entries(cols).forEach(([k, v]) => {
        totals[k] = (totals[k] || 0) + v
      })
    })
    return totals
  }

  return NextResponse.json({
    cols,
    salesTable,
    expTable,
    salesTotals: colTotals(salesTable),
    expTotals: colTotals(expTable),
    mode,
    month,
    year,
  })
}
