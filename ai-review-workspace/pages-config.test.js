// @vitest-environment node

import { describe, expect, it } from 'vitest'
import config from './vite.config.js'

describe('Vite Pages configuration', () => {
  it('builds assets beneath the nested GitHub Pages path', () => {
    expect(config.base).toBe('/vibe-coding-lab/ai-review-workspace/')
  })

  it('uses jsdom for browser-focused tests', () => {
    expect(config.test).toEqual({ environment: 'jsdom' })
  })
})
