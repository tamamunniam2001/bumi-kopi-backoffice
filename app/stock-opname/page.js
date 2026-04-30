'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

const fmt = n => Number(n) % 1 !== 0 ? Number(n).toLocaleString('id-ID', { maximumFractionDigits: 4 }) : Number(n).toLocaleString('id-ID')
const fmtRp = n => 'Rp ' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })
const fmtDate = d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })

export default function StockOpnamePage() {
  const [opnames, setOpnames] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [note, setNote] = useState('')
  const [opnameDate, setOpnameDate] = useState(() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    return now.toISOString().slice(0, 10)
  })
  const [showCreate, setShowCreate] = useState(false)

  // Detail view
  const [detail, setDetail] = useState(null) // opname object
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [filterSelisih, setFilterSelisih] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [editNote, setEditNote] = useState('')
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualItem, setManualItem] = useState({ itemName: '', satuan: '', hargaTerakhir: '' })
  const [addingManual, setAddingManual] = useState(false)
  const [search, setSearch] = useState('')
  const [reopening, setReopening] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/stock-opname?page=${page}`)
      setOpnames(res.data.opnames)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch { } finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await api.post('/admin/stock-opname', { note, date: opnameDate })
      setNote(''); setShowCreate(false)
      await openDetail(res.data.id)
      load()
    } catch (e) {
      const msg = e.response?.data?.message || 'Gagal membuat opname'
      const id = e.response?.data?.id
      if (e.response?.status === 409 && id) {
        if (confirm(msg + '. Buka opname yang ada?')) openDetail(id)
      } else alert(msg)
    } finally { setCreating(false) }
  }

  async function openDetail(id) {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await api.get(`/admin/stock-opname/${id}`)
      setDetail(res.data)
      setFilterCat('')
      setFilterSelisih(false)
      setEditingId(null)
    } catch (e) { alert(e.response?.data?.message || 'Gagal memuat detail') }
    finally { setDetailLoading(false) }
  }

  async function handleSaveItem(itemId) {
    setSaving(true)
    try {
      // Jika ada konversi, editVal adalah dalam satuanOpname → konversi ke satuan asli
      const item = detail.items.find(i => i.id === itemId)
      const konversi = item?.konversi
      const qtyToSave = konversi ? Number(editVal) * konversi : Number(editVal)
      await api.patch(`/admin/stock-opname/${detail.id}`, { itemId, qtyActual: qtyToSave, note: editNote })
      setDetail(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId
          ? { ...i, qtyActual: qtyToSave, note: editNote }
          : i
        )
      }))
      setEditingId(null)
    } catch (e) { alert(e.response?.data?.message || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  async function handleAddManual() {
    if (!manualItem.itemName.trim()) return alert('Nama item wajib diisi')
    setAddingManual(true)
    try {
      const res = await api.patch(`/admin/stock-opname/${detail.id}`, { action: 'add-item', itemName: manualItem.itemName, satuan: manualItem.satuan, hargaTerakhir: manualItem.hargaTerakhir })
      setDetail(prev => ({ ...prev, items: [...prev.items, res.data] }))
      setManualItem({ itemName: '', satuan: '', hargaTerakhir: '' })
      setShowAddManual(false)
    } catch (e) { alert(e.response?.data?.message || 'Gagal menambah item') }
    finally { setAddingManual(false) }
  }

  async function handleReopen() {
    if (!confirm('Buka kembali opname ini untuk diedit?')) return
    setReopening(true)
    try {
      await api.patch(`/admin/stock-opname/${detail.id}`, { action: 'reopen' })
      setDetail(prev => ({ ...prev, status: 'DRAFT' }))
    } catch (e) { alert(e.response?.data?.message || 'Gagal membuka opname') }
    finally { setReopening(false) }
  }

  async function handleDeleteManualItem(itemId) {
    if (!confirm('Hapus item manual ini?')) return
    try {
      await api.delete(`/admin/stock-opname/${detail.id}`, { data: { itemId } })
      setDetail(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }))
    } catch (e) { alert(e.response?.data?.message || 'Gagal menghapus') }
  }

  async function handleFinish() {
    if (!confirm('Selesaikan opname ini? Qty inventaris akan diperbarui sesuai qty aktual.')) return
    setFinishing(true)
    try {
      await api.patch(`/admin/stock-opname/${detail.id}`, { action: 'selesai' })
      setDetail(prev => ({ ...prev, status: 'SELESAI' }))
      load()
    } catch (e) { alert(e.response?.data?.message || 'Gagal menyelesaikan') }
    finally { setFinishing(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus opname ini?')) return
    try { await api.delete(`/admin/stock-opname/${id}`); load() }
    catch (e) { alert(e.response?.data?.message || 'Gagal menghapus') }
  }

  function startEdit(item) {
    setEditingId(item.id)
    // Tampilkan dalam satuanOpname jika ada konversi
    const displayQty = item.konversi && item.konversi > 0
      ? String(item.qtyActual / item.konversi)
      : String(item.qtyActual)
    setEditVal(displayQty)
    setEditNote(item.note || '')
  }

  // ── Detail view ──
  if (detail || detailLoading) {
    const cats = detail ? [...new Set(detail.items.map(i => i.inventoryItem?.category || i.expenseItem?.category).filter(Boolean))].sort() : []
    const filtered = detail ? detail.items.filter(i => {
      const matchCat = !filterCat || (i.inventoryItem?.category || i.expenseItem?.category) === filterCat
      const matchBelum = !filterSelisih || i.qtyActual === 0
      const matchSearch = !search || (i.inventoryItem?.name || i.itemName || '').toLowerCase().includes(search.toLowerCase())
      return matchCat && matchBelum && matchSearch
    }) : []
    const isDraft = detail?.status === 'DRAFT'

    return (
      <div className="page">
        <Sidebar />
        <main className="main">
          <div className="topbar">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 0' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Kembali
                </button>
                <span style={{ color: 'var(--border)' }}>/</span>
                <div className="topbar-title">Detail Opname</div>
              </div>
              {detail && (
                <div className="topbar-sub">
                  {fmtDate(detail.date)} · oleh {detail.user?.name} ·{' '}
                  <span style={{ color: detail.status === 'SELESAI' ? '#10B981' : '#F59E0B', fontWeight: 700 }}>{detail.status}</span>
                  {detail.note && <> · {detail.note}</>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {detail && isDraft && (
                <>
                  <button className="btn btn-ghost" onClick={() => setShowAddManual(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Tambah Manual
                  </button>
                  <button className="btn btn-primary" onClick={handleFinish} disabled={finishing} style={{ background: '#10B981', borderColor: '#10B981' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {finishing ? 'Menyimpan...' : 'Selesaikan Opname'}
                  </button>
                </>
              )}
              {detail && !isDraft && (
                <button className="btn btn-ghost" onClick={handleReopen} disabled={reopening}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {reopening ? 'Membuka...' : 'Edit Opname'}
                </button>
              )}
            </div>
          </div>

          <div className="content">
            {detailLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>Memuat...</div>
            ) : detail && (
              <>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'Total Item', val: detail.items.length, color: '#4A7CC7' },
                    { label: 'Sudah Diisi', val: detail.items.filter(i => i.qtyActual > 0).length, color: '#10B981' },
                    { label: 'Belum Diisi', val: detail.items.filter(i => i.qtyActual === 0).length, color: '#F59E0B' },
                    { label: 'Total Nilai', val: fmtRp(detail.items.reduce((s, i) => s + (i.qtyActual * (i.hargaTerakhir || 0)), 0)), color: '#8B5CF6', isText: true },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: s.isText ? '16px' : '22px', fontWeight: '800', color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Filter */}
                <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input className="input" style={{ paddingLeft: '32px', width: '200px' }} placeholder="Cari nama barang..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <select className="input" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="">Semua Kategori</option>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={filterSelisih} onChange={e => setFilterSelisih(e.target.checked)} style={{ width: '15px', height: '15px', cursor: 'pointer' }} />
                    Belum diisi saja
                  </label>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--muted)' }}>{filtered.length} item</span>
                </div>

                {/* Tabel */}
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nama Barang</th>
                          <th>Kategori</th>
                          <th style={{ textAlign: 'center' }}>Stok Sebelumnya</th>
                          <th style={{ textAlign: 'center' }}>Qty Saat Ini</th>
                          <th style={{ textAlign: 'right' }}>Harga Satuan</th>
                          <th style={{ textAlign: 'right' }}>Nilai Stok</th>
                          <th>Catatan</th>
                          {isDraft && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={isDraft ? 8 : 7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Tidak ada item</td></tr>
                        ) : filtered.map(item => {
                          const isEditing = editingId === item.id
                          const harga = item.hargaTerakhir || 0
                          const satuanTampil = (item.satuanOpname && item.konversi) ? item.satuanOpname : (item.inventoryItem?.satuan || item.satuan)
                          const qtyAktualTampil = (item.satuanOpname && item.konversi) ? item.qtyActual / item.konversi : item.qtyActual
                          const qtySebelumnyaTampil = (item.satuanOpname && item.konversi && item.qtySebelumnya != null) ? item.qtySebelumnya / item.konversi : item.qtySebelumnya
                          const qtyInputNow = isEditing ? (Number(editVal) || 0) : qtyAktualTampil
                          // Nilai stok selalu pakai satuan asli × harga
                          const qtyAsli = isEditing
                            ? (item.konversi ? Number(editVal) * item.konversi : Number(editVal))
                            : item.qtyActual
                          const nilaiStok = qtyAsli * harga
                          return (
                            <tr key={item.id} style={{ background: item.qtyActual === 0 && !isEditing ? '#FFFBEB' : undefined }}>
                              <td>
                                <div style={{ fontWeight: '600', color: 'var(--text)' }}>{item.inventoryItem?.name || item.itemName}</div>
                                {item.isManual && <span style={{ fontSize: '10px', background: 'var(--orange-light)', color: 'var(--orange)', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Manual</span>}
                              </td>
                              <td>{item.inventoryItem?.category || item.expenseItem?.category ? <span className="badge badge-blue">{item.inventoryItem?.category || item.expenseItem?.category}</span> : null}</td>
                              <td style={{ textAlign: 'center' }}>
                                {qtySebelumnyaTampil !== null && qtySebelumnyaTampil !== undefined
                                  ? <span className="badge badge-gray">{fmt(qtySebelumnyaTampil)} {satuanTampil}</span>
                                  : <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>
                                }
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {isEditing ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input
                                      className="input"
                                      type="number"
                                      step="any"
                                      min="0"
                                      value={editVal}
                                      onChange={e => setEditVal(e.target.value)}
                                      style={{ width: '80px', textAlign: 'center', padding: '4px 8px' }}
                                      autoFocus
                                      onKeyDown={e => { if (e.key === 'Enter') handleSaveItem(item.id); if (e.key === 'Escape') setEditingId(null) }}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{satuanTampil}</span>
                                    {item.satuanOpname && item.konversi && (
                                      <span style={{ fontSize: '10px', color: 'var(--accent)', background: 'var(--accent-light)', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                        = {fmt(Number(editVal) * item.konversi)} {item.inventoryItem?.satuan || item.satuan}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="badge badge-purple" style={{ cursor: isDraft ? 'pointer' : 'default' }} onClick={() => isDraft && startEdit(item)}>
                                    {fmt(qtyAktualTampil)} {satuanTampil}
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--muted)' }}>
                                {harga > 0 ? fmtRp(harga) : <span style={{ color: 'var(--muted)' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {harga > 0 && qtyAsli > 0
                                  ? <span style={{ fontWeight: '700', color: '#8B5CF6', fontSize: '13px' }}>{fmtRp(nilaiStok)}</span>
                                  : <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>
                                }
                              </td>
                              <td style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                {isEditing ? (
                                  <input className="input" placeholder="Catatan..." value={editNote} onChange={e => setEditNote(e.target.value)} style={{ padding: '4px 8px', fontSize: '12px' }} />
                                ) : item.note}
                              </td>
                              {isDraft && (
                                <td>
                                  {isEditing ? (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleSaveItem(item.id)} disabled={saving}>Simpan</button>
                                      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setEditingId(null)}>Batal</button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button className="btn" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #C7D4F0', padding: '4px 10px', fontSize: '12px' }} onClick={() => startEdit(item)}>Edit</button>
                                      {item.isManual && (
                                        <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleDeleteManualItem(item.id)}>Hapus</button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Stock Opname</div>
            <div className="topbar-sub">{total} opname tercatat</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Buat Opname
          </button>
        </div>

        <div className="content">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Oleh</th>
                    <th style={{ textAlign: 'center' }}>Total Item</th>
                    <th style={{ textAlign: 'center' }}>Selisih</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Catatan</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Memuat...</td></tr>
                  ) : opnames.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                      <div>Belum ada data stock opname</div>
                    </td></tr>
                  ) : opnames.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: '600' }}>{fmtDate(o.date)}</td>
                      <td>{o.user?.name}</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-gray">{o.totalItems}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        {o.itemsSelisih > 0
                          ? <span className="badge" style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>{o.itemsSelisih} item</span>
                          : <span className="badge" style={{ background: '#F0FDF4', color: '#10B981', border: '1px solid #A7F3D0' }}>Sesuai</span>
                        }
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{
                          background: o.status === 'SELESAI' ? '#F0FDF4' : '#FFFBEB',
                          color: o.status === 'SELESAI' ? '#10B981' : '#F59E0B',
                          border: `1px solid ${o.status === 'SELESAI' ? '#A7F3D0' : '#FDE68A'}`,
                          fontWeight: 700
                        }}>{o.status}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{o.note}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #C7D4F0', padding: '5px 10px', fontSize: '12px' }} onClick={() => openDetail(o.id)}>
                            {o.status === 'DRAFT' ? 'Isi' : 'Lihat'}
                          </button>
                          <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => handleDelete(o.id)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && totalPages > 1 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                <button className="btn btn-ghost" style={{ padding: '5px 12px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Hal {page} / {totalPages}</span>
                <button className="btn btn-ghost" style={{ padding: '5px 12px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Buat Opname */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="card fade-in" style={{ width: '420px', maxWidth: '96vw', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #D8E4F4, #E8EEF8)' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Buat Stock Opname</div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">Tanggal</label>
                <input type="date" className="input" value={opnameDate} onChange={e => setOpnameDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Catatan <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                <input className="input" placeholder="Misal: Opname bulanan Januari..." value={note} onChange={e => setNote(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()} />
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', background: 'var(--surface2)' }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleCreate} disabled={creating}>
                {creating ? 'Membuat...' : 'Buat & Mulai Isi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Item Manual */}
      {showAddManual && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddManual(false) }}>
          <div className="card fade-in" style={{ width: '400px', maxWidth: '96vw', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #D8E4F4, #E8EEF8)' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Tambah Item Manual</div>
              <button onClick={() => setShowAddManual(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">Nama Item</label>
                <input className="input" placeholder="Nama barang..." value={manualItem.itemName}
                  onChange={e => setManualItem(p => ({ ...p, itemName: e.target.value }))} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label">Satuan <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                  <input className="input" placeholder="pcs, kg, liter..." value={manualItem.satuan}
                    onChange={e => setManualItem(p => ({ ...p, satuan: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Harga/Satuan <span style={{ color: 'var(--muted)', fontWeight: '400' }}>(opsional)</span></label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--muted)', fontWeight: '600', pointerEvents: 'none' }}>Rp</span>
                    <input className="input" type="number" step="any" min="0" placeholder="0" value={manualItem.hargaTerakhir}
                      onChange={e => setManualItem(p => ({ ...p, hargaTerakhir: e.target.value }))}
                      style={{ paddingLeft: '30px' }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', background: 'var(--surface2)' }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddManual(false)}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleAddManual} disabled={addingManual}>
                {addingManual ? 'Menambah...' : 'Tambah Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
