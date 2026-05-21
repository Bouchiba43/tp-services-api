// SVG architecture diagram

// viewBox: 0 0 1000 460
export const NODES = {
  browser:      { label: 'Browser / Client',  sub: 'HTTP · GraphQL',       x: 330, y: 5,   w: 340, h: 44, type: 'client'  },
  nginx:        { label: 'nginx API Gateway', sub: ':8080 · reverse proxy', x: 330, y: 57,  w: 340, h: 46, type: 'gateway' },
  catalog:      { label: 'Catalog Service',   sub: ':3001  REST',           x: 20,  y: 127, w: 200, h: 68, type: 'rest'    },
  order:        { label: 'Order Service',     sub: ':3002  REST',           x: 400, y: 127, w: 200, h: 68, type: 'rest'    },
  query:        { label: 'Query Service',     sub: ':3005  GraphQL',        x: 780, y: 127, w: 200, h: 68, type: 'graphql' },
  postgres:     { label: 'PostgreSQL',        sub: ':5432',                 x: 140, y: 308, w: 170, h: 50, type: 'db'      },
  stock:        { label: 'Stock Service',     sub: ':5001  gRPC',           x: 390, y: 308, w: 200, h: 68, type: 'grpc'    },
  kafka:        { label: 'Kafka',             sub: ':9092',                 x: 640, y: 308, w: 145, h: 50, type: 'infra'   },
  notification: { label: 'Notification Svc',  sub: 'Kafka consumer',        x: 830, y: 308, w: 195, h: 68, type: 'kafka'   },
}

function cx(id) { const n = NODES[id]; return n.x + n.w / 2 }
function cy(id) { const n = NODES[id]; return n.y + n.h / 2 }
function top(id)    { return NODES[id].y }
function bottom(id) { const n = NODES[id]; return n.y + n.h }
function left(id)   { return NODES[id].x }
function right(id)  { const n = NODES[id]; return n.x + n.w }

export const CONNECTIONS = [
  // ── browser ──────────────────────────────────────────────────────────────
  {
    id: 'c-browser-nginx',
    label: ':8080',
    type: 'gateway',
    d: `M ${cx('browser')} ${bottom('browser')} L ${cx('nginx')} ${top('nginx')}`,
  },
  // ── nginx → services ─────────────────────────────────────────────────────
  {
    id: 'c-nginx-catalog',
    label: '/api/catalog/',
    type: 'rest',
    d: `M ${left('nginx')} ${cy('nginx')}
        C 200 ${cy('nginx')}, ${cx('catalog')} 110, ${cx('catalog')} ${top('catalog')}`,
  },
  {
    id: 'c-nginx-order',
    label: '/api/orders/',
    type: 'rest',
    d: `M ${cx('nginx')} ${bottom('nginx')} L ${cx('order')} ${top('order')}`,
  },
  {
    id: 'c-nginx-query',
    label: '/graphql',
    type: 'graphql',
    d: `M ${right('nginx')} ${cy('nginx')}
        C 800 ${cy('nginx')}, ${cx('query')} 110, ${cx('query')} ${top('query')}`,
  },
  // ── databases ─────────────────────────────────────────────────────────────
  {
    id: 'c-catalog-postgres',
    label: 'TypeORM',
    type: 'db',
    d: `M ${cx('catalog')} ${bottom('catalog')} L ${cx('postgres')} ${top('postgres')}`,
  },
  {
    id: 'c-order-postgres',
    label: 'TypeORM',
    type: 'db',
    d: `M ${left('order')} ${cy('order')}
        C ${left('order') - 60} ${cy('order')}, ${right('postgres')} ${cy('postgres')}, ${right('postgres')} ${cy('postgres')}`,
  },
  // ── gRPC ──────────────────────────────────────────────────────────────────
  {
    id: 'c-order-stock',
    label: 'gRPC',
    type: 'grpc',
    d: `M ${cx('order')} ${bottom('order')} L ${cx('stock')} ${top('stock')}`,
  },
  // ── Kafka ─────────────────────────────────────────────────────────────────
  {
    id: 'c-order-kafka',
    label: 'emit',
    type: 'kafka',
    d: `M ${right('order')} ${cy('order')}
        C ${right('order') + 70} ${cy('order')}, ${cx('kafka')} ${top('kafka') - 40}, ${cx('kafka')} ${top('kafka')}`,
  },
  {
    id: 'c-kafka-notification',
    label: 'consume',
    type: 'kafka',
    d: `M ${right('kafka')} ${cy('kafka')} L ${left('notification')} ${cy('notification')}`,
  },
  // ── GraphQL HTTP proxy ────────────────────────────────────────────────────
  {
    id: 'c-query-catalog',
    label: 'HTTP',
    type: 'http',
    d: `M ${left('query')} ${cy('query') + 8}
        C 550 268, 290 268, ${right('catalog')} ${bottom('catalog')}`,
  },
  {
    id: 'c-query-order',
    label: 'HTTP',
    type: 'http',
    d: `M ${left('query')} ${cy('query') - 8}
        C 680 240, 600 240, ${right('order')} ${cy('order')}`,
  },
]

