import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/Main.vue',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue'],
    },
  }
})
