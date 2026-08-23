<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  itemCards as items,
  memberCards as memberships,
  type AssetMembership,
} from '@/composables/useAssets'
import AssetItemCard from '@/components/AssetItemCard.vue'

// 总览统计
const stats = computed(() => {
  const itemList = items.value
  const memberList = memberships.value
  return {
    itemCount: itemList.length,
    itemTotal: itemList.reduce((sum, asset) => sum + asset.totalPrice, 0),
    memberCount: memberList.length,
    memberMonthly: memberList.reduce((sum, asset) => sum + asset.monthlyCost, 0),
  }
})

// 物品排序选项：日均费用（默认）/ 购入时间 / 总价
const SORT_OPTIONS = [
  { value: 'dailyCost', label: '日均费用' },
  { value: 'purchaseDate', label: '购入时间' },
  { value: 'totalPrice', label: '总价' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['value']

// 当前排序：默认按日均费用从高到低
const sortKey = ref<SortKey>('dailyCost')
const sortDesc = ref(true)

// 按所选排序方式排列的全部物品
const sortedItems = computed(() => {
  const list = [...items.value]
  const desc = sortDesc.value
  const key = sortKey.value
  list.sort((a, b) => {
    const raw =
      key === 'purchaseDate'
        ? a.purchase_date.localeCompare(b.purchase_date)
        : key === 'totalPrice'
          ? a.totalPrice - b.totalPrice
          : a.dailyCost - b.dailyCost
    return desc ? -raw : raw
  })
  return list
})

// 已出二手 / 已丢弃分别收进各自折叠区（其余状态正常展示）
const activeItems = computed(() =>
  sortedItems.value.filter((item) => item.status !== 'discarded' && item.status !== 'sold'),
)
const soldItems = computed(() => sortedItems.value.filter((item) => item.status === 'sold'))
const discardedItems = computed(() =>
  sortedItems.value.filter((item) => item.status === 'discarded'),
)

// 方向按钮文案：按时间显示新旧，其余显示高低
const sortDirLabel = computed(() =>
  sortKey.value === 'purchaseDate'
    ? sortDesc.value
      ? '新→旧'
      : '旧→新'
    : sortDesc.value
      ? '高→低'
      : '低→高',
)

// 切换排序方式（切到其它方式时回到降序，更符合直觉）
function selectSortKey(key: SortKey): void {
  if (key === sortKey.value) return
  sortKey.value = key
  sortDesc.value = true
}

function toggleSortDir(): void {
  sortDesc.value = !sortDesc.value
}

function formatPrice(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function cycleLabel(cycle: AssetMembership['cycle']): string {
  return cycle === 'monthly' ? '每月' : '每年'
}

function maskPhone(text: string): string {
  return text.replace(/\b(\d{3})\d{4}(\d{4})\b/g, '$1****$2')
}
</script>

<template>
  <main class="asset-page">
    <header class="page-header">
      <h1>我的资产</h1>
      <p class="page-header__note">只记录有交易价值的资产</p>
    </header>

    <section class="stats" aria-label="资产总览">
      <div class="stat">
        <span class="stat__value">{{ stats.itemCount }}</span>
        <span class="stat__label">物品（件）</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ formatPrice(stats.itemTotal) }}</span>
        <span class="stat__label">物品总投入</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ stats.memberCount }}</span>
        <span class="stat__label">订阅服务（项）</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ formatPrice(stats.memberMonthly) }}</span>
        <span class="stat__label">订阅月均支出</span>
      </div>
    </section>

    <section class="asset-section">
      <div class="asset-section__head">
        <div>
          <h2 class="asset-section__title">物品</h2>
          <p class="asset-section__hint">日均费用 = 总价 ÷ 已使用天数，越低代表用得越“划算”</p>
        </div>
        <div class="sort-bar" role="group" aria-label="物品排序">
          <div class="sort-bar__options">
            <button v-for="opt in SORT_OPTIONS" :key="opt.value" type="button" class="sort-bar__opt"
              :class="{ 'sort-bar__opt--active': sortKey === opt.value }" @click="selectSortKey(opt.value)">
              {{ opt.label }}
            </button>
          </div>
          <button type="button" class="sort-bar__dir" :aria-pressed="sortDesc" @click="toggleSortDir">
            {{ sortDirLabel }}
          </button>
        </div>
      </div>

      <p v-if="items.length === 0" class="asset-empty">还没有物品数据</p>

      <template v-else>
        <ol class="item-list">
          <AssetItemCard v-for="item in activeItems" :key="item.id" :item="item" />
        </ol>

        <details v-if="soldItems.length" class="collapsed-section">
          <summary class="collapsed-section__summary">已出二手（{{ soldItems.length }}）</summary>
          <ol class="item-list">
            <AssetItemCard v-for="item in soldItems" :key="item.id" :item="item" />
          </ol>
        </details>

        <details v-if="discardedItems.length" class="collapsed-section">
          <summary class="collapsed-section__summary">
            已丢弃（{{ discardedItems.length }}）
          </summary>
          <ol class="item-list">
            <AssetItemCard v-for="item in discardedItems" :key="item.id" :item="item" />
          </ol>
        </details>
      </template>
    </section>

    <section class="asset-section">
      <h2 class="asset-section__title">订阅 · 月均费用</h2>
      <p v-if="memberships.length === 0" class="asset-empty">还没有订阅数据</p>
      <ul v-else class="member-list">
        <li v-for="member in memberships" :key="member.id" class="member-card">
          <div class="member-card__main">
            <div class="card-title">
              <h3 class="member-card__name">{{ member.name }}</h3>
              <span v-if="member.tag" class="tag">{{ member.tag }}</span>
            </div>
            <p v-if="member.notes" class="member-card__notes">{{ maskPhone(member.notes) }}</p>
          </div>
          <div class="member-card__cost">
            <span class="member-card__cycle">{{ cycleLabel(member.cycle) }} {{ formatPrice(member.price) }}</span>
            <span class="member-card__monthly">月均 {{ formatPrice(member.monthlyCost) }}</span>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.asset-page {
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

.page-header__note {
  margin: 0;
  color: var(--color-text-secondary);
}

/* 总览统计 */
.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-card-bg);
}

