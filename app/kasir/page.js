'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'
import { printThermal } from '@/lib/thermal'
import Cookies from 'js-cookie'

const fmt = (n) => Number(n).toLocaleString('id-ID')

export default function KasirPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const user = (() => { try { return JSON.parse(Cookies.get('user') || '{}') } catch { return {} } })()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/products')
      const prods = res.data
      const cats = [...new Set(prods.map((p) => p.category?.name).filter(Boolean))].sort()
      setProducts(prods)
      setCategories(cats)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.code || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCat || p.category?.name === selectedCat
    return matchSearch && matchCat
  })

  function addToCart(product) {
    if (product.stock <= 0) return
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id)
      if (idx >= 0) return prev.map((i, n) => n === idx ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product, qty: 1 }]
    })
  }

  function updateQty(productId, delta) {
    setCart((prev) => prev
      .map((i) => i.product.id === productId ? { ...i, qty: i.qty + delta } : i)
      .filter((i) => i.qty > 0)
    )
  }

  function clearCart() { setCart([]) }

  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const qtyOf = (id) => cart.find((i) => i.product.id === id)?.qty || 0
  const totalQty = cart.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="page">
      <Sidebar />
      <main className="main" style={{ overflow: 'hidden', position: 'relative' }}>
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Kasir</div>
            <div className="topbar-sub">{user.name || 'Kasir'}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input className="input" style={{ paddingLeft: '32px', width: '220px' }} placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-ghost" onClick={load}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            </button>
          </div>
        </div>

        {/* Produk area — full width */}
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
          {/* Category bar */}
          <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '10px 20px', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0 }}>
            {[{ label: 'Semua', value: null }, ...categories.map((c) => ({ label: c, value: c }))].map(({ label, value }) => (
              <button key={label} onClick={() => setSelectedCat(value)}
                style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${selectedCat === value ? 'var(--accent)' : 'var(--border)'}`, background: selectedCat === value ? 'var(--accent)' : '#fff', color: selectedCat === value ? '#fff' : 'var(--text2)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Grid produk */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94A3B8' }}>Memuat produk...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                {filtered.map((p) => {
                  const qty = qtyOf(p.id)
                  const outOfStock = p.stock <= 0
                  return (
                    <div key={p.id} onClick={() => addToCart(p)}
                      style={{ background: '#fff', borderRadius: '12px', border: `2px solid ${qty > 0 ? 'var(--accent)' : 'var(--border)'}`, cursor: outOfStock ? 'not-allowed' : 'pointer', opacity: outOfStock ? 0.5 : 1, overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: qty > 0 ? '0 0 0 3px rgba(37,99,235,0.1)' : '0 1px 4px rgba(13,21,38,0.06)' }}>
                      <div style={{ height: '100px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} /> : <span style={{ fontSize: '28px' }}>☕</span>}
                      </div>
                      <div style={{ padding: '10px' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {p.category && <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: '6px' }}>{p.category.name}</span>}
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginLeft: 'auto' }}>Rp {fmt(p.price)}</span>
                        </div>
                        {qty > 0 && <div style={{ marginTop: '6px', background: 'var(--accent)', color: '#fff', borderRadius: '6px', textAlign: 'center', fontSize: '11px', fontWeight: '700', padding: '2px 0' }}>{qty} dipilih</div>}
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: '#94A3B8' }}><div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>Tidak ada produk</div>}
              </div>
            )}
          </div>
        </div>

        {/* Cart Overlay */}
        <div className={`cart-overlay${cartOpen ? ' open' : ''}`} onClick={() => setCartOpen(false)} />

        {/* Cart Drawer */}
        <div className={`cart-drawer${cartOpen ? ' open' : ''}`}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>Pesanan</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {cart.length > 0 && <button onClick={clearCart} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--red)', fontWeight: '600', fontFamily: 'inherit' }}>Kosongkan</button>}
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', gap: '8px' }}>
                <span style={{ fontSize: '40px' }}>🛒</span>
                <span style={{ fontSize: '13px' }}>Belum ada pesanan</span>
              </div>
            ) : cart.map((item) => (
              <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#F1F5F9', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.product.imageUrl ? <img src={item.product.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} /> : <span style={{ fontSize: '18px' }}>☕</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600' }}>Rp {fmt(item.product.price)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => updateQty(item.product.id, -1)} style={{ width: '26px', height: '26px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--accent-light)', color: 'var(--accent)', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontWeight: '800', fontSize: '14px', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} style={{ width: '26px', height: '26px', borderRadius: '7px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer cart */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <ManualItemButton onAdd={(item) => setCart((prev) => {
              const idx = prev.findIndex((i) => i.product.id === item.id)
              if (idx >= 0) return prev.map((i, n) => n === idx ? { ...i, qty: i.qty + 1 } : i)
              return [...prev, { product: item, qty: 1 }]
            })} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' }}>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>Total</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent)' }}>Rp {fmt(total)}</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }}
              disabled={cart.length === 0} onClick={() => setCheckoutOpen(true)}>
              Lanjutkan →
            </button>
          </div>
        </div>

        {/* FAB Cart */}
        <button className="cart-fab" onClick={() => setCartOpen(!cartOpen)}>
          {cartOpen
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          }
          {!cartOpen && totalQty > 0 && (
            <span className="cart-badge">{totalQty > 99 ? '99+' : totalQty}</span>
          )}
        </button>
      </main>

      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          total={total}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => { clearCart(); setCheckoutOpen(false); setCartOpen(false); load() }}
        />
      )}
    </div>
  )
}

// ── Tambah Item Manual ──
function ManualItemButton({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name || !price) return
    onAdd({ id: `manual_${Date.now()}`, name, price: Number(price), stock: 999, imageUrl: null, category: null })
    setName(''); setPrice(''); setOpen(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '10px', background: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text2)', fontWeight: '600', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '10px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Tambah Item Manual
      </button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,21,38,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="card" style={{ width: '360px', padding: '24px' }}>
            <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '16px' }}>Tambah Item Manual</div>
            <form onSubmit={submit}>
              <div style={{ marginBottom: '12px' }}>
                <label className="label">Nama Item</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama produk" required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="label">Harga</label>
                <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" required />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Tambah</button>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── Checkout Modal ──
function CheckoutModal({ cart, total, onClose, onSuccess }) {
  const [payMethod, setPayMethod] = useState('CASH')
  const [payment, setPayment] = useState('')
  const [loading, setLoading] = useState(false)
  const [tx, setTx] = useState(null)
  const [printing, setPrinting] = useState(false)

  const paid = Number(payment) || 0
  const change = payMethod === 'CASH' ? paid - total : 0
  const methods = ['CASH', 'QRIS', 'TRANSFER', 'NONTUNAI']
  const quickAmounts = [50000, 100000, 150000, 200000]

  async function checkout() {
    if (payMethod === 'CASH' && paid < total) return alert('Uang bayar kurang')
    setLoading(true)
    try {
      const items = cart.map((i) => {
        const o = { qty: i.qty, price: i.product.price }
        if (i.product.id.startsWith('manual_')) o.name = i.product.name
        else o.productId = i.product.id
        return o
      })
      const res = await api.post('/transactions', { items, payment: payMethod === 'CASH' ? paid : total, payMethod })
      setTx(res.data)
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan transaksi')
    } finally {
      setLoading(false)
    }
  }

  async function handlePrint() {
    if (!tx) return
    setPrinting(true)
    try { await printThermal(tx) } catch (e) { alert('Gagal cetak: ' + e.message) }
    finally { setPrinting(false) }
  }

  if (tx) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,21,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="card fade-in" style={{ width: '400px', padding: '32px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', background: 'var(--green-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>✓</div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>Transaksi Berhasil!</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'monospace', marginBottom: '20px' }}>{tx.invoiceNo}</div>
        <div style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
          {cart.map((item) => (
            <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
              <span>{item.product.name} ×{item.qty}</span>
              <span style={{ fontWeight: '600' }}>Rp {fmt(item.product.price * item.qty)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '15px' }}>
            <span>Total</span><span style={{ color: 'var(--accent)' }}>Rp {fmt(tx.total)}</span>
          </div>
          {payMethod === 'CASH' && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px', color: 'var(--green)' }}><span>Kembalian</span><span style={{ fontWeight: '700' }}>Rp {fmt(tx.change)}</span></div>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onSuccess(tx)}>Selesai</button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={printing} onClick={handlePrint}>
            {printing ? '⏳ Mencetak...' : '🖨️ Print Struk'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,21,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card fade-in" style={{ width: '460px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: '800' }}>Checkout</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div className="section-label">Pesanan</div>
            <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
              {cart.map((item) => (
                <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text2)' }}>{item.product.name} <span style={{ color: 'var(--muted)' }}>×{item.qty}</span></span>
                  <span style={{ fontWeight: '700' }}>Rp {fmt(item.product.price * item.qty)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div className="section-label">Metode Pembayaran</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {methods.map((m) => (
                <button key={m} onClick={() => { setPayMethod(m); setPayment('') }}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: `1px solid ${payMethod === m ? 'var(--accent)' : 'var(--border)'}`, background: payMethod === m ? 'var(--accent)' : '#fff', color: payMethod === m ? '#fff' : 'var(--text2)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          {payMethod === 'CASH' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="label">Uang Bayar</label>
              <input className="input" type="number" placeholder="0" value={payment} onChange={(e) => setPayment(e.target.value)} style={{ marginBottom: '8px' }} />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {quickAmounts.map((v) => (
                  <button key={v} onClick={() => setPayment(String(v))}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Rp {fmt(v)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700' }}>Total</span>
              <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent)' }}>Rp {fmt(total)}</span>
            </div>
            {payMethod === 'CASH' && paid > 0 && <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text2)' }}>
                <span>Bayar</span><span>Rp {fmt(paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', color: change >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '4px' }}>
                <span>Kembalian</span><span>Rp {fmt(Math.max(0, change))}</span>
              </div>
            </>}
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px' }}
            disabled={loading || (payMethod === 'CASH' && paid < total)} onClick={checkout}>
            {loading ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        </div>
      </div>
    </div>
  )
}
