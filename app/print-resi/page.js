'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

// ── ESC/POS ──────────────────────────────────────────────────────────────────
const ESC = 0x1b
const GS  = 0x1d

function renderToCanvas(imgEl, printWidth, contrast = 0) {
  const ratio = printWidth / imgEl.naturalWidth
  const h = Math.round(imgEl.naturalHeight * ratio)
  const cv = document.createElement('canvas')
  cv.width = printWidth; cv.height = h
  const ctx = cv.getContext('2d')
  ctx.filter = `contrast(${100 + contrast}%)`
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, printWidth, h)
  ctx.drawImage(imgEl, 0, 0, printWidth, h)
  return { imageData: ctx.getImageData(0, 0, printWidth, h), width: printWidth, height: h }
}

// Unsharp mask sederhana untuk mempertajam tulisan
function sharpen(imageData, width, height, amount = 1.2) {
  const src = imageData.data
  const out = new Uint8ClampedArray(src)
  // Kernel laplacian 3x3
  const k = [-amount, -amount, -amount, -amount, 8 * amount + 1, -amount, -amount, -amount, -amount]
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let v = 0
        for (let ky = -1; ky <= 1; ky++)
          for (let kx = -1; kx <= 1; kx++)
            v += src[((y + ky) * width + (x + kx)) * 4 + c] * k[(ky + 1) * 3 + (kx + 1)]
        out[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, v))
      }
    }
  }
  const result = new ImageData(out, width, height)
  return result
}

// Floyd-Steinberg dithering
function dither(imageData, width, height) {
  const gray = new Float32Array(width * height)
  const { data } = imageData
  for (let i = 0; i < width * height; i++)
    gray[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2]
  const px = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const nv = gray[i] < 128 ? 0 : 255
      px[i] = nv === 0 ? 1 : 0
      const err = gray[i] - nv
      if (x+1 < width)            gray[i+1]           += err * 7/16
      if (y+1 < height) {
        if (x > 0)                gray[i+width-1]      += err * 3/16
                                  gray[i+width]        += err * 5/16
        if (x+1 < width)          gray[i+width+1]      += err * 1/16
      }
    }
  }
  return px
}

function toEscPos(imageData, printWidth) {
  const { width, height } = imageData
  const sharpened = sharpen(imageData, width, height, 1.5)
  const px = dither(sharpened, width, height)
  const bpr = Math.ceil(printWidth / 8)
  const bytes = []

  // Kirim per strip 32 baris via GS v 0 agar buffer printer tidak overflow
  const STRIP = 32
  for (let y = 0; y < height; y += STRIP) {
    const rows = Math.min(STRIP, height - y)
    // GS v 0 header untuk strip ini
    bytes.push(GS, 0x76, 0x30, 0x00)
    bytes.push(bpr & 0xff, (bpr >> 8) & 0xff)
    bytes.push(rows & 0xff, (rows >> 8) & 0xff)
    // Data baris per baris dalam strip
    for (let row = y; row < y + rows; row++) {
      for (let bx = 0; bx < bpr; bx++) {
        let b = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit
          if (x < width && px[row * width + x] === 1) b |= (0x80 >> bit)
        }
        bytes.push(b)
      }
    }
  }
  return bytes
}

function previewDither(imgEl, printWidth, contrast) {
  const { imageData, width, height } = renderToCanvas(imgEl, printWidth, contrast)
  const sharpened = sharpen(imageData, width, height, 1.5)
  const px = dither(sharpened, width, height)
  const cv = document.createElement('canvas')
  cv.width = width; cv.height = height
  const ctx = cv.getContext('2d')
  const out = ctx.createImageData(width, height)
  for (let i = 0; i < width * height; i++) {
    const v = px[i] === 1 ? 0 : 255
    out.data[i*4] = v; out.data[i*4+1] = v; out.data[i*4+2] = v; out.data[i*4+3] = 255
  }
  ctx.putImageData(out, 0, 0)
  return cv.toDataURL()
}

