'use client'
import { useState, useRef, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'

function MarkdownText({ text }) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3} (.+)$/gm, '<div class="md-heading">$1</div>')
    .replace(/^[-•] (.+)$/gm, '<div class="md-bullet"><span class="md-dot"></span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="md-bullet"><span class="md-num">$1.</span><span>$2</span></div>')
    .replace(/\n\n/g, '<br/>')
    .replace(/\n/g, '<br/>')
  return <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  )
}

const SUGGESTIONS = [
  'Berapa total penjualan hari ini?',
  'Produk apa yang paling laris bulan ini?',
  'Berapa total pengeluaran bulan ini?',
  'Bagaimana tren laba bersih bulan ini?',
  'Bandingkan penjualan bulan ini vs bulan lalu',
  'Produk apa yang perlu diperhatikan stoknya?',
]

export default function AIPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await api.post('/ai', {
        mode: 'chat',
        payload: { messages, question: q },
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.result }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Gagal mendapat respons. Silakan coba lagi.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="page">
      <Sidebar />
      <main className="main" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ai-topbar-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <div className="topbar-title">AI Assistant</div>
              <div className="topbar-sub">Tanya apa saja tentang data kedai kopi</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="ai-model-badge">
              <div className="ai-online-dot" />
              Llama 3.3 · Groq
            </div>
            {messages.length > 0 && (
              <button className="ai-clear-btn" onClick={() => setMessages([])}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                Hapus riwayat
              </button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="ai-chat-area">

          {/* Empty state */}
          {isEmpty && (
            <div className="ai-empty">
              <div className="ai-empty-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="ai-empty-title">Selamat datang di AI Assistant</div>
              <div className="ai-empty-sub">Tanya apa saja tentang penjualan, pengeluaran, produk, dan laporan kedai kopi kamu.</div>
              <div className="ai-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="ai-suggestion" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {!isEmpty && (
            <div className="ai-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`ai-row ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="ai-avatar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                  )}
                  <div className={`ai-bubble ${msg.role}`}>
                    {msg.role === 'user'
                      ? msg.content
                      : <MarkdownText text={msg.content} />
                    }
                  </div>
                </div>
              ))}

              {loading && (
                <div className="ai-row assistant">
                  <div className="ai-avatar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="ai-bubble assistant">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="ai-input-wrap">
          {/* Suggestion chips saat ada pesan */}
          {!isEmpty && !loading && (
            <div className="ai-chips">
              {SUGGESTIONS.slice(0, 3).map((s, i) => (
                <button key={i} className="ai-chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          <div className="ai-input-bar">
            <textarea
              ref={inputRef}
              className="ai-textarea"
              placeholder="Ketik pertanyaan..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-send"
              onClick={() => send()}
              disabled={loading || !input.trim()}
            >
              {loading
                ? <div className="ai-spin" />
                : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )
              }
            </button>
          </div>
          <div className="ai-hint">Enter untuk kirim · Shift+Enter untuk baris baru</div>
        </div>
      </main>

      <style>{`
        /* Topbar extras */
        .ai-topbar-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--accent-light); color: var(--accent);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .ai-model-badge {
          display: flex; align-items: center; gap: 7px;
          background: var(--surface2); border: 1px solid var(--border);
          padding: 6px 12px; border-radius: 20px;
          font-size: 12px; font-weight: 600; color: var(--text2);
        }
        .ai-online-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #10B981;
          box-shadow: 0 0 0 2px rgba(16,185,129,0.2);
          animation: aiPulse 2s ease-in-out infinite;
        }
        .ai-clear-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid var(--border); background: var(--surface);
          color: var(--muted); font-size: 12px; font-weight: 500;
          cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .ai-clear-btn:hover { background: var(--red-light); color: var(--red); border-color: #FECACA; }

        /* Chat area */
        .ai-chat-area {
          flex: 1; overflow-y: auto; display: flex; flex-direction: column;
          padding: 0 24px;
        }

        /* Empty state */
        .ai-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px 24px; text-align: center; gap: 12px;
          max-width: 600px; margin: 0 auto; width: 100%;
        }
        .ai-empty-icon-wrap {
          width: 60px; height: 60px; border-radius: 18px;
          background: var(--accent-light); color: var(--accent);
          display: flex; align-items: center; justify-content: center;
          border: 1px solid #C7D4F0; margin-bottom: 4px;
        }
        .ai-empty-title { font-size: 17px; font-weight: 700; color: var(--text); }
        .ai-empty-sub { font-size: 13px; color: var(--muted); line-height: 1.6; max-width: 400px; }
        .ai-suggestions {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          width: 100%; margin-top: 8px;
        }
        .ai-suggestion {
          padding: 11px 14px; border-radius: 10px;
          border: 1px solid var(--border); background: var(--surface);
          color: var(--text2); font-size: 12px; font-weight: 500;
          cursor: pointer; font-family: inherit; text-align: left;
          line-height: 1.5; transition: all 0.15s;
        }
        .ai-suggestion:hover {
          border-color: var(--accent); color: var(--accent);
          background: var(--accent-light); transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(74,124,199,0.12);
        }

        /* Messages */
        .ai-messages {
          display: flex; flex-direction: column; gap: 20px;
          padding: 24px 0; max-width: 800px; width: 100%; margin: 0 auto;
        }
        .ai-row { display: flex; gap: 10px; align-items: flex-start; }
        .ai-row.user { flex-direction: row-reverse; }
        .ai-avatar {
          width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
          background: var(--accent-light); color: var(--accent);
          border: 1px solid #C7D4F0;
          display: flex; align-items: center; justify-content: center;
          margin-top: 2px;
        }
        .ai-bubble {
          max-width: 72%; padding: 12px 16px;
          font-size: 13px; line-height: 1.7; border-radius: 14px;
        }
        .ai-bubble.user {
          background: var(--accent); color: #fff;
          border-radius: 14px 14px 4px 14px;
          box-shadow: 0 2px 8px rgba(74,124,199,0.25);
        }
        .ai-bubble.assistant {
          background: var(--surface); border: 1px solid var(--border);
          color: var(--text2); border-radius: 14px 14px 14px 4px;
          box-shadow: 0 1px 4px rgba(13,21,38,0.04);
        }

        /* Markdown */
        .md-body { font-size: 13px; line-height: 1.8; color: var(--text2); }
        .md-heading { font-weight: 700; font-size: 13px; color: var(--text); margin: 12px 0 6px; }
        .md-bullet { display: flex; gap: 8px; margin: 3px 0; align-items: flex-start; }
        .md-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 7px; }
        .md-num { color: var(--accent); font-weight: 700; flex-shrink: 0; min-width: 18px; }

        /* Typing dots */
        .typing-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--muted);
          animation: aiBounce 1.2s ease-in-out infinite;
        }

        /* Input */
        .ai-input-wrap {
          border-top: 1px solid var(--border); background: var(--surface);
          padding: 14px 24px 16px; flex-shrink: 0;
        }
        .ai-chips {
          display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap;
        }
        .ai-chip {
          padding: 5px 12px; border-radius: 20px;
          border: 1px solid var(--border); background: var(--surface2);
          color: var(--text2); font-size: 11px; font-weight: 500;
          cursor: pointer; font-family: inherit; transition: all 0.15s;
          white-space: nowrap;
        }
        .ai-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
        .ai-input-bar {
          display: flex; gap: 10px; align-items: flex-end;
          background: var(--surface2); border: 1.5px solid var(--border);
          border-radius: 14px; padding: 10px 10px 10px 16px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ai-input-bar:focus-within {
          border-color: var(--accent); box-shadow: 0 0 0 3px rgba(74,124,199,0.1);
          background: #fff;
        }
        .ai-textarea {
          flex: 1; border: none; background: transparent; outline: none;
          font-size: 13px; color: var(--text); font-family: inherit;
          resize: none; line-height: 1.6; max-height: 120px; overflow-y: auto;
        }
        .ai-textarea::placeholder { color: var(--muted); }
        .ai-textarea:disabled { opacity: 0.5; }
        .ai-send {
          width: 36px; height: 36px; border-radius: 10px; border: none;
          background: var(--accent); color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0; transition: all 0.15s;
        }
        .ai-send:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); box-shadow: 0 4px 10px rgba(74,124,199,0.35); }
        .ai-send:disabled { background: var(--border); color: var(--muted); cursor: not-allowed; transform: none; }
        .ai-hint { font-size: 11px; color: var(--muted); margin-top: 8px; text-align: center; }

        /* Spinner */
        .ai-spin {
          width: 15px; height: 15px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          animation: aiSpin 0.7s linear infinite;
        }

        @keyframes aiSpin { to { transform: rotate(360deg); } }
        @keyframes aiBounce { 0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes aiPulse { 0%, 100% { box-shadow: 0 0 0 2px rgba(16,185,129,0.2); } 50% { box-shadow: 0 0 0 5px rgba(16,185,129,0.08); } }
      `}</style>
    </div>
  )
}
