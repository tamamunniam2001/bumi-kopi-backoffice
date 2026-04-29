'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const fmt = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899']

const DualTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0F1729', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', minWidth: '200px' }}>
      <p style={{ fontSize: '11px', color: '#8896B3', marginBottom: '8px', fontWeight: '600' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: i < payload.length - 1 ? '5px' : 0 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#CBD5E1' }}>{p.name}:</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function FilterTabs({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', borderRadius: '10px', padding: '3px' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '5px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: '600', fontFamily: 'inherit',
            background: value === opt.value ? '#fff' : 'transparent',
            color: value === opt.value ? '#0F1729' : '#8896B3',
            boxShadow: value === opt.value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function CategoryTable({ title, data, colorStart }) {
  const total = data.reduce((s, d) => s + (d.total || 0), 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#8896B3', fontSize: '13px' }}>Belum ada data</div>
      ) : (
        <>
          {data.map((item, i) => {
            const pct = total > 0 ? Math.round((item.total / total) * 100) : 0
            const color = PALETTE[(i + colorStart) % PALETTE.length]
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1E2A3B' }}>{item.category}</span>
                    {item.qty != null && (
                      <span style={{ fontSize: '11px', color: '#8896B3', background: '#F1F5F9', padding: '1px 7px', borderRadius: '20px' }}>{item.qty} item</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F1729' }}>{fmt(item.total)}</span>
                    <span style={{ fontSize: '11px', color: '#8896B3', marginLeft: '6px' }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
              </div>
            )
          })}
          <div style={{ paddingTop: '14px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#8896B3' }}>Total</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F1729' }}>{fmt(total)}</span>
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [time, setTime] = useState('')
  const [salesFilter, setSalesFilter] = useState(null)   // null = bulan ini, 'year' = tahunan, 0-11 = bulan
  const [expFilter, setExpFilter] = useState(null)
  const pathname = usePathname()

  useEffect(() => {
    const load = () => api.get('/admin/dashboard').then(r => {
      setData(r.data)
      setSalesFilter(r.data.currentMonthIndex)
      setExpFilter(r.data.currentMonthIndex)
    }).catch(console.error)
    load()
    const tData = setInterval(load, 30000)
    setTime(new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    const tTime = setInterval(() => setTime(new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })), 60000)
    return () => { clearInterval(tData); clearInterval(tTime) }
  }, [pathname])

  if (!data) return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8896B3' }}>Memuat data...</div>
      </main>
    </div>
  )

  const dailyChart = data.dailyChart || []
  const monthlyChart = data.monthlyChart || []
  const months = data.months || []
  const year = data.currentYear || new Date().getFullYear()

  // Data rekap kategori berdasarkan filter
  const salesData = salesFilter === 'year' ? (data.salesByYear || []) : (data.salesByMonth?.[salesFilter] || [])
  const expData = expFilter === 'year' ? (data.expenseByYear || []) : (data.expenseByMonth?.[expFilter] || [])

  // Total pengeluaran bulan ini untuk summary chart
  const totalExpMonth = dailyChart.reduce((s, d) => s + (d.expense || 0), 0)

  // Opsi filter: semua bulan + tahunan
  const filterOptions = [
    ...months.map((m, i) => ({ label: m, value: i })),
    { label: `${year}`, value: 'year' },
  ]

  const cardStyle = { background: '#fff', borderRadius: '20px', padding: '28px', border: '1px solid #E2E8F8', boxShadow: '0 2px 16px rgba(15,23,41,0.06)', marginBottom: '20px' }

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Dashboard</div>
            <div className="topbar-sub">{time}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#ECFDF5', padding: '7px 14px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#10B981' }}>Live</span>
          </div>
        </div>

        <div className="content">

          {/* ── 1. Area Chart Pendapatan vs Pengeluaran Bulan Ini ── */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729' }}>Pendapatan vs Pengeluaran</h2>
                <p style={{ fontSize: '12px', color: '#8896B3', marginTop: '3px' }}>Harian — {data.currentMonth} {year}</p>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                {[
                  { color: '#6366F1', label: 'Pendapatan', value: data.month?.revenue || 0 },
                  { color: '#EF4444', label: 'Pengeluaran', value: totalExpMonth },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '2px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                      <span style={{ fontSize: '11px', color: '#8896B3', fontWeight: '600' }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F1729' }}>{fmt(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyChart} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8896B3' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#8896B3' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<DualTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="#6366F1" strokeWidth={2.5} fill="url(#gRev)" dot={false} activeDot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#EF4444" strokeWidth={2} fill="url(#gExp)" dot={false} activeDot={{ r: 5, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── 2. Bar Chart Bulanan ── */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729' }}>Pendapatan vs Pengeluaran Bulanan</h2>
                <p style={{ fontSize: '12px', color: '#8896B3', marginTop: '3px' }}>Perbandingan tiap bulan — {year}</p>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[{ color: '#6366F1', label: 'Pendapatan' }, { color: '#F97316', label: 'Pengeluaran' }].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color }} />
                    <span style={{ fontSize: '12px', color: '#8896B3', fontWeight: '600' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChart} margin={{ top: 5, right: 5, bottom: 0, left: 10 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8896B3' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#8896B3' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<DualTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
                <Bar dataKey="revenue" name="Pendapatan" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── 3. Rekap Kategori ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* Rekap Penjualan */}
            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F8', boxShadow: '0 2px 16px rgba(15,23,41,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729' }}>Rekap Penjualan per Kategori</h2>
                  <p style={{ fontSize: '12px', color: '#8896B3', marginTop: '3px' }}>
                    {salesFilter === 'year' ? `Tahun ${year}` : `${months[salesFilter]} ${year}`}
                  </p>
                </div>
              </div>
              {/* Filter scroll */}
              <div style={{ overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', gap: '6px', width: 'max-content' }}>
                  {filterOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSalesFilter(opt.value)}
                      style={{
                        padding: '5px 12px', borderRadius: '20px', border: '1.5px solid',
                        borderColor: salesFilter === opt.value ? '#6366F1' : '#E2E8F8',
                        background: salesFilter === opt.value ? '#6366F1' : '#fff',
                        color: salesFilter === opt.value ? '#fff' : '#8896B3',
                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <CategoryTable data={salesData} colorStart={0} />
            </div>

            {/* Rekap Pengeluaran */}
            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F8', boxShadow: '0 2px 16px rgba(15,23,41,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729' }}>Rekap Pengeluaran per Kategori</h2>
                  <p style={{ fontSize: '12px', color: '#8896B3', marginTop: '3px' }}>
                    {expFilter === 'year' ? `Tahun ${year}` : `${months[expFilter]} ${year}`}
                  </p>
                </div>
              </div>
              {/* Filter scroll */}
              <div style={{ overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', gap: '6px', width: 'max-content' }}>
                  {filterOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setExpFilter(opt.value)}
                      style={{
                        padding: '5px 12px', borderRadius: '20px', border: '1.5px solid',
                        borderColor: expFilter === opt.value ? '#F97316' : '#E2E8F8',
                        background: expFilter === opt.value ? '#F97316' : '#fff',
                        color: expFilter === opt.value ? '#fff' : '#8896B3',
                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <CategoryTable data={expData} colorStart={3} />
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
