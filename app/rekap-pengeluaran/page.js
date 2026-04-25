'use client'
import { useEffect, useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')
const fmtDate = (d) => { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}` }
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export default function RekapPengeluaranPage() {
  const [data, setData] = useState({ rows: [], expenses: [], total: 0, totalPages: 1 })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [monthly, setMonthly] = useState(Array.from({ length: 12 }, (_, m) => ({ month: m + 1, total: 0 })))
  const [year, setYear] = useState(new Date().getFullYear())
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [editModal, setEditModal] = useState(null) // expense object
  const [editForm, setEditForm] = useState({ catatan: '', items: [] })
  const [saving, setSaving] = useState(false)
  const [exportModal, setExportModal] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState(false)

  async function loadMonthly(y = year) {
    setMonthlyLoading(true)
    try { const res = await api.get(`/admin/expenses?monthly=1&year=${y}`); setMonthly(res.data.monthly) }
    catch { } finally { setMonthlyLoading(false) }
  }

  async function load(p = page) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p })
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      const res = await api.get(`/admin/expenses?${params}`)
      setData(res.data)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page])
  useEffect(() => { loadMonthly() }, [])

  function handleFilter() { setPage(1); load(1) }
  function handleReset() { setFrom(''); setTo(''); setPage(1); setTimeout(() => load(1), 0) }

  async function handleDelete(expenseId) {
    if (!confirm('Hapus catatan pengeluaran ini beserta semua itemnya?')) return
    try {
      await api.delete(`/admin/expenses/${expenseId}`)
      load(page); loadMonthly()
    } catch (e) { alert(e.response?.data?.message || 'Gagal menghapus') }
  }

  function openEdit(expenseId) {
    const expense = data.expenses.find(e => e.id === expenseId)
    if (!expense) return
    setEditForm({
      catatan: expense.catatan || '',
      items: expense.items.map(i => ({ ...i, harga: String(i.harga), qty: String(i.qty) })),
    })
    setEditModal(expense)
  }

  async function handleSaveEdit() {
    if (!editForm.items.length) return alert('Minimal 1 item')
    setSaving(true)
    try {
      await api.patch(`/admin/expenses/${editModal.id}`, {
        catatan: editForm.catatan,
        items: editForm.items.map(i => ({
          expenseItemId: i.expenseItemId || null,
          name: i.name, keterangan: i.keterangan || '',
          satuan: i.satuan || '', harga: Number(i.harga), qty: Number(i.qty) || 1,
        })),
      })
      setEditModal(null); load(page); loadMonthly()
    } catch (e) { alert(e.response?.data?.message || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  async function exportCSV() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ page: 1 })
      if (exportFrom) params.append('from', exportFrom)
      if (exportTo) params.append('to', exportTo)
      // fetch all pages
      const first = await api.get(`/admin/expenses?${params}`)
      let rows = first.data.rows || []
      const totalPages = first.data.totalPages || 1
      for (let p = 2; p <= totalPages; p++) {
        const r = await api.get(`/admin/expenses?${params}&page=${p}`)
        rows = rows.concat(r.data.rows || [])
      }
      const header = 'Tanggal,Kategori,Item,Satuan,Kode,Keterangan,Harga,Qty,Total,Kasir'
      const lines = rows.map(r => [
        fmtDate(r.date), `"${r.category}"`, `"${r.name}"`, r.satuan, r.code,
        `"${r.keterangan}"`, r.harga, r.qty, r.subtotal, `"${r.cashier}"`
      ].join(','))
      const blob = new Blob(['\uFEFF' + header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `rekap-pengeluaran${exportFrom ? `-${exportFrom}` : ''}${exportTo ? `-sd-${exportTo}` : ''}.csv`; a.click()
      URL.revokeObjectURL(url)
      setExportModal(false)
    } catch { alert('Gagal export') } finally { setExporting(false) }
  }

  const grandTotal = data.rows.reduce((s, r) => s + r.subtotal, 0)
  const monthlyGrand = monthly.reduce((s, m) => s + m.total, 0)
  const maxMonthly = Math.max(...monthly.map(m => m.total), 1)

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Rekap Pengeluaran</div>
            <div className="topbar-sub">{data.total} catatan pengeluaran</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => { setExportFrom(from); setExportTo(to); setExportModal(true) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
        </div>

        <div className="content">
          {/* Rekap Bulanan */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Rekap Pengeluaran Bulanan</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => { const y = year - 1; setYear(y); loadMonthly(y) }}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '4px 10px', fontSize: '13px', color: 'var(--text2)', fontFamily: 'inherit' }}>‹</button>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', minWidth: '48px', textAlign: 'center' }}>{year}</span>
                <button onClick={() => { const y = year + 1; setYear(y); loadMonthly(y) }}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '4px 10px', fontSize: '13px', color: 'var(--text2)', fontFamily: 'inherit' }}>›</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px' }}>
              {monthly.map((m, i) => {
                const pct = Math.round((m.total / maxMonthly) * 100)
                const isCurrent = new Date().getFullYear() === year && new Date().getMonth() === i
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '100%', height: '60px', background: 'var(--surface2)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', border: '1px solid var(--border)' }}>
                      <div style={{ width: '100%', height: `${Math.max(pct, m.total > 0 ? 4 : 0)}%`, background: isCurrent ? 'var(--red)' : m.total > 0 ? '#FCA5A5' : 'transparent', borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: m.total > 0 ? 'var(--red)' : 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>
                      {m.total > 0 ? fmt(m.total) : '-'}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: isCurrent ? '700' : '500', color: isCurrent ? 'var(--red)' : 'var(--muted)' }}>{MONTHS[i]}</div>
                  </div>
                )
              })}
            </div>
            {monthlyGrand > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '24px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Total {year}: <span style={{ fontWeight: '800', color: 'var(--red)', fontSize: '13px' }}>{fmt(monthlyGrand)}</span></div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Rata-rata/bulan: <span style={{ fontWeight: '700', color: 'var(--text)' }}>{fmt(Math.round(monthlyGrand / (monthly.filter(m => m.total > 0).length || 1)))}</span></div>
              </div>
            )}
          </div>

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

          {/* Summary */}
          {!loading && data.rows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Total Pengeluaran</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--red)' }}>{fmt(grandTotal)}</div>
              </div>
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Jumlah Item</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{data.rows.length}</div>
              </div>
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Total Catatan</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{data.total}</div>
              </div>
            </div>
          )}

          {/* Tabel */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Kategori</th>
                    <th>Item</th>
                    <th>Satuan</th>
                    <th>Kode</th>
                    <th style={{ textAlign: 'right' }}>Harga</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Memuat...</td></tr>
                  ) : data.rows.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>💸</div>
                      <div>Belum ada data pengeluaran</div>
                    </td></tr>
                  ) : data.rows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                      <td>{r.category ? <span className="badge badge-blue">{r.category}</span> : null}</td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text)' }}>{r.name}</div>
                        {r.keterangan && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{r.keterangan}</div>}
                      </td>
                      <td>{r.satuan ? <span className="badge badge-gray">{r.satuan}</span> : null}</td>
                      <td>{r.code ? <span className="badge badge-gray" style={{ fontFamily: 'monospace' }}>{r.code}</span> : null}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{fmt(r.harga)}</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-purple">{r.qty}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--red)' }}>{fmt(r.subtotal)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #C7D4F0', padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => openEdit(r.expenseId)}>Edit</button>
                          <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => handleDelete(r.expenseId)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {!loading && data.rows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#FAFBFF' }}>
                      <td colSpan={7} style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--text2)', fontSize: '13px' }}>Total halaman ini</td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '800', color: 'var(--red)' }}>{fmt(grandTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {data.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)', background: '#FAFBFF' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{data.rows.length} item dari {data.total} catatan</span>
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

      {/* Modal Edit */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditModal(null) }}>
          <div className="card fade-in" style={{ width: '560px', maxWidth: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #D8E4F4, #E8EEF8)' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Edit Pengeluaran</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{fmtDate(editModal.date)}</div>
              </div>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {editForm.items.map((item, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{item.name}</div>
                    <button onClick={() => setEditForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}
                      style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #FECACA', background: 'var(--red-light)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input" placeholder="Keterangan" value={item.keterangan || ''}
                      onChange={e => setEditForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, keterangan: e.target.value } : it) }))}
                      style={{ flex: 1, fontSize: '12px' }} />
                    <input className="input" placeholder="Satuan" value={item.satuan || ''}
                      onChange={e => setEditForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, satuan: e.target.value } : it) }))}
                      style={{ width: '70px', fontSize: '12px' }} />
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>Rp</span>
                      <input className="input" type="number" value={item.harga}
                        onChange={e => setEditForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, harga: e.target.value } : it) }))}
                        style={{ width: '110px', paddingLeft: '28px', fontSize: '12px' }} />
                    </div>
                    <input className="input" type="number" min="1" value={item.qty}
                      onChange={e => setEditForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, qty: e.target.value } : it) }))}
                      style={{ width: '56px', textAlign: 'center', fontSize: '12px' }} />
                  </div>
                </div>
              ))}
              <div>
                <label className="label">Catatan</label>
                <textarea className="input" rows={2} value={editForm.catatan}
                  onChange={e => setEditForm(f => ({ ...f, catatan: e.target.value }))} style={{ resize: 'none', fontSize: '13px' }} />
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', background: 'var(--surface2)' }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditModal(null)}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Export */}
      {exportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setExportModal(false) }}>
          <div className="card fade-in" style={{ width: '420px', maxWidth: '96vw', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #D8E4F4, #E8EEF8)' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Export CSV</div>
              <button onClick={() => setExportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Kosongkan untuk export semua data.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div><label className="label">Dari Tanggal</label><input type="date" className="input" value={exportFrom} onChange={e => setExportFrom(e.target.value)} /></div>
                <div><label className="label">Sampai Tanggal</label><input type="date" className="input" value={exportTo} onChange={e => setExportTo(e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setExportModal(false)}>Batal</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={exportCSV} disabled={exporting}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {exporting ? 'Mengekspor...' : 'Download CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
