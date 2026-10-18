import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser', timeout: 60000, workers: 1,
  use: { baseURL: process.env.PREVIEW_URL || 'http://127.0.0.1:5173', viewport: { width: 1440, height: 900 }, acceptDownloads: true, launchOptions: process.env.EDGE_PATH || process.platform==='win32' ? { executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } : {} },
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-results.json' }]],
  webServer: process.env.PREVIEW_URL ? undefined : { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: true }
})
