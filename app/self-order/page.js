'use client'
import { useState, useEffect, useCallback } from 'react'

const fmt = (n) => Number(n).toLocaleString('id-ID')

// Warna aksen utama
const A = '#6F4E37'       // coklat kopi — tombol, harga, aktif
const AL = '#FDF6EF'      // latar aksen muda
const AB = '#E8D5C0'      // border aksen
const GRAY = '#9CA3AF'
const GRAY2 = '#6B7280'
const BORDER = '#F0EBE3'
const BG = '#FAFAFA'
const WHITE = '#FFFFFF'
const TEXT = '#1C1209'
const TEXT2 = '#4B3A2A'

// ── Order Tracker ────────────────────────────────────────────────────────────
function OrderTracker({ orderId, onBack }) {
  const [order, setOrder] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const go = async () => {
      try { const r = await fetch(`/api/self-orders/${orderId}`); setOrder(await r.json()) } catch {}
    }
    go()
    const iv = setInterval(() => { go(); setTick(t => t + 1) }, 3000)
    return () => clearInterval(iv)
  }, [orderId])

  const dots = '.'.repeat((tick % 3) + 1)
  const cfg = {
    PENDING:   { emoji: '⏳', title: 'Menunggu Konfirmasi', sub: `Pesananmu sedang diterima kasir${dots}`, accent: '#D97706', bg: '#FFFBEB', border: '#FDE68A', step: 0 },
    APPROVED:  { emoji: '✅', title: 'Pesanan Dikonfirmasi!', sub: 'Silahkan ke kasir untuk pembayaran', accent: '#059669', bg: '#ECFDF5', border: '#6EE7B7', step: 1 },
    REJECTED:  { emoji: '❌', title: 'Pesanan Ditolak', sub: 'Maaf, pesanan tidak bisa diproses. Silahkan order ulang.', accent: '#DC2626', bg: '#FEF2F2', border: '#FECACA', step: 0 },
    COMPLETED: { emoji: '🎉', title: 'Terima Kasih!', sub: 'Pesananmu selesai. Sampai jumpa lagi!', accent: '#059669', bg: '#ECFDF5', border: '#6EE7B7', step: 2 },
  }
  const c = cfg[order?.status || 'PENDING']

  return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ping{0%{transform:scale(1);opacity:.5}80%,100%{transform:scale(1.5);opacity:0}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
      `}</style>
      <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeUp .5s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '40px', animation: 'float 3s ease-in-out infinite', marginBottom: '8px' }}>☕</div>
          <div style={{ fontSize: '10px', letterSpacing: '5px', color: A, fontWeight: '700', textTransform: 'uppercase' }}>BUMI KOPI</div>
        </div>

        {/* Status card */}
        <div style={{ background: WHITE, borderRadius: '24px', border: `1.5px solid ${c.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: '32px 24px', textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 20px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c.border, animation: 'ping 2s ease-in-out infinite' }} />
            <div style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>{c.emoji}</div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: TEXT, marginBottom: '6px' }}>{c.title}</div>
          <div style={{ fontSize: '13px', color: GRAY2, lineHeight: 1.7 }}>{c.sub}</div>
          {order && <div style={{ marginTop: '12px', fontSize: '11px', color: A, fontFamily: 'monospace', letterSpacing: '2px', fontWeight: '600' }}>#{order.orderNo}</div>}
        </div>

        {/* Detail */}
        {order && (
          <div style={{ background: WHITE, borderRadius: '18px', border: `1px solid ${BORDER}`, padding: '18px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: GRAY, letterSpacing: '1px', textTransform: 'uppercase' }}>Detail Pesanan</span>
              {order.tableNo && <span style={{ fontSize: '11px', fontWeight: '700', color: A, background: AL, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${AB}` }}>Meja {order.tableNo}</span>}
            </div>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < order.items.length - 1 ? `1px solid ${BORDER}` : 'none', fontSize: '13px' }}>
                <span style={{ color: TEXT2 }}>{item.name} <span style={{ color: GRAY }}>×{item.qty}</span></span>
                <span style={{ fontWeight: '600', color: TEXT }}>Rp {fmt(item.subtotal)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: TEXT2 }}>Total</span>
              <span style={{ fontSize: '20px', fontWeight: '900', color: A }}>Rp {fmt(order.total)}</span>
            </div>
          </div>
        )}

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          {['Order', 'Konfirmasi', 'Selesai'].map((label, i) => {
            const done = i <= c.step
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: done ? A : '#F3F4F6', border: `1.5px solid ${done ? A : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s' }}>
                    {done ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span style={{ fontSize: '11px', color: GRAY, fontWeight: '700' }}>{i + 1}</span>}
                  </div>
                  <span style={{ fontSize: '10px', color: done ? A : GRAY, fontWeight: done ? '700' : '400' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ width: '32px', height: '1.5px', background: i < c.step ? A : '#E5E7EB', margin: '0 4px', marginBottom: '18px', transition: 'background .3s' }} />}
              </div>
            )
          })}
        </div>

        {(order?.status === 'REJECTED' || order?.status === 'COMPLETED') && (
          <button onClick={onBack} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: A, color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 6px 20px ${A}40` }}>
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
        const r = await fetch('/api/public')
        const data = await r.json()
        const active = (Array.isArray(data) ? data : []).filter(p => p.isActive !== false)
        setProducts(active)
        setCategories([...new Set(active.map(p => p.category?.name).filter(Boolean))].sort())
      } catch {}
      setLoading(false)
    }
    load()
    const t = setTimeout(() => setSplash(false), 1800)
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

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0))
  }, [])

  const qtyOf = (id) => cart.find(i => i.product.id === id)?.qty || 0
  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const totalQty = cart.reduce((s, i) => s + i.qty, 0)
  const filtered = products.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.code || '').toLowerCase().includes(search.toLowerCase())) &&
    (!selectedCat || p.category?.name === selectedCat)
  )

  async function handleSubmitOrder() {
    if (!cart.length) return
    setSubmitting(true)
    try {
      const r = await fetch('/api/self-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNo, customerName, note, items: cart.map(i => ({ productId: i.product.id, name: i.product.name, price: i.product.price, qty: i.qty, imageUrl: i.product.imageUrl || null })) }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.message)
      setActiveOrderId(data.id)
      setCart([]); setCheckoutOpen(false); setCartOpen(false)
    } catch (e) { alert(e.message || 'Gagal mengirim order') }
    finally { setSubmitting(false) }
  }

  if (activeOrderId) return <OrderTracker orderId={activeOrderId} onBack={() => { setActiveOrderId(null); setTableNo(''); setCustomerName(''); setNote('') }} />

  // shared input style
  const inp = { width: '100%', padding: '11px 14px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, background: '#FAFAFA', color: TEXT, fontSize: '14px', fontFamily: 'inherit', outline: 'none' }

  return (
    <div style={{ minHeight: '100dvh', background: BG, fontFamily: "'Inter',system-ui,sans-serif", color: TEXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes splashOut{0%,75%{opacity:1}100%{opacity:0;pointer-events:none}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:0;height:0}
        input:focus,textarea:focus{outline:none;border-color:${A}!important;box-shadow:0 0 0 3px ${A}18}
      `}</style>

      {/* Splash */}
      {splash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: WHITE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'splashOut 1.8s ease forwards', pointerEvents: 'none' }}>
          <div style={{ animation: 'float 2s ease-in-out infinite', fontSize: '60px', marginBottom: '16px' }}>☕</div>
          <div style={{ fontSize: '10px', letterSpacing: '6px', color: A, fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>BUMI KOPI</div>
          <div style={{ fontSize: '12px', color: GRAY, letterSpacing: '1.5px' }}>Self Order</div>
        </div>
      )}

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${BORDER}`, padding: '13px 20px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: TEXT }}>☕ Bumi Kopi</div>
            <div style={{ fontSize: '11px', color: GRAY, marginTop: '1px' }}>Pilih menu favoritmu</div>
          </div>
          <button onClick={() => setCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: totalQty > 0 ? '9px 16px' : '9px 13px', borderRadius: '14px', border: `1.5px solid ${totalQty > 0 ? AB : BORDER}`, background: totalQty > 0 ? AL : WHITE, cursor: 'pointer', color: totalQty > 0 ? A : GRAY2, transition: 'all .2s', fontFamily: 'inherit', boxShadow: totalQty > 0 ? `0 2px 12px ${A}20` : 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            {totalQty > 0 && <>
              <span style={{ fontSize: '13px', fontWeight: '700' }}>{totalQty}</span>
              <div style={{ width: '1px', height: '13px', background: AB }} />
              <span style={{ fontSize: '13px', fontWeight: '700' }}>Rp {fmt(total)}</span>
            </>}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '110px' }}>

        {/* Search */}
        <div style={{ padding: '16px 20px 8px' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: GRAY }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari menu..." style={{ ...inp, paddingLeft: '42px' }} />
          </div>
        </div>

        {/* Categories */}
        <div style={{ padding: '6px 20px 8px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[{ label: 'Semua', value: null }, ...categories.map(c => ({ label: c, value: c }))].map(({ label, value }) => (
            <button key={label} onClick={() => setSelectedCat(value)} style={{ padding: '7px 18px', borderRadius: '20px', border: `1.5px solid ${selectedCat === value ? A : BORDER}`, background: selectedCat === value ? A : WHITE, color: selectedCat === value ? '#fff' : TEXT2, fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all .2s', boxShadow: selectedCat === value ? `0 2px 10px ${A}30` : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Grid produk */}
        <div style={{ padding: '8px 20px' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: '18px', background: '#F3F4F6', height: '210px', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {filtered.map(p => {
                const qty = qtyOf(p.id)
                const oos = p.stock <= 0
                return (
                  <div key={p.id} style={{ background: WHITE, borderRadius: '18px', border: `1.5px solid ${qty > 0 ? A : BORDER}`, overflow: 'hidden', transition: 'all .2s', boxShadow: qty > 0 ? `0 4px 20px ${A}18` : '0 1px 4px rgba(0,0,0,0.06)', opacity: oos ? 0.5 : 1 }}>
                    {/* Gambar */}
                    <div style={{ position: 'relative', height: '130px', background: AL, overflow: 'hidden' }}>
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>☕</div>
                      }
                      {oos && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: GRAY2, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${BORDER}`, padding: '4px 12px', borderRadius: '20px', background: WHITE }}>Habis</span>
                        </div>
                      )}
                      {qty > 0 && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: A, color: '#fff', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', boxShadow: `0 2px 8px ${A}50` }}>
                          {qty}
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: '12px 12px 11px' }}>
                      {p.category && <div style={{ fontSize: '10px', fontWeight: '600', color: A, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '3px', opacity: 0.75 }}>{p.category.name}</div>}
                      <div style={{ fontSize: '13px', fontWeight: '700', color: TEXT, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: A, marginBottom: '10px' }}>Rp {fmt(p.price)}</div>
                      {oos ? null : qty === 0 ? (
                        <button onClick={() => addToCart(p)} style={{ width: '100%', padding: '9px', borderRadius: '10px', border: `1.5px solid ${AB}`, background: AL, color: A, fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                          + Tambah
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', background: AL, borderRadius: '10px', border: `1.5px solid ${AB}`, overflow: 'hidden' }}>
                          <button onClick={() => removeFromCart(p.id)} style={{ width: '36px', height: '34px', border: 'none', background: 'transparent', color: A, fontSize: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ flex: 1, textAlign: 'center', fontWeight: '800', fontSize: '15px', color: TEXT }}>{qty}</span>
                          <button onClick={() => addToCart(p)} style={{ width: '36px', height: '34px', border: 'none', background: A, color: '#fff', fontSize: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && !loading && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: GRAY }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>☕</div>
                  <div style={{ fontSize: '14px' }}>Menu tidak ditemukan</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      {totalQty > 0 && !cartOpen && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, width: 'calc(100% - 40px)', maxWidth: '600px', animation: 'fadeUp .3s ease' }}>
          <button onClick={() => setCartOpen(true)} style={{ width: '100%', padding: '17px 24px', borderRadius: '18px', border: 'none', background: A, color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: `0 8px 28px ${A}45` }}>
            <span>{totalQty} item dipilih</span>
            <span>Rp {fmt(total)} →</span>
          </button>
        </div>
      )}

      {/* Cart Sheet */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 400, width: '100%', maxWidth: '640px', background: WHITE, borderRadius: '24px 24px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)', maxHeight: '80dvh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s cubic-bezier(.4,0,.2,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: '36px', height: '3px', borderRadius: '2px', background: '#E5E7EB' }} />
            </div>
            <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: TEXT }}>Pesanan Saya</div>
              <button onClick={() => setCartOpen(false)} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', color: GRAY2, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {cart.map((item, i) => (
                <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: i < cart.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: AL, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.product.imageUrl ? <img src={item.product.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} /> : <span style={{ fontSize: '20px' }}>☕</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: A, marginTop: '2px' }}>Rp {fmt(item.product.price)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', background: AL, borderRadius: '10px', border: `1.5px solid ${AB}`, overflow: 'hidden' }}>
                    <button onClick={() => removeFromCart(item.product.id)} style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', color: A, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ width: '28px', textAlign: 'center', fontSize: '14px', fontWeight: '800', color: TEXT }}>{item.qty}</span>
                    <button onClick={() => addToCart(item.product)} style={{ width: '32px', height: '32px', border: 'none', background: A, color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', color: GRAY2 }}>Total</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: A }}>Rp {fmt(total)}</span>
              </div>
              <button onClick={() => { setCartOpen(false); setCheckoutOpen(true) }} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: A, color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px ${A}40` }}>
                Lanjutkan →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Checkout Sheet */}
      {checkoutOpen && (
        <>
          <div onClick={() => setCheckoutOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 400, width: '100%', maxWidth: '640px', background: WHITE, borderRadius: '24px 24px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)', maxHeight: '90dvh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s cubic-bezier(.4,0,.2,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: '36px', height: '3px', borderRadius: '2px', background: '#E5E7EB' }} />
            </div>
            <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: TEXT }}>Konfirmasi Pesanan</div>
              <button onClick={() => setCheckoutOpen(false)} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', color: GRAY2, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {/* Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: GRAY2, display: 'block', marginBottom: '5px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Nomor Meja</label>
                  <input value={tableNo} onChange={e => setTableNo(e.target.value)} placeholder="Cth: 5, A3..." style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: GRAY2, display: 'block', marginBottom: '5px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Nama Kamu</label>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Panggilan kamu" style={inp} />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: GRAY2, display: 'block', marginBottom: '5px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Catatan</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Tanpa es, extra shot, less sugar..." rows={2} style={{ ...inp, resize: 'none' }} />
              </div>
              {/* Ringkasan */}
              <div style={{ background: '#FAFAFA', border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: GRAY, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>{totalQty} Item</div>
                {cart.map((item, i) => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < cart.length - 1 ? `1px solid ${BORDER}` : 'none', fontSize: '13px' }}>
                    <span style={{ color: TEXT2 }}>{item.product.name} <span style={{ color: GRAY }}>×{item.qty}</span></span>
                    <span style={{ fontWeight: '600', color: TEXT }}>Rp {fmt(item.product.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              {/* Info bayar */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>💳</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', marginBottom: '2px' }}>Bayar di Kasir</div>
                  <div style={{ fontSize: '11px', color: '#047857', lineHeight: 1.6 }}>Setelah dikonfirmasi, langsung ke kasir untuk membayar. Cash, QRIS, atau Transfer.</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: GRAY2 }}>Total Pembayaran</span>
                <span style={{ fontSize: '24px', fontWeight: '900', color: A }}>Rp {fmt(total)}</span>
              </div>
              <button onClick={handleSubmitOrder} disabled={submitting} style={{ width: '100%', padding: '17px', borderRadius: '14px', border: 'none', background: submitting ? '#D1D5DB' : A, color: '#fff', fontSize: '15px', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: submitting ? 'none' : `0 6px 20px ${A}40`, transition: 'all .2s' }}>
                {submitting ? '⏳ Mengirim...' : '🛎️ Kirim Pesanan ke Kasir'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
