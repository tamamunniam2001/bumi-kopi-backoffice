'use client'
import { useState, useRef, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

function MarkdownText({ text }) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3} (.+)$/gm, '<div style="font-weight:800;font-size:14px;color:var(--text);margin:14px 0 6px">$1</div>')
    .replace(/^[-•] (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent);flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent);flex-shrink:0;font-weight:700">$&</span></div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
  return <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text2)' }} dangerouslySetInnerHTML={{ __html: html }} />
}

function Spinner() {
  return (
    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
  )
}

export default function AIPage() {
  const [tab, setTab] = useState('analyze')

  // Analyze
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState(null)

  // Summary
  const [summarizing, setSummarizing] = useState(false)
  const [summaryResult, setSummaryResult] = useState(null)
  const [summaryMeta, setSummaryMeta] = useState(null)

  // Chat
  const [chatHistory, setChatHistory] = useState([])
  const [question, setQuestion] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory])

  async function handleAnalyze() {
    setAnalyzing(true); setAnalyzeResult(null)
    try {
      const res = await api.post('/ai', { mode: 'analyze' })
      setAnalyzeResult(res.data.result)
    } catch (e) { alert(e.response?.data?.message || 'Gagal menganalisis') }
    finally { setAnalyzing(false) }
  }

  async function handleSummary() {
    setSummarizing(true); setSummaryResult(null)
    try {
      const res = await api.post('/ai', { mode: 'summary' })
      setSummaryResult(res.data.result)
      setSummaryMeta(res.data.report)
    } catch (e) { alert(e.response?.data?.message || 'Gagal membuat ringkasan') }
    finally { setSummarizing(false) }
  }

  async function handleChat(e) {
    e.preventDefault()
    if (!question.trim() || chatLoading) return
    const q = question.trim()
    setQuestion('')
    setChatHistory(prev => [...prev, { role: 'user', content: q }])
    setChatLoading(true)
    try {
      const res = await api.post('/ai', {
        mode: 'chat',
        payload: { messages: chatHistory, question: q },
      })
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.data.result }])
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: '❌ Gagal mendapat respons. Coba lagi.' }])
    }
    finally { setChatLoading(false) }
  }

  const tabs = [
    { key: 'analyze', label: 'Analisis Pengeluaran', icon: '📊' },
    { key: 'summary', label: 'Ringkasan Laporan', icon: '📋' },
    { key: 'chat', label: 'Tanya Data', icon: '💬' },
  ]

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">AI Assistant</div>
            <div className="topbar-sub">Analisis cerdas berbasis data kedai kopi</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #EFF4FF, #F5F0FF)', padding: '8px 14px', borderRadius: '10px', border: '1px solid #C7D4F0' }}>
            <span style={{ fontSize: '16px' }}>✨</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)' }}>Powered by Groq · Llama 3.3</span>
          </div>
        </div>

        <div className="content">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '7px',
                  background: tab === t.key ? 'var(--accent)' : 'var(--surface)',
                  borderColor: tab === t.key ? 'var(--accent)' : 'var(--border)',
                  color: tab === t.key ? '#fff' : 'var(--text2)',
                  boxShadow: tab === t.key ? '0 4px 12px rgba(74,124,199,0.3)' : 'none',
                }}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Analisis Pengeluaran ── */}
          {tab === 'analyze' && (
            <div style={{ display: 'grid', gridTemplateColumns: analyzeResult ? '1fr 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>
              <div className="card" style={{ padding: '28px' }}>
                <div style={{ fontSize: '20px', marginBottom: '12px' }}>📊</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Analisis Pengeluaran</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                  AI akan menganalisis pola pengeluaran bulan ini, membandingkan dengan bulan lalu, mendeteksi anomali, dan memberikan rekomendasi efisiensi biaya.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {['Perbandingan pengeluaran bulan ini vs bulan lalu', 'Breakdown per kategori & persentase', 'Deteksi item pengeluaran terbesar', 'Rekomendasi efisiensi & peringatan'].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text2)' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px', gap: '8px' }}
                  onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? <><Spinner /> Menganalisis...</> : <><span>✨</span> Analisis Sekarang</>}
                </button>
              </div>

              {analyzeResult && (
                <div className="card fade-in" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent), #7AAAE0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '18px' }}>✨</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Hasil Analisis AI</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Berdasarkan data pengeluaran terkini</div>
                    </div>
                    <button onClick={() => setAnalyzeResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '18px' }}>×</button>
                  </div>
                  <MarkdownText text={analyzeResult} />
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Ringkasan Laporan ── */}
          {tab === 'summary' && (
            <div style={{ display: 'grid', gridTemplateColumns: summaryResult ? '1fr 1.5fr' : '1fr', gap: '20px', alignItems: 'start' }}>
              <div className="card" style={{ padding: '28px' }}>
                <div style={{ fontSize: '20px', marginBottom: '12px' }}>📋</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Ringkasan Laporan Harian</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                  AI akan membuat ringkasan narasi dari laporan harian terakhir — mencakup performa penjualan, pengeluaran, produk terlaris, dan saran untuk hari berikutnya.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {['Ringkasan performa penjualan hari itu', 'Perbandingan dengan hari sebelumnya', 'Produk terlaris & highlight transaksi', 'Saran & catatan untuk hari berikutnya'].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text2)' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#F0FDF4', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px', gap: '8px', background: 'linear-gradient(135deg, #10B981, #34D399)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                  onClick={handleSummary} disabled={summarizing}>
                  {summarizing ? <><Spinner /> Membuat Ringkasan...</> : <><span>✨</span> Buat Ringkasan</>}
                </button>
              </div>

              {summaryResult && (
                <div className="card fade-in" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #34D399)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '18px' }}>📋</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Ringkasan Laporan</div>
                      {summaryMeta && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(summaryMeta.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} · {summaryMeta.cashier}</div>}
                    </div>
                    <button onClick={() => setSummaryResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '18px' }}>×</button>
                  </div>
                  <MarkdownText text={summaryResult} />
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Chat ── */}
          {tab === 'chat' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #EFF4FF, #F5F8FE)' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent), #7AAAE0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🤖</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Tanya Data Kedai</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Tanya apa saja tentang penjualan, pengeluaran, dan laporan</div>
                </div>
                {chatHistory.length > 0 && (
                  <button onClick={() => setChatHistory([])} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Bersihkan
                  </button>
                )}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {chatHistory.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '48px' }}>💬</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Tanya apa saja tentang data kedai</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '500px', width: '100%' }}>
                      {[
                        'Berapa total penjualan hari ini?',
                        'Produk apa yang paling laris bulan ini?',
                        'Berapa total pengeluaran bulan ini?',
                        'Bagaimana laba bersih bulan ini?',
                      ].map((q, i) => (
                        <button key={i} onClick={() => setQuestion(q)}
                          style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', lineHeight: 1.4, transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {chatHistory.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        {msg.role === 'assistant' && (
                          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent), #7AAAE0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>🤖</div>
                        )}
                        <div style={{
                          maxWidth: '75%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
                          border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                          color: msg.role === 'user' ? '#fff' : 'var(--text2)',
                          fontSize: '13px', lineHeight: 1.6,
                        }}>
                          {msg.role === 'user' ? msg.content : <MarkdownText text={msg.content} />}
                        </div>
                        {msg.role === 'user' && (
                          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>👤</div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent), #7AAAE0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🤖</div>
                        <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                          {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleChat} style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', gap: '10px' }}>
                <input className="input" placeholder="Tanya sesuatu... (misal: berapa penjualan hari ini?)" value={question}
                  onChange={e => setQuestion(e.target.value)} style={{ flex: 1, fontSize: '13px' }} disabled={chatLoading} />
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', gap: '6px', flexShrink: 0 }} disabled={chatLoading || !question.trim()}>
                  {chatLoading ? <Spinner /> : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  )}
                  Kirim
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}
