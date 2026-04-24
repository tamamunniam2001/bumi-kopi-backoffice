'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = (d) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

export default function RekapPengeluaranPage() {
  const [data, setData] = useState({ expenses: [], total: 0, totalPages: 1 })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page })
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      const res = await api.get(`/admin/expenses?${params}`)
      setData(res.data)
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page])

  const grandTotal = data.expenses.reduce((s, e) => s + e.total, 0)

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Rekap Pengeluaran</div>
            <div className="topbar-sub">{data.total} catatan pengeluaran</div>
          </div>
        </div>

        <div className="content">
          {/* Filter */}
          <div className="card" style={{ padding: '18px 24px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="label">Dari Tanggal</label>
              <input type="date" className="input" style={{ width: 'auto' }} value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Sampai Tanggal</label>
              <input type="date" className="input" style={{ width: 'auto' }} value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => { setPage(1); load() }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Filter
            </button>
            {(from || to) && <button className="btn btn-ghost" onClick={() => { setFrom(''); setTo(''); setPage(1); setTimeout(load, 0) }}>Reset</button>}
          </div>

          {!loading && data.expenses.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Total Pengeluaran (halaman ini)</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--red)' }}>{fmt(grandTotal)}</div>
              </div>
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Jumlah Catatan</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{data.total}</div>
              </div>
            </div>
          )}

          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>{['Tanggal', 'Waktu', 'Kasir', 'Item', 'Total', 'Catatan', ''].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Memuat...</td></tr>
                ) : data.expenses.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>💸</div>
                    <div>Belum ada data pengeluaran</div>
                  </td></tr>
                ) : data.expenses.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: '600' }}>{fmtDate(e.date)}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '12px' }}>{fmtTime(e.date)}</td>
                    <td style={{ color: 'var(--text2)' }}>{e.cashier?.name || '-'}</td>
                    <td><span className="badge badge-blue">{e.items?.length} item</span></td>
                    <td style={{ fontWeight: '700', color: 'var(--red)' }}>{fmt(e.total)}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.catatan || '-'}</td>
                    <td>
                      <button className="btn" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #C7D4F0', padding: '5px 12px', fontSize: '12px' }}
                        onClick={() => setSelected(e)}>Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)', background: '#FAFBFF' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{data.expenses.length} dari {data.total} catatan</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} disabled={page === 1} onClick={() => setPage(page - 1)}>‹ Prev</button>
                  <span style={{ fontSize: '13px', fontWeight: '600', padding: '0 8px' }}>{page} / {data.totalPages}</span>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>Next ›</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
            <div className="card fade-in" style={{ width: '440px', maxWidth: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #D8E4F4, #E8EEF8)' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Detail Pengeluaran</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{fmtDate(selected.date)} · {fmtTime(selected.date)} · {selected.cashier?.name}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'rgba(74,124,199,0.1)', border: '1px solid #C0D0E8', borderRadius: '8px', cursor: 'pointer', color: 'var(--text2)', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '14px' }}>
                  {selected.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderBottom: i < selected.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{item.name}</div>
                        {item.keterangan && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.keterangan}</div>}
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{fmt(item.harga)} × {item.qty}</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--red)' }}>{fmt(item.subtotal)}</div>
                    </div>
                  ))}
                </div>
                {selected.catatan && (
                  <div style={{ padding: '10px 14px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '13px', color: '#78350F' }}>
                    {selected.catatan}
                  </div>
                )}
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Total</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--red)' }}>{fmt(selected.total)}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
