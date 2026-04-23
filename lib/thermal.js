const ESC = 0x1b
const GS = 0x1d

function encode(str) {
  return Array.from(new TextEncoder().encode(str))
}

function buildReceipt(tx) {
  const fmt = (n) => Number(n).toLocaleString('id-ID')
  const date = new Date(tx.createdAt).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const bytes = []

  const push = (...args) => bytes.push(...args)
  const text = (str) => push(...encode(str + '\n'))
  const hr = () => text('-'.repeat(32))

  const row = (left, right, width = 32) => {
    const gap = width - left.length - right.length
    text(left + ' '.repeat(Math.max(1, gap)) + right)
  }

  // Init + center
  push(ESC, 0x40)                          // init
  push(ESC, 0x61, 0x01)                    // center
  push(ESC, 0x21, 0x30)                    // double height+width bold
  text('BUMI KOPI')
  push(ESC, 0x21, 0x00)                    // normal
  text('Struk Pembayaran')
  push(ESC, 0x61, 0x00)                    // left

  hr()
  text(`Invoice : ${tx.invoiceNo}`)
  text(`Kasir   : ${tx.cashier?.name ?? '-'}`)
  text(`Waktu   : ${date}`)
  hr()

  for (const item of tx.items ?? []) {
    const name = item.product?.name ?? item.name ?? '-'
    text(name.substring(0, 32))
    row(`  ${item.qty} x Rp ${fmt(item.price)}`, `Rp ${fmt(item.subtotal)}`)
  }

  hr()
  push(ESC, 0x45, 0x01)                    // bold on
  row('TOTAL', `Rp ${fmt(tx.total)}`)
  push(ESC, 0x45, 0x00)                    // bold off
  row(`Bayar (${tx.payMethod})`, `Rp ${fmt(tx.payment)}`)
  row('Kembalian', `Rp ${fmt(tx.change)}`)
  hr()

  push(ESC, 0x61, 0x01)                    // center
  text('Terima kasih sudah berkunjung!')
  text('Bumi Kopi')
  push(ESC, 0x61, 0x00)

  // Feed + cut
  push(GS, 0x56, 0x41, 0x04)

  return new Uint8Array(bytes)
}

// Cache device & characteristic di memory selama sesi browser
let _device = null
let _characteristic = null

async function _getCharacteristic() {
  // Jika sudah ada characteristic dan device masih terkoneksi, langsung pakai
  if (_characteristic && _device?.gatt?.connected) return _characteristic

  // Jika device sudah dipilih sebelumnya tapi terputus, reconnect tanpa dialog
  if (_device) {
    try {
      const server = await _device.gatt.connect()
      _characteristic = await _findCharacteristic(server)
      return _characteristic
    } catch {
      // Gagal reconnect, reset dan minta pilih ulang
      _device = null
      _characteristic = null
    }
  }

  // Pertama kali: tampilkan dialog pilih device (hanya sekali per sesi)
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

  _device = device
  // Auto-reconnect jika device terputus
  _device.addEventListener('gattserverdisconnected', () => { _characteristic = null })

  const server = await _device.gatt.connect()
  _characteristic = await _findCharacteristic(server)
  return _characteristic
}

async function _findCharacteristic(server) {
  try {
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
    return await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')
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

async function printThermal(tx) {
  const characteristic = await _getCharacteristic()
  const data = buildReceipt(tx)
  const chunkSize = 512
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk)
    } else {
      await characteristic.writeValue(chunk)
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  return _device?.name ?? _device?.id ?? 'Printer'
}

// Reset koneksi (misal untuk ganti printer)
function disconnectPrinter() {
  if (_device?.gatt?.connected) _device.gatt.disconnect()
  _device = null
  _characteristic = null
}

export { printThermal, buildReceipt, disconnectPrinter }
