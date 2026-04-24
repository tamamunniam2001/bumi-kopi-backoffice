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
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef(null)

  async function load(p = page) {
    setLoading(true)
    setSelected(new Set())
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

  // ── Select ──
  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === data.rows.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(data.rows.map(r => r.id)))
    }
  }

  // ── Delete single ──
  async function handleDelete(id) {
    if (!confirm('Hapus item ini?')) return
    try {
      await api.delete(`/admin/product-sales/${id}`)
      setData(prev => ({ ...prev, rows: prev.rows.filter(r => r.id !== id), total: prev.total - 1 }))
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
    } catch (e) { alert(e.response?.data?.message || 'Gagal menghapus') }
  }

  // ── Delete bulk ──
  async function handleDeleteSelected() {
    if (!confirm(`Hapus ${selected.size} item yang dipilih?`)) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map(id => api.delete(`/admin/product-sales/${id}`)))
      setData(prev => ({
        ...prev,
        rows: prev.rows.filter(r => !selected.has(r.id)),
        total: prev.total - selected.size,
      }))
      setSelected(new Set())
    } catch (e) { alert(e.response?.data?.message || 'Gagal menghapus') }
    finally { setDeleting(false) }
  }

  // ── Template ──
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

  // ── Import dengan progress ──
  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true); setImportResult(null); setImportProgress(0)

    // Simulasi progress upload (karena XHR tidak expose server processing progress)
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 85) { clearInterval(progressInterval); return prev }
        return prev + Math.random() * 15
      })
    }, 200)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/admin/product-sales/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      clearInterval(progressInterval)
      setImportProgress(100)
      setTimeout(() => {
        setImportResult(res.data)
        setImporting(false)
        setImportProgress(0)
        load(1)
      }, 400)
    } catch (err) {
      clearInterval(progressInterval)
      setImportProgress(0)
      setImportResult({ error: err.response?.data?.message || 'Gagal import' })
      setImporting(false)
    } finally {
      fileRef.current.value = ''
    }
  }

  // ── Export CSV ──
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
        ...rows.map(r => [fmtDate(r.date), r.code, `"${r.category}"`, `"${r.name}"`, r.qty, r.total].join(','))
      ]
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rekap-produk${from ? `-${from}` : ''}${to ? `-sd-${to}` : ''}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Gagal export') }
  }

  const totalQty = data.rows.reduce((s, r) => s + r.qty, 0)
  const totalRevenue = data.rows.reduce((s, r) => s + r.total, 0)
  const allSelected = data.rows.length > 0 && selected.size === data.rows.length
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Produk Terjual</div>
            <div className="topbar-sub">{data.total} item terjual</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={downloadTemplate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Template
            </button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
            <button className="btn" style={{ background: '#F0FDF4', color: '#10B981', border: '1px solid #A7F3D0' }}
              onClick={() => fileRef.current.click()} disabled={importing}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import CSV
            </button>
            <button className="btn btn-ghost" onClick={exportCSV}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Progress Bar Import */}
        {importing && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
            <div style={{ height: '3px', background: '#E2E8F0' }}>
              <div style={{ height: '100%', width: `${importProgress}%`, background: 'linear-gradient(90deg, #10B981, #34D399)', transition: 'width 0.2s ease', borderRadius: '0 2px 2px 0' }} />
            </div>
          </div>
        )}

        {importing && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, backdropFilter: 'blur(4px)' }}>
            <div className="card fade-in" style={{ padding: '32px 40px', textAlign: 'center', minWidth: '320px' }}>
              <div style={{ width: '56px', height: '56px', background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid #A7F3D0' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Mengimpor Data...</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>Mohon tunggu, sedang memproses file CSV</div>
              <div style={{ background: '#F1F5F9', borderRadius: '99px', height: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${importProgress}%`, background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: '99px', transition: 'width 0.2s ease' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#10B981' }}>{Math.round(importProgress)}%</div>
            </div>
          </div>
        )}

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

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="slide-down" style={{ marginBottom: '12px', padding: '10px 16px', background: 'var(--accent-light)', border: '1px solid #C7D4F0', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>{selected.size} item dipilih</span>
              <button className="btn btn-danger" style={{ padding: '5px 14px', fontSize: '12px' }}
                onClick={handleDeleteSelected} disabled={deleting}>
                {deleting ? 'Menghapus...' : `Hapus ${selected.size} Item`}
              </button>
              <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}
                onClick={() => setSelected(new Set())}>
                Batal
              </button>
            </div>
          )}

          {/* Tabel */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleSelectAll}
                      style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
                  </th>
                  <th>Tanggal</th>
                  <th>Kode Produk</th>
                  <th>Kategori</th>
                  <th>Nama Produk</th>
                  <th style={{ textAlign: 'center' }}>QTY</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Memuat...</td></tr>
                ) : data.rows.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                    <div>Belum ada data transaksi produk</div>
                  </td></tr>
                ) : data.rows.map((r, i) => (
                  <tr key={i} style={{ background: selected.has(r.id) ? 'var(--accent-light)' : undefined }}>
                    <td>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
                    </td>
                    <td style={{ color: 'var(--text2)', fontSize: '13px', whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                    <td>
                      {r.code !== '-'
                        ? <span className="badge badge-blue" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.code}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>}
                    </td>
                    <td><span className="badge badge-gray">{r.category}</span></td>
                    <td style={{ fontWeight: '600', color: 'var(--text)' }}>{r.name}</td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-purple">{r.qty}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent)' }}>{fmt(r.total)}</td>
                    <td>
                      <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleDelete(r.id)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {!loading && data.rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#FAFBFF' }}>
                    <td colSpan={5} style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--text2)', fontSize: '13px' }}>
                      Total halaman ini
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: '800', color: 'var(--text)' }}>{totalQty}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '800', color: 'var(--accent)' }}>{fmt(totalRevenue)}</td>
                    <td />
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
