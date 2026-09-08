import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './', // for github pages
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
