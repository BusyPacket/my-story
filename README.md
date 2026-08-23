# my-story

个人生活记录网站，仅在家庭网络内访问，不对外开放公网。

## 功能板块

- 历史
  - 荣誉
  - 旅行
  - 人生节点
- 资产管理

## 数据存储约定

**个人内容不进 git**：代码、配置进 git；故事、资产、媒体等个人内容全部由 `.gitignore` 排除，需单独备份（见下方「备份」）。

- 进 git：代码、配置（组件、脚本、路由等）
- 不进 git：
  - `src/data/stories/` 个人故事（`.md` + `events.json`）
  - `src/data/asset/` 资产数据（`items.json` + `memberships.json`）
  - `public/media/` 照片、PDF、Word 等二进制资产

### 目录结构

```text
src/
└── data/
    ├── stories/
    │   ├── events.json   # 简单事件（一句话，无照片无附件）
    │   ├── index.ts      # 汇总入口：合并 events.json 与各 .md，统一解析日期范围等
    │   ├── trips/        # 旅行：详细事件用 .md
    │   ├── honors/       # 荣誉：详细事件用 .md（当前暂无故事）
    │   ├── milestones/   # 人生节点：详细事件用 .md
    │   └── annual/       # 年度总结：详细事件用 .md
    └── asset/
        ├── items.json       # 物品资产数据
        └── memberships.json # 订阅资产数据
public/
└── media/
    ├── photos/       # 照片（按故事分文件夹）
    ├── videos/       # 视频（时间线展示首帧封面，点击播放）
    └── docs/         # PDF / Word 附件
```

### 事件存储约定

按信息密度分两种存储方式，**字段模型完全一致**：

| 存储方式                                                 | 适用     | 说明                                                  |
| -------------------------------------------------------- | -------- | ----------------------------------------------------- |
| `events.json`                                            | 简单事件 | 一句话能说清、无照片无附件，数组里一行一条            |
| `.md` 文件（`trips/` `honors/` `milestones/` `annual/`） | 详细事件 | 有长篇所见所闻、照片、附件，头部用 frontmatter 存字段 |

所有事件统一字段：

| 字段         | 说明                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| `title`      | 标题                                                                    |
| `date`       | 日期（必填），时间点或时间段，用法见下方「`date` 字段用法」             |
| `type`       | `trip` / `honor` / `milestone` / `annual`                               |
| `visibility` | 可见范围：`private`（仅自己，默认）/ `family`（家庭）/ `public`（公开） |
| `location`   | 地点（可选）                                                            |
| `tags`       | 标签（可选）                                                            |
| `content`    | 正文 / 一句话描述（可选）                                               |
| `photos`     | 照片路径列表（可选）                                                    |
| `files`      | 附件路径列表（可选）                                                    |
| `videos`     | 视频路径列表（可选），时间线展示首帧封面，点击播放                      |
| `assets`     | 关联的资产 id 列表（可选），故事详情页展示对应资产卡片                  |

#### `date` 字段用法

`date` 是每个事件**必填**字段，既是时间线排序的依据，也决定事件是时间点还是时间段。

**时间点**：只写一个日期，支持三种粒度：

| 写法               | 含义                          |
| ------------------ | ----------------------------- |
| `date: 2015`       | 只到年份，如「2015 年上大学」 |
| `date: 2019-09`    | 到月份，如「2019 年 9 月」    |
| `date: 2026-08-01` | 到天，如「2026 年 8 月 1 日」 |

**时间段**：在 `date` 里用 `~` 连接开始与结束，程序自动识别：

```yaml
date: 2026-07-15 ~ 2026-08-01 # 7 月 15 日到 8 月 1 日
date: 2020-01 ~ 2020-03 # 2020 年第一季度
date: 2016 ~ 2019 # 2016 到 2019 年
```

- 分隔符支持 `~`、`～`（全角）、`..`
- 开始、结束两端都支持三种粒度，也可混用（如 `2020-01 ~ 2020-12-31`）
- 排序按**开始日期**；时间段在时间线显示为「开始 ~ 结束」

**划分规则**：有内容可写（感想、故事、照片、附件）→ `.md`；只是"发生了某件事"、一句话能说完 → 进 `events.json`。需要扩写时，随时把 JSON 条目迁移成 `.md` 文件，字段不变。

历史页面按 `date` 渲染成时间线，合并 `events.json` 与 `.md` 两种来源，支持按类型筛选，并按可见性切换：`private`（默认）显示全部，`family` 显示家庭与公开内容，`public` 只显示公开内容。

### 备份

- 代码、配置：由 git 管理
- 个人数据（`src/data/stories/`、`src/data/asset/`、`public/media/`）：**不进 git**，需用 `robocopy`（Windows 内置工具）单独镜像备份，否则换机 / 误删后无法恢复

**基础命令**（镜像全部个人数据目录，不含代码 / 依赖 / 构建产物）：

