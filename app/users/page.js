'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const empty = { name: '', email: '', password: '', role: 'CASHIER' }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const res = await api.get('/admin/users')
    setUsers(res.data)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (editId) await api.put(`/admin/users/${editId}`, form)
    else await api.post('/admin/users', form)
    setForm(empty); setEditId(null); setShowForm(false); load()
  }

  async function toggleActive(user) {
    await api.put(`/admin/users/${user.id}`, { isActive: !user.isActive }); load()
  }

  const roleColor = { ADMIN: 'badge-purple', CASHIER: 'badge-blue' }
  const roleGradient = { ADMIN: 'linear-gradient(135deg, #8B5CF6, #A78BFA)', CASHIER: 'linear-gradient(135deg, #2563EB, #60A5FA)' }

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Kasir & Admin</div>
            <div className="topbar-sub">{users.length} pengguna terdaftar</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setEditId(null); setShowForm(!showForm) }}>
            {showForm ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Tutup</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tambah User</>
            )}
          </button>
        </div>

        <div className="content">
          {showForm && (
            <div className="card slide-down" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{ width: '36px', height: '36px', background: editId ? 'linear-gradient(135deg, #F59E0B, #FBBF24)' : 'linear-gradient(135deg, #8B5CF6, #A78BFA)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#0D1526' }}>{editId ? 'Edit User' : 'Tambah User Baru'}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '1px' }}>Kelola akses kasir dan admin</div>
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-grid" style={{ marginBottom: '20px' }}>
                  <div>
                    <label className="label">Nama Lengkap</label>
                    <input className="input" placeholder="Nama kasir" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className="input" type="email" placeholder="email@bumikopi.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">{editId ? 'Password Baru' : 'Password'} {editId && <span style={{ color: '#94A3B8', fontWeight: '400' }}>(kosongkan jika tidak diubah)</span>}</label>
                    <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      <option value="CASHIER">Kasir</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="divider" />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Simpan
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {users.map((u) => (
              <div key={u.id} className="card fade-in" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', background: roleGradient[u.role], borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', color: '#fff', fontWeight: '700', flexShrink: 0 }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#0D1526', fontSize: '14px' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{u.email}</div>
                    </div>
                  </div>
                  <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div style={{ height: '1px', background: '#F1F5FB', marginBottom: '14px' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`badge ${roleColor[u.role] || 'badge-gray'}`}>{u.role}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn" style={{ background: '#EFF4FF', color: '#2563EB', border: '1px solid #C7D4F0', padding: '5px 12px', fontSize: '12px' }}
                      onClick={() => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditId(u.id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                      Edit
                    </button>
                    <button className={`btn ${u.isActive ? 'btn-danger' : 'btn-success'}`} style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => toggleActive(u)}>
                      {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
