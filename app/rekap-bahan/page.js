'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

export default function RekapBahanPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  async function load(overrideFrom, overrideTo) {
    setLoading(true)
    try {
      const f = overrideFrom !== undefined ? overrideFrom : from
      const t = overrideTo !== undefined ? overrideTo : to
      const params = f && t ? `?from=${f}&to=${t}` : ''
      const res = await api.get(`/admin/ingredient-usage${params}`)
      setRows(res.data)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalItems = rows.length

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Rekap Bahan Baku</div>
            <div className="topbar-sub">Total pemakaian bahan dari produk terjual</div>
          </div>
          {totalItems > 0 && (
            <span className="badge badge-blue" style={{ fontSize: '12px', padding: '5px 12px' }}>{totalItems} jenis bahan</span>
          )}
        </div>

        <div className="content">
          {/* Filter */}
          <div className="card" style={{ padding: '18px 24px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="label">Dari Tanggal</label>
              <input type="date" className="input" style={{ width: 'auto' }} value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Sampai Tanggal</label>
              <input type="date" className="input" style={{ width: 'auto' }} value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={load}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
              Tampilkan
            </button>
            {(from || to) && (
              <button className="btn btn-ghost" onClick={() => { setFrom(''); setTo(''); load('', '') }}>Reset</button>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94A3B8', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Memuat data...
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>No</th>
                    <th>Nama Bahan Baku</th>
                    <th>Satuan</th>
                    <th style={{ textAlign: 'right' }}>Total Terpakai</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const maxQty = rows[0]?.totalQty || 1
                    const pct = Math.round((r.totalQty / maxQty) * 100)
                    return (
                      <tr key={r.ingredientId}>
                        <td style={{ color: '#94A3B8', fontSize: '13px' }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: '600', color: '#0D1526', marginBottom: '5px' }}>{r.name}</div>
                          <div style={{ height: '4px', background: '#F1F5FB', borderRadius: '99px', overflow: 'hidden', maxWidth: '200px' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #2563EB, #60A5FA)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                          </div>
                        </td>
                        <td><span className="badge badge-blue">{r.unit}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '800', fontSize: '16px', color: '#10B981' }}>
                            {r.totalQty % 1 === 0 ? r.totalQty : r.totalQty.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '4px' }}>{r.unit}</span>
                        </td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                      <div>Belum ada data pemakaian bahan baku</div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
