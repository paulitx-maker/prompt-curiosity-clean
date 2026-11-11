import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      prerender: {
        crawlLinks: false
      }
    }),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
})