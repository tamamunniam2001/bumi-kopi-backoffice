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

const STORAGE_KEY = 'thermal_device_id'

async function printThermal(tx) {
  if (!navigator.bluetooth) throw new Error('Browser tidak mendukung Web Bluetooth')

  const savedId = localStorage.getItem(STORAGE_KEY)

  let device
  try {
    // Coba request device — jika ada saved ID, filter by name tidak bisa,
    // tapi browser akan ingat pilihan user sebelumnya lewat requestDevice
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    })
  } catch {
    // Fallback: acceptAllDevices jika filter tidak cocok
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    })
  }

  localStorage.setItem(STORAGE_KEY, device.id)

  const server = await device.gatt.connect()
  let characteristic

  try {
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
    characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')
  } catch {
    // Coba semua service & characteristic yang writable
    const services = await server.getPrimaryServices()
    for (const svc of services) {
      const chars = await svc.getCharacteristics()
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          characteristic = c; break
        }
      }
      if (characteristic) break
    }
  }

  if (!characteristic) throw new Error('Karakteristik printer tidak ditemukan')

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

  await device.gatt.disconnect()
}

export { printThermal, buildReceipt }
