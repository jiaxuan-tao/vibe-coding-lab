// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

describe('Pages routing', () => {
  it('uses hash routing without react-router-dom', () => {
    const app = readFileSync('src/App.jsx', 'utf8')

    expect(app).toContain('HashRouter')
    expect(app).not.toContain('BrowserRouter')
    const routerImports = sourceFiles('src')
      .filter(file => /\.[jt]sx?$/.test(file))
      .flatMap((file) => Array.from(
        readFileSync(file, 'utf8').matchAll(/from\s+['"](react-router(?:-dom)?)['"]/g),
        match => match[1],
      ))

    expect(routerImports).not.toHaveLength(0)
    expect(routerImports).toEqual(routerImports.map(() => 'react-router'))
  })
})
