// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUIStore } from '../stores'
import { callQwenClient } from './qwen'

describe('Qwen browser client', () => {
  beforeEach(() => {
    localStorage.clear()
    useUIStore.getState().setQwenApiKey('')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the key configured through the review UI store', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '来自 Qwen 的回复' } }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    useUIStore.getState().setQwenApiKey('configured-review-key')

    const response = await callQwenClient('请回答测试问题')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer configured-review-key')
    expect(response).toBe('来自 Qwen 的回复')
  })
})
