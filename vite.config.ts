import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // 💡 追加

export default defineConfig({
  base: '/study-timer/', // 💡 これを追記（リポジトリ名と同じにする）
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 自動でアプリを更新する
      manifest: {
        name: '研究時間記録',
        short_name: '研究タイマー',
        description: '研究活動の作業時間を記録するアプリ',
        theme_color: '#005bbb',
        icons: [
          {
            src: 'icon-192x192.png', // 💡 後で画像を用意する必要があります
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})