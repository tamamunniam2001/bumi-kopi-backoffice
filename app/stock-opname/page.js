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
  const [editHarga, setEditHarga] = useState('')
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualItem, setManualItem] = useState({ itemName: '', satuan: '', hargaTerakhir: '' })
  const [addingManual, setAddingManual] = useState(false)
  const [search, setSearch] = useState('')
  const [reopening, setReopening] = useState(false)
  const [sortDetail, setSortDetail] = useState({ key: '', dir: 1 })
  const [sortList, setSortList] = useState({ key: 'date', dir: -1 })
  const [requestingId, setRequestingId] = useState(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showLaporanRequest, setShowLaporanRequest] = useState(false)

  const [showSendWA, setShowSendWA] = useState(false)
  const [waSending, setWaSending] = useState(false)
  const [waNumber, setWaNumber] = useState('')
  const [waStatus, setWaStatus] = useState(null)
  const [waMessage, setWaMessage] = useState('')
  const [waOpname, setWaOpname] = useState(null)

  const [syncing, setSyncing] = useState(false)

  async function handleSendWA() {
    const numbers = waNumber.split(',').map(s => s.trim()).filter(Boolean)
    if (!numbers.length) return alert('Masukkan nomor WhatsApp tujuan')
    const opname = waOpname
    setWaSending(true); setWaStatus('sending')
    try {
      const res = await api.post(`/admin/stock-opname/${opname.id}/send-wa`, {
        targets: numbers,
        caption: `📋 *Laporan Stock Opname*\n${new Date(opname.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}\nOleh: ${opname.user?.name}\nStatus: ${opname.status}${opname.note ? `\nCatatan: ${opname.note}` : ''}`,
      })
      setWaStatus('success')
      setWaMessage(`Berhasil dikirim ke ${res.data.results?.filter(r => r.success).length} tujuan`)
    } catch (e) {
      setWaStatus('error')
      setWaMessage(e.response?.data?.message || JSON.stringify(e.response?.data?.debug) || 'Gagal mengirim')
    } finally { setWaSending(false) }
  }

  async function handleSyncManual() {
    if (!confirm('Ambil item manual dari opname sebelumnya?')) return
    setSyncing(true)
    try {
      const res = await api.patch(`/admin/stock-opname/${detail.id}`, { action: 'sync-manual' })
      setDetail(prev => ({ ...prev, items: [...prev.items, ...res.data] }))
    } catch (e) { alert(e.response?.data?.message || 'Gagal sync item manual') }
    finally { setSyncing(false) }
  }

  function toggleSortDetail(key) {
    setSortDetail(prev => prev.key === key ? { key, dir: prev.dir * -1 } : { key, dir: 1 })
  }
  function toggleSortList(key) {
    setSortList(prev => prev.key === key ? { key, dir: prev.dir * -1 } : { key, dir: 1 })
  }

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
      const item = detail.items.find(i => i.id === itemId)
      const konversi = item?.konversi
      const qtyToSave = konversi ? Number(editVal) * konversi : Number(editVal)
      const hargaToSave = item?.isManual && editHarga !== '' ? Number(editHarga) : undefined
      await api.patch(`/admin/stock-opname/${detail.id}`, { itemId, qtyActual: qtyToSave, note: editNote, hargaTerakhir: hargaToSave })
      setDetail(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId
          ? { ...i, qtyActual: qtyToSave, note: editNote, ...(hargaToSave !== undefined ? { hargaTerakhir: hargaToSave } : {}) }
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
      // Tampilkan popup laporan request jika ada item yang direquest
      const hasRequest = detail.items.some(i => i.isRequested)
      if (hasRequest) setShowLaporanRequest(true)
    } catch (e) { alert(e.response?.data?.message || 'Gagal menyelesaikan') }
    finally { setFinishing(false) }
  }

  async function handleSaveRequest(itemId) {
    try {
      const item = detail.items.find(i => i.id === itemId)
      const isRequested = !item.isRequested
      await api.patch(`/admin/stock-opname/${detail.id}`, { action: 'request-item', itemId, isRequested, requestQty: null })
      setDetail(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, isRequested, requestQty: null } : i) }))
      setRequestingId(null); setShowRequestModal(false)
    } catch (e) { alert(e.response?.data?.message || 'Gagal menyimpan request') }
  }

  function openRequestModal(item) {
    setRequestingId(item.id)
    setShowRequestModal(true)
  }

  async function handleDelete(id) {
    if (!confirm('Hapus opname ini?')) return
    try { await api.delete(`/admin/stock-opname/${id}`); load() }
    catch (e) { alert(e.response?.data?.message || 'Gagal menghapus') }
  }

  function startEdit(item) {
    setEditingId(item.id)
    const displayQty = item.konversi && item.konversi > 0
      ? String(item.qtyActual / item.konversi)
      : String(item.qtyActual)
    setEditVal(displayQty)
    setEditNote(item.note || '')
    setEditHarga(item.isManual ? String(item.hargaTerakhir || '') : '')
  }

  // ── Detail view ──
  if (detail || detailLoading) {
    const cats = detail ? [...new Set(detail.items.map(i => i.inventoryItem?.category || i.expenseItem?.category).filter(Boolean))].sort() : []
    const filtered = detail ? detail.items.filter(i => {
      const matchCat = !filterCat || (i.inventoryItem?.category || i.expenseItem?.category) === filterCat
      const matchBelum = !filterSelisih || i.qtyActual === 0
      const matchSearch = !search || (i.inventoryItem?.name || i.itemName || '').toLowerCase().includes(search.toLowerCase())
      return matchCat && matchBelum && matchSearch
    }).sort((a, b) => {
      if (!sortDetail.key) return 0
      let va, vb
      if (sortDetail.key === 'name') { va = (a.inventoryItem?.name || a.itemName || '').toLowerCase(); vb = (b.inventoryItem?.name || b.itemName || '').toLowerCase() }
      else if (sortDetail.key === 'category') { va = (a.inventoryItem?.category || a.expenseItem?.category || '').toLowerCase(); vb = (b.inventoryItem?.category || b.expenseItem?.category || '').toLowerCase() }
      else if (sortDetail.key === 'qty') { va = a.qtyActual; vb = b.qtyActual }
      else if (sortDetail.key === 'harga') { va = a.hargaTerakhir || 0; vb = b.hargaTerakhir || 0 }
      else if (sortDetail.key === 'nilai') { va = a.qtyActual * (a.hargaTerakhir || 0); vb = b.qtyActual * (b.hargaTerakhir || 0) }
      if (va < vb) return -1 * sortDetail.dir
      if (va > vb) return 1 * sortDetail.dir
      return 0
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
                  <button className="btn btn-ghost" onClick={handleSyncManual} disabled={syncing}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                    {syncing ? 'Menyinkron...' : 'Sync Item Manual'}
                  </button>
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
                          {[['name','Nama Barang'],['category','Kategori']].map(([k,l]) => (
                            <th key={k} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSortDetail(k)}>
                              {l} {sortDetail.key === k ? (sortDetail.dir === 1 ? '↑' : '↓') : <span style={{ color: 'var(--border)' }}>↕</span>}
                            </th>
                          ))}
                          <th style={{ textAlign: 'center' }}>Stok Sebelumnya</th>
                          <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSortDetail('qty')}>
                            Qty Saat Ini {sortDetail.key === 'qty' ? (sortDetail.dir === 1 ? '↑' : '↓') : <span style={{ color: 'var(--border)' }}>↕</span>}
                          </th>
                          <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSortDetail('harga')}>
                            Harga Satuan {sortDetail.key === 'harga' ? (sortDetail.dir === 1 ? '↑' : '↓') : <span style={{ color: 'var(--border)' }}>↕</span>}
                          </th>
                          <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSortDetail('nilai')}>
                            Nilai Stok {sortDetail.key === 'nilai' ? (sortDetail.dir === 1 ? '↑' : '↓') : <span style={{ color: 'var(--border)' }}>↕</span>}
                          </th>
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
                                {isEditing && item.isManual ? (
                                  <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--muted)', fontWeight: '600', pointerEvents: 'none' }}>Rp</span>
                                    <input className="input" type="number" step="any" min="0" placeholder="0" value={editHarga}
                                      onChange={e => setEditHarga(e.target.value)}
                                      style={{ width: '110px', padding: '4px 8px 4px 24px', fontSize: '12px', textAlign: 'right' }} />
                                  </div>
                                ) : harga > 0 ? fmtRp(harga) : <span style={{ color: 'var(--muted)' }}>—</span>}
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
                                      <button className="btn" style={{ background: item.isRequested ? '#FEF2F2' : '#FFF7ED', color: item.isRequested ? '#EF4444' : '#F59E0B', border: `1px solid ${item.isRequested ? '#FECACA' : '#FDE68A'}`, padding: '4px 8px', fontSize: '12px' }} onClick={() => openRequestModal(item)}>
                                        {item.isRequested ? '✓ Request' : 'Request'}
                                      </button>
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
      {/* Modal Request Item */}
      {showRequestModal && requestingId && (() => {
        const item = detail.items.find(i => i.id === requestingId)
        const itemName = item?.inventoryItem?.name || item?.itemName
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, backdropFilter: 'blur(6px)' }}
            onClick={e => { if (e.target === e.currentTarget) { setShowRequestModal(false); setRequestingId(null) } }}>
            <div className="card fade-in" style={{ width: '360px', maxWidth: '96vw', overflow: 'hidden' }}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: item?.isRequested ? '#FEF2F2' : '#FFF7ED', border: `2px solid ${item?.isRequested ? '#FECACA' : '#FDE68A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={item?.isRequested ? '#EF4444' : '#F59E0B'} strokeWidth="2.5" strokeLinecap="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>
                    {item?.isRequested ? 'Batalkan Request?' : 'Tandai Perlu Restock?'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{itemName}</div>
                </div>
                {item?.isRequested && (
                  <div style={{ padding: '8px 14px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', fontSize: '12px', color: '#EF4444', fontWeight: '600', width: '100%' }}>
                    Item ini sudah ditandai perlu restock
                  </div>
                )}
              </div>
              <div style={{ padding: '0 20px 20px', display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowRequestModal(false); setRequestingId(null) }}>Batal</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: item?.isRequested ? '#EF4444' : '#F59E0B', borderColor: item?.isRequested ? '#EF4444' : '#F59E0B' }}
                  onClick={() => handleSaveRequest(requestingId)}>
                  {item?.isRequested ? 'Batalkan' : 'Tandai Request'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Popup Laporan Request */}
      {showLaporanRequest && detail && (() => {
        const requested = detail.items.filter(i => i.isRequested)
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, backdropFilter: 'blur(6px)' }}>
            <div className="card fade-in" style={{ width: '420px', maxWidth: '96vw', overflow: 'hidden', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px 16px', background: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)' }}>Daftar Restock</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px' }}>{requested.length} item perlu restock</div>
                  </div>
                </div>
              </div>
              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {requested.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FFF7ED', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: '800', color: '#D97706' }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.inventoryItem?.name || item.itemName}</div>
                      {(item.expenseItem?.category || item.inventoryItem?.category) && (
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{item.expenseItem?.category || item.inventoryItem?.category}</div>
                      )}
                    </div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
              {/* Footer */}
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 }}>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#F59E0B', borderColor: '#F59E0B' }} onClick={() => setShowLaporanRequest(false)}>Tutup</button>
              </div>
            </div>
          </div>
        )
      })()}
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
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSortList('date')}>
                      Tanggal {sortList.key === 'date' ? (sortList.dir === 1 ? '↑' : '↓') : <span style={{ color: 'var(--border)' }}>↕</span>}
                    </th>
                    <th>Oleh</th>
                    <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSortList('totalItems')}>
                      Total Item {sortList.key === 'totalItems' ? (sortList.dir === 1 ? '↑' : '↓') : <span style={{ color: 'var(--border)' }}>↕</span>}
                    </th>
                    <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSortList('selisih')}>
                      Selisih {sortList.key === 'selisih' ? (sortList.dir === 1 ? '↑' : '↓') : <span style={{ color: 'var(--border)' }}>↕</span>}
                    </th>
                    <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSortList('status')}>
                      Status {sortList.key === 'status' ? (sortList.dir === 1 ? '↑' : '↓') : <span style={{ color: 'var(--border)' }}>↕</span>}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSortList('totalNilai')}>
                      Total Nilai {sortList.key === 'totalNilai' ? (sortList.dir === 1 ? '↑' : '↓') : <span style={{ color: 'var(--border)' }}>↕</span>}
                    </th>
                    <th>Catatan</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Memuat...</td></tr>
                  ) : opnames.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                      <div>Belum ada data stock opname</div>
                    </td></tr>
                  ) : opnames.map(o => o).sort((a, b) => {
                    let va, vb
                    if (sortList.key === 'date') { va = new Date(a.date); vb = new Date(b.date) }
                    else if (sortList.key === 'totalItems') { va = a.totalItems; vb = b.totalItems }
                    else if (sortList.key === 'selisih') { va = a.itemsSelisih; vb = b.itemsSelisih }
                    else if (sortList.key === 'status') { va = a.status; vb = b.status }
                    else if (sortList.key === 'totalNilai') { va = a.totalNilai; vb = b.totalNilai }
                    else { va = 0; vb = 0 }
                    if (va < vb) return -1 * sortList.dir
                    if (va > vb) return 1 * sortList.dir
                    return 0
                  }).map(o => (
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
                      <td style={{ textAlign: 'right', fontWeight: '700', color: '#8B5CF6', fontSize: '13px' }}>
                        {o.totalNilai > 0 ? fmtRp(o.totalNilai) : <span style={{ color: 'var(--muted)', fontWeight: '400' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{o.note}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #C7D4F0', padding: '5px 10px', fontSize: '12px' }} onClick={() => openDetail(o.id)}>
                            {o.status === 'DRAFT' ? 'Isi' : 'Lihat'}
                          </button>
                          <button className="btn" style={{ background: '#F0FDF4', color: '#22C55E', border: '1px solid #A7F3D0', padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => { setWaOpname(o); setShowSendWA(true); setWaStatus(null); setWaNumber('') }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
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

      {/* Modal Kirim WhatsApp */}
      {showSendWA && waOpname && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 800, backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget && !waSending) setShowSendWA(false) }}>
          <div className="card fade-in" style={{ width: '380px', maxWidth: '96vw', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', borderBottom: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Kirim ke WhatsApp</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>PDF akan digenerate otomatis</div>
              </div>
              {!waSending && <button onClick={() => setShowSendWA(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>}
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)' }}>
                <div style={{ fontWeight: '700', color: 'var(--text)', marginBottom: '2px' }}>Stock Opname</div>
                <div>{new Date(waOpname.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })} · {waOpname.totalItems} item · {waOpname.status}</div>
              </div>
              {waStatus !== 'success' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Nomor WhatsApp tujuan</label>
                  <input
                    className="input"
                    placeholder="628xxx atau 628xxx,628yyy untuk banyak nomor"
                    value={waNumber}
                    onChange={e => setWaNumber(e.target.value)}
                    disabled={waSending}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Format: 628xxxxxxxxx (tanpa + atau 0). Pisah koma untuk banyak nomor.</div>
                </div>
              )}
              {waStatus === 'sending' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                  <span style={{ width: '18px', height: '18px', border: '2px solid #A7F3D0', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                  <div style={{ fontSize: '13px', color: '#15803D', fontWeight: '600' }}>Membuat PDF dan mengirim...</div>
                </div>
              )}
              {waStatus === 'success' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#F0FDF4', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Terkirim!</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{waMessage}</div>
                </div>
              )}
              {waStatus === 'error' && (
                <div style={{ padding: '12px 14px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', fontSize: '12px', color: '#EF4444', fontWeight: '600' }}>
                  Gagal: {waMessage}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', gap: '8px' }}>
              {waStatus === 'success' ? (
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#22C55E', borderColor: '#22C55E' }} onClick={() => setShowSendWA(false)}>Tutup</button>
              ) : (
                <>
                  <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowSendWA(false)} disabled={waSending}>Batal</button>
                  <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', background: '#22C55E', borderColor: '#22C55E', opacity: !waNumber.trim() ? 0.5 : 1 }}
                    onClick={handleSendWA} disabled={waSending || !waNumber.trim()}>
                    {waSending ? 'Mengirim...' : 'Kirim PDF'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  )
}