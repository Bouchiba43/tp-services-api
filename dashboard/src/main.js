import './style.css'
import { buildDiagram, setNodeStatus } from './diagram.js'
import {
  appendLog, clearLog,
  testListProducts, testCreateOrder, testListOrders,
  testProductsGraphQL, testListOrdersGraphQL,
} from './runner.js'

// ── service registry ──────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: 'nginx',
    name: 'nginx API Gateway',
    meta: ':8080 · reverse proxy · /api/catalog/ · /api/orders/ · /graphql',
    port: 8080,
    healthPath: '/health',
    type: 'gateway',
    link: { label: 'nginx :8080', url: 'http://localhost:8080/health' },
  },
  {
    id: 'catalog',
    name: 'Catalog Service',
    meta: ':3001 · REST · PostgreSQL',
    port: 3001,
    type: 'rest',
    link: { label: 'Swagger', url: 'http://localhost:3001/api' },
  },
  {
    id: 'order',
    name: 'Order Service',
    meta: ':3002 · REST · gRPC client · Kafka producer',
    port: 3002,
    type: 'rest',
    link: { label: 'Swagger', url: 'http://localhost:3002/api' },
  },
  {
    id: 'query',
    name: 'Query Service',
    meta: ':3005 · GraphQL · HTTP proxy',
    port: 3005,
    type: 'graphql',
    link: { label: 'Playground', url: 'http://localhost:3005/graphql' },
  },
  {
    id: 'stock',
    name: 'Stock Service',
    meta: ':5001 · gRPC server · in-memory store',
    type: 'grpc',
  },
  {
    id: 'notification',
    name: 'Notification Service',
    meta: 'Kafka consumer · topic: order.created',
    type: 'kafka',
  },
]

// ── E2E tests ──────────────────────────────────────────────────────────────────
const TESTS = [
  { id: 'list-products',   icon: '📦', label: 'List Products',         desc: 'GET /products  via Gateway → catalog → postgres', fn: testListProducts },
  { id: 'create-order',    icon: '🛒', label: 'Create Order',          desc: 'Full flow: Gateway → gRPC → Kafka → notification', fn: testCreateOrder },
  { id: 'list-orders',     icon: '📋', label: 'List Orders',           desc: 'GET /orders  via Gateway → order → postgres', fn: testListOrders },
  { id: 'graphql-products',icon: '◈',  label: 'Products via GraphQL',  desc: 'GraphQL → Gateway → query → HTTP → catalog', fn: testProductsGraphQL },
  { id: 'graphql-orders',  icon: '◈',  label: 'Orders via GraphQL',    desc: 'GraphQL → Gateway → query → HTTP → order', fn: testListOrdersGraphQL },
]

// ── render: service cards ─────────────────────────────────────────────────────
function renderServiceCards() {
  const container = document.getElementById('service-cards')

  SERVICES.forEach(svc => {
    const card = document.createElement('div')
    card.className = `svc-card svc-${svc.type}`

    const info = document.createElement('div')
    info.className = 'svc-info'
    info.innerHTML = `<span class="svc-name">${svc.name}</span><span class="svc-meta">${svc.meta}</span>`

    const actions = document.createElement('div')
    actions.className = 'svc-actions'

    if (svc.link) {
      const btn = document.createElement('button')
      btn.className = `btn-link btn-${svc.type}`
      btn.textContent = svc.link.label
      btn.onclick = () => window.open(svc.link.url, '_blank')
      actions.appendChild(btn)
    }

    const dot = document.createElement('div')
    dot.className = `status-dot ${svc.type === 'grpc' ? 'dot-grpc' : svc.type === 'kafka' ? 'dot-kafka' : ''}`
    dot.id = `ui-status-${svc.id}`
    actions.appendChild(dot)

    card.appendChild(info)
    card.appendChild(actions)
    container.appendChild(card)
  })
}