// ── Bluetooth ─────────────────────────────────────────────────────────────────
let _dev = null, _char = null

async function getChar() {
  if (_char && _dev?.gatt?.connected) return _char
  if (_dev) {
    try { const s = await _dev.gatt.connect(); _char = await findChar(s); return _char }
    catch { _dev = null; _char = null }
  }
  if (!navigator.bluetooth) throw new Error('Browser tidak mendukung Web Bluetooth')
  let device
  try {
    device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] })
  } catch {
    device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] })
  }
  _dev = device
  _dev.addEventListener('gattserverdisconnected', () => { _char = null })
  const server = await _dev.gatt.connect()
  _char = await findChar(server)
  return _char
}

async function findChar(server) {
  try {
    const svc = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
    return await svc.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')
  } catch {
    for (const svc of await server.getPrimaryServices())
      for (const c of await svc.getCharacteristics())
        if (c.properties.write || c.properties.writeWithoutResponse) return c
  }
  throw new Error('Karakteristik printer tidak ditemukan')
}

async function sendBytes(bytes) {
  const char = await getChar()
  const data = new Uint8Array(bytes)
  const useAck = char.properties.write
  const CHUNK = 128
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK)
    if (useAck) {
      await char.writeValue(chunk)
    } else {
      await char.writeValueWithoutResponse(chunk)
      await new Promise(r => setTimeout(r, 50))
    }
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

