import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'

const appPath = '/vibe-coding-lab/ai-review-workspace/'
const distDirectory = resolve('dist')
const port = Number(process.env.PORT || 4173)
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`)
  const pathname = decodeURIComponent(url.pathname)

  if (!pathname.startsWith(appPath)) {
    response.writeHead(404).end()
    return
  }

  const filePath = resolve(distDirectory, pathname.slice(appPath.length) || 'index.html')
  if (relative(distDirectory, filePath).startsWith('..')) {
    response.writeHead(403).end()
    return
  }

  try {
    const body = await readFile(filePath)
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream' }).end(body)
  } catch {
    response.writeHead(404).end()
  }
})

server.listen(port, '127.0.0.1')