// ── render: test buttons ───────────────────────────────────────────────────────
function renderTestButtons() {
  const container = document.getElementById('test-buttons')

  TESTS.forEach(test => {
    const btn = document.createElement('button')
    btn.className = 'test-btn'
    btn.id = `btn-${test.id}`
    btn.innerHTML = `
      <span class="btn-icon">${test.icon}</span>
      <span class="btn-text">
        <span class="btn-label">${test.label}</span>
        <span class="btn-desc">${test.desc}</span>
      </span>
    `
    btn.onclick = () => test.fn(btn)
    container.appendChild(btn)
  })
}

// ── health polling ────────────────────────────────────────────────────────────
async function checkHealth(svc) {
  const path = svc.healthPath ?? '/'
  try {
    const res = await fetch(`/proxy/${svc.id}${path}`, { signal: AbortSignal.timeout(2000) })
    return res.status < 500
  } catch {
    return false
  }
}

async function pollHealth() {
  const checkable = SERVICES.filter(s => s.port)
  const results = await Promise.all(checkable.map(async s => ({ s, online: await checkHealth(s) })))

  let onlineCount = 0
  results.forEach(({ s, online }) => {
    const dot = document.getElementById(`ui-status-${s.id}`)
    if (dot) {
      dot.classList.toggle('online', !!online)
      dot.classList.toggle('offline', !online)
    }
    setNodeStatus(s.id, !!online)
    if (online) onlineCount++
  })

  const badge = document.getElementById('online-count')
  if (badge) {
    badge.textContent = `${onlineCount} / ${checkable.length}`
    badge.style.color = onlineCount === 0 ? '#f44336'
      : onlineCount === checkable.length ? '#4caf50' : '#ff9800'
  }
}

// ── SSE: Kafka / notification live stream ─────────────────────────────────────
const NEST_LOG_RE = /\[Nest\]\s+\d+\s+-.*?(LOG|WARN|ERROR)\s+\[([^\]]+)\]\s+(.+)/

function isKafkaRelevant(service, line) {
  if (service === 'notification') {
    // Show NestJS controller messages, skip kafkajs JSON blobs and stack traces
    return !line.startsWith('    at ')
      && !line.includes('"logger":"kafkajs"')
      && (line.includes('[NotificationsController]') || line.includes('Confirmation') || line.includes('Kafka') || line.includes('consumer'))
  }
  if (service === 'order') {
    return line.toLowerCase().includes('kafka') || line.includes('order.created')
  }
  return false
}

function appendKafkaEvent(service, line) {
  const stream = document.getElementById('kafka-stream')
  if (!stream) return

  // parse NestJS format if possible
  const m = line.match(NEST_LOG_RE)
  const msg = m ? `[${m[2]}] ${m[3]}` : line.trim()
  if (!msg) return

  const now = new Date()
  const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const entry = document.createElement('div')
  entry.className = `kafka-entry svc-${service}`
  entry.innerHTML = `<span class="ke-time">${ts}</span><span class="ke-svc">${service}</span><span class="ke-msg">${esc(msg)}</span>`
  stream.appendChild(entry)

  // keep last 80 entries
  while (stream.children.length > 80) stream.removeChild(stream.firstChild)
  stream.scrollTop = stream.scrollHeight

  // pulse the live dot
  const dot = document.getElementById('kafka-live-dot')
  if (dot) {
    dot.classList.add('pulse')
    setTimeout(() => dot.classList.remove('pulse'), 600)
  }
}

function startSSE() {
  const es = new EventSource('/log-events')

  es.onmessage = e => {
    try {
      const { service, line } = JSON.parse(e.data)
      if (isKafkaRelevant(service, line)) appendKafkaEvent(service, line)
    } catch { /* ignore malformed */ }
  }

  es.onerror = () => {
    // EventSource auto-reconnects; just wait
  }
}

function pad(n) { return String(n).padStart(2, '0') }
function esc(s) { return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// ── bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildDiagram(document.getElementById('diagram-wrap'))
  renderServiceCards()
  renderTestButtons()

  document.getElementById('btn-clear').onclick = clearLog

  startSSE()
  pollHealth()
  setInterval(pollHealth, 5000)
})
