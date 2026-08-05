'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const SECTIONS = [
  { id: '',          label: '— Tidak Ditampilkan —' },
  { id: 'new',       label: 'Ada yang Baru' },
  { id: 'best',      label: 'Best Seller' },
  { id: 'coffee',    label: 'Coffee' },
  { id: 'noncoffee', label: 'Non Coffee' },
  { id: 'snack',     label: 'Snack' },
  { id: 'kenyang',   label: 'Kenyang' },
  { id: 'lainnya',   label: 'Lainnya' },
]

const SECTION_COLOR = {
  new: '#2F7566', best: '#A9762F', coffee: '#4A3222',
  noncoffee: '#3F6657', snack: '#B5651D', kenyang: '#7A4B23', lainnya: '#6B7280',
}

const fmt = (n) => Number(n).toLocaleString('id-ID')

export default function SelfOrderSettingsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSection, setFilterSection] = useState('all')
  const [dirty, setDirty] = useState({}) // { [id]: { ...changedFields } }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/self-order-settings')
      setProducts(res.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function patch(id, field, value) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    setDirty(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
    setSaved(false)
  }

  async function handleSave() {
    const updates = Object.entries(dirty).map(([id, data]) => ({ id, ...data }))
    if (!updates.length) return
    setSaving(true)
    try {
      await api.patch('/admin/self-order-settings', { updates })
      setDirty({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan')
    }
    setSaving(false)
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchSection = filterSection === 'all' || p.selfOrderSection === filterSection
    return matchSearch && matchSection
  })

  const dirtyCount = Object.keys(dirty).length

  // Group by section for preview
  const grouped = SECTIONS.slice(1).reduce((acc, s) => {
    acc[s.id] = products.filter(p => p.showInSelfOrder && p.selfOrderSection === s.id)
    return acc
  }, {})

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Pengaturan Self Order</div>
            <div className="topbar-sub">Atur tampilan menu & kategori di halaman self order</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {saved && (
              <span style={{ fontSize: '13px', color: '#10B981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Tersimpan
              </span>
            )}
            {dirtyCount > 0 && (
              <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '4px 10px', borderRadius: '20px' }}>
                {dirtyCount} perubahan belum disimpan
              </span>
            )}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || dirtyCount === 0}>
              {saving ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Menyimpan...</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Simpan Perubahan</>
              )}
            </button>
          </div>
        </div>

        <div className="content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

            {/* ── Kiri: Tabel pengaturan produk ── */}
            <div>
              {/* Filter bar */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className="input" style={{ paddingLeft: '36px' }} placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input" style={{ width: 'auto' }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                  <option value="all">Semua Seksi</option>
                  {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th style={{ textAlign: 'center' }}>Tampil</th>
                      <th>Seksi</th>
                      <th>Deskripsi</th>
                      <th style={{ textAlign: 'center' }}>Baru</th>
                      <th style={{ textAlign: 'center' }}>Best Seller</th>
                      <th style={{ width: '80px' }}>Urutan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j}><div style={{ height: '20px', background: '#F1F5FB', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} /></td>
                          ))}
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>☕</div>
                        <div>Tidak ada produk</div>
                      </td></tr>
                    ) : filtered.map(p => {
                      const isDirty = !!dirty[p.id]
                      return (
                        <tr key={p.id} style={{ background: isDirty ? '#FFFBEB' : undefined }}>
                          <td>
                            <div style={{ fontWeight: '600', color: '#0D1526', fontSize: '13px' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                              {p.category?.name && <span style={{ marginRight: '8px' }}>{p.category.name}</span>}
                              Rp {fmt(p.price)}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <label style={{ cursor: 'pointer', display: 'inline-flex' }}>
                              <input
                                type="checkbox"
                                checked={p.showInSelfOrder}
                                onChange={e => patch(p.id, 'showInSelfOrder', e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563EB' }}
                              />
                            </label>
                          </td>
                          <td>
                            <select
                              className="input"
                              style={{ fontSize: '12px', padding: '5px 8px', minWidth: '140px' }}
                              value={p.selfOrderSection || ''}
                              onChange={e => patch(p.id, 'selfOrderSection', e.target.value)}
                              disabled={!p.showInSelfOrder}
                            >
                              {SECTIONS.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <textarea
                              className="input"
                              style={{ fontSize: '12px', padding: '5px 8px', width: '180px', resize: 'vertical', minHeight: '36px' }}
                              value={p.description || ''}
                              placeholder="Deskripsi menu..."
                              rows={2}
                              onChange={e => patch(p.id, 'description', e.target.value)}
                              disabled={!p.showInSelfOrder}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <label style={{ cursor: 'pointer', display: 'inline-flex' }}>
                              <input
                                type="checkbox"
                                checked={p.isNew}
                                onChange={e => patch(p.id, 'isNew', e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2F7566' }}
                                disabled={!p.showInSelfOrder}
                              />
                            </label>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <label style={{ cursor: 'pointer', display: 'inline-flex' }}>
                              <input
                                type="checkbox"
                                checked={p.isBestSeller}
                                onChange={e => patch(p.id, 'isBestSeller', e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#A9762F' }}
                                disabled={!p.showInSelfOrder}
                              />
                            </label>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input"
                              style={{ fontSize: '12px', padding: '5px 8px', width: '64px', textAlign: 'center' }}
                              value={p.selfOrderSort}
                              min={0}
                              onChange={e => patch(p.id, 'selfOrderSort', Number(e.target.value))}
                              disabled={!p.showInSelfOrder}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Kanan: Preview per seksi ── */}
            <div style={{ position: 'sticky', top: '80px' }}>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0D1526', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  Preview Seksi
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {SECTIONS.slice(1).map(s => {
                    const items = grouped[s.id] || []
                    if (items.length === 0) return null
                    return (
                      <div key={s.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                          <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: SECTION_COLOR[s.id] || '#94A3B8' }} />
                          <span style={{ fontSize: '11px', fontWeight: '700', color: SECTION_COLOR[s.id] || '#94A3B8' }}>{s.label}</span>
                          <span style={{ fontSize: '10px', color: '#94A3B8' }}>({items.length})</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '9px' }}>
                          {items.slice(0, 4).map(p => (
                            <div key={p.id} style={{ fontSize: '11px', color: '#4A5578', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                              <span style={{ color: '#94A3B8', flexShrink: 0 }}>
                                {p.isNew && '🆕'}{p.isBestSeller && '⭐'}
                              </span>
                            </div>
                          ))}
                          {items.length > 4 && (
                            <div style={{ fontSize: '10px', color: '#94A3B8' }}>+{items.length - 4} lainnya</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {Object.values(grouped).every(arr => arr.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '12px' }}>
                      Belum ada produk yang diatur
                    </div>
                  )}
                </div>
              </div>

              {/* Legenda */}
              <div className="card" style={{ padding: '14px 16px', marginTop: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '12px', color: '#4A5578', marginBottom: '10px' }}>Keterangan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#4A5578' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="checkbox" checked readOnly style={{ accentColor: '#2563EB' }} />
                    <span>Tampil — produk muncul di self order</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px' }}>🆕</span>
                    <span>Baru — masuk filter "Ada yang Baru"</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px' }}>⭐</span>
                    <span>Best Seller — masuk filter "Best Seller"</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px' }}>🔢</span>
                    <span>Urutan — angka kecil tampil lebih atas</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  )
}
