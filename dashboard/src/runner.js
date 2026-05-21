import { highlightNode, animatePacket } from './diagram.js'

let running = false

// ── logging ──────────────────────────────────────────────────────────────────
const ICONS = {
  info: '○', success: '✓', error: '✗', step: '→',
  kafka: '⊕', grpc: '⟡', graphql: '◈', data: '…', gateway: '⬡',
}

export function appendLog(msg, type = 'info') {
  const body = document.getElementById('log')
  if (!body) return
  const now = new Date()
  const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, '0')}`
  const d = document.createElement('div')
  d.className = `log-entry ${type}`
  d.innerHTML = `<span class="log-time">${ts}</span><span class="log-icon">${ICONS[type] ?? '·'}</span><span class="log-msg">${esc(msg)}</span>`
  body.appendChild(d)
  body.scrollTop = body.scrollHeight
}

export function clearLog() {
  const body = document.getElementById('log')
  if (body) body.innerHTML = ''
}

function pad(n) { return String(n).padStart(2, '0') }
function esc(s) { return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// ── flow animation helpers ────────────────────────────────────────────────────
async function step(opts) {
  const { from, to, conn, msg, type = 'step', delay = 680 } = opts
  if (from) highlightNode(from, true)
  appendLog(msg, type)
  if (conn) animatePacket(conn)
  await wait(delay)
  if (to) highlightNode(to, true)
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)) }

function resetAll() {
  ['browser','nginx','catalog','order','query','postgres','stock','kafka','notification']
    .forEach(id => highlightNode(id, false))
}

async function withRun(btn, fn) {
  if (running) return
  running = true
  resetAll()
  btn.disabled = true
  btn.classList.add('running')
  try {
    await fn()
  } catch (err) {
    appendLog(`Error: ${err.message}`, 'error')
  } finally {
    running = false
    btn.disabled = false
    btn.classList.remove('running')
    await wait(1500)
    resetAll()
  }
}

// ── API helpers (via Vite proxy) ──────────────────────────────────────────────
async function apiFetch(prefix, path, options = {}) {
  const res = await fetch(`/proxy/${prefix}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} — ${body.slice(0, 200)}`)
  }
  return res.json()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

export async function testListProducts(btn) {
  await withRun(btn, async () => {
    appendLog('━━ TEST: List Products via REST ━━', 'info')

    await step({ from: 'browser', conn: 'c-browser-nginx', to: 'nginx',
      msg: 'GET /api/catalog/products → nginx:8080', type: 'gateway' })

    await step({ from: 'nginx', conn: 'c-nginx-catalog', to: 'catalog',
      msg: 'nginx → GET /products → catalog-service:3001', type: 'step' })

    await step({ from: 'catalog', conn: 'c-catalog-postgres', to: 'postgres',
      msg: 'SELECT * FROM product', type: 'step', delay: 500 })

    const products = await apiFetch('catalog', '/products')

    highlightNode('catalog', true)
    appendLog(`✓ ${products.length} products returned`, 'success')
    appendLog(products.map(p => `  ${p.id}. ${p.name} — $${p.price}  (stock: ${p.stock})`).join('\n'), 'data')
  })
}

export async function testCreateOrder(btn) {
  await withRun(btn, async () => {
    appendLog('━━ TEST: Create Order — full E2E flow ━━', 'info')

    // 1. resolve a product via nginx
    await step({ from: 'browser', conn: 'c-browser-nginx', to: 'nginx',
      msg: 'GET /api/catalog/products → nginx:8080', type: 'gateway' })

    await step({ from: 'nginx', conn: 'c-nginx-catalog', to: 'catalog',
      msg: 'nginx → catalog-service:3001 GET /products', type: 'step' })

    await step({ from: 'catalog', conn: 'c-catalog-postgres', to: 'postgres',
      msg: 'SELECT * FROM product', type: 'step', delay: 400 })

    const products = await apiFetch('catalog', '/products')
    if (!products.length) { appendLog('No products in catalog — seed first', 'error'); return }

    const p = products[0]
    appendLog(`Using: "${p.name}" (id=${p.id}, stock=${p.stock})`, 'data')
    await wait(300)

    // 2. POST /orders via nginx
    await step({ from: 'browser', conn: 'c-browser-nginx', to: 'nginx',
      msg: `POST /api/orders/ { productId:${p.id}, qty:1 }`, type: 'gateway' })

    await step({ from: 'nginx', conn: 'c-nginx-order', to: 'order',
      msg: 'nginx → order-service:3002 POST /orders', type: 'step' })

    // 3. gRPC to stock
    await step({ from: 'order', conn: 'c-order-stock', to: 'stock',
      msg: `gRPC StockService.CheckAndReserve(productId=${p.id}, qty=1)`, type: 'grpc', delay: 700 })

    appendLog('stock-service checking availability…', 'grpc')
    await wait(400)

    // 4. stock responds → order saves
    await step({ from: 'stock', to: 'order',
      msg: '← gRPC: { available: true, message: "Reserved 1 unit" }', type: 'grpc', delay: 300 })

    await step({ from: 'order', conn: 'c-order-postgres', to: 'postgres',
      msg: 'INSERT INTO "order" (productId, quantity, customerEmail, status)', type: 'step', delay: 400 })

    // 5. Kafka emit
    await step({ from: 'order', conn: 'c-order-kafka', to: 'kafka',
      msg: 'Kafka emit → topic: order.created  { orderId, productId, customerEmail }', type: 'kafka', delay: 550 })

    // 6. notification consumes
    await step({ from: 'kafka', conn: 'c-kafka-notification', to: 'notification',
      msg: 'notification-service consuming order.created…', type: 'kafka', delay: 650 })

    // actual call (direct proxy, bypass nginx for test runner)
    const order = await apiFetch('order', '/orders', {
      method: 'POST',
      body: JSON.stringify({ productId: p.id, quantity: 1, customerEmail: 'test@example.com' }),
    })

    highlightNode('notification', true)
    appendLog(`Confirmation email sent → ${order.customerEmail}`, 'kafka')
    appendLog(`✓ Order created: id=${order.id}, status=${order.status}`, 'success')
    appendLog(JSON.stringify(order, null, 2), 'data')
  })
}

export async function testListOrders(btn) {
  await withRun(btn, async () => {
    appendLog('━━ TEST: List Orders via REST ━━', 'info')

    await step({ from: 'browser', conn: 'c-browser-nginx', to: 'nginx',
      msg: 'GET /api/orders/ → nginx:8080', type: 'gateway' })

    await step({ from: 'nginx', conn: 'c-nginx-order', to: 'order',
      msg: 'nginx → order-service:3002 GET /orders', type: 'step' })

    await step({ from: 'order', conn: 'c-order-postgres', to: 'postgres',
      msg: 'SELECT * FROM "order"', type: 'step', delay: 450 })

    const orders = await apiFetch('order', '/orders')
    appendLog(`✓ ${orders.length} orders`, 'success')
    if (orders.length) {
      appendLog(orders.map(o => `  order#${o.id}  product:${o.productId}  qty:${o.quantity}  ${o.status}`).join('\n'), 'data')
    }
  })
}

