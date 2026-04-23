'use client'
import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function DailyReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/daily-reports'
      if (from && to) url += `?from=${from}&to=${to}`
      const res = await api.get(url)
      setReports(res.data.reports || [])
    } catch { setReports([]) }
    finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const totalPengeluaran = (r) => (r.pengeluaran || []).reduce((s, p) => s + (p.harga * p.qty), 0)
  const totalPiutang = (r) => (r.piutang || []).reduce((s, p) => s + (p.nilai || 0), 0)
  const selisih = (r) => (r.uangDisetor || 0) + (r.qris || 0) + (r.transfer || 0) - (r.kasAwal || 0) - totalPengeluaran(r) - totalPiutang(r)

  return (
    <div style={{ padding: '28px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Laporan Harian</h1>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Ringkasan kas harian dari kasir</p>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#fff' }} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#fff' }} />
        <button onClick={() => { setFrom(''); setTo('') }}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#fff', cursor: 'pointer', color: '#64748B' }}>
          Reset
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: '20px' }}>
        {/* List */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Memuat...</div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Belum ada laporan harian</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Tanggal', 'Kasir', 'Penjualan', 'Pengeluaran', 'Disetor', 'Selisih'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} onClick={() => setSelected(selected?.id === r.id ? null : r)}
                    style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: selected?.id === r.id ? '#EFF6FF' : 'transparent' }}
                    onMouseEnter={(e) => { if (selected?.id !== r.id) e.currentTarget.style.background = '#F8FAFC' }}
                    onMouseLeave={(e) => { if (selected?.id !== r.id) e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0F172A', fontWeight: '500' }}>{fmtDate(r.date)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>{r.cashier?.name || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#10B981', fontWeight: '600' }}>{fmt(r.penjualan)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#EF4444' }}>{fmt(totalPengeluaran(r))}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#2563EB' }}>{fmt((r.uangDisetor || 0) + (r.qris || 0) + (r.transfer || 0))}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: selisih(r) >= 0 ? '#10B981' : '#EF4444' }}>{fmt(selisih(r))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '20px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>Detail Laporan</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{fmtDate(selected.date)} · {selected.cashier?.name}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>

            <Section label="Ringkasan Kas">
              <Row label="Kas Awal" value={fmt(selected.kasAwal)} />
              <Row label="Penjualan" value={fmt(selected.penjualan)} color="#10B981" />
            </Section>

            <Section label="Setoran">
              <Row label="Uang Fisik" value={fmt(selected.uangDisetor)} />
              <Row label="QRIS" value={fmt(selected.qris)} />
              <Row label="Transfer" value={fmt(selected.transfer)} />
            </Section>

            {(selected.pengeluaran || []).length > 0 && (
              <Section label="Pengeluaran">
                {selected.pengeluaran.map((p, i) => (
                  <Row key={i} label={`${p.barang} ×${p.qty}`} value={fmt(p.harga * p.qty)} color="#EF4444" />
                ))}
                <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '6px', paddingTop: '6px' }}>
                  <Row label="Total" value={fmt(totalPengeluaran(selected))} color="#EF4444" bold />
                </div>
              </Section>
            )}

            {(selected.piutang || []).length > 0 && (
              <Section label="Piutang / Bon">
                {selected.piutang.map((p, i) => (
                  <Row key={i} label={`${p.nama} - ${p.produk}`} value={fmt(p.nilai)} color="#F59E0B" />
                ))}
              </Section>
            )}

            <div style={{ marginTop: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>Selisih Kas</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: selisih(selected) >= 0 ? '#10B981' : '#EF4444' }}>{fmt(selisih(selected))}</span>
              </div>
            </div>

            {selected.catatan && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#92400E', marginBottom: '4px' }}>CATATAN</div>
                <div style={{ fontSize: '13px', color: '#78350F' }}>{selected.catatan}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px 12px', border: '1px solid #E2E8F0' }}>{children}</div>
    </div>
  )
}

function Row({ label, value, color = '#0F172A', bold = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: '12px', color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: bold ? '700' : '500', color }}>{value}</span>
    </div>
  )
}
