import { computed } from 'vue'

import itemRaw from '@/data/asset/items.json?raw'
import memberRaw from '@/data/asset/memberships.json?raw'

/** 一条转卖记录：卖掉某件东西所得的金额与日期 */
export type SoldRecord = {
  /** 卖了什么 */
  name?: string
  /** 转卖所得金额 */
  price: number
  /** 转卖日期 */
  date?: string
}

/** 资产当前状态：holding=持有 / discarded=已丢弃 / sold=已出二手 / retired=淘汰 */
export type AssetStatus = 'holding' | 'discarded' | 'sold' | 'retired'

/** 全部可选状态（用于遍历 / 校验，如筛选下拉） */
export const ASSET_STATUSES: AssetStatus[] = ['holding', 'discarded', 'sold', 'retired']

/** 购入方式：taobao=淘宝 / jd=京东 / xianyu=闲鱼 / other=其他（默认） */
export type PurchaseMethod = 'taobao' | 'jd' | 'xianyu' | 'other'

/** 全部可选购入方式（用于遍历 / 校验） */
export const PURCHASE_METHODS: PurchaseMethod[] = ['taobao', 'jd', 'xianyu', 'other']

export type AssetItem = {
  id: string
  type: 'item'
  name: string
  /** 分类标签（如：电脑、硬盘、内存） */
  tag?: string
  description?: string
  purchase_date: string
  /** 购入方式（不填默认视为其他） */
  purchase_method?: PurchaseMethod
  /** 总价：可省略，有 parts 时自动按 parts 合计 */
  price?: number
  /** 引用的子项目 id（如台式机的各配件），子项目与父级同级别存放 */
  parts?: string[]
  /** 骑行公里数（用于计算每公里成本，见 kmCost） */
  km?: number
  /** 转卖记录列表：每条记录的金额都会从总价中扣除 */
  sold?: SoldRecord[]
  /** 展示图（缩略图由原图自动生成，见 thumbOf） */
  photo?: string
  /** 当前状态（不填默认视为持有中） */
  status?: AssetStatus
  /** 状态开始日期（如已出二手 / 已丢弃 / 淘汰的日期），用于把日均费用截止到该日期 */
  status_date?: string
}

/** 由 parts id 引用解析出的子项目 */
export type AssetPart = Omit<AssetItem, 'price'> & {
  /** 单价：子项目必须带价才能参与合计 */
  price: number
  /** 数量，默认 1 */
  quantity?: number
}

export type AssetMembership = {
  id: string
  type: 'membership'
  name: string
  /** 分类标签（如：订阅、电话卡） */
  tag?: string
  notes?: string
  cycle: 'monthly' | 'yearly'
  price: number
}

export type Asset = AssetItem | AssetMembership

/** 物品卡片数据（与 AssetItemCard 组件 prop 结构一致） */
export interface ItemCardData {
  id: string
  name: string
  /** 单价（购入价；父级有子项目时为子项目合计） */
  price: number
  tag?: string
  description?: string
  photo?: string
  purchase_date: string
  purchase_method?: PurchaseMethod
  parts: AssetPart[]
  sold?: SoldRecord[]
  daysUsed: number
  totalPrice: number
  dailyCost: number
  km?: number
  kmCost?: number
  status?: AssetStatus
  status_date?: string
}

export interface MembershipWithMonthly extends AssetMembership {
  /** 折算后的月均费用 */
  monthlyCost: number
}

// items.json（物品）/ memberships.json（订阅）解析失败时降级为空数组，避免页面崩溃
let assets: Asset[] = []
for (const [file, raw] of [
  ['items.json', itemRaw],
  ['memberships.json', memberRaw],
] as const) {
  try {
    assets.push(...(JSON.parse(raw) as Asset[]))
  } catch (error) {
    console.warn(`[asset] ${file} 解析失败：`, error)
  }
}

// id → 资产的映射，用于解析 parts 引用
const assetMap = new Map<string, Asset>(assets.map((a) => [a.id, a]))

// 被其它条目引用的 id 集合（被引用者只在父级折叠列表展示，不单独出现）
const referencedIds = new Set<string>()
// 子项目 id → 父级购入年份列表（用于判断子项目是否“新买”，见 itemCardsByYear）
const partParentYears = new Map<string, string[]>()
for (const a of assets) {
  if (a.type === 'item') {
    for (const pid of a.parts ?? []) {
      referencedIds.add(pid)
      const parentYear = a.purchase_date.slice(0, 4)
      const years = partParentYears.get(pid) ?? []
      if (parentYear && !years.includes(parentYear)) years.push(parentYear)
      partParentYears.set(pid, years)
    }
  }
}

