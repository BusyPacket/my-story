#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const rl = createInterface({ input, output })

const TYPE_DIRS = {
  trip: 'trips',
  honor: 'honors',
  milestone: 'milestones',
  annual: 'annual',
}

const TYPE_OPTIONS = [
  { key: '1', value: 'trip', label: '旅行' },
  { key: '2', value: 'honor', label: '荣誉' },
  { key: '3', value: 'milestone', label: '节点' },
  { key: '4', value: 'annual', label: '年度总结' },
]

const VISIBILITY_OPTIONS = [
  { key: '1', value: 'private', label: '仅自己' },
  { key: '2', value: 'family', label: '家庭' },
  { key: '3', value: 'public', label: '公开' },
]

function ask(question, defaultValue) {
  const suffix = defaultValue !== undefined ? `（默认 ${defaultValue}）` : ''
  return rl.question(`${question}${suffix}：`)
}

async function main() {
  console.log('\n📝 生成新的故事 md 文件\n')

  const title = (await ask('标题（必填）', '')).trim()

  const typeInput = (await ask('类型（1 旅行 / 2 荣誉 / 3 节点 / 4 年度总结）', '3')).trim()
  const type =
    TYPE_OPTIONS.find((o) => o.key === typeInput || o.value === typeInput)?.value ?? 'milestone'

  const date = (
    await ask('日期（支持 2022 / 2022-09 / 2022-09-01 / 2022-06 ~ 2022-08）', '')
  ).trim()

  const location = (await ask('地点（可选）', '')).trim()

  const visInput = (await ask('可见性（1 仅自己 / 2 家庭 / 3 公开）', '1')).trim()
  const visibility =
    VISIBILITY_OPTIONS.find((o) => o.key === visInput || o.value === visInput)?.value ?? 'private'

  const tagsInput = (await ask('标签（可选，逗号分隔）', '')).trim()
  const tags = tagsInput
    ? tagsInput
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
    : []

  const photosInput = (await ask('照片（可选，逗号分隔多个路径）', '')).trim()
  const photos = photosInput
    ? photosInput
        .split(/[,，]/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []

  const content = (await ask('正文（可选，一句话）', '')).trim()

  if (!title || !date) {
    console.log('\n❌ 标题和日期为必填，已取消。')
    rl.close()
    return
  }

  // 文件名：用开始日期（范围取前段）+ 标题
  const prefix = date.split(/\s*[~～]/)[0].trim()
  const slug = title
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const filename = `${prefix}-${slug}.md`
  const dir = join(process.cwd(), 'src', 'stories', TYPE_DIRS[type])
  const filePath = join(dir, filename)

  if (existsSync(filePath)) {
    const overwrite = (await ask(`\n⚠️ 文件已存在：${filePath}\n是否覆盖（y/N）`, 'N'))
      .trim()
      .toLowerCase()
    if (overwrite !== 'y') {
      console.log('已取消。')
      rl.close()
      return
    }
  }

  const lines = ['---', `title: ${title}`, `date: ${date}`, `type: ${type}`]
  if (visibility !== 'private') lines.push(`visibility: ${visibility}`)
  if (location) lines.push(`location: ${location}`)
  if (tags.length) lines.push('tags:', ...tags.map((t) => `  - ${t}`))
  if (photos.length) lines.push('photos:', ...photos.map((p) => `  - ${p}`))
  lines.push('---', '')
  if (content) lines.push(content)
  const body = lines.join('\n') + '\n'

  mkdirSync(dir, { recursive: true })
  writeFileSync(filePath, body, 'utf8')

  console.log(`\n✅ 已生成：${filePath}\n`)
  console.log(body)
  rl.close()
}

main()
