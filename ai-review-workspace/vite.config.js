import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/vibe-coding-lab/ai-review-workspace/',
  plugins: [react()],
  test: { environment: 'jsdom' },
})
