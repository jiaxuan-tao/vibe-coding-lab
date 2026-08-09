// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const routerConsumers = [
  'src/App.jsx',
  'src/components/Layout.jsx',
  'src/components/ProtectedRoute.jsx',
  'src/components/Sidebar.jsx',
  'src/hooks/useKeyboardShortcuts.js',
  'src/pages/Demo.jsx',
  'src/pages/Home.jsx',
  'src/pages/Quiz.jsx',
]

describe('Pages routing', () => {
  it('uses hash routing without react-router-dom', () => {
    const app = readFileSync('src/App.jsx', 'utf8')

    expect(app).toContain('HashRouter')
    expect(app).not.toContain('BrowserRouter')
    expect(routerConsumers.map(file => readFileSync(file, 'utf8')).join('\n')).not.toContain('react-router-dom')
  })
})
