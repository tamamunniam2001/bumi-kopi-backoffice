'use client'
import { useState, useRef, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'

// ── ESC/POS helpers ──────────────────────────────────────────────────────────
const ESC = 0x1b
const GS  = 0x1d

// Konversi ImageData ke ESC/POS raster bitmap (GS v 0)
function imageDataToEscPos(imageData, printWidth = 384) {
  const { width, height, data } = imageData
  const bytesPerRow = Math.ceil(printWidth / 8)
  const bytes = []

  // GS v 0 header
  bytes.push(GS, 0x76, 0x30, 0x00)
  bytes.push(bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff)
  bytes.push(height & 0xff, (height >> 8) & 0xff)

  for (let y = 0; y < height; y++) {
    for (let bx = 0; bx < bytesPerRow; bx++) {
      let byte = 0
      for (let bit = 0; bit < 8; bit++) {
        const px = bx * 8 + bit
        if (px < width) {
          const idx = (y * width + px) * 4
          const r = data[idx], g = data[idx + 1], b = data[idx + 2]
          const gray = 0.299 * r + 0.587 * g + 0.114 * b
          if (gray < 128) byte |= (0x80 >> bit)
        }
      }
      bytes.push(byte)
    }
  }
  return bytes
}

// Resize + render gambar ke canvas, kembalikan ImageData dengan lebar printWidth
function renderImageToCanvas(imgEl, printWidth) {
  const ratio = printWidth / imgEl.naturalWidth
  const printHeight = Math.round(imgEl.naturalHeight * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = printWidth
  canvas.height = printHeight
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, printWidth, printHeight)
  ctx.drawImage(imgEl, 0, 0, printWidth, printHeight)
  return { imageData: ctx.getImageData(0, 0, printWidth, printHeight), height: printHeight }
}

// Cache BT device & characteristic
let _btDevice = null
let _btChar   = null

async function getBtCharacteristic() {
  if (_btChar && _btDevice?.gatt?.connected) return _btChar
  if (_btDevice) {
    try {
      const server = await _btDevice.gatt.connect()
      _btChar = await findChar(server)
      return _btChar
    } catch {
      _btDevice = null; _btChar = null
    }
  }
  if (!navigator.bluetooth) throw new Error('Browser tidak mendukung Web Bluetooth')
  let device
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    })
  } catch {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    })
  }
  _btDevice = device
  _btDevice.addEventListener('gattserverdisconnected', () => { _btChar = null })
  const server = await _btDevice.gatt.connect()
  _btChar = await findChar(server)
  return _btChar
}

async function findChar(server) {
  try {
    const svc = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
    return await svc.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')
  } catch {
    const services = await server.getPrimaryServices()
    for (const svc of services) {
      const chars = await svc.getCharacteristics()
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) return c
      }
    }
  }
  throw new Error('Karakteristik printer tidak ditemukan')
}

async function sendBytes(bytes) {
  const char = await getBtCharacteristic()
  const data = new Uint8Array(bytes)
  const chunkSize = 512
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    if (char.properties.writeWithoutResponse) {
      await char.writeValueWithoutResponse(chunk)
    } else {
      await char.writeValue(chunk)
    }
    await new Promise(r => setTimeout(r, 60))
  }
}

