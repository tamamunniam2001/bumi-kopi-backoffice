'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')

export default function PengeluaranPage() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState({})
  const [cartOpen, setCartOpen] = useState(false)
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    api.get('/admin/expense-items').then(r => setItems(r.data)).catch(() => {})
  }, [])

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.code || '').toLowerCase().includes(search.toLowerCase())
  )

  function updateCart(itemId, field, value) {
    setCart(prev => ({
      ...prev,
      [itemId]: { harga: '', qty: 1, keterangan: '', ...prev[itemId], [field]: value }
    }))
  }

  function addToCart(item) {
    const entry = cart[item.id]
    if (!Number(entry?.harga)) return alert('Isi harga terlebih dahulu')
    setCart(prev => ({ ...prev, [item.id]: { ...prev[item.id], added: true } }))
  }

  function removeFromCart(itemId) {
    setCart(prev => { const next = { ...prev }; delete next[itemId]; return next })
  }

  const cartItems = items.filter(i => cart[i.id]?.added)
  const total = cartItems.reduce((s, i) => s + (Number(cart[i.id].harga) || 0) * (Number(cart[i.id].qty) || 1), 0)

  async function handleSave() {
    if (!cartItems.length) return alert('Belum ada item pengeluaran')
    setSaving(true)
    try {
      const res = await api.post('/expenses', {
        catatan,
        items: cartItems.map(i => ({
          expenseItemId: i.id,
          name: i.name,
          keterangan: cart[i.id].keterangan || '',
          harga: Number(cart[i.id].harga),
          qty: Number(cart[i.id].qty) || 1,
        })),
      })
      setSaved(res.data)
      setCart({}); setCatatan(''); setCartOpen(false)
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  if (saved) return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar"><div className="topbar-title">Pengeluaran</div></div>
        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="card fade-in" style={{ padding: '48px 40px', textAlign: 'center', maxWidth: '420px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', background: 'var(--green-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px', border: '2px solid #A7DFC8' }}>✓</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Pengeluaran Tersimpan!</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--red)', marginBottom: '4px' }}>{fmt(saved.total)}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>{saved.items?.length} item pengeluaran</div>
            <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '14px', marginBottom: '24px', textAlign: 'left', border: '1px solid var(--border)' }}>
              {saved.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < saved.items.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text2)' }}>{item.name} {item.keterangan ? `(${item.keterangan})` : ''} ×{item.qty}</span>
                  <span style={{ fontWeight: '600' }}>{fmt(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              onClick={() => setSaved(null)}>
              Catat Pengeluaran Lagi
            </button>
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="page">
      <Sidebar />
      <main className="main" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="topbar">
          <div>
            <div className="topbar-title">Pengeluaran</div>
            <div className="topbar-sub">Catat pengeluaran harian</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
          <div style={{ position: 'relative', maxWidth: '480px', margin: '0 auto' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="input" style={{ paddingLeft: '42px', borderRadius: '12px', fontSize: '14px' }}
              placeholder="Cari barang atau kode..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* List Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 100px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                <div>Belum ada item pengeluaran</div>
              </div>
            )}
            {filtered.map(item => {
              const entry = cart[item.id] || {}
              const isAdded = !!entry.added
              return (
                <div key={item.id} className="card" style={{ padding: '16px 20px', border: isAdded ? '1.5px solid var(--accent)' : '1px solid var(--border)', background: isAdded ? 'var(--accent-light)' : 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.category && <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '3px' }}>{item.category}</div>}
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>{item.name}</div>
                      {item.code && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Kode: {item.code}</div>}
                    </div>

                    {!isAdded ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <input className="input" placeholder="Keterangan..." value={entry.keterangan || ''}
                          onChange={e => updateCart(item.id, 'keterangan', e.target.value)}
                          style={{ width: '140px', fontSize: '13px' }} />
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>Rp</span>
                          <input className="input" type="number" placeholder="Harga" value={entry.harga || ''}
                            onChange={e => updateCart(item.id, 'harga', e.target.value)}
                            style={{ width: '110px', paddingLeft: '32px', fontSize: '13px' }} />
                        </div>
                        <input className="input" type="number" min="1" value={entry.qty || 1}
                          onChange={e => updateCart(item.id, 'qty', e.target.value)}
                          style={{ width: '60px', textAlign: 'center', fontSize: '13px' }} />
                        <button onClick={() => addToCart(item)}
                          style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent)' }}>{fmt(Number(entry.harga) * (Number(entry.qty) || 1))}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{fmt(entry.harga)} × {entry.qty}</div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)}
                          style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #FECACA', background: 'var(--red-light)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, boxShadow: '0 -4px 16px rgba(13,21,38,0.08)' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total Pengeluaran</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: total > 0 ? 'var(--red)' : 'var(--muted)' }}>{fmt(total)}</div>
          </div>
          <button onClick={() => setCartOpen(true)} disabled={!cartItems.length}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '12px', border: 'none', background: cartItems.length ? 'var(--accent)' : '#94A3B8', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: cartItems.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            RINGKASAN ({cartItems.length})
          </button>
        </div>
      </main>

      {/* Ringkasan Modal */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setCartOpen(false) }}>
          <div className="card fade-in" style={{ width: '480px', maxWidth: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #D8E4F4, #E8EEF8)' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)' }}>Ringkasan Pengeluaran</div>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cartItems.map((item, i) => {
                const e = cart[item.id]
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{item.name}</div>
                      {e.keterangan && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{e.keterangan}</div>}
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{fmt(e.harga)} × {e.qty}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--red)' }}>{fmt(Number(e.harga) * (Number(e.qty) || 1))}</div>
                  </div>
                )
              })}
              <div>
                <label className="label">Catatan <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                <textarea className="input" rows={2} placeholder="Catatan pengeluaran..." value={catatan}
                  onChange={e => setCatatan(e.target.value)} style={{ resize: 'none' }} />
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Total</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--red)' }}>{fmt(total)}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCartOpen(false)}>Batal</button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '12px' }}
                  onClick={handleSave} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