// 从购入日到某天经过的天数（至少 1 天）
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const end = new Date(`${endDate}T00:00:00`).getTime()
  const days = Math.floor((end - start) / 86_400_000)
  return Math.max(days, 1)
}

// 从购入日算到今天经过的天数
function daysSince(dateStr: string): number {
  const start = new Date(`${dateStr}T00:00:00`).getTime()
  const days = Math.floor((Date.now() - start) / 86_400_000)
  return Math.max(days, 1)
}

// 解析一个条目的 parts id 引用为具体子项目
function resolveParts(asset: AssetItem): AssetPart[] {
  return (asset.parts ?? [])
    .map((pid) => assetMap.get(pid))
    .filter(
      (p): p is AssetPart => p !== undefined && p.type === 'item' && typeof p.price === 'number',
    )
}

// 子项目合计：Σ(单价 × 数量)
function partTotal(parts: AssetPart[] | undefined): number {
  return (parts ?? []).reduce((sum, part) => sum + part.price * (part.quantity ?? 1), 0)
}

// 把一个物品条目解析为卡片数据（子项目、总价、天数、日均、每公里）
function toItemCard(asset: AssetItem): ItemCardData {
  const parts = resolveParts(asset)
  const baseTotal = parts.length ? partTotal(parts) : (asset.price ?? 0)
  const soldTotal = (asset.sold ?? []).reduce((sum, s) => sum + s.price, 0)
  const totalPrice = baseTotal - soldTotal
  // 有状态日期（如出二手 / 丢弃日）则按截止日算，否则算到今天
  const daysUsed = asset.status_date
    ? daysBetween(asset.purchase_date, asset.status_date)
    : daysSince(asset.purchase_date)
  return {
    id: asset.id,
    name: asset.name,
    price: baseTotal,
    tag: asset.tag,
    description: asset.description,
    photo: asset.photo,
    purchase_date: asset.purchase_date,
    parts,
    sold: asset.sold,
    daysUsed,
    totalPrice,
    dailyCost: totalPrice / daysUsed,
    km: asset.km,
    kmCost: asset.km ? totalPrice / asset.km : undefined,
    status: asset.status,
    status_date: asset.status_date,
    purchase_method: asset.purchase_method,
  }
}

/** 全部物品卡片（按日均费用从高到低），供资产页使用 */
export const itemCards = computed<ItemCardData[]>(() =>
  assets
    .filter((asset): asset is AssetItem => asset.type === 'item' && !referencedIds.has(asset.id))
    .map(toItemCard)
    .sort((a, b) => b.dailyCost - a.dailyCost),
)

/** 某年购入的物品卡片（按购入日期倒序），供年度总结以卡片展示。
 *  子项目若与父级同年购入，已含在父级“配件明细”里，不单独重复展示；
 *  子项目真正购入年份与父级不同（如后加的硬盘/内存/维修），则按它的购入年份单独展示。 */
export function itemCardsByYear(year: string): ItemCardData[] {
  const prefix = `${year}-`
  return assets
    .filter(
      (asset): asset is AssetItem =>
        asset.type === 'item' && asset.purchase_date.startsWith(prefix),
    )
    .filter((asset) => {
      const parentYears = partParentYears.get(asset.id)
      return !parentYears || !parentYears.includes(year)
    })
    .map(toItemCard)
    .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))
}

/** 按 id 取物品卡片数据（不存在或非物品时返回 undefined），供故事详情页引用 */
export function itemCardById(id: string): ItemCardData | undefined {
  const asset = assetMap.get(id)
  return asset && asset.type === 'item' ? toItemCard(asset) : undefined
}

/** 订阅：统一折算成月均费用，方便横向比较 */
export const memberCards = computed<MembershipWithMonthly[]>(() =>
  assets
    .filter((asset): asset is AssetMembership => asset.type === 'membership')
    .map((asset) => ({
      ...asset,
      monthlyCost: asset.cycle === 'yearly' ? asset.price / 12 : asset.price,
    }))
    .sort((a, b) => b.monthlyCost - a.monthlyCost),
)
