'use client'
import { useEffect, useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const empty = { code: '', name: '', category: '', satuan: '' }

export default function ExpenseSettingsPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)

  async function load() {
    const res = await api.get('/admin/expense-items')
    setItems(res.data)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (editId) await api.put(`/admin/expense-items/${editId}`, form)
    else await api.post('/admin/expense-items', form)
    setForm(empty); setEditId(null); load()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus item ini?')) return
    await api.delete(`/admin/expense-items/${id}`); load()
  }

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))]

  function downloadTemplate() {
    const header = 'Kode,Nama,Kategori,Satuan'
    const contoh = [
      'BHN-001,Gula Pasir,Bahan Baku,kg',
      'BHN-002,Kopi Robusta,Bahan Baku,kg',
      'OPS-001,Air Isi Ulang,Operasional,galon',
      ',Plastik Kresek,Operasional,pcs',
    ].join('\n')
    const blob = new Blob(['\uFEFF' + header + '\n' + contoh], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template-item-pengeluaran.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true); setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/admin/expense-items/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(res.data)
      load()
    } catch (err) {
      setImportResult({ error: err.response?.data?.message || 'Gagal import' })
    } finally {
      setImporting(false)
      fileRef.current.value = ''
    }
  }

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Item Pengeluaran</div>
            <div className="topbar-sub">Kelola daftar item pengeluaran</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={downloadTemplate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Template CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
            <button className="btn" style={{ background: '#F0FDF4', color: '#10B981', border: '1px solid #A7F3D0' }}
              onClick={() => fileRef.current.click()} disabled={importing}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {importing ? 'Mengimpor...' : 'Import CSV'}
            </button>
          </div>
        </div>

        <div className="content">
          {importResult && (
            <div className="slide-down" style={{ marginBottom: '16px', padding: '14px 18px', borderRadius: '12px', border: `1px solid ${importResult.error ? '#FECACA' : '#A7F3D0'}`, background: importResult.error ? '#FEF2F2' : '#F0FDF4', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px' }}>{importResult.error ? '❌' : '✅'}</span>
                <div>
                  {importResult.error
                    ? <div style={{ fontSize: '13px', fontWeight: '600', color: '#EF4444' }}>{importResult.error}</div>
                    : <>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>Import selesai</div>
                        <div style={{ fontSize: '12px', color: '#4A5578', display: 'flex', gap: '16px' }}>
                          <span>✚ <b>{importResult.created}</b> berhasil</span>
                          <span>⊘ <b>{importResult.skipped}</b> dilewati</span>
                          <span>∑ <b>{importResult.total}</b> total</span>
                        </div>
                        {importResult.errors?.length > 0 && (
                          <div style={{ marginTop: '8px', maxHeight: '100px', overflowY: 'auto', background: '#FEF2F2', borderRadius: '6px', padding: '8px 10px', border: '1px solid #FECACA' }}>
                            {importResult.errors.map((e, i) => <div key={i} style={{ fontSize: '11px', color: '#EF4444' }}>{e}</div>)}
                          </div>
                        )}
                      </>}
                </div>
              </div>
              <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
            {/* Form */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '16px', color: 'var(--text)' }}>
                {editId ? 'Edit Item' : 'Tambah Item'}
              </div>
              <form onSubmit={handleSubmit}>
                <label className="label">Kode <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                <input className="input" placeholder="100" value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })} style={{ marginBottom: '12px' }} />
                <label className="label">Nama Item</label>
                <input className="input" placeholder="Air Isi Ulang" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required style={{ marginBottom: '12px' }} />
                <label className="label">Satuan <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                <input className="input" placeholder="pcs, kg, liter..." value={form.satuan}
                  onChange={e => setForm({ ...form, satuan: e.target.value })} style={{ marginBottom: '12px' }} />
                <label className="label">Kategori <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                <input className="input" placeholder="Persediaan, Operasional..." value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })} style={{ marginBottom: '16px' }}
                  list="cat-list" />
                <datalist id="cat-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {editId ? 'Simpan' : 'Tambah'}
                  </button>
                  {editId && <button type="button" className="btn btn-ghost" onClick={() => { setForm(empty); setEditId(null) }}>Batal</button>}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="table">
                <thead><tr><th>Kode</th><th>Nama</th><th>Satuan</th><th>Kategori</th><th>Aksi</th></tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td><span className="badge badge-blue" style={{ fontFamily: 'monospace' }}>{item.code || '—'}</span></td>
                      <td style={{ fontWeight: '600' }}>{item.name}</td>
                      <td><span className="badge badge-gray">{item.satuan || '—'}</span></td>
                      <td><span className="badge badge-gray">{item.category || '—'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn" style={{ background: '#EFF4FF', color: 'var(--accent)', border: '1px solid #C7D4F0', padding: '5px 12px', fontSize: '12px' }}
                            onClick={() => { setForm({ code: item.code || '', name: item.name, category: item.category || '', satuan: item.satuan || '' }); setEditId(item.id) }}>Edit</button>
                          <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: '12px' }}
                            onClick={() => handleDelete(item.id)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Belum ada item</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
