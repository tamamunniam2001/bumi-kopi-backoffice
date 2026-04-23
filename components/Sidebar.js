'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <IconGrid /> },
  { href: '/products', label: 'Produk', icon: <IconBox /> },
  { href: '/ingredients', label: 'Bahan Baku', icon: <IconFlask /> },
  { href: '/rekap-bahan', label: 'Rekap Bahan', icon: <IconChart /> },
  { href: '/transactions', label: 'Transaksi', icon: <IconReceipt /> },
  { href: '/daily-reports', label: 'Laporan Harian', icon: <IconReport /> },
  { href: '/users', label: 'Kasir', icon: <IconUsers /> },
]

function IconReport() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
}
function IconGrid() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
}
function IconBox() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
}
function IconFlask() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6m-5 0v6l-4 9a1 1 0 0 0 .9 1.45h10.2A1 1 0 0 0 18 18l-4-9V3"/></svg>
}
function IconChart() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function IconReceipt() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
}
function IconUsers() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconLogout() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function logout() {
    Cookies.remove('token')
    Cookies.remove('user')
    router.push('/login')
  }

  return (
    <aside style={{
      width: '240px', minHeight: '100vh', flexShrink: 0,
      background: '#0F172A',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'linear-gradient(135deg, #2563EB, #60A5FA)',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px',
            boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
          }}>☕</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#F1F5F9', letterSpacing: '-0.2px' }}>Bumi Kopi</div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#1E293B', margin: '0 20px' }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#334155', letterSpacing: '1px', padding: '0 8px', marginBottom: '8px', textTransform: 'uppercase' }}>Menu</div>
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 10px', borderRadius: '9px',
              textDecoration: 'none', marginBottom: '2px',
              background: active ? 'rgba(37,99,235,0.15)' : 'transparent',
              color: active ? '#60A5FA' : '#64748B',
              fontWeight: active ? '600' : '500', fontSize: '13.5px',
              border: active ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94A3B8' } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' } }}
            >
              <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
              {active && <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#3B82F6' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid #1E293B' }}>
        <button onClick={logout} style={{
          width: '100%', padding: '9px 10px',
          background: 'transparent', border: '1px solid #1E293B',
          borderRadius: '9px', color: '#475569',
          fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'all 0.15s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#1E293B' }}
        >
          <IconLogout /> Keluar
        </button>
      </div>
    </aside>
  )
}
