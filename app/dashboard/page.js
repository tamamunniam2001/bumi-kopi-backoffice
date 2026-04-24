'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')
const fmtShort = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}jt` : n >= 1000 ? `${(n / 1000).toFixed(0)}rb` : String(n)
const fmtTime = (d) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

function StatCard({ label, value, sub, icon, color, trend }) {
  const colors = {
    blue: { bg: 'linear-gradient(135deg, #2563EB, #3B82F6)', light: '#EFF4FF', text: '#2563EB', shadow: 'rgba(37,99,235,0.25)' },
    green: { bg: 'linear-gradient(135deg, #10B981, #34D399)', light: '#ECFDF5', text: '#10B981', shadow: 'rgba(16,185,129,0.25)' },
    orange: { bg: 'linear-gradient(135deg, #F59E0B, #FBBF24)', light: '#FFFBEB', text: '#F59E0B', shadow: 'rgba(245,158,11,0.25)' },
    purple: { bg: 'linear-gradient(135deg, #8B5CF6, #A78BFA)', light: '#F5F3FF', text: '#8B5CF6', shadow: 'rgba(139,92,246,0.25)' },
    red: { bg: 'linear-gradient(135deg, #EF4444, #F87171)', light: '#FEF2F2', text: '#EF4444', shadow: 'rgba(239,68,68,0.25)' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className="stat-card">
      <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: c.light, borderRadius: '0 16px 0 80px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ width: '44px', height: '44px', background: c.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: `0 4px 12px ${c.shadow}` }}>{icon}</div>
        {trend !== null && trend !== undefined && (
          <span style={{ fontSize: '12px', fontWeight: '600', color: trend >= 0 ? '#10B981' : '#EF4444', background: trend >= 0 ? '#ECFDF5' : '#FEF2F2', padding: '3px 8px', borderRadius: '20px' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F1729', letterSpacing: '-0.5px', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#8896B3', fontWeight: '500' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: c.text, fontWeight: '600', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F8', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 4px 16px rgba(15,23,41,0.1)' }}>
      <p style={{ fontSize: '12px', color: '#8896B3', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: '700', color: '#2563EB' }}>{fmtShort(payload[0]?.value)}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(() => {
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem('dashboard_cache') || 'null') } catch { return null }
  })
  const [time, setTime] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    const fetch = () => api.get('/admin/dashboard').then(r => {
      setData(r.data)
      localStorage.setItem('dashboard_cache', JSON.stringify(r.data))
    }).catch(console.error)

    fetch()
    const tData = setInterval(fetch, 30000)
    setTime(new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    const tTime = setInterval(() => setTime(new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })), 60000)
    return () => { clearInterval(tData); clearInterval(tTime) }
  }, [pathname])

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
          {!data ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#8896B3' }}>Memuat data...</div>
          ) : (
            <>
              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <StatCard icon="💰" label="Pendapatan Hari Ini" value={fmt(data.today.revenue)} sub={`${data.today.transactions} transaksi`} color="blue" />
                <StatCard icon="📈" label="Pendapatan Bulan Ini" value={fmt(data.month.revenue)} sub={`${data.month.transactions} transaksi`} color="green" trend={data.month.trend} />
                <StatCard icon="☕" label="Produk Aktif" value={data.totalProducts} sub="jenis produk" color="orange" />
                <StatCard icon="👥" label="Karyawan Aktif" value={data.totalEmployees} sub="staff terdaftar" color="purple" />
              </div>

              {/* Metode Pembayaran Hari Ini */}
              <div className="card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>Metode Pembayaran Hari Ini</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { key: 'CASH', label: 'Cash', color: '#2A9D6E', bg: '#E8F7F1', border: '#A7DFC8' },
                    { key: 'QRIS', label: 'QRIS', color: '#6B5BAF', bg: '#EEEAF8', border: '#C8C0E8' },
                    { key: 'TRANSFER', label: 'Transfer', color: '#C47D1A', bg: '#FDF4E3', border: '#F0D090' },
                    { key: 'NONTUNAI', label: 'Non-Tunai', color: '#4A7CC7', bg: '#EBF1FB', border: '#C0D0E8' },
                  ].map(m => (
                    <div key={m.key} style={{ background: m.bg, borderRadius: '10px', padding: '14px 16px', border: `1px solid ${m.border}` }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: '600' }}>{m.label}</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: m.color }}>{fmt(data.payMethods?.[m.key] || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(15,23,41,0.06)', border: '1px solid #E2E8F8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729' }}>Pendapatan 7 Hari</h3>
                      <p style={{ fontSize: '12px', color: '#8896B3', marginTop: '2px' }}>Tren penjualan mingguan</p>
                    </div>
                    <span style={{ fontSize: '12px', background: '#EFF4FF', color: '#2563EB', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', border: '1px solid #C7D4F0' }}>7 Hari</span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8896B3' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#8896B3' }} axisLine={false} tickLine={false} width={45} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fill="url(#colorRevenue)" dot={{ fill: '#2563EB', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#2563EB', stroke: '#EFF4FF', strokeWidth: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(15,23,41,0.06)', border: '1px solid #E2E8F8' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729' }}>Jumlah Transaksi</h3>
                    <p style={{ fontSize: '12px', color: '#8896B3', marginTop: '2px' }}>Per hari (7 hari terakhir)</p>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8896B3' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#8896B3' }} axisLine={false} tickLine={false} width={25} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {/* Transaksi Terbaru */}
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(15,23,41,0.06)', border: '1px solid #E2E8F8' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729', marginBottom: '16px' }}>Transaksi Terbaru</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.recentTransactions.length === 0 && <p style={{ color: '#8896B3', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Belum ada transaksi</p>}
                    {data.recentTransactions.map(tx => (
                      <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8FAFF', borderRadius: '10px', border: '1px solid #F0F4FF' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F1729' }}>{tx.cashier.name}</div>
                          <div style={{ fontSize: '11px', color: '#8896B3', marginTop: '1px', fontFamily: 'monospace' }}>{tx.invoiceNo}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#2563EB' }}>{fmt(tx.total)}</div>
                          <div style={{ fontSize: '11px', color: '#8896B3', marginTop: '1px' }}>{fmtTime(tx.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Produk Terlaris */}
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(15,23,41,0.06)', border: '1px solid #E2E8F8' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729', marginBottom: '4px' }}>Produk Terlaris</h3>
                  <p style={{ fontSize: '12px', color: '#8896B3', marginBottom: '16px' }}>Berdasarkan total penjualan</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.topProducts.length === 0 && <p style={{ color: '#8896B3', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Belum ada data</p>}
                    {data.topProducts.map((p, i) => {
                      const maxRev = data.topProducts[0]?.revenue || 1
                      const pct = Math.round((p.revenue / maxRev) * 100)
                      const colors = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE']
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '20px', height: '20px', background: colors[i], borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: '700', flexShrink: 0 }}>{i + 1}</span>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F1729', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{p.name}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563EB', flexShrink: 0 }}>{fmtShort(p.revenue)}</span>
                          </div>
                          <div style={{ height: '5px', background: '#F0F4FF', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: colors[i], borderRadius: '99px', transition: 'width 0.8s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Absensi Hari Ini */}
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(15,23,41,0.06)', border: '1px solid #E2E8F8' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F1729', marginBottom: '4px' }}>Absensi Hari Ini</h3>
                  <p style={{ fontSize: '12px', color: '#8896B3', marginBottom: '16px' }}>{data.absensiToday?.length || 0} catatan absensi</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(!data.absensiToday || data.absensiToday.length === 0) && (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: '#8896B3', fontSize: '13px' }}>Belum ada absensi hari ini</div>
                    )}
                    {data.absensiToday?.map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: a.type === 'OPENING' ? '#EBF1FB' : '#FEF2F2', borderRadius: '10px', border: `1px solid ${a.type === 'OPENING' ? '#C0D0E8' : '#FECACA'}` }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F1729' }}>{a.name}</div>
                          {a.type === 'OPENING' && a.kasAwal > 0 && (
                            <div style={{ fontSize: '11px', color: '#8896B3', marginTop: '1px' }}>Kas: {fmt(a.kasAwal)}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: a.type === 'OPENING' ? 'var(--accent)' : 'var(--red)', color: '#fff' }}>
                            {a.type}
                          </span>
                          <div style={{ fontSize: '11px', color: '#8896B3', marginTop: '3px' }}>{fmtTime(a.time)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
