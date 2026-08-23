<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { stories, type Story } from '@/data/stories'
import { itemCardById, type ItemCardData } from '@/composables/useAssets'
import { renderMarkdown, useStoryContent } from '@/composables/useStoryContent'
import AssetItemCard from '@/components/AssetItemCard.vue'

const route = useRoute()

const story = computed<Story | undefined>(() => stories.find((s) => s.id === route.params.id))

// 关联的资产卡片（按故事里 assets 字段的 id 解析）
const storyAssets = computed<ItemCardData[]>(() =>
  (story.value?.assets ?? [])
    .map((id) => itemCardById(id))
    .filter((a): a is ItemCardData => a !== undefined),
)

const typeMeta: Record<Story['type'], { label: string; icon: string }> = {
  trip: { label: '旅行', icon: '✈️' },
  honor: { label: '荣誉', icon: '🏆' },
  milestone: { label: '节点', icon: '📍' },
  annual: { label: '年度总结', icon: '📅' },
}

// 时间段显示为 "开始 ~ 结束"，时间点事件只显示日期
function dateLabel(s: Story): string {
  return s.dateEnd && s.dateEnd !== s.date ? `${s.date} ~ ${s.dateEnd}` : s.date
}

// 正文渲染（URL 链接化 + 无序列表圆点）与站内链接 SPA 导航
const { onContentClick } = useStoryContent()

// 灯箱：点击大图放大查看（打开时锁定背景滚动，关闭时恢复）
const lightbox = ref('')
function openLightbox(src: string): void {
  lightbox.value = src
  document.body.style.overflow = 'hidden'
}
function closeLightbox(): void {
  lightbox.value = ''
  document.body.style.overflow = ''
}
// 组件卸载（如路由跳转）时清理锁定，避免残留
onUnmounted(() => {
  document.body.style.overflow = ''
})

// 缩略图路径：/media/photos/xxx.jpg -> /media/photos/thumbs/xxx.jpg.webp（非本地照片保持原样）
function thumbOf(photo: string): string {
  if (photo.startsWith('/media/photos/')) {
    return `${photo}.webp`.replace('/photos/', '/photos/thumbs/')
  }
  return photo
}

// 图片降级链（都不该影响页面布局）：
// 1) 缩略图 404 → 回退到原图（如新增图片尚未生成缩略图）
// 2) 原图也失败 → 隐藏破图，保留占位空间
function onPhotoError(event: Event): void {
  const img = event.target as HTMLImageElement
  const full = img.dataset.full
  if (!full) return
  if ((img.getAttribute('src') ?? '') !== full) {
    img.setAttribute('src', full)
  } else {
    img.classList.add('detail__photo--missing')
  }
}

// 视频加载失败：隐藏破图，保留占位空间
function onVideoError(event: Event): void {
  ; (event.target as HTMLVideoElement).classList.add('detail__video--missing')
}
</script>

<template>
  <main class="detail-page">
    <RouterLink to="/timeline" class="detail__back">← 返回时间线</RouterLink>

    <div v-if="story" class="detail">
      <header class="detail__header">
        <div class="detail__meta">
          <time class="detail__date">{{ dateLabel(story) }}</time>
          <span class="detail__badge" :class="`detail__badge--${story.type}`">
            {{ typeMeta[story.type].icon }} {{ typeMeta[story.type].label }}
          </span>
        </div>
        <h1 class="detail__title">{{ story.title }}</h1>
        <p v-if="story.location" class="detail__location">🌏 {{ story.location }}</p>
        <div v-if="story.tags?.length" class="detail__tags">
          <span v-for="tag in story.tags" :key="tag" class="detail__tag">{{ tag }}</span>
        </div>
      </header>

      <div v-if="story.content" class="detail__content" v-html="renderMarkdown(story.content)" @click="onContentClick">
      </div>

      <section v-if="storyAssets.length" class="detail__section">
        <h2 class="detail__section-title">相关资产</h2>
        <ul class="detail__assets">
          <AssetItemCard v-for="asset in storyAssets" :key="asset.id" :item="asset" />
        </ul>
      </section>

      <section v-if="story.photos?.length" class="detail__section">
        <h2 class="detail__section-title">照片</h2>
        <div class="detail__photos">
          <button v-for="photo in story.photos" :key="photo" type="button" class="detail__photo-btn" :title="photo"
            @click="openLightbox(photo)">
            <img :src="thumbOf(photo)" :data-full="photo" :alt="story.title" loading="lazy" class="detail__photo"
              @error="onPhotoError" />
          </button>
        </div>
      </section>

      <section v-if="story.videos?.length" class="detail__section">
        <h2 class="detail__section-title">视频</h2>
        <div class="detail__videos">
          <video v-for="video in story.videos" :key="video" :src="video" class="detail__video" controls
            preload="metadata" @error="onVideoError"></video>
        </div>
      </section>

      <section v-if="story.files?.length" class="detail__section">
        <h2 class="detail__section-title">文件</h2>
        <ul class="detail__files">
          <li v-for="file in story.files" :key="file">
            <a :href="file" target="_blank" rel="noopener noreferrer">{{ file }}</a>
          </li>
        </ul>
      </section>
    </div>

    <div v-else class="detail__notfound">
      <p>未找到这个故事</p>
      <RouterLink to="/timeline" class="detail__back">← 返回时间线</RouterLink>
    </div>

    <!-- 灯箱：点击任意位置或 ✕ 关闭 -->
    <Teleport to="body">
      <div v-if="lightbox" class="lightbox" role="dialog" aria-modal="true" @click="closeLightbox">
        <img :src="lightbox" class="lightbox__img" alt="大图预览" @click="closeLightbox" />
        <button type="button" class="lightbox__close" aria-label="关闭" @click="closeLightbox">
          ✕
        </button>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.detail-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px;
}

