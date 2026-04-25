'use client'
import { useEffect, useState } from 'react'
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

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))]

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Item Pengeluaran</div>
            <div className="topbar-sub">Kelola daftar item pengeluaran</div>
          </div>
        </div>

        <div className="content">
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
