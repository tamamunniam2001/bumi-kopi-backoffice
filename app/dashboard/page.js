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
    <div style={{ background: '#0F1729', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', minWidth: '220px' }}>
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

function CategoryTable({ data, colorStart }) {
  const total = data.reduce((s, d) => s + (d.total || 0), 0)
  if (data.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#8896B3', fontSize: '13px' }}>Belum ada data</div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [catData, setCatData] = useState(null)
  const [time, setTime] = useState('')
  const [salesFilter, setSalesFilter] = useState(null)
  const [expFilter, setExpFilter] = useState(null)
  const pathname = usePathname()

  useEffect(() => {
    // Load chart utama dulu (cepat)
    api.get('/admin/dashboard').then(r => {
      setData(r.data)
      setSalesFilter(r.data.currentMonthIndex)
      setExpFilter(r.data.currentMonthIndex)
    }).catch(console.error)

    // Load rekap kategori setelah (lazy)
    api.get('/admin/dashboard-categories').then(r => setCatData(r.data)).catch(console.error)

    setTime(new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    const tTime = setInterval(() => setTime(new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })), 60000)
    return () => clearInterval(tTime)
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
  const totalExpMonth = dailyChart.reduce((s, d) => s + (d.expense || 0), 0)

  const salesData = salesFilter === 'year'
    ? (catData?.salesByYear || [])
    : (catData?.salesByMonth?.[salesFilter] || [])
  const expData = expFilter === 'year'
    ? (catData?.expenseByYear || [])
    : (catData?.expenseByMonth?.[expFilter] || [])

  const filterOptions = [
    ...months.map((m, i) => ({ label: m, value: i })),
    { label: `${year}`, value: 'year' },
  ]

  const cardStyle = {
    background: '#fff', borderRadius: '20px', padding: '28px',
    border: '1px solid #E2E8F8', boxShadow: '0 2px 16px rgba(15,23,41,0.06)', marginBottom: '20px'
  }

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

          {/* ── 1. Area Chart Harian ── */}
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
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#8896B3' }} axisLine={false} tickLine={false} width={100} />
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
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#8896B3' }} axisLine={false} tickLine={false} width={100} />
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
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729' }}>Rekap Penjualan</h2>
                  <p style={{ fontSize: '12px', color: '#8896B3', marginTop: '3px' }}>per Kategori</p>
                </div>
                <select
                  value={salesFilter ?? ''}
                  onChange={e => setSalesFilter(e.target.value === 'year' ? 'year' : Number(e.target.value))}
                  style={{
                    padding: '7px 32px 7px 12px', borderRadius: '10px',
                    border: '1.5px solid #E2E8F8', background: '#F8FAFF',
                    color: '#1E2A3B', fontSize: '12px', fontWeight: '600',
                    fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                    WebkitAppearance: 'none', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238896B3' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                  }}
                >
                  {filterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {!catData ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#8896B3', fontSize: '13px' }}>Memuat rekap...</div>
              ) : (
                <CategoryTable data={salesData} colorStart={0} />
              )}
            </div>

            {/* Rekap Pengeluaran */}
            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F8', boxShadow: '0 2px 16px rgba(15,23,41,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729' }}>Rekap Pengeluaran</h2>
                  <p style={{ fontSize: '12px', color: '#8896B3', marginTop: '3px' }}>per Kategori</p>
                </div>
                <select
                  value={expFilter ?? ''}
                  onChange={e => setExpFilter(e.target.value === 'year' ? 'year' : Number(e.target.value))}
                  style={{
                    padding: '7px 32px 7px 12px', borderRadius: '10px',
                    border: '1.5px solid #E2E8F8', background: '#F8FAFF',
                    color: '#1E2A3B', fontSize: '12px', fontWeight: '600',
                    fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                    WebkitAppearance: 'none', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238896B3' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                  }}
                >
                  {filterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {!catData ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#8896B3', fontSize: '13px' }}>Memuat rekap...</div>
              ) : (
                <CategoryTable data={expData} colorStart={3} />
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
