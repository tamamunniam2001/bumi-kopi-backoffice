'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

const fmt = (n) => Number(n).toLocaleString('id-ID')

// ── Komponen Kartu Produk ────────────────────────────────────────────────────
function ProductCard({ product, qty, onAdd, onRemove }) {
  const outOfStock = product.stock <= 0
  return (
    <div style={{
      background: '#fff',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: qty > 0 ? '0 8px 32px rgba(139,90,43,0.18)' : '0 2px 12px rgba(0,0,0,0.07)',
      border: `2px solid ${qty > 0 ? '#C8935A' : 'transparent'}`,
      transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
      opacity: outOfStock ? 0.5 : 1,
      position: 'relative',
    }}>
      {/* Gambar */}
      <div style={{ position: 'relative', height: '140px', background: 'linear-gradient(135deg,#FFF8F0,#FDEFD8)', overflow: 'hidden' }}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>☕</div>
        }
        {outOfStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: '#fff', color: '#374151', fontSize: '11px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.5px' }}>HABIS</span>
          </div>
        )}
        {qty > 0 && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#C8935A', color: '#fff', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', boxShadow: '0 2px 8px rgba(200,147,90,0.5)' }}>
            {qty}
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: '14px 14px 12px' }}>
        {product.category && (
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#C8935A', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#FFF3E8', padding: '2px 8px', borderRadius: '20px' }}>
            {product.category.name}
          </span>
        )}
        <div style={{ fontSize: '14px', fontWeight: '800', color: '#1A0F00', marginTop: '6px', marginBottom: '2px', lineHeight: 1.3 }}>{product.name}</div>
        <div style={{ fontSize: '14px', fontWeight: '800', color: '#C8935A', marginBottom: '12px' }}>Rp {fmt(product.price)}</div>

        {/* Kontrol qty */}
        {outOfStock ? null : qty === 0 ? (
          <button onClick={() => onAdd(product)} style={{
            width: '100%', padding: '10px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg,#C8935A,#A0682F)', color: '#fff',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF3E8', borderRadius: '12px', padding: '4px' }}>
            <button onClick={() => onRemove(product.id)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: 'none', background: '#fff', color: '#C8935A', fontSize: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>−</button>
            <span style={{ flex: 1, textAlign: 'center', fontWeight: '800', fontSize: '16px', color: '#1A0F00' }}>{qty}</span>
            <button onClick={() => onAdd(product)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg,#C8935A,#A0682F)', color: '#fff', fontSize: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(200,147,90,0.4)' }}>+</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Status Tracker ──────────────────────────────────────────────────────────
function OrderTracker({ orderId, onBack }) {
  const [order, setOrder] = useState(null)
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const r = await fetch(`/api/self-orders/${orderId}`)
        const data = await r.json()
        setOrder(data)
      } catch {}
    }
    fetchOrder()
    const interval = setInterval(fetchOrder, 3000)
    return () => clearInterval(interval)
  }, [orderId])

  useEffect(() => {
    const t = setInterval(() => setDots(d => d === 3 ? 1 : d + 1), 600)
    return () => clearInterval(t)
  }, [])

  const statusConfig = {
    PENDING: { icon: '⏳', label: 'Menunggu Konfirmasi', color: '#D97706', bg: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border: '#FDE68A', desc: 'Pesanan kamu sedang diterima kasir' + '.'.repeat(dots) },
    APPROVED: { icon: '✅', label: 'Dikonfirmasi!', color: '#059669', bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '#6EE7B7', desc: 'Pesanan kamu sedang diproses, silahkan ke kasir untuk membayar' },
    REJECTED: { icon: '❌', label: 'Ditolak', color: '#DC2626', bg: 'linear-gradient(135deg,#FEF2F2,#FEE2E2)', border: '#FECACA', desc: 'Maaf, pesanan tidak dapat diproses. Silahkan order ulang.' },
    COMPLETED: { icon: '🎉', label: 'Selesai!', color: '#059669', bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '#6EE7B7', desc: 'Terima kasih sudah memesan di Bumi Kopi!' },
  }

  const cfg = statusConfig[order?.status || 'PENDING']

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#1A0F00 0%,#3D2012 40%,#6B3A1F 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>☕</div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#F5DEB3', letterSpacing: '2px' }}>BUMI KOPI</div>
        </div>

        {/* Status card */}
        <div style={{ background: cfg.bg, borderRadius: '28px', border: `2px solid ${cfg.border}`, padding: '32px 24px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}>{cfg.icon}</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: cfg.color, marginBottom: '8px' }}>{cfg.label}</div>
          <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6 }}>{cfg.desc}</div>
          {order && <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: '700', color: '#9CA3AF', fontFamily: 'monospace', letterSpacing: '1px' }}>#{order.orderNo}</div>}
        </div>

        {/* Detail order */}
        {order && (
          <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.15)', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#F5DEB3', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Detail Pesanan</span>
              {order.tableNo && <span style={{ background: 'rgba(200,147,90,0.3)', color: '#F5DEB3', padding: '2px 10px', borderRadius: '20px', fontSize: '11px' }}>Meja {order.tableNo}</span>}
            </div>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                <span style={{ fontSize: '13px', color: '#D4A96A' }}>{item.name} <span style={{ color: 'rgba(255,255,255,0.4)' }}>×{item.qty}</span></span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#F5DEB3' }}>Rp {fmt(item.subtotal)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#F5DEB3' }}>Total</span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#C8935A' }}>Rp {fmt(order.total)}</span>
            </div>
          </div>
        )}

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '24px' }}>
          {[
            { key: 'PENDING', label: 'Order', icon: '📋' },
            { key: 'APPROVED', label: 'Konfirmasi', icon: '✅' },
            { key: 'COMPLETED', label: 'Selesai', icon: '🎉' },
          ].map((step, i, arr) => {
            const statuses = ['PENDING', 'APPROVED', 'COMPLETED']
            const currentIdx = statuses.indexOf(order?.status || 'PENDING')
            const stepIdx = statuses.indexOf(step.key)
            const done = stepIdx <= currentIdx
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: done ? '#C8935A' : 'rgba(255,255,255,0.1)', border: `2px solid ${done ? '#C8935A' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.3s' }}>
                    {done ? step.icon : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>{i + 1}</span>}
                  </div>
                  <span style={{ fontSize: '10px', color: done ? '#F5DEB3' : 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: '40px', height: '2px', background: stepIdx < currentIdx ? '#C8935A' : 'rgba(255,255,255,0.1)', margin: '0 4px', marginBottom: '18px', transition: 'background 0.3s' }} />
                )}
              </div>
            )
          })}
        </div>

        {(order?.status === 'REJECTED' || order?.status === 'COMPLETED') && (
          <button onClick={onBack} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg,#C8935A,#A0682F)', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(200,147,90,0.4)' }}>
            {order?.status === 'REJECTED' ? '🔄 Order Ulang' : '☕ Order Lagi'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Halaman Utama Self Order ─────────────────────────────────────────────────
export default function SelfOrderPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [tableNo, setTableNo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeOrderId, setActiveOrderId] = useState(null)
  const [heroVisible, setHeroVisible] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const r = await fetch('/api/products?slim=1')
        const data = await r.json()
        const active = data.filter(p => p.isActive !== false)
        setProducts(active)
        const cats = [...new Set(active.map(p => p.category?.name).filter(Boolean))].sort()
        setCategories(cats)
      } catch {}
      setLoading(false)
    }
    loadProducts()
    // Sembunyikan hero setelah 3 detik
    const t = setTimeout(() => setHeroVisible(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) return
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id)
      if (idx >= 0) return prev.map((i, n) => n === idx ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product, qty: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, qty: i.qty - 1 } : i)
      .filter(i => i.qty > 0))
  }, [])

  const qtyOf = (id) => cart.find(i => i.product.id === id)?.qty || 0
  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const totalQty = cart.reduce((s, i) => s + i.qty, 0)

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCat || p.category?.name === selectedCat
    return matchSearch && matchCat
  })

  async function handleSubmitOrder() {
    if (!cart.length) return
    setSubmitting(true)
    try {
      const items = cart.map(i => ({
        productId: i.product.id,
        name: i.product.name,
        price: i.product.price,
        qty: i.qty,
        imageUrl: i.product.imageUrl || null,
      }))
      const r = await fetch('/api/self-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNo, customerName, note, items }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.message)
      setActiveOrderId(data.id)
      setCart([])
      setCheckoutOpen(false)
      setCartOpen(false)
    } catch (e) {
      alert(e.message || 'Gagal mengirim order')
    } finally {
      setSubmitting(false)
    }
  }

  if (activeOrderId) {
    return <OrderTracker orderId={activeOrderId} onBack={() => { setActiveOrderId(null); setTableNo(''); setCustomerName(''); setNote('') }} />
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F0E8', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Hero Banner ── */}
      {heroVisible && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'linear-gradient(160deg,#1A0F00 0%,#3D2012 50%,#6B3A1F 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeOut 0.5s ease 2.5s forwards',
        }}>
          <style>{`@keyframes fadeOut { to { opacity: 0; pointer-events: none; } } @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
          <div style={{ animation: 'slideUp 0.6s ease', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }}>☕</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#F5DEB3', letterSpacing: '4px', marginBottom: '8px' }}>BUMI KOPI</div>
            <div style={{ fontSize: '14px', color: '#C8935A', letterSpacing: '2px', textTransform: 'uppercase' }}>Self Order · Silahkan pilih menu</div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'linear-gradient(135deg,#1A0F00,#3D2012)',
        padding: '16px 20px',
        boxShadow: '0 4px 20px rgba(26,15,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '640px', margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#F5DEB3', letterSpacing: '1.5px' }}>☕ BUMI KOPI</div>
            <div style={{ fontSize: '11px', color: '#C8935A', marginTop: '1px' }}>Pilih menu favoritmu</div>
          </div>
          {/* Cart button */}
          <button onClick={() => setCartOpen(true)} style={{
            position: 'relative', background: totalQty > 0 ? 'linear-gradient(135deg,#C8935A,#A0682F)' : 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: '16px', padding: '10px 16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontFamily: 'inherit',
            transition: 'all 0.2s', boxShadow: totalQty > 0 ? '0 4px 16px rgba(200,147,90,0.4)' : 'none',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            {totalQty > 0 && <span style={{ fontWeight: '800', fontSize: '14px' }}>{totalQty} item</span>}
            {totalQty > 0 && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>· Rp {fmt(total)}</span>}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 0 120px' }}>

        {/* ── Search ── */}
        <div style={{ padding: '16px 20px 8px' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari menu..."
              style={{
                width: '100%', padding: '12px 16px 12px 44px', borderRadius: '16px',
                border: '2px solid #E8D5C0', background: '#fff', fontSize: '14px',
                fontFamily: 'inherit', outline: 'none', color: '#1A0F00', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* ── Kategori ── */}
        <div style={{ padding: '8px 20px', display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[{ label: 'Semua', value: null }, ...categories.map(c => ({ label: c, value: c }))].map(({ label, value }) => (
            <button key={label} onClick={() => setSelectedCat(value)} style={{
              padding: '8px 18px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap',
              background: selectedCat === value ? 'linear-gradient(135deg,#C8935A,#A0682F)' : '#fff',
              color: selectedCat === value ? '#fff' : '#6B3A1F',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: selectedCat === value ? '0 4px 12px rgba(200,147,90,0.35)' : '0 1px 4px rgba(0,0,0,0.07)',
              transition: 'all 0.2s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Grid Produk ── */}
        <div style={{ padding: '12px 20px' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '20px', height: '220px', animation: 'pulse 1.5s infinite', opacity: 0.6 }}>
                  <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} qty={qtyOf(p.id)} onAdd={addToCart} onRemove={removeFromCart} />
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>☕</div>
                  <div style={{ fontSize: '15px', fontWeight: '600' }}>Menu tidak ditemukan</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── FAB Checkout ── */}
      {totalQty > 0 && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, width: 'calc(100% - 40px)', maxWidth: '600px' }}>
          <button onClick={() => setCartOpen(true)} style={{
            width: '100%', padding: '18px 24px', borderRadius: '20px', border: 'none',
            background: 'linear-gradient(135deg,#C8935A,#A0682F)',
            color: '#fff', fontSize: '16px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 8px 32px rgba(200,147,90,0.5)',
            animation: 'slideUp 0.3s ease',
          }}>
            <span>{totalQty} item dipilih</span>
            <span>Rp {fmt(total)} →</span>
          </button>
        </div>
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,15,0,0.6)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 400,
            width: '100%', maxWidth: '640px', background: '#fff', borderRadius: '28px 28px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', maxHeight: '80dvh', display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s cubic-bezier(.4,0,.2,1)',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#E5D5C5' }} />
            </div>
            <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#1A0F00' }}>🛒 Pesanan Saya</div>
              <button onClick={() => setCartOpen(false)} style={{ background: '#F5F5F5', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>×</button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {cart.map(item => (
                <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #F3EBE0' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#F5EFE8', overflow: 'hidden', flexShrink: 0 }}>
                    {item.product.imageUrl
                      ? <img src={item.product.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>☕</div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1A0F00', marginBottom: '2px' }}>{item.product.name}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#C8935A' }}>Rp {fmt(item.product.price * item.qty)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF3E8', borderRadius: '12px', padding: '4px 8px' }}>
                    <button onClick={() => removeFromCart(item.product.id)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#fff', color: '#C8935A', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>−</button>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: '#1A0F00', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                    <button onClick={() => addToCart(item.product)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#C8935A', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total + CTA */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #F3EBE0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#6B3A1F' }}>Total</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: '#C8935A' }}>Rp {fmt(total)}</span>
              </div>
              <button onClick={() => { setCartOpen(false); setCheckoutOpen(true) }} style={{
                width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                background: 'linear-gradient(135deg,#C8935A,#A0682F)', color: '#fff',
                fontSize: '16px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 6px 20px rgba(200,147,90,0.4)',
              }}>
                Lanjutkan Pesanan →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Checkout Modal ── */}
      {checkoutOpen && (
        <>
          <div onClick={() => setCheckoutOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,15,0,0.6)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 400,
            width: '100%', maxWidth: '640px', background: '#fff', borderRadius: '28px 28px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', maxHeight: '90dvh', display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s cubic-bezier(.4,0,.2,1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#E5D5C5' }} />
            </div>
            <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#1A0F00' }}>📋 Konfirmasi Pesanan</div>
              <button onClick={() => setCheckoutOpen(false)} style={{ background: '#F5F5F5', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', color: '#6B7280' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {/* Form info */}
              <div style={{ background: '#FFF8F0', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid #F3E0C8' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#C8935A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Informasi Pesanan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B3A1F', display: 'block', marginBottom: '4px' }}>Nomor Meja <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(opsional)</span></label>
                    <input value={tableNo} onChange={e => setTableNo(e.target.value)} placeholder="Contoh: 5, A3, VIP..." style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E8D5C0', fontSize: '14px', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box', outline: 'none', color: '#1A0F00' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B3A1F', display: 'block', marginBottom: '4px' }}>Nama Kamu <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(opsional)</span></label>
                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Supaya kasir mudah manggil" style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E8D5C0', fontSize: '14px', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box', outline: 'none', color: '#1A0F00' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B3A1F', display: 'block', marginBottom: '4px' }}>Catatan <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(opsional)</span></label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Tanpa es, extra shot, dll..." rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E8D5C0', fontSize: '14px', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box', outline: 'none', resize: 'none', color: '#1A0F00' }} />
                  </div>
                </div>
              </div>

              {/* Ringkasan item */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Ringkasan ({totalQty} item)</div>
                {cart.map((item, i) => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < cart.length - 1 ? '1px solid #F3EBE0' : 'none', fontSize: '14px' }}>
                    <span style={{ color: '#4B3020' }}>{item.product.name} <span style={{ color: '#9CA3AF' }}>×{item.qty}</span></span>
                    <span style={{ fontWeight: '700', color: '#1A0F00' }}>Rp {fmt(item.product.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Metode bayar info */}
              <div style={{ background: '#EFF6FF', borderRadius: '14px', padding: '14px 16px', border: '1px solid #BFDBFE', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>💳</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E40AF', marginBottom: '2px' }}>Bayar di Kasir</div>
                  <div style={{ fontSize: '12px', color: '#3B82F6', lineHeight: 1.5 }}>Setelah pesanan dikonfirmasi, silahkan datang ke kasir untuk pembayaran. Bisa Cash, QRIS, atau Transfer.</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #F3EBE0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#6B3A1F' }}>Total</span>
                <span style={{ fontSize: '24px', fontWeight: '900', color: '#C8935A' }}>Rp {fmt(total)}</span>
              </div>
              <button onClick={handleSubmitOrder} disabled={submitting} style={{
                width: '100%', padding: '18px', borderRadius: '16px', border: 'none',
                background: submitting ? '#D1C0B0' : 'linear-gradient(135deg,#C8935A,#A0682F)',
                color: '#fff', fontSize: '16px', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', boxShadow: submitting ? 'none' : '0 6px 20px rgba(200,147,90,0.4)',
              }}>
                {submitting ? '⏳ Mengirim Pesanan...' : '🛎️ Kirim Pesanan ke Kasir'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
