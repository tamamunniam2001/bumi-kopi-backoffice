'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const emptyForm = () => ({ kasAwal: '', penjualan: '', uangDisetor: '', qris: '', transfer: '', catatan: '', pengeluaran: [], piutang: [] })

export default function LaporanKasirPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
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

  function openNew() {
    setForm(emptyForm()); setEditId(null); setShowForm(true); setSelected(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEdit(r) {
    setForm({
      kasAwal: r.kasAwal, penjualan: r.penjualan,
      uangDisetor: r.uangDisetor, qris: r.qris, transfer: r.transfer,
      catatan: r.catatan || '',
      pengeluaran: (r.pengeluaran || []).map((p) => ({ ...p })),
      piutang: (r.piutang || []).map((p) => ({ ...p })),
    })
    setEditId(r.id); setShowForm(true); setSelected(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        kasAwal: Number(form.kasAwal) || 0,
        penjualan: Number(form.penjualan) || 0,
        uangDisetor: Number(form.uangDisetor) || 0,
        qris: Number(form.qris) || 0,
        transfer: Number(form.transfer) || 0,
        catatan: form.catatan,
        pengeluaran: form.pengeluaran,
        piutang: form.piutang,
      }
      if (editId) await api.put(`/daily-reports/${editId}`, payload)
      else await api.post('/daily-reports', payload)
      setShowForm(false); setEditId(null); setForm(emptyForm()); load()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan laporan')
    } finally { setSaving(false) }
  }

  const totalPengeluaran = (r) => (r.pengeluaran || []).reduce((s, p) => s + (p.harga * p.qty), 0)
  const totalPiutang = (r) => (r.piutang || []).reduce((s, p) => s + (p.nilai || 0), 0)
  const selisih = (r) => (r.uangDisetor || 0) + (r.qris || 0) + (r.transfer || 0) - (r.kasAwal || 0) - totalPengeluaran(r) - totalPiutang(r)

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Laporan Harian Kasir</div>
            <div className="topbar-sub">Ringkasan kas harian</div>
          </div>
          <button className="btn btn-primary" onClick={showForm ? () => setShowForm(false) : openNew}>
            {showForm ? '× Tutup' : '+ Buat Laporan'}
          </button>
        </div>

        <div className="content">
          {showForm && (
            <div className="card slide-down" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '20px' }}>{editId ? 'Edit Laporan' : 'Buat Laporan Harian'}</div>
              <form onSubmit={handleSubmit}>
                {/* Ringkasan Kas */}
                <div className="section-label">Ringkasan Kas</div>
                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  <NumField label="Kas Awal" value={form.kasAwal} onChange={(v) => setForm({ ...form, kasAwal: v })} />
                  <NumField label="Penjualan" value={form.penjualan} onChange={(v) => setForm({ ...form, penjualan: v })} />
                </div>

                {/* Setoran */}
                <div className="section-label">Setoran</div>
                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  <NumField label="Uang Fisik (Tunai)" value={form.uangDisetor} onChange={(v) => setForm({ ...form, uangDisetor: v })} />
                  <NumField label="QRIS" value={form.qris} onChange={(v) => setForm({ ...form, qris: v })} />
                  <NumField label="Transfer" value={form.transfer} onChange={(v) => setForm({ ...form, transfer: v })} />
                </div>

                {/* Pengeluaran */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="section-label" style={{ margin: 0 }}>Pengeluaran</div>
                  <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => setForm({ ...form, pengeluaran: [...form.pengeluaran, { barang: '', qty: 1, harga: 0 }] })}>+ Tambah</button>
                </div>
                {form.pengeluaran.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input className="input" placeholder="Nama barang" value={p.barang} onChange={(e) => { const arr = [...form.pengeluaran]; arr[i] = { ...arr[i], barang: e.target.value }; setForm({ ...form, pengeluaran: arr }) }} style={{ flex: 2 }} />
                    <input className="input" type="number" placeholder="Qty" value={p.qty} onChange={(e) => { const arr = [...form.pengeluaran]; arr[i] = { ...arr[i], qty: Number(e.target.value) }; setForm({ ...form, pengeluaran: arr }) }} style={{ flex: 1 }} />
                    <input className="input" type="number" placeholder="Harga" value={p.harga} onChange={(e) => { const arr = [...form.pengeluaran]; arr[i] = { ...arr[i], harga: Number(e.target.value) }; setForm({ ...form, pengeluaran: arr }) }} style={{ flex: 2 }} />
                    <button type="button" className="btn btn-danger" style={{ padding: '8px 10px', flexShrink: 0 }} onClick={() => setForm({ ...form, pengeluaran: form.pengeluaran.filter((_, n) => n !== i) })}>×</button>
                  </div>
                ))}

                {/* Piutang */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                  <div className="section-label" style={{ margin: 0 }}>Piutang / Bon</div>
                  <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => setForm({ ...form, piutang: [...form.piutang, { nama: '', produk: '', nilai: 0 }] })}>+ Tambah</button>
                </div>
                {form.piutang.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input className="input" placeholder="Nama" value={p.nama} onChange={(e) => { const arr = [...form.piutang]; arr[i] = { ...arr[i], nama: e.target.value }; setForm({ ...form, piutang: arr }) }} style={{ flex: 2 }} />
                    <input className="input" placeholder="Produk" value={p.produk} onChange={(e) => { const arr = [...form.piutang]; arr[i] = { ...arr[i], produk: e.target.value }; setForm({ ...form, piutang: arr }) }} style={{ flex: 2 }} />
                    <input className="input" type="number" placeholder="Nilai" value={p.nilai} onChange={(e) => { const arr = [...form.piutang]; arr[i] = { ...arr[i], nilai: Number(e.target.value) }; setForm({ ...form, piutang: arr }) }} style={{ flex: 2 }} />
                    <button type="button" className="btn btn-danger" style={{ padding: '8px 10px', flexShrink: 0 }} onClick={() => setForm({ ...form, piutang: form.piutang.filter((_, n) => n !== i) })}>×</button>
                  </div>
                ))}

                {/* Catatan */}
                <div style={{ marginTop: '16px' }}>
                  <label className="label">Catatan</label>
                  <textarea className="input" rows={3} placeholder="Catatan tambahan..." value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} style={{ resize: 'vertical' }} />
                </div>

                <div className="divider" />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: '20px' }}>
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
                    <tr>{['Tanggal', 'Kasir', 'Penjualan', 'Pengeluaran', 'Disetor', 'Selisih', ''].map((h) => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} onClick={() => setSelected(selected?.id === r.id ? null : r)} style={{ cursor: 'pointer', background: selected?.id === r.id ? '#EFF6FF' : 'transparent' }}>
                        <td style={{ fontWeight: '500' }}>{fmtDate(r.date)}</td>
                        <td style={{ color: '#475569' }}>{r.cashier?.name || '-'}</td>
                        <td style={{ color: 'var(--green)', fontWeight: '600' }}>{fmt(r.penjualan)}</td>
                        <td style={{ color: 'var(--red)' }}>{fmt(totalPengeluaran(r))}</td>
                        <td style={{ color: 'var(--accent)' }}>{fmt((r.uangDisetor || 0) + (r.qris || 0) + (r.transfer || 0))}</td>
                        <td style={{ fontWeight: '700', color: selisih(r) >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(selisih(r))}</td>
                        <td>
                          <button className="btn" style={{ background: '#EFF4FF', color: 'var(--accent)', border: '1px solid #C7D4F0', padding: '5px 12px', fontSize: '12px' }}
                            onClick={(e) => { e.stopPropagation(); openEdit(r) }}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {selected && (
              <div className="card" style={{ padding: '20px', height: 'fit-content' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>Detail Laporan</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{fmtDate(selected.date)} · {selected.cashier?.name}</div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px' }}>×</button>
                </div>
                <DetailSection label="Ringkasan Kas">
                  <DetailRow label="Kas Awal" value={fmt(selected.kasAwal)} />
                  <DetailRow label="Penjualan" value={fmt(selected.penjualan)} color="var(--green)" />
                </DetailSection>
                <DetailSection label="Setoran">
                  <DetailRow label="Uang Fisik" value={fmt(selected.uangDisetor)} />
                  <DetailRow label="QRIS" value={fmt(selected.qris)} />
                  <DetailRow label="Transfer" value={fmt(selected.transfer)} />
                </DetailSection>
                {(selected.pengeluaran || []).length > 0 && (
                  <DetailSection label="Pengeluaran">
                    {selected.pengeluaran.map((p, i) => <DetailRow key={i} label={`${p.barang} ×${p.qty}`} value={fmt(p.harga * p.qty)} color="var(--red)" />)}
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: '6px', paddingTop: '6px' }}>
                      <DetailRow label="Total" value={fmt(totalPengeluaran(selected))} color="var(--red)" bold />
                    </div>
                  </DetailSection>
                )}
                {(selected.piutang || []).length > 0 && (
                  <DetailSection label="Piutang / Bon">
                    {selected.piutang.map((p, i) => <DetailRow key={i} label={`${p.nama} - ${p.produk}`} value={fmt(p.nilai)} color="var(--orange)" />)}
                  </DetailSection>
                )}
                <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '700' }}>Selisih Kas</span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: selisih(selected) >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(selisih(selected))}</span>
                  </div>
                </div>
                {selected.catatan && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400E', marginBottom: '4px' }}>CATATAN</div>
                    <div style={{ fontSize: '13px', color: '#78350F' }}>{selected.catatan}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function NumField({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function DetailSection({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border)' }}>{children}</div>
    </div>
  )
}

function DetailRow({ label, value, color = 'var(--text)', bold = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: '12px', color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: bold ? '700' : '500', color }}>{value}</span>
    </div>
  )
}
