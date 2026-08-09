// @vitest-environment node

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

describe('focused no-login workspace', () => {
  it('has no authentication store, hydration, or route guard', () => {
    const source = sourceFiles('src')
      .filter(file => /\.[jt]sx?$/.test(file) && !file.endsWith('.test.js'))
      .map(file => readFileSync(file, 'utf8'))
      .join('\n')

    expect(existsSync('src/components/ProtectedRoute.jsx')).toBe(false)
    expect(source).not.toMatch(/useAuthStore|initAuthSync|isAuthenticated|ai-review-auth|_hasHydrated|enterDemoMode/)
  })
})
