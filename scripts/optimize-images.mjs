#!/usr/bin/env node
/**
 * 照片缩略图优化脚本（增量）
 *
 * 把 public/media/photos/ 下的原始照片批量压缩成 WebP 缩略图，
 * 输出到 public/media/photos/thumbs/<原文件名>.webp。
 *
 * 特性：
 * - 增量处理：已有缩略图且不比原图旧则跳过，新增照片秒级完成
 * - 可被 vite.config.ts 的插件自动调用（dev 启动 / build 时）
 * - 也可作为 CLI 单独运行：node scripts/optimize-images.mjs
 *
 * 说明：public/media/ 已在 .gitignore 中，缩略图同样不进 git，
 * 部署/克隆后首次 build 会自动重新生成。
 */
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PHOTOS_DIR = join(__dirname, '..', 'public', 'media', 'photos')
const THUMBS_DIR = join(PHOTOS_DIR, 'thumbs')

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i

/**
 * 增量生成缩略图。
 * @returns {Promise<{ total: number; generated: number; skipped: number }>}
 */
export async function optimizePhotos({
  photosDir = PHOTOS_DIR,
  thumbsDir = THUMBS_DIR,
  width = 480, // 时间线显示 120px，2x 屏幕取 480 保证清晰
  quality = 78,
  log = console,
} = {}) {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    log.warn?.('[optimize-images] 未安装 sharp，跳过图片优化。运行 pnpm add -D sharp 后重试。')
    return { total: 0, generated: 0, skipped: 0 }
  }

  if (!existsSync(photosDir)) {
    log.warn?.('[optimize-images] 照片目录不存在，跳过：', photosDir)
    return { total: 0, generated: 0, skipped: 0 }
  }

  const files = readdirSync(photosDir).filter((name) => IMAGE_EXT.test(name))
  mkdirSync(thumbsDir, { recursive: true })

  let generated = 0
  let skipped = 0

  for (const file of files) {
    const src = join(photosDir, file)
    const out = join(thumbsDir, `${file}.webp`)

    // 增量：缩略图存在且不比原图旧则跳过
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) {
      skipped++
      continue
    }

    try {
      await sharp(src, { failOn: 'none' })
        .rotate() // 无参数时按 EXIF orientation 自动旋转，避免带方向标记的图片被"转错"
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toFile(out)
      generated++
    } catch (error) {
      log.error?.(`[optimize-images] 处理失败：${file}`, error?.message ?? error)
    }
  }

  return { total: files.length, generated, skipped }
}

// CLI 直接运行时执行
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { total, generated, skipped } = await optimizePhotos()
  console.log(`[optimize-images] 共 ${total} 张照片：生成 ${generated} 张，跳过 ${skipped} 张`)
}
