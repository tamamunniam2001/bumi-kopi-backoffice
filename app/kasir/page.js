'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'
import { printThermal } from '@/lib/thermal'
import Cookies from 'js-cookie'

const fmt = (n) => Number(n).toLocaleString('id-ID')
const fmtTime = (d) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

export default function KasirPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersExpanded, setOrdersExpanded] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
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

  const loadOrders = useCallback(async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const res = await api.get(`/transactions?from=${today.toISOString()}&to=${new Date().toISOString()}&page=1`)
      setOrders(res.data.transactions || [])
    } catch { setOrders([]) }
  }, [])

  useEffect(() => { load(); loadOrders() }, [load, loadOrders])

  // Auto-refresh orders setiap 30 detik
  useEffect(() => {
    const t = setInterval(loadOrders, 30000)
    return () => clearInterval(t)
  }, [loadOrders])

  async function toggleServed(order) {
    try {
      await api.patch(`/transactions/${order.id}`, {
        servedAt: order.servedAt ? null : new Date().toISOString()
      })
      loadOrders()
    } catch { }
  }

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

  // hitung summary orders
  const ordersToday = orders.length
  const ordersServed = orders.filter((o) => o.servedAt).length
  const ordersPending = ordersToday - ordersServed

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

          {/* ── Order List ── */}
          <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {/* Header */}
            <div onClick={() => setOrdersExpanded(!ordersExpanded)}
              style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Order Hari Ini</span>
              <span style={{ fontSize: '11px', fontWeight: '700', background: '#EFF4FF', color: 'var(--accent)', padding: '2px 8px', borderRadius: '20px', border: '1px solid #C7D4F0' }}>{ordersToday} order</span>
              {ordersPending > 0 && <span style={{ fontSize: '11px', fontWeight: '700', background: 'var(--orange-light)', color: 'var(--orange)', padding: '2px 8px', borderRadius: '20px', border: '1px solid #FDE68A' }}>{ordersPending} belum disajikan</span>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={(e) => { e.stopPropagation(); loadOrders() }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: '2px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </button>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: '#94A3B8', transition: 'transform 0.2s', transform: ordersExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {/* Cards */}
            {ordersExpanded && (
              <div style={{ overflowX: 'auto', padding: '0 20px 12px', display: 'flex', gap: '10px' }}>
                {orders.length === 0 ? (
                  <div style={{ padding: '12px 0', color: '#94A3B8', fontSize: '13px' }}>Belum ada order hari ini</div>
                ) : orders.map((order) => {
                  const served = !!order.servedAt
                  const paid = order.status === 'COMPLETED'
                  return (
                    <div key={order.id} style={{ flexShrink: 0, width: '170px', background: '#fff', borderRadius: '14px', border: `1.5px solid ${!paid ? '#FECACA' : served ? '#A7F3D0' : 'var(--border)'}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(13,21,38,0.06)', transition: 'box-shadow 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(13,21,38,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(13,21,38,0.06)'}
                    >
                      {/* Klik area untuk detail */}
                      <div onClick={() => setSelectedOrder(order)} style={{ padding: '12px 12px 8px', cursor: 'pointer' }}>
                        {/* Waktu + invoice */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent)' }}>{fmtTime(order.createdAt)}</span>
                          <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>#{order.invoiceNo.slice(-5)}</span>
                        </div>
                        {/* Nama pembeli */}
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.customerName || '(Tanpa Nama)'}
                        </div>
                        {/* Total */}
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent)', marginBottom: '8px' }}>Rp {fmt(order.total)}</div>
                        {/* Status badges */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', textAlign: 'center', background: served ? '#ECFDF5' : '#FFFBEB', color: served ? 'var(--green)' : 'var(--orange)', border: `1px solid ${served ? '#A7F3D0' : '#FDE68A'}` }}>
                            {served ? '✓ Disajikan' : '⏳ Belum Disajikan'}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', textAlign: 'center', background: paid ? '#ECFDF5' : '#FEF2F2', color: paid ? 'var(--green)' : 'var(--red)', border: `1px solid ${paid ? '#A7F3D0' : '#FECACA'}` }}>
                            {paid ? '✓ Lunas' : '✗ Belum Bayar'}
                          </span>
                        </div>
                      </div>
                      {/* Tombol sajikan */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleServed(order) }}
                        style={{ width: '100%', padding: '7px', border: 'none', borderTop: '1px solid var(--border)', background: served ? '#F0FDF4' : 'var(--accent)', color: served ? 'var(--green)' : '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                        {served ? '↺ Batalkan Sajian' : '✓ Tandai Disajikan'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

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
            <div style={{ display: 'flex', gap: '8px', marginBottom: '0' }}>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '14px' }}
                disabled={cart.length === 0} onClick={() => setCheckoutOpen(true)}>
                Bayar Sekarang
              </button>
              <button className="btn" style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '14px', background: '#FFFBEB', color: 'var(--orange)', border: '1px solid #FDE68A', fontWeight: '700' }}
                disabled={cart.length === 0} onClick={() => setCheckoutOpen('later')}>
                Bayar Nanti
              </button>
            </div>
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
          payLater={checkoutOpen === 'later'}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => { clearCart(); setCheckoutOpen(false); setCartOpen(false); load(); loadOrders() }}
        />
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onToggleServed={async () => {
            await api.patch(`/transactions/${selectedOrder.id}`, { servedAt: selectedOrder.servedAt ? null : new Date().toISOString() })
            await loadOrders()
            setSelectedOrder((prev) => ({ ...prev, servedAt: prev.servedAt ? null : new Date().toISOString() }))
          }}
          onRefresh={() => { loadOrders(); setSelectedOrder(null) }}
        />
      )}
    </div>
  )
}

// ── Order Detail Modal ──
function OrderDetailModal({ order, onClose, onToggleServed, onRefresh }) {
  const [printing, setPrinting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payMethod, setPayMethod] = useState('CASH')
  const [payment, setPayment] = useState('')
  const served = !!order.servedAt
  const paid = order.status === 'COMPLETED'
  const methods = ['CASH', 'QRIS', 'TRANSFER', 'NONTUNAI']
  const quickAmounts = [50000, 100000, 150000, 200000]
  const paid2 = Number(payment) || 0
  const change = payMethod === 'CASH' ? paid2 - order.total : 0

  async function handlePrint() {
    setPrinting(true)
    try { await printThermal(order) } catch (e) { alert('Gagal cetak: ' + e.message) }
    finally { setPrinting(false) }
  }

  async function handleToggle() {
    setToggling(true)
    try { await onToggleServed() } catch { }
    finally { setToggling(false) }
  }

  async function handlePay() {
    if (payMethod === 'CASH' && paid2 < order.total) return alert('Uang bayar kurang')
    setPaying(true)
    try {
      await api.patch(`/transactions/${order.id}`, {
        payment: payMethod === 'CASH' ? paid2 : order.total,
        payMethod,
        total: order.total,
      })
      onRefresh()
      onClose()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal memproses pembayaran')
    } finally { setPaying(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,21,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card fade-in" style={{ width: '440px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)' }}>
              {order.customerName || '(Tanpa Nama)'}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', marginTop: '2px' }}>{order.invoiceNo} · {fmtTime(order.createdAt)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Status row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: served ? '#ECFDF5' : '#FFFBEB', borderRadius: '10px', padding: '12px', border: `1px solid ${served ? '#A7F3D0' : '#FDE68A'}` }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>STATUS SAJIAN</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: served ? 'var(--green)' : 'var(--orange)' }}>{served ? '✓ Sudah Disajikan' : '⏳ Belum Disajikan'}</div>
            </div>
            <div style={{ background: paid ? '#ECFDF5' : '#FEF2F2', borderRadius: '10px', padding: '12px', border: `1px solid ${paid ? '#A7F3D0' : '#FECACA'}` }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>STATUS BAYAR</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: paid ? 'var(--green)' : 'var(--red)' }}>{paid ? '✓ Lunas' : '✗ Belum Bayar'}</div>
            </div>
          </div>

          {/* Catatan */}
          {order.note && (
            <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400E', marginBottom: '3px' }}>CATATAN</div>
              <div style={{ fontSize: '13px', color: '#78350F' }}>{order.note}</div>
            </div>
          )}

          {/* Items */}
          <div style={{ marginBottom: '14px' }}>
            <div className="section-label">Item Pesanan</div>
            <div style={{ background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{item.product?.name || 'Item Manual'}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.qty} × Rp {fmt(item.price)}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>Rp {fmt(item.subtotal)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border)', marginBottom: paid ? '0' : '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: paid && order.payment > 0 ? '6px' : '0' }}>
              <span style={{ fontSize: '14px', fontWeight: '700' }}>Total</span>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent)' }}>Rp {fmt(order.total)}</span>
            </div>
            {paid && order.payment > 0 && <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}>
                <span>Bayar ({order.payMethod})</span><span>Rp {fmt(order.payment)}</span>
              </div>
              {order.change > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: 'var(--green)' }}>
                <span>Kembalian</span><span>Rp {fmt(order.change)}</span>
              </div>}
            </>}
          </div>

          {/* Form bayar jika PENDING */}
          {!paid && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--red)', marginBottom: '12px' }}>Proses Pembayaran</div>
              <div style={{ marginBottom: '10px' }}>
                <div className="section-label">Metode</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {methods.map((m) => (
                    <button key={m} onClick={() => { setPayMethod(m); setPayment('') }}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${payMethod === m ? 'var(--accent)' : 'var(--border)'}`, background: payMethod === m ? 'var(--accent)' : '#fff', color: payMethod === m ? '#fff' : 'var(--text2)', fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {payMethod === 'CASH' && (
                <div style={{ marginBottom: '10px' }}>
                  <label className="label">Uang Bayar</label>
                  <input className="input" type="number" placeholder="0" value={payment} onChange={(e) => setPayment(e.target.value)} style={{ marginBottom: '6px' }} />
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {quickAmounts.map((v) => (
                      <button key={v} onClick={() => setPayment(String(v))}
                        style={{ padding: '4px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {fmt(v)}
                      </button>
                    ))}
                  </div>
                  {paid2 > 0 && <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '700', color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    Kembalian: Rp {fmt(Math.max(0, change))}
                  </div>}
                </div>
              )}
              <button onClick={handlePay} disabled={paying || (payMethod === 'CASH' && paid2 < order.total)}
                style={{ width: '100%', padding: '10px', borderRadius: '9px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (paying || (payMethod === 'CASH' && paid2 < order.total)) ? 0.6 : 1 }}>
                {paying ? 'Memproses...' : 'Konfirmasi Bayar'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
          <button onClick={handleToggle} disabled={toggling}
            style={{ flex: 1, padding: '10px', borderRadius: '9px', border: `1px solid ${served ? '#FDE68A' : '#A7F3D0'}`, background: served ? '#FFFBEB' : '#ECFDF5', color: served ? 'var(--orange)' : 'var(--green)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            {toggling ? '...' : served ? 'Batalkan Sajian' : 'Tandai Disajikan'}
          </button>
          <button onClick={handlePrint} disabled={printing}
            style={{ flex: 1, padding: '10px', borderRadius: '9px', border: '1px solid #C7D4F0', background: '#EFF4FF', color: 'var(--accent)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            {printing ? '⏳ Mencetak...' : '🖨️ Print Ulang'}
          </button>
        </div>
      </div>
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
function CheckoutModal({ cart, total, payLater = false, onClose, onSuccess }) {
  const [payMethod, setPayMethod] = useState(payLater ? 'NONTUNAI' : 'CASH')
  const [payment, setPayment] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [tx, setTx] = useState(null)
  const [printing, setPrinting] = useState(false)

  const paid = Number(payment) || 0
  const change = payMethod === 'CASH' ? paid - total : 0
  const methods = ['CASH', 'QRIS', 'TRANSFER', 'NONTUNAI']
  const quickAmounts = [50000, 100000, 150000, 200000]

  async function checkout() {
    if (payMethod === 'CASH' && !payLater && paid < total) return alert('Uang bayar kurang')
    setLoading(true)
    try {
      const items = cart.map((i) => {
        const o = { qty: i.qty, price: i.product.price }
        if (i.product.id.startsWith('manual_')) o.name = i.product.name
        else o.productId = i.product.id
        return o
      })
      const res = await api.post('/transactions', {
        items,
        payment: payLater ? 0 : (payMethod === 'CASH' ? paid : total),
        payMethod,
        payLater,
        customerName,
        note,
      })
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: '800' }}>{payLater ? 'Bayar Nanti' : 'Checkout'}</span>
            {payLater && <span style={{ fontSize: '11px', fontWeight: '700', background: '#FFFBEB', color: 'var(--orange)', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '20px' }}>Bon / Hutang</span>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {payLater && (
            <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A', fontSize: '13px', color: '#92400E', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span>Order akan dicatat sebagai <b>belum dibayar</b>. Pembayaran bisa dilakukan nanti.</span>
            </div>
          )}
          {/* Nama pembeli + catatan */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label className="label">Nama Pembeli</label>
              <input className="input" placeholder="Nama pelanggan" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="label">Catatan <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opsional)</span></label>
              <input className="input" placeholder="Tanpa es, extra shot..." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
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
          {!payLater && payMethod === 'CASH' && (
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
            {!payLater && payMethod === 'CASH' && paid > 0 && <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text2)' }}>
                <span>Bayar</span><span>Rp {fmt(paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', color: change >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '4px' }}>
                <span>Kembalian</span><span>Rp {fmt(Math.max(0, change))}</span>
              </div>
            </>}
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px' }}
            disabled={loading || (!payLater && payMethod === 'CASH' && paid < total)} onClick={checkout}>
            {loading ? 'Memproses...' : payLater ? 'Simpan Bon' : 'Bayar Sekarang'}
          </button>
        </div>
      </div>
    </div>
  )
}
