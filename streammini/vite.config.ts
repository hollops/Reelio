/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Prompt 102 — unit tests run through the SAME build pipeline as the app, so a component
  // that compiles in `npm run dev` compiles in tests too. No second toolchain to keep in step.
  test: {
    // jsdom gives us a fake DOM in Node: document, elements, events — no real browser.
    // Fast and precise, but it is a simulation: it has no layout engine and no real video
    // playback, so visual and media behaviour still belongs in the Playwright tests.
    environment: 'jsdom',
    globals: true, // describe/it/expect without importing them in every file
    setupFiles: ['./src/test/setup.ts'],
    css: false, // tests assert behaviour, not styling — skip the Tailwind work
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
