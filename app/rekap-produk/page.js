'use client'
import { useEffect, useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')
const fmtDate = (d) => {
  const date = new Date(d)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export default function RekapProdukPage() {
  const [data, setData] = useState({ rows: [], total: 0, totalPages: 1 })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

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

  function downloadTemplate() {
    const header = 'Tanggal,Kode Produk,Kategori,Nama Produk,QTY,Total'
    const contoh = [
      '23/04/2025,KP-001,Minuman,Kopi Susu,2,30000',
      '23/04/2025,MK-001,Makanan,Mie Goreng,1,20000',
      '24/04/2025,-,Minuman,Es Teh,3,15000',
    ].join('\n')
    const blob = new Blob(['\uFEFF' + header + '\n' + contoh], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template-import-penjualan.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true); setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/admin/product-sales/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(res.data)
      load(1)
    } catch (err) {
      setImportResult({ error: err.response?.data?.message || 'Gagal import' })
    } finally { setImporting(false); fileRef.current.value = '' }
  }
  function handleFilter() { setPage(1); load(1) }
  function handleReset() { setFrom(''); setTo(''); setPage(1); setTimeout(() => load(1), 0) }

  async function exportCSV() {
    try {
      const params = new URLSearchParams({ page: 1, limit: 99999 })
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      const res = await api.get(`/admin/product-sales?${params}`)
      const rows = res.data.rows || []
      const header = ['Tanggal', 'Kode Produk', 'Kategori', 'Nama Produk', 'QTY', 'Total']
      const lines = [
        header.join(','),
        ...rows.map(r => [
          fmtDate(r.date),
          r.code,
          `"${r.category}"`,
          `"${r.name}"`,
          r.qty,
          r.total,
        ].join(','))
      ]
      // BOM agar Excel bisa baca UTF-8
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rekap-produk${from ? `-${from}` : ''}${to ? `-sd-${to}` : ''}.csv`
      a.click()
      URL.revokeObjectURL(url)
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
            <div className="topbar-title">Produk Terjual</div>
            <div className="topbar-sub">{data.total} item terjual</div>
          </div>
          <button className="btn btn-ghost" onClick={downloadTemplate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Template
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
          <button className="btn" style={{ background: '#F0FDF4', color: '#10B981', border: '1px solid #A7F3D0' }}
            onClick={() => fileRef.current.click()} disabled={importing}>
            {importing
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Mengimpor...</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Import CSV</>}
          </button>
          <button className="btn btn-ghost" onClick={exportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
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

          {/* Hasil Import */}
          {importResult && (
            <div className="slide-down" style={{ marginBottom: '16px', padding: '14px 18px', borderRadius: '12px', border: `1px solid ${importResult.error ? '#FECACA' : '#A7F3D0'}`, background: importResult.error ? '#FEF2F2' : '#F0FDF4', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', marginTop: '1px' }}>{importResult.error ? '❌' : '✅'}</span>
                <div>
                  {importResult.error
                    ? <div style={{ fontSize: '13px', fontWeight: '600', color: '#EF4444' }}>{importResult.error}</div>
                    : <>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>Import berhasil</div>
                        <div style={{ fontSize: '12px', color: '#4A5578', display: 'flex', gap: '16px' }}>
                          <span>✚ <b>{importResult.created}</b> ditambahkan</span>
                          <span>⊘ <b>{importResult.skipped}</b> dilewati</span>
                        </div>
                        {importResult.errors?.length > 0 && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#EF4444' }}>
                            {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                          </div>
                        )}
                      </>}
                </div>
              </div>
              <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '2px', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}

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
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  )
}