```powershell
robocopy /MIR C:\Users\19209\my_file\code\my-story\src\data D:\backup\my-story-data
robocopy /MIR C:\Users\19209\my_file\code\my-story\public\media D:\backup\my-story-media
```

**写入日志**：

```powershell
robocopy /MIR C:\Users\19209\my_file\code\my-story\src\data D:\backup\my-story-data /LOG:backup-data.log
robocopy /MIR C:\Users\19209\my_file\code\my-story\public\media D:\backup\my-story-media /LOG:backup-media.log
```

**常用参数**：

| 参数          | 作用                                                   |
| ------------- | ------------------------------------------------------ |
| `/MIR`        | 镜像模式，源中删除的文件在备份里也会删除，保持完全一致 |
| `/XD <目录>`  | 排除指定目录（多个用空格分隔）                         |
| `/LOG:<文件>` | 把执行结果写入日志文件                                 |
| `/R:3 /W:5`   | 复制失败重试 3 次、每次间隔 5 秒                       |

**自动化**：把上面的命令保存为 `backup.ps1`，用「任务计划程序」定时执行即可自动备份。

### 资产存储约定

资产数据按类型拆成两个文件，每个文件都是一个数组，每条一个资产：

- **`src/data/asset/items.json`**：物品（`type: "item"`），有实际价值的实物（电脑、自行车等），按日均费用排序展示
- **`src/data/asset/memberships.json`**：订阅（`type: "membership"`），周期性付费服务（iCloud、话费卡等），统一折算成月均费用

**物品字段**：

| 字段                       | 说明                                                                             |
| -------------------------- | -------------------------------------------------------------------------------- |
| `id`                       | 唯一标识                                                                         |
| `type`                     | `item`                                                                           |
| `name`                     | 名称                                                                             |
| `tag`                      | 分类标签（可选，如：电脑、硬盘、运动器械）                                       |
| `description`              | 描述（可选）                                                                     |
| `purchase_date`            | 购入日期                                                                         |
| `purchase_method`          | 购入方式（可选）：`taobao` / `jd` / `xianyu` / `other`，不填默认 `other`（其他） |
| `price`                    | 总价；有 `parts` 时自动按配件合计                                                |
| `parts`                    | 引用的子项目 id 列表（可选），子项目与父级同层级存放                             |
| `km`                       | 骑行公里数（可选），用于计算「每公里多少钱」                                     |
| `sold`                     | 转卖记录列表（可选），每条金额从总价中扣除                                       |
| `photo`                    | 展示图路径（可选），页面自动显示缩略图                                           |
| `status`                   | 当前状态（可选），取值见下方「状态取值」，不填默认持有中                         |     | `status_date` | 状态开始日期（可选），如已出二手 / 已丢弃 / 淘汰的日期，日均费用截止到该日 |
| **状态（`status`）取值**： |

| 值          | 展示文案 | 徽标颜色 |
| ----------- | -------- | -------- |
| `holding`   | 持有     | 绿       |
| `discarded` | 已丢弃   | 灰       |
| `sold`      | 已出二手 | 蓝       |
| `retired`   | 淘汰     | 橙       |

状态与 `type` / `cycle` 一样存英文值，中文文案在卡片组件内映射显示。

**购入方式（`purchase_method`）取值**：

| 值       | 展示文案         |
| -------- | ---------------- |
| `taobao` | 淘宝             |
| `jd`     | 京东             |
| `xianyu` | 闲鱼             |
| `other`  | 其他（不填默认） |

与状态一致存英文值，中文文案在卡片组件内映射显示。

**转卖记录（`sold`）每条**：

| 字段    | 说明         |
| ------- | ------------ |
| `name`  | 卖了什么     |
| `price` | 转卖所得金额 |
| `date`  | 转卖日期     |

**订阅字段**：

| 字段    | 说明                           |
| ------- | ------------------------------ |
| `id`    | 唯一标识                       |
| `type`  | `membership`                   |
| `name`  | 名称                           |
| `tag`   | 分类标签（可选）               |
| `notes` | 备注（可选）                   |
| `cycle` | 计费周期：`monthly` / `yearly` |
| `price` | 金额                           |

**示例**（一台带配件与转卖记录的笔记本）：

```json
{
  "id": "asus-tianxuan3",
  "type": "item",
  "name": "华硕天选3",
  "tag": "电脑",
  "purchase_date": "2022-11-19",
  "purchase_method": "jd",
  "parts": ["asus-tianxuan3-body", "samsung970evoplus-1t"],
  "sold": [{ "name": "原装 DDR5 4800 2×8GB", "price": 626, "date": "2025-12-24" }]
}
```

**故事关联资产**：在事件里写 `assets` 字段（id 列表），故事详情页会在正文下方自动展示对应的物品卡片，例如 `"assets": ["xiaofeng-rs3000"]`。

## Project command

```sh
pnpm install
pnpm dev
pnpm build
pnpm type-check
pnpm lint
```
