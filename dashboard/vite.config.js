import { defineConfig } from 'vite'
import { watch, statSync, createReadStream } from 'fs'
import { join, resolve } from 'path'

// Tails .logs/*.log files and streams new lines via SSE at /log-events
function logBridgePlugin() {
  return {
    name: 'log-bridge',
    configureServer(server) {
      server.middlewares.use('/log-events', (req, res) => {
        res.writeHead(200, {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
          'Access-Control-Allow-Origin': '*',
        })
        res.write(': connected\n\n')

        const LOG_DIR  = resolve(process.cwd(), '..', '.logs')
        const SERVICES = ['catalog', 'order', 'notification', 'query', 'stock']
        const watchers = []
        const pos = {}

        SERVICES.forEach(name => {
          const fp = join(LOG_DIR, `${name}.log`)
          try { pos[name] = statSync(fp).size } catch { pos[name] = 0 }

          try {
            const w = watch(fp, { persistent: false }, () => {
              try {
                const size = statSync(fp).size
                if (size <= pos[name]) return
                const stream = createReadStream(fp, {
                  start: pos[name], end: size - 1, encoding: 'utf8',
                })
                let buf = ''
                stream.on('data', d => (buf += d))
                stream.on('end', () => {
                  pos[name] = size
                  buf.split('\n')
                    .filter(l => l.trim())
                    .forEach(line => {
                      res.write(`data: ${JSON.stringify({ service: name, line, ts: Date.now() })}\n\n`)
                    })
                })
              } catch { /* file may have been rotated */ }
            })
            watchers.push(w)
          } catch { /* file not yet created */ }
        })

        const ping = setInterval(() => { try { res.write(': ping\n\n') } catch {} }, 15000)

        const cleanup = () => {
          clearInterval(ping)
          watchers.forEach(w => { try { w.close() } catch {} })
        }
        req.on('close', cleanup)
        req.on('error', cleanup)
      })
    },
  }
}

export default defineConfig({
  plugins: [logBridgePlugin()],
  server: {
    port: 5173,
    proxy: {
      '/proxy/catalog': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/proxy\/catalog/, ''),
      },
      '/proxy/order': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/proxy\/order/, ''),
      },
      '/proxy/query': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/proxy\/query/, ''),
      },
      '/proxy/gateway': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/proxy\/gateway/, ''),
      },
    },
  },
})