const COLORS = {
  client:  { border: '#4a9eff', bg: '#0a1520', text: '#4a9eff' },
  gateway: { border: '#00bcd4', bg: '#001820', text: '#4dd0e1' },
  rest:    { border: '#2196f3', bg: '#0d1f3c', text: '#64b5f6' },
  graphql: { border: '#e91e8c', bg: '#1f0a1f', text: '#f48fb1' },
  grpc:    { border: '#9c27b0', bg: '#1a0d2e', text: '#ce93d8' },
  kafka:   { border: '#ff9800', bg: '#1f1200', text: '#ffb74d' },
  db:      { border: '#4caf50', bg: '#0d1f0d', text: '#81c784' },
  infra:   { border: '#ff9800', bg: '#1a1000', text: '#ffa726' },
}

const CONN_COLORS = {
  gateway: '#00bcd4',
  rest:    '#2196f3',
  graphql: '#e91e8c',
  grpc:    '#9c27b0',
  kafka:   '#ff9800',
  db:      '#4caf50',
  http:    '#26c6da',
}

const ICONS = {
  client: '🌐', gateway: '⬡', rest: '⚡', graphql: '◈',
  grpc: '⟡', kafka: '⊕', db: '🗄', infra: '⊗',
}

export function buildDiagram(container) {
  const vw = 1000, vh = 460

  const svg = el('svg', {
    viewBox: `0 0 ${vw} ${vh}`,
    xmlns: 'http://www.w3.org/2000/svg',
  })

  // ── defs: arrow markers + glow filter ─────────────────────────────────────
  const defs = el('defs')

  Object.entries(CONN_COLORS).forEach(([type, color]) => {
    const m = el('marker', {
      id: `arrow-${type}`, markerWidth: '8', markerHeight: '8',
      refX: '6', refY: '3', orient: 'auto',
    })
    m.appendChild(el('path', { d: 'M0,0 L0,6 L8,3 z', fill: color }))
    defs.appendChild(m)
  })

  const filter = el('filter', { id: 'glow', x: '-40%', y: '-40%', width: '180%', height: '180%' })
  const blur = el('feGaussianBlur', { stdDeviation: '5', result: 'blur' })
  const merge = el('feMerge')
  merge.appendChild(el('feMergeNode', { in: 'blur' }))
  merge.appendChild(el('feMergeNode', { in: 'SourceGraphic' }))
  filter.appendChild(blur)
  filter.appendChild(merge)
  defs.appendChild(filter)

  svg.appendChild(defs)

  // ── connections (drawn behind nodes) ─────────────────────────────────────
  const connGroup = el('g', { id: 'connections' })

  CONNECTIONS.forEach(conn => {
    const color = CONN_COLORS[conn.type]
    const dash = ({ http: '6,4', grpc: '8,4', gateway: '4,3' })[conn.type] ?? 'none'

    const path = el('path', {
      id: conn.id,
      d: conn.d.replace(/\s+/g, ' ').trim(),
      stroke: color,
      'stroke-width': '1.5',
      'stroke-dasharray': dash,
      fill: 'none',
      opacity: '0.4',
      'marker-end': `url(#arrow-${conn.type})`,
    })
    path.classList.add('conn-path')
    connGroup.appendChild(path)

    // animated packet
    const pkt = el('circle', { id: `pkt-${conn.id}`, r: '5', fill: color, opacity: '0' })
    const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion')
    anim.id = `anim-${conn.id}`
    anim.setAttribute('dur', '0.65s')
    anim.setAttribute('begin', 'indefinite')
    anim.setAttribute('fill', 'freeze')
    const mpath = document.createElementNS('http://www.w3.org/2000/svg', 'mpath')
    mpath.setAttribute('href', `#${conn.id}`)
    anim.appendChild(mpath)
    pkt.appendChild(anim)
    connGroup.appendChild(pkt)
  })

  svg.appendChild(connGroup)

  // ── connection labels ─────────────────────────────────────────────────────
  const LABEL_POS = {
    'c-browser-nginx':    [560, 51],
    'c-nginx-catalog':    [185, 84],
    'c-nginx-order':      [522, 110],
    'c-nginx-query':      [810, 84],
    'c-catalog-postgres': [148, 262],
    'c-order-postgres':   [348, 224],
    'c-order-stock':      [512, 252],
    'c-order-kafka':      [638, 214],
    'c-kafka-notification':[800, 322],
    'c-query-catalog':    [500, 271],
    'c-query-order':      [675, 244],
  }

  const lblGroup = el('g', { id: 'conn-labels', 'font-size': '9', 'text-anchor': 'middle' })
  CONNECTIONS.forEach(conn => {
    const pos = LABEL_POS[conn.id]
    if (!pos) return
    const color = CONN_COLORS[conn.type]
    lblGroup.appendChild(el('rect', {
      x: pos[0] - 16, y: pos[1] - 8, width: 32, height: 12,
      rx: '3', fill: '#080c18', opacity: '0.9',
    }))
    const t = el('text', { x: pos[0], y: pos[1], fill: color, 'font-weight': '700', 'dominant-baseline': 'middle' })
    t.textContent = conn.label
    lblGroup.appendChild(t)
  })
  svg.appendChild(lblGroup)

  // ── nodes ─────────────────────────────────────────────────────────────────
  const nodeGroup = el('g', { id: 'nodes' })

  Object.entries(NODES).forEach(([id, node]) => {
    const c = COLORS[node.type]
    const g = el('g', { id: `node-${id}`, class: 'node-box', style: `color:${c.border}` })

    // drop shadow
    g.appendChild(el('rect', {
      x: node.x + 3, y: node.y + 3, width: node.w, height: node.h,
      rx: '8', fill: '#000', opacity: '0.35',
    }))
    // main box
    g.appendChild(el('rect', {
      id: `rect-${id}`,
      x: node.x, y: node.y, width: node.w, height: node.h,
      rx: '8', fill: c.bg, stroke: c.border, 'stroke-width': '1.5',
    }))

    const midY = node.y + node.h / 2
    const iconX = node.x + 20
    const textX = node.x + 38

    g.appendChild(elTxt(ICONS[node.type] ?? '●', iconX, midY - 6, {
      fill: c.border, 'font-size': '14', 'text-anchor': 'middle',
    }))
    g.appendChild(elTxt(node.label, textX, midY - 6, {
      fill: '#d8e0f0', 'font-size': '12', 'font-weight': '600',
    }))
    g.appendChild(elTxt(node.sub, textX, midY + 10, {
      fill: c.text, 'font-size': '10', 'font-family': 'monospace',
    }))

    // status dot (for HTTP-reachable services + nginx)
    if (['catalog', 'order', 'query', 'nginx'].includes(id)) {
      g.appendChild(el('circle', {
        id: `status-${id}`,
        cx: node.x + node.w - 10, cy: node.y + 10, r: '4',
        fill: '#2a3040',
      }))
    }

    nodeGroup.appendChild(g)
  })

  svg.appendChild(nodeGroup)

  container.innerHTML = ''
  container.appendChild(svg)
}

