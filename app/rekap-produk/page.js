'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'
import * as XLSX from 'xlsx'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function RekapProdukPage() {
  const [data, setData] = useState({ rows: [], total: 0, totalPages: 1 })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  async function load(p = page) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p })
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      const res = await api.get(`/admin/product-sales?${params}`)
      setData(res.data)
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page])

  function handleFilter() { setPage(1); load(1) }
  function handleReset() { setFrom(''); setTo(''); setPage(1); setTimeout(() => load(1), 0) }

  async function exportExcel() {
    // Fetch semua data tanpa pagination untuk export
    try {
      const params = new URLSearchParams({ page: 1, limit: 99999 })
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      const res = await api.get(`/admin/product-sales?${params}`)
      const rows = res.data.rows || []
      const ws = XLSX.utils.aoa_to_sheet([
        ['Tanggal', 'Kode Produk', 'Kategori', 'Nama Produk', 'QTY', 'Total'],
        ...rows.map(r => [fmtDate(r.date), r.code, r.category, r.name, r.qty, r.total]),
      ])
      ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 28 }, { wch: 8 }, { wch: 16 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Produk')
      XLSX.writeFile(wb, `rekap-produk${from ? `-${from}` : ''}${to ? `-sd-${to}` : ''}.xlsx`)
    } catch { alert('Gagal export') }
  }

  // Hitung summary
  const totalQty = data.rows.reduce((s, r) => s + r.qty, 0)
  const totalRevenue = data.rows.reduce((s, r) => s + r.total, 0)

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Rekap Transaksi Produk</div>
            <div className="topbar-sub">{data.total} item terjual</div>
          </div>
          <button className="btn btn-ghost" onClick={exportExcel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Excel
          </button>
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
            <button className="btn btn-primary" onClick={handleFilter}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Filter
            </button>
            {(from || to) && <button className="btn btn-ghost" onClick={handleReset}>Reset</button>}
          </div>

          {/* Summary cards */}
          {!loading && data.rows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Total Item (halaman ini)</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{totalQty.toLocaleString('id-ID')}</div>
              </div>
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Total Pendapatan (halaman ini)</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent)' }}>{fmt(totalRevenue)}</div>
              </div>
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Total Baris Data</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{data.total.toLocaleString('id-ID')}</div>
              </div>
            </div>
          )}

          {/* Tabel */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kode Produk</th>
                  <th>Kategori</th>
                  <th>Nama Produk</th>
                  <th style={{ textAlign: 'center' }}>QTY</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Memuat...</td></tr>
                ) : data.rows.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                    <div>Belum ada data transaksi produk</div>
                  </td></tr>
                ) : data.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text2)', fontSize: '13px', whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                    <td>
                      {r.code !== '-'
                        ? <span className="badge badge-blue" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.code}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>}
                    </td>
                    <td><span className="badge badge-gray">{r.category}</span></td>
                    <td style={{ fontWeight: '600', color: 'var(--text)' }}>{r.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-purple">{r.qty}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent)' }}>{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              {!loading && data.rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#FAFBFF' }}>
                    <td colSpan={4} style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--text2)', fontSize: '13px' }}>
                      Total halaman ini
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: '800', color: 'var(--text)' }}>{totalQty}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '800', color: 'var(--accent)' }}>{fmt(totalRevenue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)', background: '#FAFBFF' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {((page - 1) * 50) + 1}–{Math.min(page * 50, data.total)} dari {data.total} baris
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} disabled={page === 1} onClick={() => setPage(page - 1)}>‹ Prev</button>
                  <span style={{ fontSize: '13px', fontWeight: '600', padding: '0 8px' }}>{page} / {data.totalPages}</span>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>Next ›</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
