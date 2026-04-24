'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

export default function AbsensiPage() {
  const [tab, setTab] = useState('OPENING')
  const [employees, setEmployees] = useState([])
  const [sopItems, setSopItems] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [kasAwal, setKasAwal] = useState('')
  const [checklist, setChecklist] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/admin/employees'), api.get('/admin/sop')]).then(([e, s]) => {
      setEmployees(e.data.filter(x => x.isActive))
      setSopItems(s.data)
    }).catch(() => {})
  }, [])

  const filtered = sopItems.filter(s => s.type === tab)

  function toggleCheck(id) {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function reset() {
    setEmployeeId(''); setKasAwal(''); setChecklist({}); setSaved(false)
  }

  async function handleSave() {
    if (!employeeId) return alert('Pilih nama staf terlebih dahulu')
    setSaving(true)
    try {
      await api.post('/attendance', {
        employeeId, type: tab,
        kasAwal: tab === 'OPENING' ? (Number(kasAwal) || 0) : 0,
        checklist: filtered.map(s => ({ id: s.id, text: s.text, checked: !!checklist[s.id] })),
      })
      setSaved(true)
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan absensi')
    } finally { setSaving(false) }
  }

  if (saved) return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="topbar-title">Absensi</div>
        </div>
        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="card fade-in" style={{ padding: '48px 40px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', background: 'var(--green-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px', border: '2px solid #A7DFC8' }}>✓</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Absensi Tersimpan!</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '28px' }}>
              Laporan absensi <b>{tab === 'OPENING' ? 'Opening' : 'Closing'}</b> berhasil disimpan.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={reset}>Absensi Lagi</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setTab(tab === 'OPENING' ? 'CLOSING' : 'OPENING'); reset() }}>
                Lanjut {tab === 'OPENING' ? 'Closing' : 'Opening'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="topbar-title">Absensi</div>
          <div className="topbar-sub">Checklist SOP harian</div>
        </div>

        <div className="content">
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>

            {/* Tab */}
            <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: '12px', padding: '4px', marginBottom: '24px', border: '1px solid var(--border)' }}>
              {['OPENING', 'CLOSING'].map(t => (
                <button key={t} onClick={() => { setTab(t); setChecklist({}) }}
                  style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    background: tab === t ? 'var(--surface)' : 'transparent',
                    color: tab === t ? 'var(--text)' : 'var(--muted)',
                    boxShadow: tab === t ? '0 1px 4px rgba(13,21,38,0.08)' : 'none',
                  }}>
                  {t === 'OPENING' ? 'Opening' : 'Closing'}
                </button>
              ))}
            </div>

            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Nama Staf */}
              <div>
                <label className="label">Nama Staf</label>
                <select className="input" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                  <option value="">Pilih staf bertugas...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              {/* Kas Awal — hanya Opening */}
              {tab === 'OPENING' && (
                <div>
                  <label className="label">Kas Awal di Dompet</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '600', color: 'var(--muted)' }}>Rp</span>
                    <input className="input" type="number" placeholder="0" value={kasAwal}
                      onChange={e => setKasAwal(e.target.value)}
                      style={{ paddingLeft: '40px' }} />
                  </div>
                </div>
              )}

              {/* Checklist SOP */}
              <div>
                <label className="label">
                  Checklist SOP{' '}
                  <span style={{ color: tab === 'OPENING' ? 'var(--accent)' : 'var(--red)', fontWeight: '700' }}>
                    {tab === 'OPENING' ? 'Opening' : 'Closing'}
                  </span>
                </label>
                {filtered.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    Belum ada item SOP. Tambahkan di menu Pengaturan Absensi.
                  </div>
                ) : (
                  <div style={{ border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface)' }}>
                    {filtered.map((item, i) => (
                      <div key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: checklist[item.id] ? 'var(--accent-light)' : 'transparent', transition: 'background 0.1s' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${checklist[item.id] ? 'var(--accent)' : 'var(--border)'}`, background: checklist[item.id] ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          {checklist[item.id] && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ fontSize: '13px', color: checklist[item.id] ? 'var(--accent)' : 'var(--text)', fontWeight: checklist[item.id] ? '600' : '400', textDecoration: checklist[item.id] ? 'none' : 'none', flex: 1 }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {filtered.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                    {Object.values(checklist).filter(Boolean).length} / {filtered.length} item selesai
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Simpan */}
            <button
              onClick={handleSave} disabled={saving || !employeeId}
              style={{ width: '100%', marginTop: '20px', padding: '15px', borderRadius: '12px', border: 'none', background: saving || !employeeId ? '#94A3B8' : 'var(--text)', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: saving || !employeeId ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.5px', transition: 'all 0.15s' }}>
              {saving ? 'Menyimpan...' : 'SIMPAN LAPORAN ABSEN'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