// ── Editor Crop & Rotate ─────────────────────────────────────────────────────
function ImageEditor({ src, onDone, onCancel }) {
  const canvasRef  = useRef(null)
  const [rotation, setRotation]   = useState(0)   // derajat: 0 90 180 270
  const [crop, setCrop]           = useState(null) // { x, y, w, h } dalam koordinat canvas
  const [dragging, setDragging]   = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [imgNatural, setImgNatural] = useState(null) // Image element asli
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef(null)
  const DISPLAY_MAX = 520 // lebar maks canvas tampil

  // Load gambar asli
  useEffect(() => {
    const img = new Image()
    img.onload = () => setImgNatural(img)
    img.src = src
  }, [src])

  // Hitung ukuran canvas berdasarkan rotasi
  const getDisplaySize = useCallback((img, rot) => {
    const swapped = rot === 90 || rot === 270
    const nw = swapped ? img.naturalHeight : img.naturalWidth
    const nh = swapped ? img.naturalWidth  : img.naturalHeight
    const scale = Math.min(1, DISPLAY_MAX / nw)
    return { w: Math.round(nw * scale), h: Math.round(nh * scale), scale, nw, nh }
  }, [])

  // Render canvas
  useEffect(() => {
    if (!imgNatural || !canvasRef.current) return
    const { w, h, scale, nw, nh } = getDisplaySize(imgNatural, rotation)
    const cv = canvasRef.current
    cv.width = w; cv.height = h
    setCanvasSize({ w, h })
    const ctx = cv.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(imgNatural, -imgNatural.naturalWidth / 2 * scale, -imgNatural.naturalHeight / 2 * scale,
      imgNatural.naturalWidth * scale, imgNatural.naturalHeight * scale)
    ctx.restore()
    // Gambar overlay crop
    if (crop) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, 0, w, crop.y)
      ctx.fillRect(0, crop.y, crop.x, crop.h)
      ctx.fillRect(crop.x + crop.w, crop.y, w - crop.x - crop.w, crop.h)
      ctx.fillRect(0, crop.y + crop.h, w, h - crop.y - crop.h)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h)
      // Grid rule of thirds
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 0.8
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(crop.x + crop.w * i/3, crop.y); ctx.lineTo(crop.x + crop.w * i/3, crop.y + crop.h); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(crop.x, crop.y + crop.h * i/3); ctx.lineTo(crop.x + crop.w, crop.y + crop.h * i/3); ctx.stroke()
      }
      // Handles pojok
      ctx.fillStyle = '#fff'
      const corners = [[crop.x, crop.y], [crop.x+crop.w, crop.y], [crop.x, crop.y+crop.h], [crop.x+crop.w, crop.y+crop.h]]
      corners.forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 2*Math.PI); ctx.fill() })
    }
  }, [imgNatural, rotation, crop, canvasSize])

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  function onMouseDown(e) {
    e.preventDefault()
    setDragging(true)
    const p = getPos(e)
    setDragStart(p)
    setCrop({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  function onMouseMove(e) {
    if (!dragging || !dragStart) return
    const p = getPos(e)
    const x = Math.max(0, Math.min(dragStart.x, p.x))
    const y = Math.max(0, Math.min(dragStart.y, p.y))
    const w = Math.min(Math.abs(p.x - dragStart.x), canvasSize.w - x)
    const h = Math.min(Math.abs(p.y - dragStart.y), canvasSize.h - y)
    setCrop({ x, y, w, h })
  }

  function onMouseUp() { setDragging(false) }

  function rotate(deg) {
    setRotation(r => (r + deg + 360) % 360)
    setCrop(null)
  }

  function handleApply() {
    if (!imgNatural) return
    const iw = imgNatural.naturalWidth
    const ih = imgNatural.naturalHeight
    const swapped = rotation === 90 || rotation === 270
    // Canvas output dalam resolusi asli
    const outW = swapped ? ih : iw
    const outH = swapped ? iw : ih
    const rotCv = document.createElement('canvas')
    rotCv.width = outW; rotCv.height = outH
    const rotCtx = rotCv.getContext('2d')
    rotCtx.fillStyle = '#fff'
    rotCtx.fillRect(0, 0, outW, outH)
    rotCtx.save()
    rotCtx.translate(outW / 2, outH / 2)
    rotCtx.rotate((rotation * Math.PI) / 180)
    rotCtx.drawImage(imgNatural, -iw / 2, -ih / 2, iw, ih)
    rotCtx.restore()
    // Crop — koordinat crop ada di display canvas, konversi ke skala asli
    let finalCv = rotCv
    if (crop && crop.w > 10 && crop.h > 10) {
      const { w: dw, h: dh } = getDisplaySize(imgNatural, rotation)
      const sx = (crop.x / dw) * outW
      const sy = (crop.y / dh) * outH
      const sw = (crop.w / dw) * outW
      const sh = (crop.h / dh) * outH
      const cropCv = document.createElement('canvas')
      cropCv.width = Math.round(sw); cropCv.height = Math.round(sh)
      cropCv.getContext('2d').drawImage(rotCv, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh), 0, 0, Math.round(sw), Math.round(sh))
      finalCv = cropCv
    }
    onDone(finalCv.toDataURL('image/jpeg', 0.95))
  }

  function handleReset() { setRotation(0); setCrop(null) }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,30,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 600, backdropFilter: 'blur(6px)' }}>
      <div className="card fade-in" style={{ width: '600px', maxWidth: '98vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#D8E4F4,#E8EEF8)', flexShrink: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Edit Gambar</div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* Rotate buttons */}
            <button onClick={() => rotate(-90)} title="Putar kiri" style={btnStyle}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            </button>
            <button onClick={() => rotate(90)} title="Putar kanan" style={btnStyle}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.5"/></svg>
            </button>
            <button onClick={() => rotate(180)} title="Balik 180°" style={btnStyle}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
            <button onClick={handleReset} style={{ ...btnStyle, fontSize: '11px', fontWeight: '700' }}>Reset</button>
            <button onClick={onCancel} style={{ ...btnStyle, color: '#94A3B8' }}>×</button>
          </div>
        </div>

        {/* Instruksi */}
        <div style={{ padding: '8px 18px', background: '#F0F9FF', borderBottom: '1px solid var(--border)', fontSize: '11px', color: '#0369A1', flexShrink: 0 }}>
          Seret pada gambar untuk memilih area crop. Rotasi: {rotation}°
        </div>

        {/* Canvas */}
        <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', background: '#1a2436' }}>
          <canvas ref={canvasRef}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={onMouseUp}
            style={{ cursor: 'crosshair', maxWidth: '100%', display: 'block', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', background: 'var(--surface2)', flexShrink: 0 }}>
          {crop && crop.w > 10 && crop.h > 10 && (
            <button className="btn btn-ghost" onClick={() => setCrop(null)} style={{ fontSize: '12px' }}>Batalkan Crop</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onCancel}>Batal</button>
          <button className="btn btn-primary" onClick={handleApply} style={{ minWidth: '120px', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Terapkan
          </button>
        </div>
      </div>
    </div>
  )
}

const btnStyle = { background: 'rgba(74,124,199,0.1)', border: '1px solid #C0D0E8', borderRadius: '7px', cursor: 'pointer', color: '#4A7CC7', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontSize: '16px' }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PrintResiPage() {
  const [list, setList]             = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [imgSrc, setImgSrc]         = useState(null)   // src final (sudah di-edit)
  const [rawImgSrc, setRawImgSrc]   = useState(null)   // src asli untuk editor
  const [imgFile, setImgFile]       = useState(null)
  const [namaResi, setNamaResi]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [printing, setPrinting]     = useState(null)   // id resi yang sedang dicetak
  const [printWidth, setPrintWidth] = useState(384)
  const [contrast, setContrast]     = useState(30)
  const [dragging, setDragging]     = useState(false)
  const [previewSrc, setPreviewSrc] = useState(null)
  const [selected, setSelected]     = useState(null)   // resi yang dibuka detail
  const imgRef  = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { loadList() }, [])

  async function loadList() {
    setLoadingList(true)
    try { const r = await api.get('/resi'); setList(r.data) }
    catch { } finally { setLoadingList(false) }
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setImgFile(file); setPreviewSrc(null)
    const url = URL.createObjectURL(file)
    setRawImgSrc(url)
    setShowEditor(true)  // langsung buka editor
    if (!namaResi) setNamaResi(file.name.replace(/\.[^.]+$/, ''))
  }

  function handleEditorDone(dataUrl) {
    setImgSrc(dataUrl)
    setShowEditor(false)
    setPreviewSrc(null)
  }

  const handleDrop = useCallback(e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }, [])
  function handlePaste(e) {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'))
    if (item) handleFile(item.getAsFile())
  }

  async function handleSave() {
    if (!imgSrc) return
    setSaving(true)
    try {
      // imgSrc sudah berupa dataURL (dari editor atau blob URL)
      let base64 = imgSrc
      if (imgSrc.startsWith('blob:')) {
        base64 = await fileToBase64(imgFile)
      }
      const r = await api.post('/resi', { nama: namaResi || 'Resi', imageUrl: base64 })
      setList(prev => [r.data, ...prev])
      setShowForm(false); setImgSrc(null); setRawImgSrc(null); setImgFile(null); setNamaResi(''); setPreviewSrc(null)
    } catch (e) { alert(e.response?.data?.message || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  async function handlePrint(resi) {
    setPrinting(resi.id)
    try {
      // Load gambar dari base64 ke Image element
      const img = new Image()
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = resi.imageUrl })
      const { imageData } = renderToCanvas(img, printWidth, contrast)
      const imgBytes = toEscPos(imageData, printWidth)
      await sendBytes([ESC, 0x40, ESC, 0x61, 0x01, ...imgBytes, ESC, 0x64, 0x04, GS, 0x56, 0x41, 0x04])
      // Mark as printed
      const updated = await api.patch(`/resi/${resi.id}`, { printed: true })
      setList(prev => prev.map(r => r.id === resi.id ? updated.data : r))
      if (selected?.id === resi.id) setSelected(updated.data)
    } catch (e) { alert(e.message || 'Gagal mencetak') }
    finally { setPrinting(null) }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus resi ini?')) return
    try {
      await api.delete(`/resi/${id}`)
      setList(prev => prev.filter(r => r.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (e) { alert(e.response?.data?.message || 'Gagal menghapus') }
  }

  async function handleTogglePrinted(resi) {
    try {
      const updated = await api.patch(`/resi/${resi.id}`, { printed: !resi.printed })
      setList(prev => prev.map(r => r.id === resi.id ? updated.data : r))
      if (selected?.id === resi.id) setSelected(updated.data)
    } catch { }
  }

  return (
    <div className="page">
      <Sidebar />
      <main className="main" onPaste={showForm ? handlePaste : undefined}>
        <div className="topbar">
          <div>
            <div className="topbar-title">Print Resi</div>
            <div className="topbar-sub">{list.length} resi tersimpan</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setImgSrc(null); setImgFile(null); setNamaResi(''); setPreviewSrc(null) }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Upload Resi
          </button>
        </div>

        <div className="content">
          {/* ── Form Upload ── */}
          {showForm && (
            <div className="card slide-down" style={{ padding: '20px 24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Upload Resi Baru</div>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
                {/* Drop zone / preview */}
                {!imgSrc ? (
                  <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop} onClick={() => fileRef.current.click()}
                    style={{ border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '12px', background: dragging ? 'var(--accent-light)' : 'var(--surface2)', padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🧾</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Drag & drop atau klik</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>JPG, PNG, WEBP · Ctrl+V untuk paste</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '10px' }}>
                      <img ref={imgRef} src={imgSrc} alt="resi"
                        style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block', background: '#f8faff' }} />
                    </div>
                    {previewSrc && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ padding: '8px 12px', background: 'var(--surface2)', fontSize: '11px', fontWeight: '700', color: 'var(--muted)' }}>PREVIEW CETAK</div>
                        <img src={previewSrc} alt="preview"
                          style={{ width: '100%', imageRendering: 'pixelated', display: 'block', background: '#fff' }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Panel kanan */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="label">Nama Resi</label>
                    <input className="input" value={namaResi} onChange={e => setNamaResi(e.target.value)} placeholder="Nama / keterangan resi" />
                  </div>

                  <div>
                    <label className="label">Ukuran Kertas</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      {[{ val: 384, label: '58mm' }, { val: 576, label: '80mm' }].map(o => (
                        <label key={o.val} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${printWidth === o.val ? 'var(--accent)' : 'var(--border)'}`, background: printWidth === o.val ? 'var(--accent-light)' : 'var(--surface)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                          <input type="radio" checked={printWidth === o.val} onChange={() => { setPrintWidth(o.val); setPreviewSrc(null) }} style={{ accentColor: 'var(--accent)' }} />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Kontras: {contrast > 0 ? `+${contrast}` : contrast}%</label>
                    <input type="range" min="-50" max="150" value={contrast}
                      onChange={e => { setContrast(Number(e.target.value)); setPreviewSrc(null) }}
                      style={{ width: '100%', accentColor: 'var(--accent)', marginTop: '4px' }} />
                  </div>

                  {imgSrc && (
                    <button className="btn btn-ghost" onClick={() => { setRawImgSrc(imgSrc); setShowEditor(true) }}
                      style={{ justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Crop & Rotate
                    </button>
                  )}

                  {imgSrc && (
                    <button className="btn btn-ghost" onClick={() => imgRef.current && setPreviewSrc(previewDither(imgRef.current, printWidth, contrast))}
                      style={{ justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Preview Hasil Cetak
                    </button>
                  )}

                  <button className="btn btn-ghost" onClick={() => fileRef.current.click()} style={{ justifyContent: 'center' }}>
                    {imgSrc ? 'Ganti Gambar' : 'Pilih File'}
                  </button>

                  <button className="btn btn-primary" onClick={handleSave} disabled={!imgSrc || saving}
                    style={{ justifyContent: 'center', padding: '12px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    {saving ? 'Menyimpan...' : 'Simpan Resi'}
                  </button>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />
            </div>
          )}

          {/* ── Daftar Resi ── */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nama Resi</th>
                  <th>Tanggal Upload</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Dicetak</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Memuat...</td></tr>
                ) : list.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧾</div>
                    <div>Belum ada resi tersimpan</div>
                  </td></tr>
                ) : list.map(r => (
                  <tr key={r.id}>
                    <td>
                      <button onClick={() => setSelected(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', color: 'var(--accent)', fontSize: '13px', padding: 0, fontFamily: 'inherit', textAlign: 'left' }}>
                        {r.nama || 'Resi'}
                      </button>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{fmtDate(r.createdAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleTogglePrinted(r)}
                        style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: r.printed ? '#D1FAE5' : '#FEF3C7', color: r.printed ? '#059669' : '#D97706' }}>
                        {r.printed ? '✓ Sudah Cetak' : '○ Belum Cetak'}
                      </button>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {r.printedAt ? fmtDate(r.printedAt) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '12px' }}
                          onClick={() => handlePrint(r)} disabled={printing === r.id}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          {printing === r.id ? '...' : 'Print'}
                        </button>
                        <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleDelete(r.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── Modal Detail / Print ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="card fade-in" style={{ width: '560px', maxWidth: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#D8E4F4,#E8EEF8)', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>{selected.nama || 'Resi'}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{fmtDate(selected.createdAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: selected.printed ? '#D1FAE5' : '#FEF3C7', color: selected.printed ? '#059669' : '#D97706' }}>
                  {selected.printed ? '✓ Sudah Cetak' : '○ Belum Cetak'}
                </span>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1 }}>×</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Setting print di modal */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[{ val: 384, label: '58mm' }, { val: 576, label: '80mm' }].map(o => (
                    <label key={o.val} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '7px', border: `1.5px solid ${printWidth === o.val ? 'var(--accent)' : 'var(--border)'}`, background: printWidth === o.val ? 'var(--accent-light)' : 'var(--surface)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      <input type="radio" checked={printWidth === o.val} onChange={() => setPrintWidth(o.val)} style={{ accentColor: 'var(--accent)' }} />
                      {o.label}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '160px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Kontras {contrast > 0 ? `+${contrast}` : contrast}%</span>
                  <input type="range" min="-50" max="150" value={contrast} onChange={e => setContrast(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent)' }} />
                </div>
              </div>

              <img src={selected.imageUrl} alt="resi"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)', display: 'block', background: '#f8faff' }} />
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', background: 'var(--surface2)', flexShrink: 0 }}>
              <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '12px' }}
                onClick={() => { setRawImgSrc(selected.imageUrl); setShowEditor(true) }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleTogglePrinted(selected)}>
                {selected.printed ? '○ Tandai Belum Cetak' : '✓ Tandai Sudah Cetak'}
              </button>
              <button className="btn btn-danger" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => handleDelete(selected.id)}>Hapus</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handlePrint(selected)} disabled={printing === selected.id}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                {printing === selected.id ? 'Mencetak...' : 'Print via Bluetooth'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Editor Crop & Rotate ── */}
      {showEditor && rawImgSrc && (
        <ImageEditor
          src={rawImgSrc}
          onDone={dataUrl => {
            if (selected) {
              // Edit dari modal detail — update imageUrl ke DB
              api.patch(`/resi/${selected.id}`, { printed: selected.printed, imageUrl: dataUrl })
                .then(r => {
                  setList(prev => prev.map(x => x.id === selected.id ? r.data : x))
                  setSelected(r.data)
                }).catch(() => {})
              setShowEditor(false)
            } else {
              handleEditorDone(dataUrl)
            }
          }}
          onCancel={() => {
            setShowEditor(false)
            if (!imgSrc && !selected) { setImgFile(null); setRawImgSrc(null) }
          }}
        />
      )}
    </div>
  )
}