export async function testProductsGraphQL(btn) {
  await withRun(btn, async () => {
    appendLog('━━ TEST: Products via GraphQL ━━', 'info')

    await step({ from: 'browser', conn: 'c-browser-nginx', to: 'nginx',
      msg: 'POST /graphql { products { id name price stock } } → nginx:8080', type: 'gateway' })

    await step({ from: 'nginx', conn: 'c-nginx-query', to: 'query',
      msg: 'nginx → query-service:3005 GraphQL resolver', type: 'graphql' })

    await step({ from: 'query', conn: 'c-query-catalog', to: 'catalog',
      msg: 'query-service → HTTP GET http://localhost:3001/products', type: 'step', delay: 550 })

    await step({ from: 'catalog', conn: 'c-catalog-postgres', to: 'postgres',
      msg: 'SELECT * FROM product', type: 'step', delay: 400 })

    const data = await apiFetch('query', '/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: '{ products { id name price stock } }' }),
    })

    if (data.errors) throw new Error(data.errors[0].message)
    const products = data.data.products
    appendLog(`✓ GraphQL resolved ${products.length} products`, 'success')
    appendLog(products.map(p => `  ${p.name}  $${p.price}  stock:${p.stock}`).join('\n'), 'data')
  })
}

export async function testListOrdersGraphQL(btn) {
  await withRun(btn, async () => {
    appendLog('━━ TEST: Orders via GraphQL ━━', 'info')

    await step({ from: 'browser', conn: 'c-browser-nginx', to: 'nginx',
      msg: 'POST /graphql { orders { id productId status } } → nginx:8080', type: 'gateway' })

    await step({ from: 'nginx', conn: 'c-nginx-query', to: 'query',
      msg: 'nginx → query-service:3005 GraphQL resolver', type: 'graphql' })

    await step({ from: 'query', conn: 'c-query-order', to: 'order',
      msg: 'query-service → HTTP GET http://localhost:3002/orders', type: 'step', delay: 550 })

    await step({ from: 'order', conn: 'c-order-postgres', to: 'postgres',
      msg: 'SELECT * FROM "order"', type: 'step', delay: 400 })

    const data = await apiFetch('query', '/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: '{ orders { id productId quantity customerEmail status createdAt } }' }),
    })

    if (data.errors) throw new Error(data.errors[0].message)
    const orders = data.data.orders
    appendLog(`✓ GraphQL resolved ${orders.length} orders`, 'success')
    if (orders.length) {
      appendLog(orders.map(o => `  order#${o.id}  product:${o.productId}  qty:${o.quantity}  ${o.status}`).join('\n'), 'data')
    } else {
      appendLog('  (no orders yet — run Create Order test first)', 'data')
    }
  })
}
