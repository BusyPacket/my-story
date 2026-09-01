<script setup lang="ts">
import { computed, ref } from 'vue'

import { sortAnchor, stories, type Story, type StoryType, type Visibility } from '@/data/stories'
import { renderMarkdown, useStoryContent } from '@/composables/useStoryContent'
import { itemCardsByYear, type ItemCardData } from '@/composables/useAssets'
import AssetItemCard from '@/components/AssetItemCard.vue'
import DateView from '@/components/DateView.vue'

type FilterKey = 'all' | StoryType

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'trip', label: '旅行' },
  { key: 'honor', label: '荣誉' },
  { key: 'milestone', label: '节点' },
  { key: 'annual', label: '年度总结' },
]

const typeMeta: Record<StoryType, { label: string; icon: string }> = {
  trip: { label: '旅行', icon: '✈️' },
  honor: { label: '荣誉', icon: '🏆' },
  milestone: { label: '节点', icon: '📍' },
  annual: { label: '年度总结', icon: '📅' },
}

const activeFilter = ref<FilterKey>('all')

// 时间段显示为 "开始 ~ 结束"，时间点事件只显示日期
function dateLabel(story: Story): string {
  return story.dateEnd && story.dateEnd !== story.date
    ? `${story.date} ~ ${story.dateEnd}`
    : story.date
}

const filteredStories = computed(() =>
  activeFilter.value === 'all'
    ? stories
    : stories.filter((story) => story.type === activeFilter.value),
)

// 可见性切换：隐私等级模型，内容越私密数值越大，查看者等级 >= 内容等级才能看到。
// 仅自己(3)看到全部，家庭(2)看到 family+public，公开(1)只看到 public
const visibilityOptions: { key: Visibility; label: string }[] = [
  { key: 'private', label: '仅自己' },
  { key: 'family', label: '家庭' },
  { key: 'public', label: '公开' },
]

const visibilityLevel: Record<Visibility, number> = {
  private: 3,
  family: 2,
  public: 1,
}

const activeVisibility = ref<Visibility>('private')

const visibleStories = computed(() =>
  filteredStories.value.filter(
    (story) => visibilityLevel[story.visibility] <= visibilityLevel[activeVisibility.value],
  ),
)

// 提取事件年份（取排序锚点年份，与排序逻辑保持一致）
function storyYear(story: Story): number {
  const first = sortAnchor(story).split(/[-~～]/)[0]
  return Number(first) || 0
}

// 按年份分组：年份倒序，组内保持日期倒序
const groupedStories = computed(() => {
  const groups = new Map<number, Story[]>()
  for (const story of visibleStories.value) {
    const year = storyYear(story)
    const list = groups.get(year) ?? []
    list.push(story)
    groups.set(year, list)
  }
  return Array.from(groups.entries()).sort((a, b) => b[0] - a[0])
})

// 年度总结：按故事 id 收集当年购入的资产（卡片形式，默认折叠展示）
const annualAssetsByStory = computed<Map<string, ItemCardData[]>>(() => {
  const map = new Map<string, ItemCardData[]>()
  for (const story of visibleStories.value) {
    if (story.type !== 'annual') continue
    const year = /^\d{4}/.exec(story.date)?.[0]
    if (year) map.set(story.id, itemCardsByYear(year))
  }
  return map
})

// 当年购入资产的展示门槛：单价低于此值的卡片不展示，用文字提示已隐藏
const MIN_ASSET_PRICE = 200

// 取某个故事的当年购入资产（非年度总结返回空数组）
function annualAssets(story: Story): ItemCardData[] {
  return annualAssetsByStory.value.get(story.id) ?? []
}

// 单价超过阈值、以卡片形式展示的资产
function visibleAssets(story: Story): ItemCardData[] {
  return annualAssets(story).filter((asset) => asset.price > MIN_ASSET_PRICE)
}

// 因单价过低被隐藏的件数
function hiddenAssetCount(story: Story): number {
  return annualAssets(story).filter((asset) => asset.price <= MIN_ASSET_PRICE).length
}

