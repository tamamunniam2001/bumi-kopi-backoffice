'use client'
import { useEffect, useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

export default function InventarisPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [modal, setModal] = useState(null) // null | 'add' | item(edit)
  const [form, setForm] = useState({ name: '', qty: '', satuan: '', category: '', imageUrl: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filterCat) params.append('category', filterCat)
      const res = await api.get(`/admin/inventory?${params}`)
      setItems(res.data)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort()
  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || i.category === filterCat
    return matchSearch && matchCat
  })

  const allSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id))
  function toggleSelectAll() {
    if (allSelected) setSelected(s => { const n = new Set(s); filtered.forEach(i => n.delete(i.id)); return n })
    else setSelected(s => { const n = new Set(s); filtered.forEach(i => n.add(i.id)); return n })
  }

  function openAdd() { setForm({ name: '', qty: '', satuan: '', category: '', imageUrl: '', note: '' }); setModal('add') }
  function openEdit(item) { setForm({ name: item.name, qty: String(item.qty), satuan: item.satuan || '', category: item.category || '', imageUrl: item.imageUrl || '', note: item.note || '' }); setModal(item) }

  async function handleSave() {
    if (!form.name.trim()) return alert('Nama wajib diisi')
    setSaving(true)
    try {
      if (modal === 'add') await api.post('/admin/inventory', form)
      else await api.patch(`/admin/inventory/${modal.id}`, form)
      setModal(null); load()
    } catch (e) { alert(e.response?.data?.message || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus item ini?')) return
    try { await api.delete(`/admin/inventory/${id}`); load() }
    catch (e) { alert(e.response?.data?.message || 'Gagal menghapus') }
  }

  async function handleMassDelete() {
    if (!selected.size || !confirm(`Hapus ${selected.size} item?`)) return
    try {
      await api.delete('/admin/inventory', { data: { ids: [...selected] } })
      setSelected(new Set()); load()
    } catch (e) { alert(e.response?.data?.message || 'Gagal menghapus') }
  }

  function downloadTemplate() {
    const blob = new Blob(['\uFEFFNama,Qty,Satuan,Kategori,URL Foto,Catatan\nMeja Kayu,4,pcs,Furnitur,,\nKursi Besi,12,pcs,Furnitur,,\n'], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'template-inventaris.csv'; a.click()
  }

  async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return
    setImporting(true); setImportResult(null)
    try {
      const text = await file.text()
      const clean = text.replace(/^\uFEFF/, '')
      const lines = clean.split(/\r?\n/).filter(l => l.trim())
      const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ','
      const dataLines = lines.slice(1)
      const toCreate = []
      const errors = []
      dataLines.forEach((line, i) => {
        const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim())
        const [name, qty, satuan, category, imageUrl, note] = cols
        if (!name) { errors.push(`Baris ${i + 2}: Nama kosong`); return }
        toCreate.push({ name, qty: Number(qty) || 0, satuan: satuan || '', category: category || '', imageUrl: imageUrl || null, note: note || '' })
      })
      let created = 0
      for (const item of toCreate) {
        try { await api.post('/admin/inventory', item); created++ }
        catch (e) { errors.push(`${item.name}: ${e.response?.data?.message || 'Gagal'}`) }
      }
      setImportResult({ created, skipped: errors.length, errors })
      load()
    } catch { setImportResult({ error: 'Gagal membaca file' }) }
    finally { setImporting(false); fileRef.current.value = '' }
  }

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Inventaris</div>
            <div className="topbar-sub">{items.length} item terdaftar</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selected.size > 0 && (
              <button className="btn btn-danger" onClick={handleMassDelete} style={{ gap: '6px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                Hapus {selected.size}
              </button>
            )}
            <button className="btn btn-ghost" onClick={downloadTemplate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Template
            </button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
            <button className="btn" style={{ background: '#F0FDF4', color: '#10B981', border: '1px solid #A7F3D0' }}
              onClick={() => fileRef.current.click()} disabled={importing}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {importing ? 'Mengimpor...' : 'Import CSV'}
            </button>
            <button className="btn btn-primary" onClick={openAdd}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Item
            </button>
          </div>
        </div>

        <div className="content">
          {/* Filter */}
          <div className="card" style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <svg style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="input" style={{ paddingLeft: '34px' }} placeholder="Cari nama barang..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
            </div>
            <select className="input" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-primary" onClick={load}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Cari
            </button>
            {(search || filterCat) && <button className="btn btn-ghost" onClick={() => { setSearch(''); setFilterCat(''); setTimeout(load, 0) }}>Reset</button>}
          </div>

          {/* Tabel */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '36px', textAlign: 'center' }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                    </th>
                    <th style={{ width: '56px' }}>Foto</th>
                    <th>Nama Barang</th>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th>Satuan</th>
                    <th>Catatan</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Memuat...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                      <div>Belum ada data inventaris</div>
                    </td></tr>
                  ) : filtered.map(item => (
                    <tr key={item.id} style={{ background: selected.has(item.id) ? 'var(--accent-light)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={selected.has(item.id)} onChange={() => setSelected(s => { const n = new Set(s); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n })} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                      </td>
                      <td>
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} onError={e => e.target.style.display = 'none'} />
                          : <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
                        }
                      </td>
                      <td><div style={{ fontWeight: '600', color: 'var(--text)' }}>{item.name}</div></td>
                      <td>{item.category ? <span className="badge badge-blue">{item.category}</span> : null}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-purple" style={{ fontSize: '13px', fontWeight: '700' }}>
                          {Number(item.qty) % 1 !== 0 ? Number(item.qty).toLocaleString('id-ID', { maximumFractionDigits: 4 }) : Number(item.qty).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td>{item.satuan ? <span className="badge badge-gray">{item.satuan}</span> : null}</td>
                      <td style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '200px' }}>{item.note}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #C7D4F0', padding: '5px 10px', fontSize: '12px' }} onClick={() => openEdit(item)}>Edit</button>
                          <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => handleDelete(item.id)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && filtered.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--muted)', background: '#FAFBFF' }}>
                {filtered.length} item{filterCat || search ? ' (difilter)' : ''}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Tambah/Edit */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="card fade-in" style={{ width: '480px', maxWidth: '96vw', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #D8E4F4, #E8EEF8)' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>{modal === 'add' ? 'Tambah Item Inventaris' : 'Edit Item Inventaris'}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Preview foto */}
              {form.imageUrl && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <img src={form.imageUrl} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border)' }} onError={e => e.target.style.display = 'none'} />
                </div>
              )}
              <div>
                <label className="label">URL Foto <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                <input className="input" placeholder="https://..." value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nama Barang</label>
                <input className="input" placeholder="Nama barang..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label">Jumlah (Qty)</label>
                  <input className="input" type="number" step="any" min="0" placeholder="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Satuan</label>
                  <input className="input" placeholder="pcs, kg, unit..." value={form.satuan} onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Kategori <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                <input className="input" placeholder="Furnitur, Elektronik, Peralatan..." value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} list="inv-cat-list" />
                <datalist id="inv-cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="label">Catatan <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                <input className="input" placeholder="Kondisi, lokasi, dll..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', background: 'var(--surface2)' }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : modal === 'add' ? 'Tambah Item' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifikasi Import */}
      {importResult && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 600, maxWidth: '360px', width: '100%' }}>
          <div style={{ padding: '14px 18px', borderRadius: '12px', border: `1px solid ${importResult.error ? '#FECACA' : '#A7F3D0'}`, background: importResult.error ? '#FEF2F2' : '#F0FDF4', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              {importResult.error
                ? <div style={{ fontSize: '13px', fontWeight: '600', color: '#EF4444' }}>❌ {importResult.error}</div>
                : <>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>✅ Import selesai</div>
                    <div style={{ fontSize: '12px', color: '#4A5578' }}>✚ <b>{importResult.created}</b> berhasil · ⊘ <b>{importResult.skipped}</b> gagal</div>
                    {importResult.errors?.length > 0 && (
                      <div style={{ marginTop: '6px', maxHeight: '80px', overflowY: 'auto', background: '#FEF2F2', borderRadius: '6px', padding: '6px 8px', border: '1px solid #FECACA' }}>
                        {importResult.errors.map((e, i) => <div key={i} style={{ fontSize: '11px', color: '#EF4444' }}>{e}</div>)}
                      </div>
                    )}
                  </>}
            </div>
            <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
