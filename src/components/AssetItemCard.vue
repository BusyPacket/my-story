<script setup lang="ts">
/** 一条转卖记录：卖掉某件东西所得的金额与日期 */
type SoldRecord = {
  /** 卖了什么 */
  name?: string
  /** 转卖所得金额 */
  price: number
  /** 转卖日期 */
  date?: string
}

/** 资产状态：holding=持有 / discarded=已丢弃 / sold=已出二手 / retired=淘汰 */
type AssetStatus = 'holding' | 'discarded' | 'sold' | 'retired'

/** 状态 → 中文展示文案 */
const STATUS_LABEL: Record<AssetStatus, string> = {
  holding: '持有',
  discarded: '已丢弃',
  sold: '已出二手',
  retired: '淘汰',
}

/** 购入方式：taobao=淘宝 / jd=京东 / xianyu=闲鱼 / other=其他 */
type PurchaseMethod = 'taobao' | 'jd' | 'xianyu' | 'other'

/** 购入方式 → 中文展示文案 */
const PURCHASE_METHOD_LABEL: Record<PurchaseMethod, string> = {
  taobao: '淘宝',
  jd: '京东',
  xianyu: '闲鱼',
  other: '其他',
}

/** 配件明细行 */
type CardPart = {
  id: string
  name: string
  price: number
  quantity?: number
}

/** 物品卡片所需数据（由父级 AssetView 传入） */
interface ItemCardData {
  id: string
  name: string
  tag?: string
  description?: string
  photo?: string
  purchase_date: string
  purchase_method?: PurchaseMethod
  parts: CardPart[]
  sold?: SoldRecord[]
  daysUsed: number
  totalPrice: number
  dailyCost: number
  km?: number
  kmCost?: number
  status?: AssetStatus
  status_date?: string
}

defineProps<{ item: ItemCardData }>()

function formatPrice(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// 公里数显示：保留最多 2 位小数，千分位分隔
function formatKm(km: number): string {
  return km.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

// 缩略图路径：/media/photos/xxx.jpg -> /media/photos/thumbs/xxx.jpg.webp（非本地照片保持原样）
function thumbOf(photo: string): string {
  if (photo.startsWith('/media/photos/')) {
    return `${photo}.webp`.replace('/photos/', '/photos/thumbs/')
  }
  return photo
}

// 图片降级链：缩略图 404 → 回退到原图；原图也失败 → 隐藏破图
function onPhotoError(event: Event): void {
  const img = event.target as HTMLImageElement
  const full = img.dataset.full
  if (!full) return
  if ((img.getAttribute('src') ?? '') !== full) {
    img.src = full
    return
  }
  img.style.display = 'none'
}
</script>

<template>
  <li class="item-card">
    <div class="item-card__top">
      <img v-if="item.photo" :src="thumbOf(item.photo)" :data-full="item.photo" :alt="item.name" loading="lazy"
        class="item-card__thumb" @error="onPhotoError" />
      <div class="item-card__main">
        <div class="card-title">
          <h3 class="item-card__name">{{ item.name }}</h3>
          <span v-if="item.status" class="item-card__status" :class="`item-card__status--${item.status}`">{{
            STATUS_LABEL[item.status] }}</span>
          <span v-if="item.tag" class="tag">{{ item.tag }}</span>
        </div>
        <p v-if="item.description" class="item-card__desc">{{ item.description }}</p>
      </div>
      <div class="item-card__daily">
        <span class="item-card__daily-label">日均费用</span>
        <span class="item-card__daily-value">{{ formatPrice(item.dailyCost) }}</span>
      </div>
    </div>
    <details v-if="item.parts.length > 0 || item.sold?.length" class="item-card__parts">
      <summary class="item-card__parts-summary">
        配件明细（{{ item.parts.length > 0 ? `${item.parts.length} 件 · ` : '' }}合计
        {{ formatPrice(item.totalPrice) }}）
      </summary>
      <ul class="item-card__parts-list">
        <li v-for="part in item.parts" :key="part.id" class="item-card__part">
          <span class="item-card__part-name">{{ part.name }}</span>
          <span class="item-card__part-price">{{
            formatPrice(part.price * (part.quantity ?? 1))
            }}</span>
        </li>
        <li v-for="s in item.sold ?? []" :key="`${s.name ?? ''}-${s.price}-${s.date ?? ''}`"
          class="item-card__part item-card__part--sold">
          <span class="item-card__part-name">转卖<template v-if="s.name"> {{ s.name }}</template><template
              v-if="s.date">（{{ s.date }}）</template></span>
          <span class="item-card__part-price">-{{ formatPrice(s.price) }}</span>
        </li>
      </ul>
    </details>
    <div class="item-card__meta">
      <template v-if="item.status === 'sold' || item.status === 'discarded'">
        <span>{{ PURCHASE_METHOD_LABEL[item.purchase_method ?? 'other'] }}购入 · 持有：{{
          item.purchase_date
        }}
          - {{ item.status_date }}（{{ item.daysUsed }} 天）</span>
      </template>
      <template v-else>
        <span>{{ PURCHASE_METHOD_LABEL[item.purchase_method ?? 'other'] }}购入
          {{ item.purchase_date }}</span>
        <span>已用 {{ item.daysUsed }} 天</span>
      </template>
      <template v-if="item.km">
        <span>码表里程 {{ formatKm(item.km) }} km</span>
        <span>每公里 {{ formatPrice(item.kmCost ?? 0) }}</span>
      </template>
      <span class="item-card__meta-total">总价 {{ formatPrice(item.totalPrice) }}</span>
    </div>
  </li>
</template>

<style scoped>
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.item-card__status {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.item-card__status--holding {
  background: var(--status-holding-bg);
  color: var(--status-holding-text);
}

.item-card__status--discarded {
  background: var(--status-discarded-bg);
  color: var(--status-discarded-text);
}

.item-card__status--sold {
  background: var(--status-sold-bg);
  color: var(--status-sold-text);
}

.item-card__status--retired {
  background: var(--status-retired-bg);
  color: var(--status-retired-text);
}

.item-card {
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-card-bg);
  transition: border-color 0.15s ease;
}

.item-card:hover {
  border-color: var(--color-border-strong);
}

.item-card__top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* 资产缩略图 */
.item-card__thumb {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.item-card__main {
  flex: 1;
  min-width: 0;
}

.item-card__name {
  margin: 0 0 4px;
  font-size: 16px;
}

.item-card__desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.item-card__daily {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.item-card__daily-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.item-card__daily-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.item-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 13px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

/* 总价靠右对齐 */
.item-card__meta-total {
  margin-left: auto;
}

/* 配件明细（子项目） */
.item-card__parts {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.item-card__parts-summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-secondary);
  user-select: none;
}

.item-card__parts-summary:hover {
  color: var(--color-primary);
}

.item-card__parts-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-card__part {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.item-card__part-name {
  color: var(--color-text-secondary);
}

.item-card__part-price {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

/* 转卖记录：扣减项，绿色表示回收的资金 */
.item-card__part--sold .item-card__part-name {
  color: var(--color-text-muted);
}

.item-card__part--sold .item-card__part-price {
  color: var(--milestone-dot);
  font-weight: 600;
}
</style>
