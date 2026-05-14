const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const http = require('http')

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wa-session' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
})

let isReady = false

client.on('qr', qr => {
  console.log('\n=== Scan QR ini dengan WhatsApp ===')
  qrcode.generate(qr, { small: true })
})

client.on('ready', async () => {
  isReady = true
  console.log('✅ WhatsApp Bot siap!')
  console.log('\n=== Daftar Grup ===')
  const chats = await client.getChats()
  const groups = chats.filter(c => c.isGroup)
  if (groups.length === 0) {
    console.log('Tidak ada grup ditemukan')
  } else {
    groups.forEach(g => console.log(`📌 ${g.name}\n   ID: ${g.id._serialized}\n`))
  }
  console.log('==================\n')
})

client.on('disconnected', () => {
  isReady = false
  console.log('❌ WhatsApp terputus, restart server untuk reconnect')
})

client.initialize()

// HTTP server untuk menerima request dari Next.js
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') { res.writeHead(200); return res.end() }

  if (req.method === 'GET' && req.url === '/status') {
    return res.end(JSON.stringify({ ready: isReady }))
  }

  if (req.method === 'POST' && req.url === '/send-pdf') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        if (!isReady) {
          res.writeHead(503)
          return res.end(JSON.stringify({ error: 'WhatsApp belum terhubung' }))
        }

        const { targets, pdfBase64, caption } = JSON.parse(body)
        if (!targets?.length || !pdfBase64) {
          res.writeHead(400)
          return res.end(JSON.stringify({ error: 'targets dan pdfBase64 wajib diisi' }))
        }

        const media = new MessageMedia('application/pdf', pdfBase64, 'stock-opname.pdf')

        const results = []
        for (const target of targets) {
          try {
            // target bisa berupa nomor (628xxx) atau chatId grup (120363xxx@g.us)
            const chatId = target.includes('@') ? target : `${target}@c.us`
            await client.sendMessage(chatId, media, { caption: caption || '' })
            results.push({ target, success: true })
          } catch (e) {
            results.push({ target, success: false, error: e.message })
          }
        }

        res.writeHead(200)
        res.end(JSON.stringify({ success: true, results }))
      } catch (e) {
        res.writeHead(500)
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(3001, () => {
  console.log('🚀 WA Bot server berjalan di http://localhost:3001')
})
