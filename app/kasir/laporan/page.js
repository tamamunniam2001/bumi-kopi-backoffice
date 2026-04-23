'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function LaporanHarianPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/daily-reports')
      setReports(res.data.reports || [])
    } catch { setReports([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalPengeluaran = (r) => (r.pengeluaran || []).reduce((s, p) => s + (p.harga * p.qty), 0)
  const kasAkhir = (r) => (r.kasAwal || 0) + (r.uangDisetor || 0) - totalPengeluaran(r)

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Laporan Harian</div>
            <div className="topbar-sub">Ringkasan closing kasir harian</div>
          </div>
        </div>

        <div className="content">
          <div className="card" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Memuat...</div>
            ) : reports.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                <div>Belum ada laporan harian</div>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>{['Tanggal', 'Kasir', 'Total Penjualan', 'Cash', 'QRIS', 'Transfer', 'Pengeluaran', 'Kas Akhir', ''].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                      <td style={{ fontWeight: '600' }}>{fmtDate(r.date)}</td>
                      <td style={{ color: 'var(--text2)' }}>{r.cashier?.name || '-'}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: '700' }}>{fmt(r.penjualan)}</td>
                      <td style={{ color: 'var(--green)' }}>{fmt(r.uangDisetor)}</td>
                      <td style={{ color: '#6B5BAF' }}>{fmt(r.qris)}</td>
                      <td style={{ color: '#C47D1A' }}>{fmt(r.transfer)}</td>
                      <td style={{ color: 'var(--red)' }}>{fmt(totalPengeluaran(r))}</td>
                      <td style={{ fontWeight: '700', color: kasAkhir(r) >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(kasAkhir(r))}</td>
                      <td>
                        <button className="btn" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #C0D0E8', padding: '5px 12px', fontSize: '12px' }}
                          onClick={(e) => { e.stopPropagation(); setSelected(r) }}>Detail</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {selected && <DetailModal report={selected} onClose={() => setSelected(null)} fmt={fmt} fmtDate={fmtDate} totalPengeluaran={totalPengeluaran} kasAkhir={kasAkhir} />}
      </main>
    </div>
  )
}

function DetailModal({ report: r, onClose, fmt, fmtDate, totalPengeluaran, kasAkhir }) {
  const kAkhir = kasAkhir(r)
  const totPengeluaran = totalPengeluaran(r)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card fade-in" style={{ width: '720px', maxWidth: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #D8E4F4, #E8EEF8)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E2A3B' }}>Laporan Closing — {fmtDate(r.date)}</div>
            <div style={{ fontSize: '11px', color: '#7A8FAF', marginTop: '1px' }}>Kasir: {r.cashier?.name || '-'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(74,124,199,0.1)', border: '1px solid #C0D0E8', borderRadius: '8px', cursor: 'pointer', color: '#5A6E90', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body 2 kolom */}
        <div style={{ display: 'flex', gap: '0', flex: 1, overflow: 'hidden' }}>
          {/* Kolom kiri */}
          <div style={{ flex: 1, padding: '14px 16px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Ringkasan Penjualan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Total Penjualan', value: r.penjualan, color: '#4A7CC7', bg: '#EBF1FB', border: '#C0D0E8' },
                { label: 'Cash', value: r.uangDisetor, color: '#2A9D6E', bg: '#E8F7F1', border: '#A7DFC8' },
                { label: 'QRIS', value: r.qris, color: '#6B5BAF', bg: '#EEEAF8', border: '#C8C0E8' },
                { label: 'Transfer', value: r.transfer, color: '#C47D1A', bg: '#FDF4E3', border: '#F0D090' },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '9px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '3px' }}>{label}</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color }}>{fmt(value)}</div>
                </div>
              ))}
            </div>

            {/* Kalkulasi kas */}
            <div style={{ background: 'linear-gradient(135deg, #D8E4F4, #E8EEF8)', borderRadius: '12px', border: '1px solid #C0D0E8', padding: '12px 14px', marginTop: 'auto' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#7A8FAF', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Kalkulasi Kas</div>
              {[
                ['Kas Awal', fmt(r.kasAwal || 0), 'var(--text2)'],
                ['+ Penjualan Cash', `+${fmt(r.uangDisetor || 0)}`, '#2A9D6E'],
                ...(totPengeluaran > 0 ? [['- Pengeluaran', `-${fmt(totPengeluaran)}`, '#C95555']] : []),
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ color: '#7A8FAF' }}>{label}</span>
                  <span style={{ fontWeight: '600', color }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #C0D0E8', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E2A3B' }}>Total Kas Akhir</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: kAkhir >= 0 ? '#2A9D6E' : '#C95555' }}>{fmt(kAkhir)}</span>
              </div>
            </div>
          </div>

          {/* Kolom kanan */}
          <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {/* Pengeluaran */}
            <div style={{ background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: '#F5F8FE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Pengeluaran</div>
                {totPengeluaran > 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: '#C95555' }}>-{fmt(totPengeluaran)}</span>}
              </div>
              <div style={{ padding: '10px 12px' }}>
                {(r.pengeluaran || []).filter(p => p.barang).length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>Tidak ada pengeluaran</div>
                ) : (r.pengeluaran || []).filter(p => p.barang).map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < (r.pengeluaran || []).filter(x => x.barang).length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>{p.barang}</div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{p.qty} x {fmt(p.harga)}</div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#C95555' }}>-{fmt(p.harga * p.qty)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Catatan */}
            <div style={{ background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: '#F5F8FE' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Catatan</div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                {r.catatan ? (
                  <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6' }}>{r.catatan}</div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>Tidak ada catatan</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