// ── Komponen utama ────────────────────────────────────────────────────────────
export default function PrintResiPage() {
  const [imgSrc, setImgSrc]       = useState(null)
  const [imgFile, setImgFile]     = useState(null)
  const [printing, setPrinting]   = useState(false)
  const [status, setStatus]       = useState(null)   // { type: 'success'|'error', msg }
  const [printWidth, setPrintWidth] = useState(384)  // lebar cetak dalam piksel (384 = 58mm, 576 = 80mm)
  const [dragging, setDragging]   = useState(false)
  const imgRef  = useRef(null)
  const fileRef = useRef(null)

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setImgFile(file)
    setStatus(null)
    const url = URL.createObjectURL(file)
    setImgSrc(url)
  }

  function handleInputChange(e) {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  function handlePaste(e) {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'))
    if (item) handleFile(item.getAsFile())
  }

  async function handlePrint() {
    if (!imgRef.current) return
    setPrinting(true); setStatus(null)
    try {
      const { imageData } = renderImageToCanvas(imgRef.current, printWidth)
      const imgBytes = imageDataToEscPos(imageData, printWidth)

      const header = [ESC, 0x40]                  // init
      const center = [ESC, 0x61, 0x01]            // center
      const feed   = [ESC, 0x64, 0x04]            // feed 4 lines
      const cut    = [GS, 0x56, 0x41, 0x04]       // partial cut

      await sendBytes([...header, ...center, ...imgBytes, ...feed, ...cut])
      setStatus({ type: 'success', msg: `Resi berhasil dicetak via ${_btDevice?.name || 'printer'}` })
    } catch (e) {
      setStatus({ type: 'error', msg: e.message || 'Gagal mencetak' })
    } finally {
      setPrinting(false)
    }
  }

  function handleReset() {
    setImgSrc(null); setImgFile(null); setStatus(null)
  }

  return (
    <div className="page">
      <Sidebar />
      <main className="main" onPaste={handlePaste}>
        <div className="topbar">
          <div>
            <div className="topbar-title">Print Resi</div>
            <div className="topbar-sub">Upload gambar resi lalu cetak via printer thermal Bluetooth</div>
          </div>
          {imgSrc && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={handleReset}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                Ganti Gambar
              </button>
              <button className="btn btn-primary" onClick={handlePrint} disabled={printing}
                style={{ minWidth: '130px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                {printing ? 'Mencetak...' : 'Print Resi'}
              </button>
            </div>
          )}
        </div>

        <div className="content">
          {/* Status */}
          {status && (
            <div className="slide-down" style={{
              marginBottom: '16px', padding: '12px 16px', borderRadius: '10px',
              border: `1px solid ${status.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              background: status.type === 'success' ? '#F0FDF4' : '#FEF2F2',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '16px' }}>{status.type === 'success' ? '✅' : '❌'}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: status.type === 'success' ? '#10B981' : '#EF4444' }}>
                  {status.msg}
                </span>
              </div>
              <button onClick={() => setStatus(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: imgSrc ? '1fr 340px' : '1fr', gap: '20px', alignItems: 'start' }}>
            {/* Area upload / preview */}
            <div>
              {!imgSrc ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current.click()}
                  style={{
                    border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '16px',
                    background: dragging ? 'var(--accent-light)' : 'var(--surface)',
                    padding: '64px 32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧾</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>
                    Upload Gambar Resi
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
                    Drag & drop, klik untuk pilih file, atau tekan Ctrl+V untuk paste dari clipboard
                  </div>
                  <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: '10px', fontSize: '13px', fontWeight: '700' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Pilih Gambar
                  </div>
                  <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--muted)' }}>
                    JPG, PNG, WEBP, GIF
                  </div>
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Preview Gambar</div>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{imgFile?.name}</span>
                  </div>
                  <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', background: '#F8FAFF' }}>
                    <img
                      ref={imgRef}
                      src={imgSrc}
                      alt="resi"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '600px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInputChange} />
            </div>

            {/* Panel pengaturan cetak */}
            {imgSrc && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>
                    Pengaturan Cetak
                  </div>

                  {/* Ukuran kertas */}
                  <div style={{ marginBottom: '16px' }}>
                    <label className="label">Ukuran Kertas Printer</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {[
                        { val: 384, label: 'Kertas 58mm', sub: '384 piksel' },
                        { val: 576, label: 'Kertas 80mm', sub: '576 piksel' },
                      ].map(opt => (
                        <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '9px', border: `1.5px solid ${printWidth === opt.val ? 'var(--accent)' : 'var(--border)'}`, background: printWidth === opt.val ? 'var(--accent-light)' : 'var(--surface)', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <input type="radio" name="printWidth" value={opt.val} checked={printWidth === opt.val}
                            onChange={() => setPrintWidth(opt.val)}
                            style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{opt.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{opt.sub}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 12px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
                    <div>🖨️ Printer thermal Bluetooth</div>
                    <div>🧾 Gambar akan otomatis di-resize</div>
                    <div>⬛ Dikonversi ke hitam-putih</div>
                  </div>
                </div>

                {/* Tombol print */}
                <button className="btn btn-primary" onClick={handlePrint} disabled={printing}
                  style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '14px', fontWeight: '700' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  {printing ? 'Menghubungkan & Mencetak...' : 'Print via Bluetooth'}
                </button>

                <button className="btn btn-ghost" onClick={handleReset} style={{ width: '100%', justifyContent: 'center' }}>
                  Ganti Gambar
                </button>

                {/* Panduan */}
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>Cara Penggunaan</div>
                  {[
                    '1. Upload gambar resi (foto/screenshot)',
                    '2. Pilih ukuran kertas sesuai printer',
                    '3. Tekan tombol Print via Bluetooth',
                    '4. Pilih printer dari daftar perangkat',
                    '5. Resi akan langsung tercetak',
                  ].map((s, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '5px', lineHeight: '1.5' }}>{s}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
