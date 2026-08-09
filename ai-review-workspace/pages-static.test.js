// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pagesUrl = 'https://jiaxuan-tao.github.io/vibe-coding-lab/ai-review-workspace/'

describe('Pages static entrypoints', () => {
  it('uses nested assets and hash URLs without a root service worker', () => {
    const index = readFileSync('index.html', 'utf8')
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'))
    const main = readFileSync('src/main.jsx', 'utf8')

    expect(index).toContain('%BASE_URL%favicon.svg')
    expect(index).toContain('%BASE_URL%manifest.json')
    expect(index).toContain('%BASE_URL%og-image.svg')
    expect(index).toContain(pagesUrl)
    expect(index).not.toContain('ai-review-workspace.vercel.app')
    expect(index).not.toContain('shiorii.tech')
    expect(manifest.start_url).toBe('./#/home')
    expect(manifest.icons[0].src).toBe('./favicon.svg')
    expect(manifest.shortcuts.map(shortcut => shortcut.url)).toEqual(['./#/notes', './#/flashcards', './#/quiz'])
    expect(main).not.toContain('serviceWorker')
  })
})