// 平滑滚动到对应年份分组
function scrollToYear(year: number): void {
  document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 日期视图点击格子：滚动到该日期对应的事件卡片（复用排序锚点匹配日期）
function onSelectDate(date: string): void {
  const story = visibleStories.value.find((s) => sortAnchor(s).slice(0, 10) === date)
  if (story) {
    document.getElementById(`story-${story.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 年份下拉：选择后跳转并重置，方便重复选择
function onYearChange(event: Event): void {
  const select = event.target as HTMLSelectElement
  const year = Number(select.value)
  if (year) scrollToYear(year)
  select.value = ''
}

function onVisibilityChange(event: Event): void {
  activeVisibility.value = (event.target as HTMLSelectElement).value as Visibility
}

// 正文渲染（URL 链接化 + 无序列表圆点）与站内链接 SPA 导航
const { onContentClick } = useStoryContent()

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
    img.classList.add('timeline__photo--missing')
  }
}

// 视频封面：点击切换播放/暂停（视频区域与 ▶ 按钮均可点击）
function toggleVideo(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement
  const wrap = target.closest('.timeline__video-wrap') as HTMLElement | null
  const video = wrap?.querySelector('video')
  if (!video) return
  if (video.paused) {
    void video.play()
  } else {
    video.pause()
  }
}

// 播放/暂停状态同步到 ▶ 角标（播放中显示 ⏸）
function onVideoState(event: Event): void {
  const video = event.target as HTMLVideoElement
  const btn = video.parentElement?.querySelector('.timeline__video-play')
  if (!btn) return
  btn.classList.toggle('timeline__video-play--playing', !video.paused)
}

// 视频加载失败：隐藏破图，保留占位空间
function onVideoError(event: Event): void {
  const video = event.target as HTMLVideoElement
  video.classList.add('timeline__video--missing')
}
</script>

<template>
  <main class="timeline-page">
    <header class="page-header">
      <h1>我的历史</h1>
      <p>按时间线回顾走过的路、拿过的奖、重要的时刻</p>
    </header>

    <div class="filters">
      <nav class="type-filter" aria-label="按类型筛选">
        <button v-for="filter in filters" :key="filter.key" type="button" class="type-filter__item"
          :class="{ 'type-filter__item--active': activeFilter === filter.key }" @click="activeFilter = filter.key">
          {{ filter.label }}
        </button>
      </nav>

      <label class="visibility-filter">
        <span class="visibility-filter__label">可见性</span>
        <select class="visibility-filter__select" :value="activeVisibility" @change="onVisibilityChange"
          aria-label="按可见性切换">
          <option v-for="opt in visibilityOptions" :key="opt.key" :value="opt.key">
            {{ opt.label }}
          </option>
        </select>
      </label>
    </div>

    <DateView v-if="visibleStories.length > 0" :stories="visibleStories" @select-date="onSelectDate" />

    <label v-if="groupedStories.length > 0" class="year-nav">
      <span class="year-nav__label">年份</span>
      <select class="year-nav__select" value="" @change="onYearChange" aria-label="按年份跳转">
        <option value="" disabled>跳转到年份…</option>
        <option v-for="[year] in groupedStories" :key="year" :value="year">{{ year }}</option>
      </select>
    </label>

    <section class="timeline">
      <div v-if="visibleStories.length === 0" class="timeline__empty">
        <p>还没有任何故事</p>
        <p class="timeline__empty-hint">
          在 <code>src/data/stories/</code> 下新建带 frontmatter 的 .md 文件即可添加回忆
        </p>
      </div>

      <template v-else>
        <div v-for="[year, yearStories] in groupedStories" :key="year" :id="`year-${year}`"
          class="timeline__year-group">
          <h2 class="timeline__year">
            {{ year }}
            <span class="timeline__year-count">{{ yearStories.length }}</span>
          </h2>
          <ol class="timeline__list">
            <li v-for="story in yearStories" :key="`${story.title}-${story.date}`" :id="`story-${story.id}`"
              class="timeline__item">
              <div class="timeline__dot" :class="`timeline__dot--${story.type}`"></div>
              <article class="timeline__card">
                <div class="timeline__meta">
                  <time class="timeline__date">{{ dateLabel(story) }}</time>
                  <span class="timeline__badge" :class="`timeline__badge--${story.type}`">
                    {{ typeMeta[story.type].icon }} {{ typeMeta[story.type].label }}
                  </span>
                </div>
                <h2 class="timeline__title">
                  <RouterLink :to="`/story/${story.id}`" class="timeline__title-link">
                    {{ story.title }}
                  </RouterLink>
                </h2>
                <p v-if="story.location" class="timeline__location">🌏{{ story.location }}</p>
                <div v-if="story.content" class="timeline__content" v-html="renderMarkdown(story.content)"
                  @click="onContentClick"></div>
                <div v-if="story.photos?.length" class="timeline__photos">
                  <img v-for="photo in story.photos.slice(0, 3)" :key="photo" :src="thumbOf(photo)" :data-full="photo"
                    :alt="story.title" loading="lazy" class="timeline__photo" @error="onPhotoError" />
                  <div v-if="story.photos.length > 3" class="timeline__photos-more">
                    <img :src="thumbOf(story.photos?.[3] ?? '')" :data-full="story.photos?.[3] ?? ''" :alt="story.title"
                      loading="lazy" class="timeline__photo timeline__photo--more" @error="onPhotoError" />
                    <span class="timeline__photos-more-badge" aria-hidden="true">
                      <span class="timeline__photos-more-count">+{{ story.photos.length - 3 }}</span>
                    </span>
                  </div>
                </div>
                <div v-if="story.videos?.length" class="timeline__videos">
                  <div v-for="video in story.videos" :key="video" class="timeline__video-wrap">
                    <video :src="video" class="timeline__video" preload="metadata" muted playsinline
                      @click="toggleVideo" @play="onVideoState" @pause="onVideoState" @error="onVideoError"></video>
                    <button type="button" class="timeline__video-play" aria-label="播放视频" @click="toggleVideo"></button>
                  </div>
                </div>
                <div v-if="story.tags?.length" class="timeline__tags">
                  <span v-for="tag in story.tags" :key="tag" class="timeline__tag">{{ tag }}</span>
                </div>
                <!-- 年度总结：当年购入的资产以卡片展示，单价过低的不展示并用文字提示 -->
                <details v-if="visibleAssets(story).length" class="timeline__year-assets">
                  <summary class="timeline__year-assets-summary">
                    当年购入的资产（{{ visibleAssets(story).length }}）
                    <span v-if="hiddenAssetCount(story) > 0" class="timeline__year-assets-hint">已隐藏 {{
                      hiddenAssetCount(story) }} 件低于 ¥{{ MIN_ASSET_PRICE }} 的</span>
                  </summary>
                  <ul class="timeline__year-assets-list">
                    <AssetItemCard v-for="asset in visibleAssets(story)" :key="asset.id" :item="asset" />
                  </ul>
                </details>
                <div class="timeline__footer">
                  <RouterLink :to="`/story/${story.id}`" class="timeline__detail-link">查看详情 →</RouterLink>
                </div>
              </article>
            </li>
          </ol>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.timeline-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.page-header p {
  margin: 0;
  color: var(--color-text-secondary);
}

.filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
}

.type-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.type-filter__item {
  padding: 6px 16px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-card-bg);
  color: var(--color-text);
  cursor: pointer;
  font-size: 14px;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.type-filter__item:hover {
  border-color: var(--color-border-strong);
}

.type-filter__item--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-text);
}

.visibility-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.visibility-filter__label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.visibility-filter__select {
  padding: 6px 32px 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-card-bg);
  color: var(--color-text);
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

.visibility-filter__select:hover {
  border-color: var(--color-border-strong);
}

.visibility-filter__select:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
  border-color: var(--color-accent);
}

.timeline {
  position: relative;
  padding-left: 24px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
  border-radius: 1px;
}

.year-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.year-nav__label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.year-nav__select {
  padding: 6px 32px 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-card-bg);
  color: var(--color-text);
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

.year-nav__select:hover {
  border-color: var(--color-border-strong);
}

.year-nav__select:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
  border-color: var(--color-accent);
}

.timeline__year-group {
  margin-bottom: 36px;
  scroll-margin-top: 72px;
}

.timeline__year {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  font-size: 22px;
  color: var(--color-text);
}

.timeline__year::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.timeline__year-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-muted);
  background: var(--color-bg-secondary);
  border-radius: 999px;
  padding: 2px 10px;
}

.timeline__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.timeline__item {
  position: relative;
  scroll-margin-top: 72px;
}

.timeline__dot {
  position: absolute;
  left: -29px;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--color-bg);
  box-shadow: 0 0 0 2px var(--color-border);
}

.timeline__dot--trip {
  background: var(--trip-dot);
}

.timeline__dot--honor {
  background: var(--honor-dot);
}

.timeline__dot--milestone {
  background: var(--milestone-dot);
}

.timeline__dot--annual {
  background: var(--annual-dot);
}

.timeline__card {
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-card-bg);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.timeline__card:hover {
  border-color: var(--color-border-strong);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.timeline__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.timeline__date {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.timeline__badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.timeline__badge--trip {
  background: var(--trip-badge-bg);
  color: var(--trip-badge-text);
}

.timeline__badge--honor {
  background: var(--honor-badge-bg);
  color: var(--honor-badge-text);
}

.timeline__badge--milestone {
  background: var(--milestone-badge-bg);
  color: var(--milestone-badge-text);
}

.timeline__badge--annual {
  background: var(--annual-badge-bg);
  color: var(--annual-badge-text);
}

.timeline__title {
  margin: 0 0 6px;
  font-size: 18px;
}

.timeline__location {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--color-text-secondary);
  /* 超出省略：单行截断显示 ... */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline__content {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.6;
}

.timeline__content a {
  color: var(--color-primary);
  text-decoration: none;
  word-break: break-all;
}

.timeline__content a:hover {
  text-decoration: underline;
}

/* markdown 渲染的段落：去掉浏览器默认的大 margin，改为紧凑段间距 */
.timeline__content :deep(p) {
  margin: 0 0 6px;
}

.timeline__content :deep(p:last-child) {
  margin-bottom: 0;
}

.timeline__content :deep(ul) {
  margin: 4px 0;
  padding-left: 1.25em;
  list-style: disc;
}

.timeline__content :deep(li + li) {
  margin-top: 4px;
}

/* 嵌套列表（markdown 缩进子项）贴合父项，避免大间距 */
.timeline__content :deep(li > ul) {
  margin: 4px 0;
}

.timeline__photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.timeline__photo {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

/* 原图也加载失败：隐藏破图图标，保留 120x120 占位空间避免布局跳动 */
.timeline__photo--missing {
  visibility: hidden;
}

/* 非详情页只展示前 3 张：超出部分用第 4 张模糊占位，保留轮廓并在中间显示省略号 */
.timeline__photos-more {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  background: var(--color-bg-secondary);
}

.timeline__photos-more .timeline__photo--more {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
  filter: blur(8px);
  transform: scale(1.05);
}

.timeline__photos-more-badge {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.timeline__photos-more-count {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  opacity: 0.95;
  font-variant-numeric: tabular-nums;
}

.timeline__videos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.timeline__video-wrap {
  position: relative;
}

.timeline__video {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  cursor: pointer;
}

/* 视频加载失败：隐藏破图，保留 120x120 占位 */
.timeline__video--missing {
  visibility: hidden;
}

.timeline__video-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.15s ease,
    transform 0.15s ease;
}

.timeline__video-play::before {
  content: '▶';
}

/* 播放中显示暂停图标 */
.timeline__video-play--playing::before {
  content: '⏸';
}

.timeline__video-play:hover {
  background: rgba(0, 0, 0, 0.75);
  transform: translate(-50%, -50%) scale(1.08);
}

.timeline__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.timeline__tag {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 12px;
}

/* 年度总结：当年购入资产折叠区 */
.timeline__year-assets {
  margin-top: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg-secondary);
}

.timeline__year-assets-summary {
  cursor: pointer;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  user-select: none;
  list-style: none;
}

.timeline__year-assets-summary::-webkit-details-marker {
  display: none;
}

.timeline__year-assets-summary::before {
  content: '▸ ';
}

.timeline__year-assets[open] .timeline__year-assets-summary::before {
  content: '▾ ';
}

.timeline__year-assets-summary:hover {
  color: var(--color-primary);
}

.timeline__year-assets-list {
  list-style: none;
  margin: 0;
  padding: 0 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 已隐藏低价资产的文字提示 */
.timeline__year-assets-hint {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-muted);
}

.timeline__empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 80px 0;
}

.timeline__empty p:first-child {
  margin: 0 0 8px;
  font-size: 16px;
}

.timeline__empty-hint {
  margin: 0;
  font-size: 13px;
}

.timeline__title-link {
  color: inherit;
  text-decoration: none;
}

.timeline__title-link:hover {
  color: var(--color-primary);
}

.timeline__footer {
  margin-top: 10px;
  text-align: right;
}

.timeline__detail-link {
  font-size: 13px;
  color: var(--color-primary);
  text-decoration: none;
}

.timeline__detail-link:hover {
  text-decoration: underline;
}
</style>
