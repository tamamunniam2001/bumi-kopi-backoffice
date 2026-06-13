'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

const fmt = (n) => Number(n).toLocaleString('id-ID')

// ── Status Tracker ──────────────────────────────────────────────────────────
function OrderTracker({ orderId, onBack }) {
  const [order, setOrder] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch(`/api/self-orders/${orderId}`)
        setOrder(await r.json())
      } catch {}
    }
    fetch_()
    const iv = setInterval(() => { fetch_(); setTick(t => t + 1) }, 3000)
    return () => clearInterval(iv)
  }, [orderId])

  const dots = '.'.repeat((tick % 3) + 1)

  const cfg = {
    PENDING:   { emoji: '⏳', title: 'Menunggu Konfirmasi', sub: `Pesananmu sedang diterima kasir${dots}`, color: '#D4A96A', ring: 'rgba(212,169,106,0.3)', bg: 'rgba(212,169,106,0.08)' },
    APPROVED:  { emoji: '✅', title: 'Pesanan Dikonfirmasi!', sub: 'Silahkan ke kasir untuk pembayaran', color: '#4ADE80', ring: 'rgba(74,222,128,0.3)', bg: 'rgba(74,222,128,0.06)' },
    REJECTED:  { emoji: '❌', title: 'Pesanan Ditolak', sub: 'Maaf, pesanan tidak bisa diproses. Silahkan order ulang.', color: '#F87171', ring: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.06)' },
    COMPLETED: { emoji: '🎉', title: 'Terima Kasih!', sub: 'Pesananmu selesai. Sampai jumpa lagi!', color: '#4ADE80', ring: 'rgba(74,222,128,0.3)', bg: 'rgba(74,222,128,0.06)' },
  }
  const c = cfg[order?.status || 'PENDING']
  const steps = ['PENDING', 'APPROVED', 'COMPLETED']
  const stepIdx = steps.indexOf(order?.status || 'PENDING')

  return (
    <div style={{ minHeight: '100dvh', background: '#0A0A0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.12);opacity:0.2} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>

      <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeUp 0.5s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px', animation: 'float 3s ease-in-out infinite' }}>☕</div>
          <div style={{ fontSize: '11px', letterSpacing: '6px', color: '#D4A96A', fontWeight: '600', textTransform: 'uppercase' }}>BUMI KOPI</div>
        </div>

        {/* Status card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '36px 28px', textAlign: 'center', backdropFilter: 'blur(20px)', marginBottom: '16px' }}>
          {/* Ring pulse */}
          <div style={{ position: 'relative', width: '88px', height: '88px', margin: '0 auto 24px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c.ring, animation: 'pulse-ring 2s ease-in-out infinite' }} />
            <div style={{ position: 'relative', width: '88px', height: '88px', borderRadius: '50%', background: c.bg, border: `1.5px solid ${c.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
              {c.emoji}
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#F5F0E8', marginBottom: '8px', letterSpacing: '-0.3px' }}>{c.title}</div>
          <div style={{ fontSize: '13px', color: '#8A8A9A', lineHeight: 1.7 }}>{c.sub}</div>
          {order && <div style={{ marginTop: '14px', fontSize: '11px', color: '#D4A96A', fontFamily: 'monospace', letterSpacing: '2px' }}>#{order.orderNo}</div>}
        </div>

        {/* Order detail */}
        {order && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#6A6A7A', letterSpacing: '1px', textTransform: 'uppercase' }}>Detail Pesanan</span>
              {order.tableNo && <span style={{ fontSize: '11px', fontWeight: '700', color: '#D4A96A', background: 'rgba(212,169,106,0.12)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(212,169,106,0.2)' }}>Meja {order.tableNo}</span>}
            </div>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: '13px', color: '#C8C0B0' }}>{item.name} <span style={{ color: '#5A5A6A' }}>×{item.qty}</span></span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#E8E0D0' }}>Rp {fmt(item.subtotal)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#8A8A9A' }}>Total</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#D4A96A' }}>Rp {fmt(order.total)}</span>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          {['Order', 'Konfirmasi', 'Selesai'].map((label, i) => {
            const done = i <= stepIdx
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: done ? '#D4A96A' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${done ? '#D4A96A' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s' }}>
                    {done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span style={{ fontSize: '11px', color: '#4A4A5A', fontWeight: '700' }}>{i + 1}</span>}
                  </div>
                  <span style={{ fontSize: '10px', color: done ? '#D4A96A' : '#4A4A5A', fontWeight: done ? '700' : '400', letterSpacing: '0.3px' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ width: '36px', height: '1px', background: i < stepIdx ? '#D4A96A' : 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: '20px', transition: 'background 0.4s' }} />}
              </div>
            )
          })}
        </div>

        {(order?.status === 'REJECTED' || order?.status === 'COMPLETED') && (
          <button onClick={onBack} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #D4A96A, #B8893A)', color: '#0A0A0F', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.3px' }}>
            {order.status === 'REJECTED' ? '↩ Order Ulang' : '☕ Order Lagi'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
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
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    const load = async () => {
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
    load()
    const t = setTimeout(() => setSplash(false), 2200)
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
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0))
  }, [])

  const qtyOf = (id) => cart.find(i => i.product.id === id)?.qty || 0
  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const totalQty = cart.reduce((s, i) => s + i.qty, 0)

  const filtered = products.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || (p.code || '').toLowerCase().includes(search.toLowerCase())
    const mc = !selectedCat || p.category?.name === selectedCat
    return ms && mc
  })

  async function handleSubmitOrder() {
    if (!cart.length) return
    setSubmitting(true)
    try {
      const items = cart.map(i => ({ productId: i.product.id, name: i.product.name, price: i.product.price, qty: i.qty, imageUrl: i.product.imageUrl || null }))
      const r = await fetch('/api/self-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNo, customerName, note, items }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.message)
      setActiveOrderId(data.id)
      setCart([]); setCheckoutOpen(false); setCartOpen(false)
    } catch (e) { alert(e.message || 'Gagal mengirim order') }
    finally { setSubmitting(false) }
  }

  if (activeOrderId) return <OrderTracker orderId={activeOrderId} onBack={() => { setActiveOrderId(null); setTableNo(''); setCustomerName(''); setNote('') }} />

  return (
    <div style={{ minHeight: '100dvh', background: '#0A0A0F', fontFamily: "'Inter', system-ui, sans-serif", color: '#F0EAE0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes splashFade { 0%{opacity:1;transform:scale(1)} 80%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.04)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        input:focus, textarea:focus { outline: none; }
      `}</style>

      {/* Splash */}
      {splash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0A0A0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'splashFade 2.2s ease forwards' }}>
          <div style={{ animation: 'float 2s ease-in-out infinite', fontSize: '64px', marginBottom: '20px' }}>☕</div>
          <div style={{ fontSize: '11px', letterSpacing: '8px', color: '#D4A96A', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>BUMI KOPI</div>
          <div style={{ fontSize: '12px', color: '#4A4A5A', letterSpacing: '2px' }}>Self Order</div>
        </div>
      )}

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#F0EAE0', letterSpacing: '0.5px' }}>☕ Bumi Kopi</div>
            <div style={{ fontSize: '11px', color: '#6A6A7A', marginTop: '1px' }}>Pilih menu favoritmu</div>
          </div>
          {/* Cart button */}
          <button onClick={() => setCartOpen(true)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', padding: totalQty > 0 ? '10px 18px' : '10px 14px', borderRadius: '14px', border: `1px solid ${totalQty > 0 ? 'rgba(212,169,106,0.4)' : 'rgba(255,255,255,0.08)'}`, background: totalQty > 0 ? 'rgba(212,169,106,0.12)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', color: totalQty > 0 ? '#D4A96A' : '#6A6A7A', transition: 'all 0.2s', fontFamily: 'inherit' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            {totalQty > 0 && <>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#D4A96A' }}>{totalQty}</span>
              <span style={{ width: '1px', height: '14px', background: 'rgba(212,169,106,0.3)' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#D4A96A' }}>Rp {fmt(total)}</span>
            </>}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '100px' }}>

        {/* Search */}
        <div style={{ padding: '16px 20px 8px' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4A4A5A' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari menu..." style={{ width: '100%', padding: '11px 16px 11px 42px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.04)', color: '#F0EAE0', fontSize: '14px', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Categories */}
        <div style={{ padding: '8px 20px 4px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[{ label: 'Semua', value: null }, ...categories.map(c => ({ label: c, value: c }))].map(({ label, value }) => (
            <button key={label} onClick={() => setSelectedCat(value)} style={{ padding: '7px 18px', borderRadius: '20px', border: `1px solid ${selectedCat === value ? '#D4A96A' : 'rgba(255,255,255,0.08)'}`, background: selectedCat === value ? 'rgba(212,169,106,0.15)' : 'transparent', color: selectedCat === value ? '#D4A96A' : '#6A6A7A', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.2s', letterSpacing: '0.3px' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Product Grid — identical data to kasir */}
        <div style={{ padding: '12px 20px' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: '18px', background: 'rgba(255,255,255,0.04)', height: '200px', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {filtered.map(p => {
                const qty = qtyOf(p.id)
                const outOfStock = p.stock <= 0
                return (
                  <div key={p.id} style={{ borderRadius: '18px', border: `1px solid ${qty > 0 ? 'rgba(212,169,106,0.4)' : 'rgba(255,255,255,0.06)'}`, background: qty > 0 ? 'rgba(212,169,106,0.06)' : 'rgba(255,255,255,0.03)', overflow: 'hidden', transition: 'all 0.2s', opacity: outOfStock ? 0.4 : 1 }}>
                    {/* Image */}
                    <div style={{ position: 'relative', height: '130px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>☕</div>
                      }
                      {outOfStock && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,15,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#6A6A7A', letterSpacing: '2px', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px' }}>Habis</span>
                        </div>
                      )}
                      {qty > 0 && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#D4A96A', color: '#0A0A0F', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900' }}>
                          {qty}
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: '12px 12px 10px' }}>
                      {p.category && <div style={{ fontSize: '10px', fontWeight: '600', color: '#D4A96A', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.7 }}>{p.category.name}</div>}
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#F0EAE0', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#D4A96A', marginBottom: '10px' }}>Rp {fmt(p.price)}</div>
                      {/* Controls */}
                      {outOfStock ? null : qty === 0 ? (
                        <button onClick={() => addToCart(p)} style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1px solid rgba(212,169,106,0.3)', background: 'rgba(212,169,106,0.08)', color: '#D4A96A', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.3px', transition: 'all 0.2s' }}>
                          + Tambah
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(212,169,106,0.08)', borderRadius: '10px', border: '1px solid rgba(212,169,106,0.2)', overflow: 'hidden' }}>
                          <button onClick={() => removeFromCart(p.id)} style={{ width: '36px', height: '36px', border: 'none', background: 'transparent', color: '#D4A96A', fontSize: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ flex: 1, textAlign: 'center', fontWeight: '800', fontSize: '15px', color: '#F0EAE0' }}>{qty}</span>
                          <button onClick={() => addToCart(p)} style={{ width: '36px', height: '36px', border: 'none', background: '#D4A96A', color: '#0A0A0F', fontSize: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && !loading && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#4A4A5A' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>☕</div>
                  <div style={{ fontSize: '14px' }}>Menu tidak ditemukan</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB — sticky bottom CTA */}
      {totalQty > 0 && !cartOpen && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, width: 'calc(100% - 40px)', maxWidth: '600px', animation: 'fadeUp 0.3s ease' }}>
          <button onClick={() => setCartOpen(true)} style={{ width: '100%', padding: '17px 24px', borderRadius: '18px', border: 'none', background: 'linear-gradient(135deg, #D4A96A 0%, #B8893A 100%)', color: '#0A0A0F', fontSize: '15px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(212,169,106,0.35)', letterSpacing: '0.2px' }}>
            <span>{totalQty} item dipilih</span>
            <span>Rp {fmt(total)} →</span>
          </button>
        </div>
      )}

      {/* Cart Sheet */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, backdropFilter: 'blur(8px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 400, width: '100%', maxWidth: '640px', background: '#111118', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', maxHeight: '80dvh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: '36px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#F0EAE0' }}>Pesanan Saya</div>
              <button onClick={() => setCartOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', color: '#6A6A7A', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {cart.map((item, i) => (
                <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i < cart.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.product.imageUrl ? <img src={item.product.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} /> : <span style={{ fontSize: '20px' }}>☕</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#E8E0D0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#D4A96A', marginTop: '1px' }}>Rp {fmt(item.product.price)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <button onClick={() => removeFromCart(item.product.id)} style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', color: '#D4A96A', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ width: '28px', textAlign: 'center', fontSize: '14px', fontWeight: '800', color: '#F0EAE0' }}>{item.qty}</span>
                    <button onClick={() => addToCart(item.product)} style={{ width: '32px', height: '32px', border: 'none', background: '#D4A96A', color: '#0A0A0F', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', color: '#8A8A9A', fontWeight: '500' }}>Total</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: '#D4A96A' }}>Rp {fmt(total)}</span>
              </div>
              <button onClick={() => { setCartOpen(false); setCheckoutOpen(true) }} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #D4A96A, #B8893A)', color: '#0A0A0F', fontSize: '15px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit' }}>
                Lanjutkan →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Checkout Sheet */}
      {checkoutOpen && (
        <>
          <div onClick={() => setCheckoutOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, backdropFilter: 'blur(8px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 400, width: '100%', maxWidth: '640px', background: '#111118', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', maxHeight: '90dvh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: '36px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#F0EAE0' }}>Konfirmasi Pesanan</div>
              <button onClick={() => setCheckoutOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', color: '#6A6A7A', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {/* Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#6A6A7A', display: 'block', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Nomor Meja</label>
                  <input value={tableNo} onChange={e => setTableNo(e.target.value)} placeholder="Contoh: 5, A3..." style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#F0EAE0', fontSize: '14px', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#6A6A7A', display: 'block', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Nama Kamu</label>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Panggilan kamu" style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#F0EAE0', fontSize: '14px', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#6A6A7A', display: 'block', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Catatan</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Tanpa es, extra shot, less sugar..." rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#F0EAE0', fontSize: '14px', fontFamily: 'inherit', resize: 'none' }} />
              </div>
              {/* Order summary */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6A6A7A', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>{totalQty} Item</div>
                {cart.map((item, i) => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < cart.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', fontSize: '13px' }}>
                    <span style={{ color: '#A0A0B0' }}>{item.product.name} <span style={{ color: '#5A5A6A' }}>×{item.qty}</span></span>
                    <span style={{ fontWeight: '600', color: '#E8E0D0' }}>Rp {fmt(item.product.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              {/* Payment info */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)', borderRadius: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>💳</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#4ADE80', marginBottom: '2px' }}>Bayar di Kasir</div>
                  <div style={{ fontSize: '11px', color: '#4A6A4A', lineHeight: 1.6 }}>Setelah pesanan dikonfirmasi, langsung ke kasir untuk membayar. Cash, QRIS, atau Transfer.</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: '#6A6A7A' }}>Total Pembayaran</span>
                <span style={{ fontSize: '24px', fontWeight: '900', color: '#D4A96A' }}>Rp {fmt(total)}</span>
              </div>
              <button onClick={handleSubmitOrder} disabled={submitting} style={{ width: '100%', padding: '17px', borderRadius: '14px', border: 'none', background: submitting ? 'rgba(212,169,106,0.3)' : 'linear-gradient(135deg, #D4A96A, #B8893A)', color: submitting ? '#6A6A7A' : '#0A0A0F', fontSize: '15px', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.2px', transition: 'all 0.2s' }}>
                {submitting ? '⏳ Mengirim...' : '🛎️ Kirim Pesanan ke Kasir'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