// ── animation helpers ──────────────────────────────────────────────────────

export function highlightNode(id, on = true) {
  const rect = document.getElementById(`rect-${id}`)
  if (!rect) return
  if (on) {
    rect.setAttribute('filter', 'url(#glow)')
    rect.setAttribute('stroke-width', '2.5')
  } else {
    rect.removeAttribute('filter')
    rect.setAttribute('stroke-width', '1.5')
  }
}

export function animatePacket(connId) {
  const pkt  = document.getElementById(`pkt-${connId}`)
  const anim = document.getElementById(`anim-${connId}`)
  const path = document.getElementById(connId)
  if (!pkt || !anim) return
  if (path) {
    path.setAttribute('opacity', '1')
    setTimeout(() => path.setAttribute('opacity', '0.4'), 850)
  }
  pkt.setAttribute('opacity', '1')
  anim.beginElement()
  setTimeout(() => pkt.setAttribute('opacity', '0'), 750)
}

export function setNodeStatus(id, online) {
  const dot = document.getElementById(`status-${id}`)
  if (!dot) return
  dot.setAttribute('fill', online ? '#4caf50' : '#f44336')
  if (online) dot.setAttribute('filter', 'url(#glow)')
  else dot.removeAttribute('filter')
}

// ── SVG helpers ────────────────────────────────────────────────────────────
function el(tag, attrs = {}) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag)
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v))
  return e
}

function elTxt(text, x, y, attrs = {}) {
  const t = el('text', { x, y, ...attrs, 'dominant-baseline': 'middle' })
  t.textContent = text
  return t
}