.stat__value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.stat__label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 区块标题 */
.asset-section {
  margin-bottom: 40px;
}

.asset-section__title {
  margin: 0 0 4px;
  font-size: 20px;
}

.asset-section__hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

/* 物品区块头部：标题 + 排序控件 */
.asset-section__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

/* 排序控件 */
.sort-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-bar__options {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: var(--color-bg-secondary);
}

.sort-bar__opt {
  border: none;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.sort-bar__opt:hover {
  color: var(--color-text);
}

.sort-bar__opt--active {
  background: var(--color-card-bg);
  color: var(--color-primary);
  font-weight: 600;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
}

.sort-bar__dir {
  border: 1px solid var(--color-border);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-card-bg);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.sort-bar__dir:hover {
  border-color: var(--color-border-strong);
  color: var(--color-primary);
}

.asset-empty {
  padding: 24px;
  border: 1px dashed var(--color-border);
  border-radius: 16px;
  color: var(--color-text-muted);
  text-align: center;
}

/* 物品列表 */
.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 已出二手 / 已丢弃折叠区 */
.collapsed-section {
  margin-top: 16px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-bg-secondary);
}

.collapsed-section__summary {
  cursor: pointer;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  user-select: none;
}

.collapsed-section__summary:hover {
  color: var(--color-primary);
}

.collapsed-section .item-list {
  padding: 0 16px 16px;
}

/* 订阅卡片 */
.member-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-card-bg);
  transition: border-color 0.15s ease;
}

.member-card:hover {
  border-color: var(--color-border-strong);
}

.member-card__name {
  margin: 0 0 4px;
  font-size: 16px;
}

.member-card__notes {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.member-card__cost {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.member-card__cycle {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.member-card__monthly {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

/* 会员费合计 */
.member-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
  padding: 14px 20px;
  border-radius: 16px;
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.member-total__label {
  font-size: 14px;
  font-weight: 600;
}

.member-total__value {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

@media (min-width: 560px) {
  .stats {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
