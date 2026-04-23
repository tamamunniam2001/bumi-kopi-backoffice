import './globals.css'

export const metadata = { title: 'Bumi Kopi - Admin' }

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
