import { sep } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Logger, type Plugin, type ResolvedConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import { optimizePhotos } from './scripts/optimize-images.mjs'

// 照片缩略图自动优化：dev 启动 / build 时增量生成，新增图片无需手动运行脚本
function imageOptimizer(): Plugin {
  let logger: Logger
  const optimize = () =>
    optimizePhotos().then(({ total, generated, skipped }) => {
      logger.info(`[images] 缩略图就绪：共 ${total} 张，本次生成 ${generated}，跳过 ${skipped}`)
    })

  return {
    name: 'story-image-optimizer',
    configResolved(resolvedConfig: ResolvedConfig) {
      logger = resolvedConfig.logger
    },
    async buildStart() {
      const { total, generated, skipped } = await optimizePhotos()
      if (generated > 0) {
        logger.info(`[images] 已生成 ${generated} 张缩略图（共 ${total}，跳过 ${skipped}）`)
      }
    },
    configureServer(server) {
      void optimize()

      // 监听照片目录：新增/覆盖图片时自动增量生成缩略图，无需重启或手动运行脚本
      const photosDir = fileURLToPath(new URL('./public/media/photos', import.meta.url))
      const thumbsMark = `${sep}thumbs${sep}`
      server.watcher.add(photosDir)
      server.watcher.on('add', (file: string) => {
        if (file.includes(thumbsMark) || !/\.(jpe?g|png|webp|gif|avif)$/i.test(file)) return
        void optimize()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), imageOptimizer()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
