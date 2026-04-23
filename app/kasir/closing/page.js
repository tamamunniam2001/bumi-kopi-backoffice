'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'
import Cookies from 'js-cookie'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

export default function ClosingPage() {
  const router = useRouter()
  const user = (() => { try { return JSON.parse(Cookies.get('user') || '{}') } catch { return {} } })()

  const [orders, setOrders] = useState([])
  const [kasAwal, setKasAwal] = useState('')
  const [pengeluaran, setPengeluaran] = useState([])
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999)
        const res = await api.get(`/transactions?slim=1&from=${today.toISOString()}&to=${endOfDay.toISOString()}&page=1`)
        setOrders(res.data.transactions || [])
      } catch { }
      setLoading(false)
    }
    load()
  }, [])

  const completed = orders.filter(o => o.status === 'COMPLETED')
  const totalPenjualan = completed.reduce((s, o) => s + o.total, 0)
  const totalCash = completed.filter(o => o.payMethod === 'CASH').reduce((s, o) => s + o.total, 0)
  const totalQris = completed.filter(o => o.payMethod === 'QRIS').reduce((s, o) => s + o.total, 0)
  const totalTransfer = completed.filter(o => o.payMethod === 'TRANSFER' || o.payMethod === 'NONTUNAI').reduce((s, o) => s + o.total, 0)
  const pendingCount = orders.filter(o => o.status !== 'COMPLETED').length

  const totalPengeluaran = pengeluaran.reduce((s, p) => s + (Number(p.harga) * Number(p.qty || 1)), 0)
  const kasAkhir = Number(kasAwal || 0) + totalCash - totalPengeluaran

  function addPengeluaran() {
    setPengeluaran(prev => [...prev, { barang: '', qty: 1, harga: '' }])
  }

  function updatePengeluaran(i, field, val) {
    setPengeluaran(prev => prev.map((p, n) => n === i ? { ...p, [field]: val } : p))
  }

  function removePengeluaran(i) {
    setPengeluaran(prev => prev.filter((_, n) => n !== i))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/daily-reports', {
        kasAwal: Number(kasAwal) || 0,
        penjualan: totalPenjualan,
        uangDisetor: totalCash,
        qris: totalQris,
        transfer: totalTransfer,
        pengeluaran: pengeluaran.filter(p => p.barang).map(p => ({ ...p, qty: Number(p.qty) || 1, harga: Number(p.harga) || 0 })),
        piutang: [],
        catatan,
      })
      setSaved(true)
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan laporan')
    } finally { setSaving(false) }
  }

  const todayLabel = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const timeLabel = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <div className="page">
      <Sidebar />
      <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94A3B8', fontSize: '14px' }}>Memuat data...</div>
      </main>
    </div>
  )

  return (
    <div className="page">
      <Sidebar />
      <main className="main" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{
          flexShrink: 0, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', background: '#fff', borderBottom: '1px solid #E8EDF8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Back button - modern pill style */}
            <button
              onClick={() => router.push('/kasir')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '20px', border: '1.5px solid #E8EDF8',
                background: '#F8FAFF', color: '#4A5578', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EFF4FF'; e.currentTarget.style.borderColor = '#C7D4F0'; e.currentTarget.style.color = '#2563EB' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFF'; e.currentTarget.style.borderColor = '#E8EDF8'; e.currentTarget.style.color = '#4A5578' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Kembali
            </button>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F1729', letterSpacing: '-0.3px' }}>Closing Kasir</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{todayLabel} · {timeLabel}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8' }}>KASIR</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F1729' }}>{user.name || '-'}</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: '700' }}>
              {(user.name || 'K').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {saved ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #34D399)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', boxShadow: '0 6px 24px rgba(16,185,129,0.3)'
              }}>✓</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F1729' }}>Laporan Tersimpan!</div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>Closing hari ini berhasil dicatat</div>
              <button className="btn btn-primary" style={{ marginTop: '4px' }} onClick={() => router.push('/kasir')}>Kembali ke Kasir</button>
            </div>
          ) : (
            <>
              {/* Left: Ringkasan */}
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', gap: '16px',
                padding: '20px 24px', overflow: 'hidden'
              }}>

                {/* Row 1: 4 Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', flexShrink: 0 }}>
                  {[
                    { label: 'Total Penjualan', value: totalPenjualan, icon: '💰', color: '#2563EB', bg: '#EFF4FF', border: '#C7D4F0' },
                    { label: 'Cash', value: totalCash, icon: '💵', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
                    { label: 'QRIS', value: totalQris, icon: '📱', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
                    { label: 'Transfer', value: totalTransfer, icon: '🏦', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
                  ].map(card => (
                    <div key={card.label} style={{
                      background: '#fff', borderRadius: '12px', border: '1px solid #E8EDF8',
                      padding: '14px', boxShadow: '0 1px 3px rgba(13,21,38,0.04)',
                      display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px' }}>{card.icon}</span>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: card.color, letterSpacing: '-0.5px' }}>{fmt(card.value)}</div>
                    </div>
                  ))}
                </div>

                {/* Row 2: Kas Management + Catatan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>

                  {/* Kas Awal & Pengeluaran */}
                  <div style={{
                    background: '#fff', borderRadius: '14px', border: '1px solid #E8EDF8',
                    boxShadow: '0 1px 3px rgba(13,21,38,0.04)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                  }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5FB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Laporan Kas</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{completed.length} transaksi · {pendingCount} belum bayar</span>
                    </div>

                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>

                      {/* Kas Awal */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#4A5578', marginBottom: '4px', display: 'block' }}>KAS AWAL</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: '#94A3B8' }}>Rp</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={kasAwal}
                            onChange={e => setKasAwal(e.target.value)}
                            style={{
                              width: '100%', padding: '9px 12px 9px 36px', borderRadius: '10px',
                              border: '1.5px solid #E8EDF8', fontSize: '14px', fontWeight: '700',
                              color: '#0F1729', outline: 'none', background: '#F8FAFF', fontFamily: 'inherit'
                            }}
                            onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                            onBlur={e => { e.target.style.borderColor = '#E8EDF8'; e.target.style.boxShadow = 'none' }}
                          />
                        </div>
                      </div>

                      {/* Pengeluaran */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#4A5578' }}>PENGELUARAN</label>
                          <button onClick={addPengeluaran}
                            style={{
                              fontSize: '11px', fontWeight: '700', color: '#2563EB', background: '#EFF4FF',
                              border: '1px solid #C7D4F0', borderRadius: '6px', padding: '3px 10px',
                              cursor: 'pointer', fontFamily: 'inherit'
                            }}
                          >+ Tambah</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflowY: 'auto' }}>
                          {pengeluaran.length === 0 && (
                            <div style={{ fontSize: '12px', color: '#CBD5E1', padding: '6px 0' }}>Belum ada pengeluaran</div>
                          )}
                          {pengeluaran.map((p, i) => (
                            <div key={i} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <input
                                placeholder="Nama barang"
                                value={p.barang}
                                onChange={e => updatePengeluaran(i, 'barang', e.target.value)}
                                style={{
                                  flex: 2, padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #E8EDF8',
                                  fontSize: '12px', color: '#0F1729', outline: 'none', background: '#F8FAFF', fontFamily: 'inherit'
                                }}
                              />
                              <input
                                type="number" placeholder="Qty" value={p.qty}
                                onChange={e => updatePengeluaran(i, 'qty', e.target.value)}
                                style={{
                                  flex: '0 0 44px', padding: '6px 8px', borderRadius: '8px', border: '1.5px solid #E8EDF8',
                                  fontSize: '12px', color: '#0F1729', outline: 'none', background: '#F8FAFF', fontFamily: 'inherit', textAlign: 'center'
                                }}
                              />
                              <input
                                type="number" placeholder="Harga"
                                value={p.harga}
                                onChange={e => updatePengeluaran(i, 'harga', e.target.value)}
                                style={{
                                  flex: 2, padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #E8EDF8',
                                  fontSize: '12px', color: '#0F1729', outline: 'none', background: '#F8FAFF', fontFamily: 'inherit'
                                }}
                              />
                              <button onClick={() => removePengeluaran(i)}
                                style={{
                                  background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '7px',
                                  color: '#EF4444', cursor: 'pointer', padding: '6px 8px', fontSize: '12px', flexShrink: 0,
                                  fontFamily: 'inherit', fontWeight: '700'
                                }}
                              >×</button>
                            </div>
                          ))}
                        </div>
                        {totalPengeluaran > 0 && (
                          <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#EF4444', marginTop: '4px' }}>
                            Total Pengeluaran: {fmt(totalPengeluaran)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Kas Akhir + Catatan */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Kas Akhir Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #0F172A, #1E293B)', borderRadius: '14px',
                      padding: '20px', boxShadow: '0 6px 24px rgba(15,23,41,0.18)',
                      display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Perhitungan Kas Akhir</div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#94A3B8' }}>Kas Awal</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#F1F5F9' }}>{fmt(Number(kasAwal) || 0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#94A3B8' }}>+ Penjualan Cash</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#10B981' }}>+{fmt(totalCash)}</span>
                      </div>
                      {totalPengeluaran > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#94A3B8' }}>- Pengeluaran</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#EF4444' }}>-{fmt(totalPengeluaran)}</span>
                        </div>
                      )}
                      <div style={{ borderTop: '1px solid #334155', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#F1F5F9' }}>Total Kas Akhir</span>
                        <span style={{
                          fontSize: '26px', fontWeight: '800',
                          color: kasAkhir >= 0 ? '#10B981' : '#EF4444',
                          letterSpacing: '-1px'
                        }}>{fmt(kasAkhir)}</span>
                      </div>
                    </div>

                    {/* Catatan */}
                    <div style={{
                      background: '#fff', borderRadius: '14px', border: '1px solid #E8EDF8',
                      boxShadow: '0 1px 3px rgba(13,21,38,0.04)',
                      display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'
                    }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5FB' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan</span>
                      </div>
                      <div style={{ padding: '12px 16px', flex: 1 }}>
                        <textarea
                          value={catatan}
                          onChange={e => setCatatan(e.target.value)}
                          placeholder="Catatan tambahan..."
                          style={{
                            width: '100%', height: '100%', minHeight: '50px', border: '1.5px solid #E8EDF8',
                            borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#0F1729',
                            outline: 'none', background: '#F8FAFF', fontFamily: 'inherit', resize: 'none'
                          }}
                          onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                          onBlur={e => { e.target.style.borderColor = '#E8EDF8'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!saved && (
          <div style={{
            flexShrink: 0, height: '64px', padding: '0 24px',
            background: '#fff', borderTop: '1px solid #E8EDF8',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94A3B8' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
              Semua data tersimpan otomatis setelah klik simpan
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => router.push('/kasir')}
                style={{
                  padding: '10px 22px', borderRadius: '10px', border: '1.5px solid #E8EDF8',
                  background: '#fff', color: '#64748B', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFF' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDF8'; e.currentTarget.style.background = '#fff' }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 28px', borderRadius: '10px', border: 'none',
                  background: saving ? '#93C5FD' : 'linear-gradient(135deg, #2563EB, #3B82F6)',
                  color: '#fff', fontSize: '13px', fontWeight: '700',
                  cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(37,99,235,0.35)',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px'
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {saving ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Simpan Laporan Closing
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

