<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { sortAnchor, type Story } from '@/data/stories'

const props = defineProps<{ stories: Story[] }>()

const emit = defineEmits<{ 'select-date': [date: string] }>()

interface DayCell {
  date: string
  day: number
  month: number
  count: number
}

// 可用年份：存在完整日期事件的年份（升序），供年份切换
const availableYears = computed(() => {
  const years = new Set<number>()
  for (const story of props.stories) {
    const anchor = sortAnchor(story)
    if (anchor.length < 10) continue
    const year = Number(anchor.slice(0, 4))
    if (year) years.add(year)
  }
  return Array.from(years).sort((a, b) => a - b)
})

// 选中年份：默认最近一个有记录的年份；筛选变化导致当前年份失效时自动重置
const selectedYear = ref(0)

watch(
  availableYears,
  (years) => {
    selectedYear.value = years.length ? (years[years.length - 1] ?? 0) : 0
  },
  { immediate: true },
)

// 事件日集合：复用时间线的排序锚点逻辑（时间段事件标在锚点那一天）
const eventDays = computed(() => {
  const map = new Map<string, Story[]>()
  for (const story of props.stories) {
    const anchor = sortAnchor(story)
    if (anchor.length < 10) continue
    if (Number(anchor.slice(0, 4)) !== selectedYear.value) continue
    const date = anchor.slice(0, 10)
    const list = map.get(date) ?? []
    list.push(story)
    map.set(date, list)
  }
  return map
})

function eventTitles(date: string): string[] {
  return (eventDays.value.get(date) ?? []).map((story) => story.title)
}

// hover 悬浮提示：展示该日的事件标题列表（fixed 定位，贴近鼠标并做边界收敛）
const hovered = ref<{ date: string; titles: string[]; x: number; y: number } | null>(null)

function onCellEnter(cell: DayCell | null, event: MouseEvent): void {
  if (!cell) return
  const titles = eventTitles(cell.date)
  if (titles.length === 0) {
    hovered.value = null
    return
  }
  hovered.value = { date: cell.date, titles, x: event.clientX, y: event.clientY }
}

function onCellMove(event: MouseEvent): void {
  if (!hovered.value) return
  const pad = 14
  const w = 220
  const h = 44 + hovered.value.titles.length * 18
  let x = event.clientX + pad
  let y = event.clientY + pad
  if (x + w > window.innerWidth) x = event.clientX - pad - w
  if (y + h > window.innerHeight) y = event.clientY - pad - h
  hovered.value.x = Math.max(4, x)
  hovered.value.y = Math.max(4, y)
}

function onCellLeave(): void {
  hovered.value = null
}

