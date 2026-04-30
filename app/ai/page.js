'use client'
import { useState, useRef, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

function MarkdownText({ text }) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3} (.+)$/gm, '<div style="font-weight:800;font-size:14px;color:var(--text);margin:14px 0 6px">$1</div>')
    .replace(/^[-•] (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent);flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^(\d+\. .+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent);flex-shrink:0;font-weight:700">$1</span></div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
  return <div style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--text2)' }} dangerouslySetInnerHTML={{ __html: html }} />
}

function Spinner() {
  return <span className="ai-spinner" />
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', animation: `aiBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  )
}

const TABS = [
  { key: 'analyze', label: 'Analisis Pengeluaran', icon: '📊', color: '#4A7CC7', gradient: 'linear-gradient(135deg, #4A7CC7, #7AAAE0)' },
  { key: 'summary', label: 'Ringkasan Laporan', icon: '📋', color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #34D399)' },
  { key: 'chat', label: 'Tanya Data', icon: '💬', color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' },
]

const ANALYZE_FEATURES = [
  'Perbandingan pengeluaran bulan ini vs bulan lalu',
  'Breakdown per kategori & persentase',
  'Deteksi item pengeluaran terbesar',
  'Rekomendasi efisiensi & peringatan',
]

const SUMMARY_FEATURES = [
  'Ringkasan performa penjualan hari itu',
  'Perbandingan dengan hari sebelumnya',
  'Produk terlaris & highlight transaksi',
  'Saran & catatan untuk hari berikutnya',
]

const QUICK_QUESTIONS = [
  'Berapa total penjualan hari ini?',
  'Produk apa yang paling laris bulan ini?',
  'Berapa total pengeluaran bulan ini?',
  'Bagaimana laba bersih bulan ini?',
]

export default function AIPage() {
  const [tab, setTab] = useState('analyze')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [summaryResult, setSummaryResult] = useState(null)
  const [summaryMeta, setSummaryMeta] = useState(null)
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
      const res = await api.post('/ai', { mode: 'chat', payload: { messages: chatHistory, question: q } })
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.data.result }])
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: '❌ Gagal mendapat respons. Coba lagi.' }])
    } finally { setChatLoading(false) }
  }

  const activeTab = TABS.find(t => t.key === tab)

  return (
    <div className="page">
      <Sidebar />
      <main className="main">
        {/* Hero Topbar */}
        <div className="ai-hero">
          <div className="ai-hero-bg" />
          <div className="ai-hero-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="ai-hero-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.4px' }}>AI Assistant</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>Analisis cerdas berbasis data kedai kopi</div>
              </div>
            </div>
            <div className="ai-powered-badge">
              <span style={{ fontSize: '14px' }}>✨</span>
              <span>Powered by Groq · Llama 3.3</span>
            </div>
          </div>
        </div>

        <div className="content">
          {/* Tabs */}
          <div className="ai-tabs">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`ai-tab ${tab === t.key ? 'active' : ''}`}
                style={tab === t.key ? { background: t.gradient, borderColor: 'transparent', color: '#fff', boxShadow: `0 6px 20px ${t.color}40` } : {}}>
                <span className="ai-tab-icon">{t.icon}</span>
                <span>{t.label}</span>
                {tab === t.key && <span className="ai-tab-dot" />}
              </button>
            ))}
          </div>

          {/* ── Analisis Pengeluaran ── */}
          {tab === 'analyze' && (
            <div className={`ai-panel-grid ${analyzeResult ? 'has-result' : ''}`}>
              <FeatureCard
                icon="📊" title="Analisis Pengeluaran"
                desc="AI akan menganalisis pola pengeluaran bulan ini, membandingkan dengan bulan lalu, mendeteksi anomali, dan memberikan rekomendasi efisiensi biaya."
                features={ANALYZE_FEATURES} featureColor="#4A7CC7" featureBg="#EBF1FB" featureBorder="#C7D4F0"
                btnLabel="Analisis Sekarang" loading={analyzing} loadingLabel="Menganalisis..."
                btnStyle={{ background: 'linear-gradient(135deg, #4A7CC7, #7AAAE0)', boxShadow: '0 6px 20px rgba(74,124,199,0.4)' }}
                onClick={handleAnalyze}
              />
              {analyzeResult && (
                <ResultCard
                  icon="✨" title="Hasil Analisis AI" sub="Berdasarkan data pengeluaran terkini"
                  gradient="linear-gradient(135deg, #4A7CC7, #7AAAE0)"
                  onClose={() => setAnalyzeResult(null)} result={analyzeResult}
                />
              )}
            </div>
          )}

          {/* ── Ringkasan Laporan ── */}
          {tab === 'summary' && (
            <div className={`ai-panel-grid ${summaryResult ? 'has-result' : ''}`}>
              <FeatureCard
                icon="📋" title="Ringkasan Laporan Harian"
                desc="AI akan membuat ringkasan narasi dari laporan harian terakhir — mencakup performa penjualan, pengeluaran, produk terlaris, dan saran untuk hari berikutnya."
                features={SUMMARY_FEATURES} featureColor="#10B981" featureBg="#F0FDF4" featureBorder="#A7F3D0"
                btnLabel="Buat Ringkasan" loading={summarizing} loadingLabel="Membuat Ringkasan..."
                btnStyle={{ background: 'linear-gradient(135deg, #10B981, #34D399)', boxShadow: '0 6px 20px rgba(16,185,129,0.4)' }}
                onClick={handleSummary}
              />
              {summaryResult && (
                <ResultCard
                  icon="📋" title="Ringkasan Laporan"
                  sub={summaryMeta ? `${new Date(summaryMeta.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} · ${summaryMeta.cashier}` : ''}
                  gradient="linear-gradient(135deg, #10B981, #34D399)"
                  onClose={() => setSummaryResult(null)} result={summaryResult}
                />
              )}
            </div>
          )}

          {/* ── Chat ── */}
          {tab === 'chat' && (
            <div className="ai-chat-card card">
              {/* Chat Header */}
              <div className="ai-chat-header">
                <div className="ai-chat-avatar" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>🤖</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Tanya Data Kedai</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Tanya apa saja tentang penjualan, pengeluaran, dan laporan</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="ai-status-dot" />
                  <span style={{ fontSize: '11px', color: '#10B981', fontWeight: '600' }}>Online</span>
                  {chatHistory.length > 0 && (
                    <button onClick={() => setChatHistory([])} className="ai-clear-btn">Bersihkan</button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="ai-messages">
                {chatHistory.length === 0 ? (
                  <div className="ai-empty-state">
                    <div className="ai-empty-icon">🤖</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>Halo! Ada yang bisa saya bantu?</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>Tanya apa saja tentang data kedai kopi kamu</div>
                    <div className="ai-quick-grid">
                      {QUICK_QUESTIONS.map((q, i) => (
                        <button key={i} onClick={() => setQuestion(q)} className="ai-quick-btn">{q}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`ai-msg-row ${msg.role}`}>
                        {msg.role === 'assistant' && (
                          <div className="ai-chat-avatar sm" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>🤖</div>
                        )}
                        <div className={`ai-bubble ${msg.role}`}>
                          {msg.role === 'user' ? msg.content : <MarkdownText text={msg.content} />}
                        </div>
                        {msg.role === 'user' && (
                          <div className="ai-chat-avatar sm user">👤</div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="ai-msg-row assistant">
                        <div className="ai-chat-avatar sm" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>🤖</div>
                        <div className="ai-bubble assistant"><TypingDots /></div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleChat} className="ai-input-bar">
                <input className="input ai-input" placeholder="Tanya sesuatu... (misal: berapa penjualan hari ini?)"
                  value={question} onChange={e => setQuestion(e.target.value)} disabled={chatLoading} />
                <button type="submit" className="ai-send-btn" disabled={chatLoading || !question.trim()}
                  style={{ background: chatLoading || !question.trim() ? 'var(--border)' : 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>
                  {chatLoading ? <Spinner /> : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .ai-hero { position: relative; overflow: hidden; background: linear-gradient(135deg, #1E2A3B 0%, #2D3F5E 50%, #3A5080 100%); padding: 0 24px; height: 72px; display: flex; align-items: center; }
        .ai-hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at 80% 50%, rgba(74,124,199,0.3) 0%, transparent 60%), radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.2) 0%, transparent 50%); pointer-events: none; }
        .ai-hero-content { position: relative; width: 100%; display: flex; align-items: center; justify-content: space-between; }
        .ai-hero-icon { width: 44px; height: 44px; border-radius: 14px; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ai-powered-badge { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9); }

        .ai-tabs { display: flex; gap: '8px'; margin-bottom: 24px; gap: 8px; }
        .ai-tab { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; border: 1.5px solid var(--border); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; background: var(--surface); color: var(--text2); position: relative; }
        .ai-tab:hover:not(.active) { background: var(--surface2); border-color: #CBD5E1; transform: translateY(-1px); }
        .ai-tab.active { color: #fff; }
        .ai-tab-icon { font-size: 15px; }
        .ai-tab-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.7); margin-left: 2px; }

        .ai-panel-grid { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
        .ai-panel-grid.has-result { grid-template-columns: 1fr 1.2fr; }

        .ai-feature-card { padding: 28px; }
        .ai-feature-title { font-size: 17px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
        .ai-feature-desc { font-size: 13px; color: var(--muted); line-height: 1.7; margin-bottom: 22px; }
        .ai-feature-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
        .ai-feature-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text2); }
        .ai-feature-check { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ai-run-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
        .ai-run-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.05); }
        .ai-run-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .ai-result-card { padding: 24px; }
        .ai-result-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
        .ai-result-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .ai-result-close { margin-left: auto; background: var(--surface2); border: 1px solid var(--border); cursor: pointer; color: var(--muted); font-size: 16px; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .ai-result-close:hover { background: var(--red-light); color: var(--red); border-color: #FECACA; }

        .ai-chat-card { display: flex; flex-direction: column; height: calc(100vh - 220px); overflow: hidden; }
        .ai-chat-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #FAFBFF, #F5F0FF); }
        .ai-chat-avatar { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .ai-chat-avatar.sm { width: 32px; height: 32px; border-radius: 10px; font-size: 16px; margin-top: 2px; }
        .ai-chat-avatar.user { background: var(--surface2); border: 1px solid var(--border); }
        .ai-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 0 2px rgba(16,185,129,0.2); animation: aiPulse 2s ease-in-out infinite; }
        .ai-clear-btn { padding: 5px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--muted); font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .ai-clear-btn:hover { background: var(--red-light); color: var(--red); border-color: #FECACA; }

        .ai-messages { flex: 1; overflow-y: auto; padding: 24px; }
        .ai-empty-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; }
        .ai-empty-icon { font-size: 52px; animation: aiFloat 3s ease-in-out infinite; }
        .ai-quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-width: 520px; width: 100%; margin-top: 8px; }
        .ai-quick-btn { padding: 11px 14px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface); color: var(--text2); font-size: 12px; cursor: pointer; font-family: inherit; text-align: left; line-height: 1.5; transition: all 0.15s; }
        .ai-quick-btn:hover { border-color: #8B5CF6; color: #8B5CF6; background: #F5F0FF; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.15); }

        .ai-msg-row { display: flex; gap: 10px; }
        .ai-msg-row.user { justify-content: flex-end; }
        .ai-msg-row.assistant { justify-content: flex-start; }
        .ai-bubble { max-width: 75%; padding: 12px 16px; font-size: 13px; line-height: 1.7; }
        .ai-bubble.user { background: linear-gradient(135deg, #8B5CF6, #A78BFA); color: #fff; border-radius: 18px 18px 4px 18px; box-shadow: 0 4px 12px rgba(139,92,246,0.3); }
        .ai-bubble.assistant { background: var(--surface2); border: 1px solid var(--border); color: var(--text2); border-radius: 18px 18px 18px 4px; }

        .ai-input-bar { padding: 16px 20px; border-top: 1px solid var(--border); background: var(--surface); display: flex; gap: 10px; align-items: center; }
        .ai-input { flex: 1; font-size: 13px; border-radius: 12px; padding: 11px 16px; }
        .ai-send-btn { width: 44px; height: 44px; border-radius: 12px; border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
        .ai-send-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 6px 16px rgba(139,92,246,0.4); }
        .ai-send-btn:disabled { cursor: not-allowed; }

        .ai-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; display: inline-block; animation: aiSpin 0.7s linear infinite; }

        @keyframes aiSpin { to { transform: rotate(360deg); } }
        @keyframes aiBounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes aiFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes aiPulse { 0%, 100% { box-shadow: 0 0 0 2px rgba(16,185,129,0.2); } 50% { box-shadow: 0 0 0 5px rgba(16,185,129,0.1); } }
      `}</style>
    </div>
  )
}

function FeatureCard({ icon, title, desc, features, featureColor, featureBg, featureBorder, btnLabel, loading, loadingLabel, btnStyle, onClick }) {
  return (
    <div className="card ai-feature-card fade-in">
      <div style={{ fontSize: '28px', marginBottom: '14px' }}>{icon}</div>
      <div className="ai-feature-title">{title}</div>
      <div className="ai-feature-desc">{desc}</div>
      <div className="ai-feature-list">
        {features.map((f, i) => (
          <div key={i} className="ai-feature-item">
            <div className="ai-feature-check" style={{ background: featureBg, border: `1px solid ${featureBorder}` }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={featureColor} strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            {f}
          </div>
        ))}
      </div>
      <button className="ai-run-btn" style={btnStyle} onClick={onClick} disabled={loading}>
        {loading ? <><span className="ai-spinner" /> {loadingLabel}</> : <><span>✨</span> {btnLabel}</>}
      </button>
    </div>
  )
}

function ResultCard({ icon, title, sub, gradient, onClose, result }) {
  return (
    <div className="card ai-result-card fade-in">
      <div className="ai-result-header">
        <div className="ai-result-icon" style={{ background: gradient }}>
          <span>{icon}</span>
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>{title}</div>
          {sub && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{sub}</div>}
        </div>
        <button className="ai-result-close" onClick={onClose}>×</button>
      </div>
      <MarkdownText text={result} />
    </div>
  )
}
