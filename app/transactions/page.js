'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'
import { printThermal, disconnectPrinter } from '@/lib/thermal'

const methodBadge = {
  CASH: 'badge-green',
  QRIS: 'badge-blue',
  TRANSFER: 'badge-purple',
}

export default function TransactionsPage() {
  const [data, setData] = useState({ transactions: [], total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [printingId, setPrintingId] = useState(null)
  const [printerName, setPrinterName] = useState(null)

  async function handlePrint(tx) {
    setPrintingId(tx.id)
    try {
      const name = await printThermal(tx)
      if (name) setPrinterName(name)
    } catch (e) {
      alert('Gagal cetak: ' + e.message)
    } finally {
      setPrintingId(null)
    }
  }

  function handleDisconnect() {
    disconnectPrinter()
    setPrinterName(null)
  }

  async function load() {
    const params = new URLSearchParams({ page })
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    const res = await api.get(`/transactions?${params}`)
    setData(res.data)
  }

  useEffect(() => { load() }, [page])

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Transaksi</div>
            <div className="topbar-sub">{data.total} total transaksi</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {printerName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '6px 12px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#10B981' }}>{printerName}</span>
              </div>
            )}
            {printerName && (
              <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={handleDisconnect}>
                Ganti Printer
              </button>
            )}
          </div>
        </div>

        <div className="content">
          {/* Filter */}
          <div className="card" style={{ padding: '18px 24px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="label">Dari Tanggal</label>
              <input type="date" className="input" style={{ width: 'auto' }} value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Sampai Tanggal</label>
              <input type="date" className="input" style={{ width: 'auto' }} value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => { setPage(1); load() }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Filter
            </button>
            {(from || to) && (
              <button className="btn btn-ghost" onClick={() => { setFrom(''); setTo(''); setPage(1); setTimeout(load, 0) }}>Reset</button>
            )}
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  {['Invoice', 'Kasir', 'Total', 'Bayar', 'Metode', 'Waktu', ''].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94A3B8' }}>{tx.invoiceNo}</td>
                    <td style={{ fontWeight: '600', color: '#0D1526' }}>{tx.cashier.name}</td>
                    <td style={{ fontWeight: '700', color: '#2563EB' }}>Rp {tx.total.toLocaleString('id-ID')}</td>
                    <td style={{ color: '#4A5578' }}>Rp {tx.payment.toLocaleString('id-ID')}</td>
                    <td><span className={`badge ${methodBadge[tx.payMethod] || 'badge-gray'}`}>{tx.payMethod}</span></td>
                    <td style={{ fontSize: '12px', color: '#94A3B8' }}>{new Date(tx.createdAt).toLocaleString('id-ID')}</td>
                    <td>
                      <button
                        className="btn"
                        style={{ background: '#EFF4FF', color: '#2563EB', border: '1px solid #C7D4F0', padding: '5px 12px', fontSize: '12px', opacity: printingId === tx.id ? 0.6 : 1 }}
                        disabled={printingId === tx.id}
                        onClick={() => handlePrint(tx)}
                      >
                        {printingId === tx.id ? '⏳' : '🖨️'} {printingId === tx.id ? 'Mencetak...' : 'Print'}
                      </button>
                    </td>
                  </tr>
                ))}
                {data.transactions.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧾</div>
                    <div>Tidak ada transaksi</div>
                  </td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #F1F5FB', background: '#FAFBFF' }}>
              <span style={{ fontSize: '13px', color: '#94A3B8' }}>
                {data.transactions.length} dari {data.total} transaksi
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} disabled={page === 1} onClick={() => setPage(page - 1)}>‹ Prev</button>
                <span style={{ fontSize: '13px', color: '#4A5578', fontWeight: '600', padding: '0 8px' }}>{page} / {data.totalPages}</span>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>Next ›</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