.detail__back {
  display: inline-block;
  margin-bottom: 24px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 14px;
}

.detail__back:hover {
  color: var(--color-primary);
}

.detail {
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-card-bg);
  padding: 32px;
}

.detail__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.detail__date {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.detail__badge {
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
}

.detail__badge--trip {
  background: var(--trip-badge-bg);
  color: var(--trip-badge-text);
}

.detail__badge--honor {
  background: var(--honor-badge-bg);
  color: var(--honor-badge-text);
}

.detail__badge--milestone {
  background: var(--milestone-badge-bg);
  color: var(--milestone-badge-text);
}

.detail__badge--annual {
  background: var(--annual-badge-bg);
  color: var(--annual-badge-text);
}

.detail__title {
  margin: 0 0 8px;
  font-size: 26px;
  line-height: 1.35;
}

.detail__location {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail__tag {
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 12px;
}

.detail__content {
  margin-top: 20px;
  font-size: 15px;
  line-height: 1.8;
}

.detail__content a {
  color: var(--color-primary);
  text-decoration: none;
  word-break: break-all;
}

.detail__content a:hover {
  text-decoration: underline;
}

/* markdown 渲染的段落：去掉浏览器默认的大 margin，改为紧凑段间距 */
.detail__content :deep(p) {
  margin: 0 0 10px;
}

.detail__content :deep(p:last-child) {
  margin-bottom: 0;
}

.detail__content :deep(ul) {
  margin: 4px 0;
  padding-left: 1.25em;
  list-style: disc;
}

.detail__content :deep(li + li) {
  margin-top: 4px;
}

/* 嵌套列表（markdown 缩进子项）贴合父项，避免大间距 */
.detail__content :deep(li > ul) {
  margin: 4px 0;
}

.detail__section {
  margin-top: 28px;
}

.detail__section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail__section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

/* 关联资产卡片列表 */
.detail__assets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail__photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.detail__photo-btn {
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-bg-secondary);
  cursor: zoom-in;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}

.detail__photo-btn:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.detail__photo {
  display: block;
  width: 100%;
  height: 220px;
  object-fit: cover;
}

/* 图片加载失败：隐藏破图，保留占位空间 */
.detail__photo--missing {
  visibility: hidden;
}

.detail__videos {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail__video {
  width: 100%;
  max-height: 480px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

/* 视频加载失败：隐藏破图，保留占位空间 */
.detail__video--missing {
  visibility: hidden;
}

.detail__files {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.detail__files a {
  color: var(--color-primary);
  text-decoration: none;
  word-break: break-all;
}

.detail__files a:hover {
  text-decoration: underline;
}

.detail__notfound {
  text-align: center;
  color: var(--color-text-muted);
  padding: 80px 0;
}

.detail__notfound p {
  margin: 0 0 12px;
  font-size: 16px;
}

/* 灯箱 */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.85);
  cursor: zoom-out;
}

.lightbox__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.lightbox__close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}

.lightbox__close:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