// 点击有事件的格子：通知父组件滚动到该日期对应的事件
function onCellClick(cell: DayCell | null): void {
  if (!cell || cell.count === 0) return
  emit('select-date', cell.date)
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function fmtDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// GitHub 风格网格：列=周（周日起始），行=7 天；月份标签跨其所在列范围
const grid = computed(() => {
  const year = selectedYear.value
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)

  const weeks: (DayCell | null)[][] = []
  const monthStarts: { month: number; col: number }[] = []

  const cursor = new Date(start)
  cursor.setDate(cursor.getDate() - cursor.getDay()) // 对齐到起始周的周日
  const stop = new Date(end)
  stop.setDate(stop.getDate() + (6 - stop.getDay())) // 对齐到结束周的周六

  let prevMonth = 0
  let col = 0
  while (cursor <= stop) {
    const week: (DayCell | null)[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      if (d.getFullYear() === year) {
        const date = fmtDate(d)
        week.push({
          date,
          day: d.getDate(),
          month: d.getMonth() + 1,
          count: (eventDays.value.get(date) ?? []).length,
        })
      } else {
        week.push(null)
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    const firstMonth = week.find((cell) => cell !== null)?.month ?? 0
    if (firstMonth !== 0 && firstMonth !== prevMonth) {
      monthStarts.push({ month: firstMonth, col })
      prevMonth = firstMonth
    }
    weeks.push(week)
    col++
  }

  // 月份标签：起始于月份首周，跨到下一月份首周前（列 1 是星期标签列，故 +2）
  const monthSpans = monthStarts.map((m, i) => {
    const next = monthStarts[i + 1]
    return { label: m.month, start: m.col + 2, end: next ? next.col + 2 : weeks.length + 2 }
  })

  return { weeks, monthSpans }
})

// 年份切换：左右步进
function stepYear(delta: number): void {
  const idx = availableYears.value.indexOf(selectedYear.value)
  const next = availableYears.value[idx + delta]
  if (next) selectedYear.value = next
}

function onSelectYear(event: Event): void {
  selectedYear.value = Number((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <section v-if="availableYears.length > 0" class="date-view" aria-label="日期视图">
    <div class="date-view__head">
      <span class="date-view__title">日期视图</span>
      <div class="date-view__controls">
        <button type="button" class="date-view__btn" :disabled="selectedYear <= (availableYears[0] ?? 0)"
          @click="stepYear(-1)" aria-label="上一年">‹</button>
        <select class="date-view__select" :value="selectedYear" @change="onSelectYear" aria-label="切换年份">
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
        <button type="button" class="date-view__btn"
          :disabled="selectedYear >= (availableYears[availableYears.length - 1] ?? 0)" @click="stepYear(1)"
          aria-label="下一年">›</button>
      </div>
    </div>

    <div class="date-view__scroll">
      <div class="date-view__graph" :style="{ gridTemplateColumns: `auto repeat(${grid.weeks.length}, 13px)` }">
        <span v-for="m in grid.monthSpans" :key="m.start" class="date-view__month"
          :style="{ gridColumn: `${m.start} / ${m.end}` }">{{ m.label }}月</span>
        <template v-for="(week, w) in grid.weeks" :key="w">
          <span v-for="(cell, r) in week" :key="r" class="date-view__cell"
            :class="{ 'date-view__cell--on': cell && cell.count > 0 }" :style="{ gridColumn: w + 2, gridRow: r + 2 }"
            @mouseenter="onCellEnter(cell, $event)" @mousemove="onCellMove" @mouseleave="onCellLeave"
            @click="onCellClick(cell)"></span>
        </template>
        <template v-for="(label, r) in WEEKDAYS" :key="label">
          <span class="date-view__weekday" :style="{ gridColumn: 1, gridRow: r + 2 }">{{ label }}</span>
        </template>
      </div>
    </div>

    <div v-if="hovered" class="date-view__tooltip" :style="{ left: `${hovered.x}px`, top: `${hovered.y}px` }">
      <div class="date-view__tooltip-date">{{ hovered.date }}</div>
      <ul v-if="hovered.titles.length" class="date-view__tooltip-list">
        <li v-for="(title, i) in hovered.titles" :key="i" class="date-view__tooltip-item">{{ title }}</li>
      </ul>
    </div>

    <div class="date-view__foot">
      <span class="date-view__hint">{{ selectedYear }} 年 · {{ eventDays.size }} 天有记录</span>
      <span class="date-view__legend">
        <span class="date-view__legend-cell"></span>
        少
        <span class="date-view__legend-cell date-view__legend-cell--on"></span>
        多
      </span>
    </div>
  </section>
</template>

<style scoped>
.date-view {
  margin-bottom: 24px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-card-bg);
}

.date-view__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.date-view__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.date-view__controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-view__btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.date-view__btn:hover:not(:disabled) {
  border-color: var(--color-border-strong);
}

.date-view__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.date-view__select {
  padding: 4px 26px 4px 10px;
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
  background-position: right 8px center;
}

.date-view__select:hover {
  border-color: var(--color-border-strong);
}

.date-view__select:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
  border-color: var(--color-accent);
}

.date-view__scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}

.date-view__graph {
  display: grid;
  grid-template-rows: 18px repeat(7, 13px);
  gap: 2px 3px;
  width: max-content;
  align-items: center;
}

.date-view__month {
  font-size: 10px;
  color: var(--color-text-muted);
  white-space: nowrap;
  padding-right: 4px;
}

.date-view__weekday {
  font-size: 10px;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 13px;
}

.date-view__cell {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  background: var(--color-bg-secondary);
}

.date-view__cell--on {
  background: var(--color-primary);
  cursor: pointer;
}

.date-view__cell--on:hover {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.date-view__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.date-view__hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

.date-view__legend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.date-view__legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--color-bg-secondary);
}

.date-view__legend-cell--on {
  background: var(--color-primary);
}

.date-view__tooltip {
  position: fixed;
  z-index: 50;
  min-width: 140px;
  max-width: 260px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-card-bg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  color: var(--color-text);
  pointer-events: none;
}

.date-view__tooltip-date {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--color-text-secondary);
}

.date-view__tooltip-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 180px;
  overflow-y: auto;
}

.date-view__tooltip-item {
  line-height: 1.4;
  word-break: break-all;
}
</style>
