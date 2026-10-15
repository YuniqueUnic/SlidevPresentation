---
theme: unicorn
title: Photon 接口版本管理：从行业做法到我们的选择
info: Stripe、Polar 的做法，核心要求，三种方案与推荐（2026-10-14）
twoslash: true
themeConfig:
  brand: Photon
  mark: "''"
  product: API 版本管理
  sfx:
    volume: 0.6
    music: false
    musicVolume: 0.25
    track: contemplation
layout: cover
class: p-0
---

<div class="cover-wrap px-14">
<div class="kicker">Photon · API 版本管理 · 2026-10-14</div>

<h1 class="cover-title">内部快跑，<br/>外部锁定。</h1>

<div class="cover-sub">从 <b>Stripe</b>、<b>Polar</b> 的做法讲起<br/>到 Photon 的三种方案</div>

<div class="flex gap-3 mt-9">
<span class="pill solid"><ph-play-fill /> 所有代码都实际跑过</span>
<span class="pill"><ph-cpu /> xidlc 0.100.0</span>
<span class="pill"><ph-package /> cadwyn 7.4.0</span>
</div>

<SpectrumPanels />
</div>

---

# 这次讲什么

<div class="agenda2">
<div class="ag"><div class="no">01</div><div class="bd"><div class="t"><ph-buildings /> 行业怎么做</div><div class="d">Stripe 和 Polar 各自怎么管理接口版本：客户怎么用、内部怎么实现</div><div class="see">会看到：一个 Stripe 事件怎样一步步退回旧格式；Polar 怎样给字段标“有效期”</div></div></div>
<div class="ag"><div class="no">02</div><div class="bd"><div class="t"><ph-list-checks /> 核心要求</div><div class="d">从两家做法里抽出 7 条共同要求，再归结成三个基本事实</div><div class="see">会看到：版本管理其实只需要“升级、降级”两个函数</div></div></div>
<div class="ag"><div class="no">03</div><div class="bd"><div class="t"><ph-git-fork /> Photon 的三种方案</div><div class="d">自己手写转换、Cadwyn、xidl，每种都讲：怎么运作、代码、优缺点、好不好维护</div><div class="see">会看到：同一个接口改动，在三种方案里分别要写什么</div></div></div>
<div class="ag"><div class="no">04</div><div class="bd"><div class="t"><ph-signpost /> 怎么选</div><div class="d">能力对比、版本多了以后的成本，最后是推荐路线和退路</div><div class="see">会看到：先做什么、在哪里检查、不行时怎么退</div></div></div>
</div>

<div class="analogy mt-5"><ph-lightbulb-filament /><div><b>一句话结论</b><p>以 xidl 为目标分步推进：先做三种方案都需要的公共部分，再用 xidl 接一个接口试点；试点不过关，就退回自己手写转换，前面的工作不浪费。</p></div></div>

---

# 先认识几个词

<div class="grid grid-cols-3 gap-3.5 mt-1 terms2">
<div class="term"><div class="t"><ph-plug /> 接口（API）</div><div class="d">客户的程序调用我们服务的入口。</div><div class="eg">例：<code>POST /v1/messages</code> 发一条消息</div></div>
<div class="term"><div class="t"><ph-git-branch /> 接口版本</div><div class="d">接口在某个时间点的样子。客户选定后，收到的格式就不再变。</div><div class="eg">例：<code>2026-07</code>、<code>2026-10</code></div></div>
<div class="term"><div class="t"><ph-crown-simple /> 最新版（HEAD）</div><div class="d">代码里唯一维护的那个版本，业务逻辑只认识它。</div><div class="eg">例：开发新功能时直接改的就是它</div></div>
<div class="term"><div class="t"><ph-arrow-fat-up /> 升级转换</div><div class="d">把旧版客户发来的请求，转成最新版的格式（upcast）。</div><div class="eg">例：<code>recipient</code> → <code>to</code></div></div>
<div class="term"><div class="t"><ph-arrow-fat-down /> 降级转换</div><div class="d">把最新版的结果，转回客户所用旧版的格式（downcast）。</div><div class="eg">例：<code>sender</code> 对象 → 电话号码字符串</div></div>
<div class="term"><div class="t"><ph-paper-plane-tilt /> Webhook</div><div class="d">发生事件时，我们主动发给客户服务器的消息，失败会重试。</div><div class="eg">例：收到新消息时推送给客户</div></div>
<div class="term"><div class="t"><ph-package /> SDK</div><div class="d">开发工具包：我们发布的各语言代码库，客户用它调接口。</div><div class="eg">例：TypeScript、Python、Rust、Go 四种</div></div>
<div class="term"><div class="t"><ph-file-doc /> OpenAPI</div><div class="d">描述接口的标准文档格式，SDK 和接口文档都从它生成。</div><div class="eg">例：一个 <code>openapi.json</code> 文件</div></div>
<div class="term"><div class="t"><ph-file-code /> IDL</div><div class="d">接口定义语言：用专门的写法描述接口，再由工具生成代码。</div><div class="eg">例：xidl 的 <code>.idl</code> 文件</div></div>
</div>

---
layout: section
---

<div class="section-wrap">
<div class="section-no">01 / 04</div>
<h1 class="section-title">行业怎么做</h1>
<div class="section-bar" style="background:var(--ph-spectrum)"></div>
<p class="muted mt-5">只挑两家：Stripe 最早把这件事做成体系，Polar 是近两年的新做法</p>
</div>

---

# Stripe（一）：客户怎么用版本

<div class="grid grid-cols-2 gap-4">
<div class="fact"><div class="k">版本号长什么样</div><div class="v">日期 + 名字，例如 <code>2026-09-30.endive</code></div></div>
<div class="fact"><div class="k">怎么选版本</div><div class="v">请求头 <code>Stripe-Version</code>；不写就用账户的默认版本</div></div>
<div class="fact"><div class="k">默认版本从哪来</div><div class="v"><b>账户第一次调用接口时自动定下</b>，之后在控制台手动升级</div></div>
<div class="fact"><div class="k">发布节奏</div><div class="v">每月发一次，<b>不含破坏性改动</b>；每年两次大版本，才允许破坏性改动（从 2024-09-30.acacia 开始）</div></div>
<div class="fact"><div class="k">Webhook</div><div class="v">每个推送地址<b>自己带一个版本</b>，推送内容按这个版本生成；升级要新建一个推送地址切过去</div></div>
<div class="fact"><div class="k">SDK</div><div class="v">每个 SDK 版本固定使用它发布时的接口版本</div></div>
</div>

<div class="analogy mt-5"><ph-lightbulb-filament /><div><b>要点</b><p>客户不用懂 Stripe 内部怎么改：它第一次接入时的版本被“记住”，以后一直按这个格式收发数据，直到它自己决定升级。</p></div></div>

<div class="src mt-3">来源：docs.stripe.com/api/versioning、docs.stripe.com/sdks/set-version、docs.stripe.com/webhooks/versioning（2026-10-14 查看）</div>

---
clicks: 3
---

# Stripe（二）：内部怎么实现——跟着一个事件走一遍

<WalkBack :versions="[{ name: '当前结构', note: '业务代码只产出它' }, { name: '2017-04-06 的样子' }, { name: '2017-02-14 的样子', note: '客户锁定的版本' }]" :changes="['套用 2017-05-25 的改动', '套用 2017-04-06 的改动']" />

<div class="grid grid-cols-[1fr_1fr] gap-5 mt-4 mid-code">
<div class="flex flex-col gap-3">

````md magic-move {at:1, lines: false}
```json
// 业务代码产出的事件：只有当前结构
{
  "id": "evt_1",
  "type": "charge.succeeded",
  "request": {
    "id": "req_1",
    "idempotency_key": "key_1"
  }
}
```
```json
// 套用 CollapseEventRequest 之后
{
  "id": "evt_1",
  "type": "charge.succeeded",
  "request": "req_1"
}
```
```json
// 套用 LegacyTransfers：它只标了 has_side_effects，数据不变
{
  "id": "evt_1",
  "type": "charge.succeeded",
  "request": "req_1"
}
```
```json
// 到达客户锁定的 2017-02-14，发出去
{
  "id": "evt_1",
  "type": "charge.succeeded",
  "request": "req_1"
}
```
````

</div>
<div class="flex flex-col gap-3">

````md magic-move {at:1, lines: false}
```ruby
# 一张总表：哪个日期发生了哪些改动
VERSIONS = {
  '2017-05-25' => [Change::AccountTypes,
                   Change::CollapseEventRequest],
  '2017-04-06' => [Change::LegacyTransfers],
}
```
```ruby
# 2017-05-25 的改动模块：把对象折回字符串
class CollapseEventRequest < AbstractVersionChange
  description "Event objects (and webhooks) will now ..."
  response EventAPIResource do
    change :request, type_old: String, type_new: Hash
    run do |data|
      data.merge(:request => data[:request][:id])
    end
  end
end
```
```ruby
# 2017-04-06 的改动模块：改的是业务行为，不是格式
class LegacyTransfers < AbstractVersionChange
  has_side_effects
end

# 业务代码里判断它对当前客户是否生效
if VersionChanges.active?(LegacyTransfers)
  # 按旧行为处理
end
```
```ruby
# 小结：新功能只改“当前结构”
# 每加一个破坏性改动 = 写一个模块 + 在总表里登记一行
# 旧版本永远是“当前结构 + 倒着套用模块”算出来的
```
````

<Caption :steps="[
  { title: '从当前结构出发', tag: '第 0 步', body: '客户锁定的是 2017-02-14。业务代码不管这些，只产出<b>当前结构</b>的事件：<code>request</code> 是一个对象。右边是登记所有改动的总表。' },
  { title: '套用 2017-05-25 的改动', tag: '第 1 步', body: '客户的版本早于 2017-05-25，所以要撤回这一天的改动。<code>CollapseEventRequest</code> 把 <code>request</code> 对象折回成旧版的字符串 id。' },
  { title: '套用 2017-04-06 的改动', tag: '第 2 步', body: '这一天的改动改的是<b>业务行为</b>，不是数据格式，所以模块本身不转换数据，而是在业务代码里用 <code>active?</code> 判断要不要走旧逻辑。' },
  { title: '到达客户的版本', tag: '完成', body: '再往前没有比 2017-02-14 更新的改动了，转换结束，按这个格式发给客户。每个模块只关心“它那一天”的变化，不用知道后面还会发生什么。' },
]" />

</div>
</div>

<div class="src mt-2">来源：Stripe 工程博客《APIs as infrastructure: future-proofing Stripe with versioning》，代码为博客原文节选</div>

<Sfx name="success" :at="3" />

---
clicks: 1
---

# Polar（一）：客户怎么用版本

<Rotation />

<div class="grid grid-cols-3 gap-3 mt-4">
<div class="fact"><div class="k">版本号</div><div class="v"><code>YYYY-MM</code>，每年 1、4、7、10 月第一周各发一个；<b>每个版本约支持 9 个月</b></div></div>
<div class="fact"><div class="k">怎么选版本</div><div class="v">请求头 <code>Polar-Version</code>；不写就用 Current；<b>响应头会写明实际用的版本</b>；版本不存在或已删除返回 404</div></div>
<div class="fact"><div class="k">冻结规则</div><div class="v">Current 和 Deprecated <b>完全冻结</b>，连“加一个可选字段”都只能进 Next</div></div>
<div class="fact"><div class="k">Webhook</div><div class="v">推送地址自己带版本；改了版本只影响之后的事件，<b>重发的旧事件保持原来的格式</b></div></div>
<div class="fact"><div class="k">SDK</div><div class="v">按版本导入：<code>@polar-sh/sdk/2026-10</code>，导入哪版就自动发哪版的请求头</div></div>
<div class="fact"><div class="k">自家产品</div><div class="v">Polar 自己的控制台和手机 App 一直用 Next，最先吃到新功能</div></div>
</div>

<div class="src mt-3">来源：polar.sh/docs/api-reference/2026-10/versioning（2026-10-14 查看）</div>

---
clicks: 4
---

# Polar（二）：内部怎么实现——给字段和接口标“有效期”

<div class="grid grid-cols-[1.15fr_1fr] gap-5">
<div class="flex flex-col gap-3">

<RangeTable :versions="['2026-04', '2026-07', '2026-10', '2027-01']" :remove-at="4" :rows="[
  { name: 'email', kind: 'field' },
  { name: 'new_field', kind: 'field', from: '2026-10' },
  { name: 'old_field', kind: 'field', to: '2026-04' },
  { name: 'GET /old', kind: 'route', to: '2026-04' },
  { name: 'PATCH update', kind: 'route', to: '2026-07', note: '旧实现' },
  { name: 'PATCH update_v2026_10', kind: 'route', from: '2026-10', note: '新实现' },
]" />

<Caption :steps="[
  { title: '客户用 2026-04', tag: '选中一个版本', body: '只有覆盖 2026-04 的字段和接口才存在：<code>old_field</code> 和 <code>GET /old</code> 还在，<code>new_field</code> 还没出现。这一版的接口文档就按这一列生成。' },
  { title: '客户用 2026-07', tag: '选中一个版本', body: '右边代码给 <code>GET /old</code> 标了“只到 2026-04 为止”，所以从 2026-07 开始，这个接口和 <code>old_field</code> 一样<b>不再出现</b>。更新接口仍用旧实现。' },
  { title: '客户用 2026-10', tag: '选中一个版本', body: '<code>new_field</code> 从这一版开始出现。请求格式变了的更新接口，换成<b>新版本专用的实现</b>。' },
  { title: '客户用 2027-01（Next）', tag: '选中一个版本', body: '标记写的是具体版本，不是“当前版本”这种会变的叫法，所以版本轮换时<b>标记不用改</b>。' },
  { title: '2026-04 到期删除', tag: '清理', body: '删掉一个版本时，按标记找到“有效期到 2026-04 为止”的字段和接口，<b>直接删代码</b>。只剩一个实现的接口，去掉标记即可。' },
]" />

</div>
<div>

````md magic-move {lines: false}
```python
# 字段标有效期：
#   new_field 从 2026-10 开始，old_field 到 2026-04 为止
#   → 对应左表 2026-04 这一列：有 old_field，没有 new_field
class Customer(Schema):
    email: str
    new_field: Annotated[
        str, Version(starting_from=V2026_10)]
    old_field: Annotated[
        str, Version(up_to=V2026_04)]
```
```python
# 接口也能标有效期：GET /old 只到 2026-04 为止
@router.get("/old")
@version(up_to=V2026_04)
async def old(): ...

# → 所以左表 2026-07 这一列里，GET /old 已经没有了
#   old_field 也一样，它也只到 2026-04 为止
```
```python
# 请求格式变了：多写一份新版本专用的实现
# 2026-10 起走 update_v2026_10，更早的版本仍走 update
@router.patch("/{id}")
async def update(id: UUID, body: CustomerUpdateLegacy): ...

@router.patch("/{id}", name="update")
@version(starting_from=V2026_10)
async def update_v2026_10(id: UUID, body: CustomerUpdate): ...
```
```python
# 版本常量：标记只引用具体版本
V2026_04 = APIVersion(year=2026, month=4)
V2026_10 = APIVersion(year=2026, month=10)
V2027_01 = APIVersion(year=2027, month=1)

CURRENT_API_VERSION = V2026_10   # 会变的叫法
NEXT_API_VERSION = V2027_01      # 不能用在标记里
```
```python
# 删除 2026-04 后
class Customer(Schema):
    email: str
    new_field: Annotated[
        str, Version(starting_from=V2026_10)]
    # old_field 已删除

# GET /old 已删除
```
````

<Mark t="warn">多写一份实现能接受，是因为同时只有 3 个版本、最多 9 个月就删</Mark>
<Mark t="ok">已发布版本的格式用测试锁住，改了就失败</Mark>

</div>
</div>

<div class="src mt-2">来源：Polar 开源仓库 handbook/engineering/backend-development/api-versioning.mdx，代码为原文节选</div>

<Sfx name="notify" :at="4" />

---

# 两家对比：同一件事，两种取舍

<div class="matrix">

| 比较项 | Stripe | Polar |
| --- | --- | --- |
| 版本号 | 日期 + 名字，如 `2026-09-30.endive` | `YYYY-MM`，如 `2026-10` |
| 发布节奏 | 每月一次（不破坏）+ 每年两次大版本 | 每季度一次 |
| 支持多久 | 很长，老版本一直能用 | 约 9 个月，到期删除 |
| 不写版本号时 | 账户第一次调用时定下的版本 | 当前的 Current |
| 旧版本怎么得到 | **一份实现**，用改动模块倒推回旧格式 | 字段和接口**标版本范围**；请求格式变了就多写一份实现 |
| 业务行为变化 | 标 `has_side_effects`，业务代码里判断 | 写新版本专用的实现 |
| Webhook | 推送地址带版本 | 推送地址带版本；重发保持原格式 |
| 冻结怎么保证 | 每月版本约定不含破坏性改动 | 测试锁住接口格式 |

</div>

<div class="analogy mt-4"><ph-scales /><div><b>取舍</b><p>Stripe 要长期支持很多版本，所以只能有一份实现，靠转换倒推；Polar 只保留 3 个版本，所以允许短期多写一份实现，换来简单。</p></div></div>

---
layout: section
---

<div class="section-wrap">
<div class="section-no">02 / 04</div>
<h1 class="section-title">抽出核心要求</h1>
<div class="section-bar" style="background:var(--ph-spectrum)"></div>
<p class="muted mt-5">不管哪家，都绕不开下面这几条</p>
</div>

---
clicks: 6
---

# 两家都做到的 7 条，每条看一个例子

<div class="grid grid-cols-[17rem_1fr] gap-6">
<div>

<Pipeline :steps="['客户能锁定一个版本', '不写版本号，结果也确定', '长期存在的东西绑定具体版本', '旧版本从一份源头推出来', '已发布版本不能被悄悄改', '改变业务行为的改动单独处理', '版本有明确的生命周期']" />

</div>
<div class="flex flex-col gap-3 mid-code">

````md magic-move {lines: false}
```http
POST /v1/messages
Photon-Version: 2026-07          ← 客户在请求头写明版本

# SDK 也按版本发布（Polar）
import { createPolar } from "@polar-sh/sdk/2026-10"
```
```http
# 没写版本号的请求，响应里告诉客户实际用了哪个（Polar）
HTTP/1.1 200 OK
Polar-Version: 2026-10

# Stripe：账户第一次调用时，就把当时的版本记成默认值
```
```json
// 创建 Webhook 推送地址时写死版本（Stripe、Polar 都这样）
{
  "url": "https://example.com/webhooks",
  "events": ["order.created"],
  "api_version": "2026-10"
}
```
```python
# Stripe：改动模块倒推          # Polar：版本范围标记
VERSIONS = {                    new_field: Annotated[
  '2017-05-25': [...],            str, Version(starting_from=V2026_10)]
}
```
```text
# Polar：用测试锁住已发布版本的格式
$ pytest tests/schema_lock
FAILED  2026-10 的 Customer 多了字段 new_field
        → 这个改动只能进 Next
```
```ruby
# Stripe：格式转换解决不了的改动，单独标出来
class LegacyTransfers < AbstractVersionChange
  has_side_effects
end
if VersionChanges.active?(LegacyTransfers) then ... end
```
```http
# Polar：每季度发布，约 9 个月后删除；删除后请求它
GET /v1/products/
Polar-Version: 2025-10

HTTP/1.1 404 Not Found
```
````

<Caption :steps="[
  { title: '客户能锁定一个版本', tag: 'Stripe · Polar', body: '请求头写明版本；SDK 也按版本发布。锁定之后，客户收到的格式就由它自己决定什么时候变。' },
  { title: '不写版本号，结果也确定', tag: 'Stripe · Polar', body: '不能让“不写”变成“跟着我们变”。Stripe 记住第一次的版本；Polar 用 Current，并在响应头写明实际用的版本。' },
  { title: '长期存在的东西绑定具体版本', tag: 'Stripe · Polar', body: 'Webhook 推送地址这种会存在很久的东西，创建时就写死版本。Polar 还保证：重发旧事件时，格式和第一次一样。' },
  { title: '旧版本从一份源头推出来', tag: 'Stripe · Polar', body: '没人手写每个旧版本。Stripe 从当前结构倒推；Polar 按标记裁剪。两种办法都只有一份源头。' },
  { title: '已发布版本不能被悄悄改', tag: 'Stripe · Polar', body: '靠约定不够，要有自动检查。Polar 的测试会在有人改动已发布版本的格式时直接失败。' },
  { title: '改变业务行为的改动单独处理', tag: 'Stripe · Polar', body: '比如扣费方式、权限变了，换个数据格式解决不了，要在业务代码里按版本走不同逻辑，而且越少越好。' },
  { title: '版本有明确的生命周期', tag: 'Stripe · Polar', body: '什么时候发、支持多久、什么时候删、删了返回什么，都写清楚。客户能提前安排升级。' },
]" />

<Caption :steps="[
  { title: 'Photon：请求头 Photon-Version', tag: '放到 Photon', body: '对应 Linear 任务“请求头与错误”：<code>Photon-Version</code> 为主，旧的 <code>x-photon-version</code> 也接受，两者冲突就报错。SDK 默认带上自己发布时的版本。' },
  { title: 'Photon：项目默认版本', tag: '放到 Photon', body: '对应“项目默认版本”任务：项目创建时记下<b>具体版本</b>，不存“当前版本”这种会变的叫法。响应里写明实际用的版本。' },
  { title: 'Photon：Webhook 绑定版本', tag: '放到 Photon', body: '对应“Webhook 绑定与正文先存”任务：推送地址创建时写死版本；第一次生成的正文存下来，重试原样再发。' },
  { title: 'Photon：一份源头', tag: '放到 Photon', body: '这正是后面三种方案要回答的问题：格式说明和两个转换，从哪一份源头来。' },
  { title: 'Photon：冻结检查', tag: '放到 Photon', body: '对应“发布机制”任务：已发布版本的格式和接口文档存档比对，被改了就让 CI 失败。' },
  { title: 'Photon：行为开关', tag: '放到 Photon', body: '只在真有需要时用，比如新版默认改走 WhatsApp、旧版客户仍走短信。没有这种改动就不加。' },
  { title: 'Photon：生命周期', tag: '放到 Photon', body: '当前设计是 <code>preview</code> / <code>current</code> / <code>maintain</code> 三档，和 Polar 的 Next / Current / Deprecated 一一对应；支持多久还要定。' },
]" />

</div>
</div>

---
clicks: 4
---

# 再往下想一层：版本管理到底在做什么

<Boundary />

<div class="mt-4 h-40">
<div v-if="$clicks < 4" class="relative h-full">
<Tip :at="0" arrow="none" title="怎么看这一页">点击三次，依次点亮内部、外部、边界。三块拼起来，就是版本管理的全部。</Tip>
<Tip :at="1" arrow="none" title="事实一：内部只有一份最新的" tone="info">业务代码、数据结构、内部消息只有一套。开发新功能就是直接改它，不为旧版本留分支。</Tip>
<Tip :at="2" arrow="none" title="事实二：外部锁定的永远不变" tone="ok">客户（包括我们自己的控制台、命令行工具）锁定 2026-07 后，发出的请求和收到的结果、推送，永远是 2026-07 的格式。</Tip>
<Tip :at="3" arrow="none" title="事实三：中间只需要两个转换" tone="warn">里面只有最新版、外面锁在 2026-07，那么边界上只需要两个函数：进来时升级，出去时降级。它们只翻译格式，不做业务。</Tip>
</div>
<div v-else class="fx">
<div class="fx-h"><span>写成公式</span><span>用大白话读</span><span>本例里</span></div>

<div class="fx-r"><div>

$\text{请求}_{\text{最新}} = \text{升级}_{V\to\text{最新}}(\text{请求}_V)$

</div><div>客户按 V 版格式发来的请求，交给“从 V 升到最新”的函数，得到最新格式，再交给业务代码</div><div><code>recipient</code> → <code>to: {handle, protocol}</code></div></div>

<div class="fx-r"><div>

$\text{结果}_V = \text{降级}_{\text{最新}\to V}(\text{结果}_{\text{最新}})$

</div><div>业务代码算出的最新格式结果，交给“从最新降到 V”的函数，变回 V 版格式再返回</div><div><code>sender</code> 对象 → 电话号码字符串</div></div>

<div class="fx-r"><div>

$\text{推送}_V = \text{降级}_{\text{最新}\to V}(\text{事件}_{\text{最新}})$

</div><div>内部产生的最新格式事件，同样降到 V 版，再通过 Webhook 推给客户</div><div>收到新消息的推送，用 2026-07 的格式</div></div>

<div class="fx-n">下标表示“哪个版本的格式”：<b>请求<sub>V</sub></b> 就是“V 版格式的请求”；<b>升级<sub>V→最新</sub></b> 是一个函数，把 V 版格式转成最新版格式。后面三种方案的区别，就是<b>这两个函数由谁来写</b>。</div>
</div>
</div>

---
clicks: 3
---

# 用最少的东西做到：要什么，不要什么

<div class="mini mt-1">
<div class="lane">
<div class="ln-h"><ph-arrow-right /> 一次请求经过的组件</div>
<div class="row">
<div class="blk" v-click="1"><ph-identification-badge /><b>确定版本</b><span>请求头 / SDK / 项目默认 → 2026-07</span></div>
<div class="arr" v-click="1" />
<div class="blk" v-click="1"><ph-check-square /><b>按 2026-07 检查</b><span>用这一版的格式说明</span></div>
<div class="arr" v-click="1" />
<div class="blk hot" v-click="1"><ph-arrow-fat-up /><b>升级</b></div>
<div class="arr" v-click="1" />
<div class="blk core" v-click="1"><ph-crown-simple /><b>最新版业务</b><span>幂等 · 行为开关</span></div>
<div class="arr" v-click="1" />
<div class="blk hot" v-click="1"><ph-arrow-fat-down /><b>降级</b></div>
<div class="arr" v-click="1" />
<div class="blk" v-click="1"><ph-check-square /><b>按 2026-07 检查</b><span>再返回</span></div>
</div>
<div class="row sub">
<div class="blk side" v-click="2"><ph-files /><b>每个版本的格式说明</b><span>检查、生成文档和 SDK 都用它</span></div>
<div class="blk side" v-click="2"><ph-lock /><b>冻结检查</b><span>已发布版本的格式被改了就失败</span></div>
<div class="blk side" v-click="2"><ph-archive-box /><b>推送正文先存下来</b><span>重试原样再发</span></div>
</div>
</div>
<div class="lane no" v-click="3">
<div class="ln-h"><ph-prohibit /> 不需要</div>
<div class="ghosts">
<div class="ghost">每个版本一套业务代码</div>
<div class="ghost">单独部署的“转换服务”</div>
<div class="ghost">消息内容里再造一套版本号</div>
<div class="ghost">让内部服务跟着对外版本号走</div>
<div class="ghost">一上来就支持很多历史版本</div>
</div>
</div>
</div>

<div class="punch mt-4 !text-base">接下来的三种方案，区别只在：<b>每个版本的格式说明从哪来、橙色的两个转换由谁来写</b></div>

---

# 放到 Photon 上：一个旧版客户的请求怎么走

<div class="grid grid-cols-2 gap-6">
<div>

<span class="ver old"><ph-clock-counter-clockwise /> 旧版 2026-07</span>

```json
// 发消息
{ "recipient": "+15551234567",
  "text": "Hello" }

// 消息内容
{ "id": "msg_1",
  "sender": "+15551234567",
  "text": "Hello" }
```

</div>
<div>

<span class="ver new"><ph-sparkle /> 新版 2026-10（最新）</span>

```json
// 发消息
{ "to": { "handle": "+15551234567",
          "protocol": "sms" },
  "text": "Hello" }

// 消息内容
{ "id": "msg_1",
  "sender": { "handle": "+15551234567",
              "protocol": "sms" },
  "text": "Hello", "thread_id": "thr_1" }
```

</div>
</div>

<div v-click class="mt-3">
<Mark t="info">这是后面一直用的例子：<code>sender</code> 从电话号码字符串变成带渠道的对象；发消息时 <code>recipient</code> 改名为 <code>to</code></Mark>
<Mark t="add">另外新增：WhatsApp 渠道、按会话查消息的接口、一个新错误“会话已关闭”</Mark>
<Mark t="warn">难点：WhatsApp 发来的消息没有电话号码，旧版格式<b>表达不了</b>，只能明确报错，不能编一个号码</Mark>
</div>

<div class="foot">示例只为说明问题，不是 Photon 已发布的接口</div>

<Sfx name="warning" :at="1" />

---
clicks: 6
---

# 走一遍：一个旧版客户发来的请求

<div class="grid grid-cols-[16rem_1fr] gap-7 mt-1">
<div>

<Pipeline :steps="['旧版客户发请求', '按旧版格式检查', '升级成最新格式', '最新版业务逻辑', '降级回旧版格式', 'Webhook：只生成一次正文', '重试：发同一份字节']" />

</div>
<div class="flex flex-col gap-3">

````md magic-move {lines: false}
```jsonc
// 发消息        Photon-Version: 2026-07
{
  "recipient": "+15551234567",
  "text": "Hello"
}
```
```jsonc
// 按客户选的 2026-07 格式检查
{
  "recipient": "+15551234567",
  "text": "Hello"
}
```
```jsonc
// 升级：recipient → to
{
  "to": { "handle": "+15551234567", "protocol": "sms" },
  "text": "Hello"
}
```
```jsonc
// 业务代码只认识最新版
{
  "id": "msg_1",
  "sender": { "handle": "+15551234567", "protocol": "sms" },
  "text": "Hello",
  "thread_id": "thr_1"
}
```
```jsonc
// 降级：变回 2026-07 的样子
{
  "id": "msg_1",
  "sender": "+15551234567",
  "text": "Hello"
}
```
```jsonc
// 推送记录：正文字节 + 指纹
{
  "deliveryId": "whdel_1",
  "contractVersion": "2026-07",
  "body": "{\"id\":\"msg_1\",\"sender\":\"+15551234567\",…}",
  "bodySha256": "99205a07…"
}
```
```jsonc
// 第 3 次重试
{
  "deliveryId": "whdel_1",
  "attempt": 3,
  "body": "{\"id\":\"msg_1\",\"sender\":\"+15551234567\",…}",
  "bodySha256": "99205a07…"   // 没变
}
```
````

<Caption :steps="[
  { title: '旧版客户发请求', tag: '确定版本', body: '请求头写了 <code>Photon-Version: 2026-07</code>。没写的话，依次看 SDK 设定、项目默认版本、当前版本，最后确定<b>一个具体版本</b>，之后全程只用它。' },
  { title: '按旧版格式检查', tag: '检查', body: '先按<b>客户选的版本</b>检查，报错信息里用的是旧版字段名。拿新版的 <code>to</code> 字段冒充 2026-07 调用，这一步直接拒绝。' },
  { title: '升级成最新格式', tag: '升级转换', body: '旧版只支持电话号码，所以渠道一定是 <code>sms</code>，这是推出来的，不是猜的。转完后再按最新版检查一次，防止转换本身写错。' },
  { title: '最新版业务逻辑', tag: '业务', body: '业务代码只认识最新版，里面没有“如果是旧版就……”。同一个意图不管用哪个版本发来，都只执行一次（幂等：像同一个订单号付两次钱只扣一次）。' },
  { title: '降级回旧版格式', tag: '降级转换', body: '结果往回转：<code>sender</code> 变回字符串，旧版没有的 <code>thread_id</code> 去掉。转完再按旧版检查，客户收到的一定是旧版承诺的样子。' },
  { title: 'Webhook：只生成一次正文', tag: '先存下来', body: '像寄快递：<b>第一次就打包封箱</b>。按推送地址绑定的版本转换一次、生成一次正文，把字节和指纹（sha256）存进推送记录。' },
  { title: '重试：发同一份字节', tag: '不会变', body: '重试和人工重发，直接寄那个封好的箱子，<b>不再重新转换</b>。中间上线了新代码，正文也不会变；只有签名时间和第几次发送会变。' },
]" />

</div>
</div>

---
clicks: 3
---

# 这部分不管选哪种方案，都要 Photon 自己做

<div class="hub-wrap">
<div class="hub-side">
<div class="hub-h" v-click="1"><ph-arrows-down-up /> 接口调用</div>
<div class="rtb" v-click="1"><ph-identification-badge /><div><b>确定版本</b><span>请求头 / SDK / 项目默认 → 一个具体版本</span></div><em>请求头任务</em></div>
<div class="rtb" v-click="1"><ph-folder-user /><div><b>项目默认版本</b><span>创建项目时记下具体版本，不存“当前版本”</span></div><em>项目默认版本任务</em></div>
<div class="rtb" v-click="1"><ph-repeat-once /><div><b>跨版本幂等</b><span>同一个意图，不管哪个版本发来，只执行一次</span></div><em>幂等任务</em></div>
<div class="rtb" v-click="1"><ph-toggle-right /><div><b>行为开关</b><span>极少数改变业务行为的改动，按版本走不同逻辑</span></div><em>按需</em></div>
</div>

<div class="hub" v-click="3">
<div class="hub-ring" />
<div class="hub-core">
<div class="hub-k">中间这一块</div>
<div class="hub-t">升级 · 降级 · 格式说明</div>
<div class="hub-cycle"><span>方案一 自己手写</span><span>方案二 Cadwyn</span><span>方案三 xidl</span></div>
<div class="hub-k">三种方案只换这里</div>
</div>
</div>

<div class="hub-side">
<div class="hub-h" v-click="2"><ph-paper-plane-tilt /> 主动推送</div>
<div class="rtb" v-click="2"><ph-link /><div><b>推送地址绑定版本</b><span>创建 Webhook 推送地址时写死版本</span></div><em>Webhook 任务</em></div>
<div class="rtb" v-click="2"><ph-archive-box /><div><b>正文先存下来</b><span>第一次生成就存字节和指纹，重试原样再发</span></div><em>Webhook 任务</em></div>
<div class="rtb" v-click="2"><ph-plugs-connected /><div><b>长连接按原版本补发</b><span>断线重连时，用订阅时的版本补发</span></div><em>长连接任务</em></div>
<div class="rtb" v-click="2"><ph-calendar-check /><div><b>版本目录与生命周期</b><span>preview / current / maintain 三档</span></div><em>版本目录任务</em></div>
</div>
</div>

<div class="note mt-4"><ph-info /><span>Stripe、Polar 都是自己做这些；Cadwyn 和 xidl 也都不管。它们和选哪种方案无关，Linear 上已经拆好任务，<b>现在就能开工</b>。</span></div>

---
layout: section
---

<div class="section-wrap">
<div class="section-no">03 / 04</div>
<h1 class="section-title">Photon 的三种方案</h1>
<div class="section-bar" style="background:var(--ph-spectrum)"></div>
<p class="muted mt-5">区别在于：每个版本的格式说明从哪来、两个转换由谁来写</p>
</div>

---

# 三种方案，分别像谁

<div class="grid grid-cols-3 gap-5 mt-2">
<div class="card c1">
<span class="pill c1">方案一</span>

### 自己手写转换

<p class="text-sm muted">每个版本的格式、两个转换，全部自己写</p>
<p class="text-sm mt-3"><ph-arrow-bend-down-right class="inline" /> 思路来自 <b>Stripe</b>，但没有它的工具</p>
</div>
<div class="card c2">
<span class="pill c2">方案二</span>

### Cadwyn

<p class="text-sm muted">开源 Python 框架：只写“改了什么”，旧版格式自动推出</p>
<p class="text-sm mt-3"><ph-arrow-bend-down-right class="inline" /> 等于 <b>Stripe</b> 做法的 Python 开源版</p>
</div>
<div class="card c3 hero">
<span class="pill c3">方案三 · 推荐</span>

### xidl

<p class="text-sm muted">在接口定义里标版本范围，编译器生成所有版本的代码和文档</p>
<p class="text-sm mt-3"><ph-arrow-bend-down-right class="inline" /> <b>Polar</b> 的版本范围标记 + <b>Stripe</b> 的单一实现</p>
</div>
</div>

<div class="grid grid-cols-3 gap-4 mt-6 text-sm">
<div class="q"><ph-scales /> 每个版本的格式说明从哪来</div>
<div class="q"><ph-arrows-left-right /> 两个转换由谁来写</div>
<div class="q"><ph-bug-beetle /> 写错了什么时候发现</div>
</div>

---
layout: section
---

<div class="section-wrap">
<div class="section-no">03 / 04 · 方案一</div>
<h1 class="section-title">自己手写转换</h1>
<div class="section-bar" style="background:var(--c1)"></div>
<p class="muted mt-5">不引入任何工具，转换代码和每个版本的格式都自己写</p>
</div>

---
clicks: 3
---

# 方案一：怎么运作

<div class="flex flex-col gap-3 big-code">

````md magic-move {lines: false}
```ts
// 1. 约定一个转换器接口
interface VersionAdapter<Old, Head> {
  upcastRequest?(input: Old, ctx: AdapterContext): Head;
  downcastResponse?(input: Head, ctx: AdapterContext): Old;
  downcastEvent?(input: Head, ctx: AdapterContext): Old;
}
```
```ts
// 2. 每个版本的数据格式都手写一遍
interface SendV0707 { recipient: string; text: string }
interface MessageV0707 { id: string; sender: string; text: string }

interface SendHead { to: { handle: string; protocol: Protocol }; text: string }
interface MessageHead {
  id: string; sender: { handle: string; protocol: Protocol };
  text: string; thread_id?: string;
}
```
```ts
// 3. 写转换函数：旧版表达不了时，明确报错
const message_1010_to_0707: VersionAdapter<MessageV0707, MessageHead> = {
  downcastResponse: (head) => {
    if (head.sender.protocol === "whatsapp") {
      throw new UnsupportedDowncast("structured-sender",
        "2026-07 cannot represent a WhatsApp sender");
    }
    return { id: head.id, sender: head.sender.handle, text: head.text };
  },
};
```
```ts
// 4. 登记到一张表里，运行时按「接口 × 版本」查
const REGISTRY = {
  "messages.send":    { "2026-07": sendMessage_0707_to_1010 },
  "messages.get":     { "2026-07": message_1010_to_0707 },
  "message.received": { "2026-07": message_1010_to_0707 },
};
function chain(op: string, target: Version) {
  return ORDER.slice(ORDER.indexOf(target), -1).map((v) => {
    const a = REGISTRY[op]?.[v];
    if (!a) throw new Error(`missing adapter ${op}@${v}`);
    return a;
  });
}
```
````

<Caption :steps="[
  { title: '约定一个转换器接口', tag: '起点', body: '三个方法分别负责：<b>把旧请求转成新格式</b>、<b>把新结果转回旧格式</b>、<b>把新事件转回旧格式</b>。一对相邻版本写一个，版本多了就串起来，这就是 Stripe 的“倒着走回去”。' },
  { title: '每个版本的数据格式都手写', tag: '容易出问题', body: '最新版改了一个字段，旧版的格式定义<b>不会自动跟着变</b>，编译器也看不出两边对不上。这些定义还要和接口文档、SDK 保持一致，全靠人记得改。' },
  { title: '写转换函数', tag: '正确做法', body: 'WhatsApp 发来的消息没有电话号码，旧版表达不了，就<b>明确报错</b>交给产品决定怎么处理；不能塞一个空字符串假装是电话号码。' },
  { title: '登记到表里', tag: '容易出问题', body: '运行时按「哪个接口 × 哪个版本」查表。漏登记一条，编译和启动时都不会报错，<b>要等真有请求走到这里才会失败</b>。' },
]" />

</div>

---

# 方案一：改一次接口，要动几处

<div class="grid grid-cols-[1.25fr_1fr] gap-5 mt-1 items-stretch">
<div class="card flex flex-col">

<div class="flex items-center justify-between mb-3"><h3 class="!m-0">手动维护的 6 处</h3><span class="pill">谁保证它们一致：人</span></div>

<div class="grid grid-cols-2 gap-2.5">
<div v-click class="tile"><ph-file-ts /><div><b>旧版数据格式</b><span>请求和返回各一份</span></div></div>
<div v-click class="tile"><ph-file-ts /><div><b>最新版数据格式</b><span>业务代码用的那份</span></div></div>
<div v-click class="tile"><ph-arrows-left-right /><div><b>转换函数 × 2</b><span>升级、降级各一个</span></div></div>
<div v-click class="tile"><ph-table /><div><b>登记表 × 3 条</b><span>两个接口 + 一个事件</span></div></div>
<div v-click class="tile"><ph-file-doc /><div><b>旧版接口文档</b><span>OpenAPI 存档一份</span></div></div>
<div v-click class="tile"><ph-test-tube /><div><b>对照测试</b><span>证明以上彼此一致</span></div></div>
</div>

</div>
<div class="card flex flex-col">

<h3 class="!mb-3">打个比方</h3>

<p class="text-sm">像<b>手工记账</b>：每多一个月，就要在账本、发票夹、报表里各写一遍，哪一处漏了，月底对账才发现。</p>

<p class="text-sm mt-3">版本越多，要对的账越多。Stripe 能这么做，是因为它有一整套内部工具；我们没有。</p>

</div>
</div>

<div class="punch mt-5 !text-base">问题集中在一处：<b>格式定义、文档、转换代码是三份独立的东西</b>，没有工具帮你核对</div>

---
clicks: 4
zoom: 0.94
---

# 方案一：小结

<div class="sum2">
<div class="sum-side">
<div class="sum-verdict"><ph-target /><div><div class="k">在 Photon 的定位</div><div class="v">退路</div></div></div>
<div class="card !p-3">
<div class="text-xs muted mb-2">评分（越长越好）</div>
<Scores :items="[{ label: '起步成本低', value: 5, note: '今天就能写' }, { label: '各版本保持一致', value: 1, note: '三份东西靠人对齐' }, { label: '版本多了好维护', value: 1, note: '每版多写一套' }, { label: '能用在 Photon', value: 5, note: '就是 TypeScript' }]" />
</div>
</div>
<div class="sum">
<div class="box how" v-click="1"><h4><ph-gear /> 怎么运作</h4>

- 每个版本的数据格式自己写，或在发布时存一份接口文档
- 转换函数自己写，登记到一张表里
- 运行时按版本查表，一步步转到最新版

</div>
<div class="box pro" v-click="2"><h4><ph-thumbs-up /> 优点</h4>

- 不引入新工具，今天就能写
- 和现有 TypeScript 代码一致
- 另外两种方案失败时可以退回这里

</div>
<div class="box con" v-click="3"><h4><ph-thumbs-down /> 缺点</h4>

- 格式、文档、转换三份东西靠人保持一致
- 哪些改动会破坏老客户，全靠人判断
- 漏写的转换要到运行时才发现

</div>
<div class="box keep" v-click="4"><h4><ph-wrench /> 好不好维护</h4>

- 版本少时还行
- 每加一个版本，要写的东西就多一份
- 时间长了容易“说明书和产品对不上”

</div>
</div>
</div>

<div class="fit"><ph-lightbulb-filament /> <b>适合：</b>只有一两个版本、短期过渡；或者作为另外两种方案的退路</div>

<div class="fixline"><span class="fl-h"><ph-pencil-simple-line /> 对原来理解的修正</span><span>“到处分散”可以用一张登记表避免；真正的问题是<b>三份东西靠人保持一致</b>。</span></div>

---
layout: section
---

<div class="section-wrap">
<div class="section-no">03 / 04 · 方案二</div>
<h1 class="section-title">Cadwyn</h1>
<div class="section-bar" style="background:var(--c2)"></div>
<p class="muted mt-5">Stripe 做法的开源 Python 实现</p>
</div>

---
clicks: 4
---

# 方案二：只写“这一版改了什么”

<div class="grid grid-cols-[1fr_15rem] gap-5">
<div>

```python {all|3-7|9-12|14-16|18-20}
class StructureTheSender(VersionChange):
    """`sender` is now an object; requests use `to`."""
    instructions_to_migrate_to_previous_version = (
        schema(Message).field("sender").had(type=str),
        schema(SendMessageRequest).field("to").didnt_exist,
        schema(SendMessageRequest).field("recipient").existed_as(type=str),
    )

    @convert_request_to_next_version_for(SendMessageRequest)
    def recipient_to_structured(request: RequestInfo):
        request.body["to"] = {
            "handle": request.body.pop("recipient"), "protocol": "sms"}

    @convert_response_to_previous_version_for(Message)
    def structured_to_phone(response: ResponseInfo):
        response.body["sender"] = response.body["sender"]["handle"]

versions = VersionBundle(
    HeadVersion(), Version("2026-10", StructureTheSender), Version("2026-07"))
app = Cadwyn(versions=versions, api_version_parameter_name="Photon-Version")
```

</div>
<div class="relative">
<Tip :at="0" top="0" title="一次改动 = 一个类">和 Stripe 的“改动模块”一样。类上面那行说明会变成给客户看的更新说明。</Tip>
<Tip :at="1" top="1.6rem" title="写下旧版长什么样">只写“以前 <code>sender</code> 是字符串、以前没有 <code>to</code>”。框架据此<b>自动推出</b> 2026-07 的格式和接口文档。</Tip>
<Tip :at="2" top="6.6rem" title="旧请求 → 新格式" tone="gen">旧版请求先按旧版检查，再由这个函数改成最新版的样子。</Tip>
<Tip :at="3" top="11rem" title="新结果 → 旧格式" tone="gen">业务返回最新版，这个函数把 <code>sender</code> 变回字符串，再交给旧版客户。</Tip>
<Tip :at="4" top="14.6rem" title="版本列表" tone="warn">和 Stripe 的总表一样，从新到旧排。注意：<code>Cadwyn</code> 本身就是一个 Python 网站应用。</Tip>
</div>
</div>

<div class="foot"><a href="https://github.com/YuniqueUnic/SlidevPresentation/blob/main/decks/2026-10-photon-versioned-api/attachments/examples/cadwyn/app.py" target="_blank" rel="noopener">attachments/examples/cadwyn/app.py ↗</a> · 实测：两个版本都正常返回；拿新版请求冒充旧版会被拒绝（422）；两个版本的接口文档里 sender 类型不同</div>

---
clicks: 3
zoom: 0.9
---

# 方案二：思路很好，但装不进我们的系统

<div class="verdict mb-4"><ph-gavel class="text-xl" /><span>结论：<b>学它的思路，不用它的代码</b></span></div>

<div class="grid grid-cols-[1fr_1.15fr] gap-5">
<div class="card c3">

<h3 class="flex items-center gap-2"><ph-graduation-cap /> 值得学的</h3>

<Mark t="ok">先按客户选的<b>旧版</b>检查请求，再转换</Mark>
<Mark t="ok">旧版的格式和文档是<b>推出来的</b>，不用复制一份</Mark>
<Mark t="ok">会改变业务行为的改动，单独标出来</Mark>
<Mark t="ok">已经发布的改动记录，不能再改</Mark>

</div>
<div class="card c1" v-click="1">

<h3 class="flex items-center gap-2"><ph-puzzle-piece /> 为什么装不进来</h3>

<div class="misfit">
<div class="mf-box ts"><simple-icons-typescript class="text-[#3178c6]" /><b>Photon 的服务</b><span>base-bffs · fusor-v2 · webhooks<br/>全是 TypeScript</span></div>
<div class="mf-x"><ph-x-bold /><span>对不上</span></div>
<div class="mf-box py"><simple-icons-python class="text-[#ffd43b]" /><b>Cadwyn</b><span><code>class Cadwyn(FastAPI)</code><br/>本身就是 Python 网站应用</span></div>
</div>
<Mark t="no">它不是能套在我们服务外面的一层</Mark>
<Mark t="no">只管接口调用，不管 Webhook 推送和长连接</Mark>

</div>
</div>

<div class="grid grid-cols-2 gap-5 mt-4">
<div class="card c2" v-click="2">
<div class="flex items-center gap-2 font-semibold"><ph-copy /> 硬要用，办法 A：照着它的思路用 TypeScript 重写</div>
<div class="mf-flow"><span class="mf-n">读 Cadwyn 的设计</span><ph-arrow-right /><span class="mf-n">用 TS 重写</span><ph-arrow-right /><span class="mf-n eq">= 方案一</span></div>
<p class="text-xs muted !mt-1 !mb-0">只是写得更有章法，Cadwyn 本身并没有被用上</p>
</div>
<div class="card c2" v-click="3">
<div class="flex items-center gap-2 font-semibold"><ph-plugs-connected /> 硬要用，办法 B：在我们服务前面再加一个 Python 服务</div>
<div class="mf-flow"><span class="mf-n">客户</span><ph-arrow-right /><span class="mf-n bad">Python 服务 + Cadwyn</span><ph-arrow-right /><span class="mf-n">TS 服务</span></div>
<p class="text-xs muted !mt-1 !mb-0">多一种语言、多一次网络转发；数据格式要在 Python 和 TS 两边各写一份</p>
</div>
</div>

---
clicks: 4
zoom: 0.94
---

# 方案二：小结

<div class="sum2">
<div class="sum-side">
<div class="sum-verdict"><ph-target /><div><div class="k">在 Photon 的定位</div><div class="v">参考书</div></div></div>
<div class="card !p-3">
<div class="text-xs muted mb-2">评分（越长越好）</div>
<Scores :items="[{ label: '起步成本低', value: 1, note: '要换语言或加服务' }, { label: '各版本保持一致', value: 4, note: '旧版自动推出' }, { label: '版本多了好维护', value: 4, note: '只写改了什么' }, { label: '能用在 Photon', value: 0, note: '只能用在 Python' }]" />
</div>
</div>
<div class="sum">
<div class="box how" v-click="1"><h4><ph-gear /> 怎么运作</h4>

- 只维护最新版的数据格式
- 每次改动写一个“改了什么”的类
- 框架自动推出旧版格式和文档，请求时自动转换

</div>
<div class="box pro" v-click="2"><h4><ph-thumbs-up /> 优点</h4>

- 思路成熟，就是 Stripe 的做法
- 旧版格式和文档自动推出
- 开源免费（MIT 许可），一直在更新

</div>
<div class="box con" v-click="3"><h4><ph-thumbs-down /> 缺点</h4>

- 只能用在 Python 网站框架 FastAPI 里
- 不管 Webhook 推送和长连接
- 硬要接入，要么重写，要么多加一个服务

</div>
<div class="box keep" v-click="4"><h4><ph-wrench /> 好不好维护</h4>

- 在 Python 项目里很好维护
- 在 Photon 里用不上，谈不上维护

</div>
</div>
</div>

<div class="fit"><ph-lightbulb-filament /> <b>适合：</b>参考它的规则（先按旧版检查、改动记录不能改），我们照着做</div>

<div class="fixline"><span class="fl-h"><ph-pencil-simple-line /> 对原来理解的修正</span><span>Cadwyn <b>不是套在服务外面的一层</b>，它本身就是 Python 网站应用。</span></div>

---
layout: section
---

<div class="section-wrap">
<div class="section-no">03 / 04 · 方案三 · 推荐</div>
<h1 class="section-title">xidl：写一份接口定义，生成所有版本</h1>
<div class="section-bar" style="background:var(--ph-spectrum)"></div>
<p class="muted mt-5">一种接口定义语言和它的编译器：一份定义文件，生成各个版本的代码和文档</p>
</div>

---
clicks: 3
zoom: 0.84
---

# 方案三：在接口定义里标出“哪一版加了、哪一版删了”

<div class="grid grid-cols-[1fr_15rem] gap-5">
<div>

````md magic-move {lines: false}
```idl
struct Message {
    string id;
    string sender;
    string text;
};
```
```idl
@version
enum ApiVersions {
    @rename("2026-07") v2026_07,
    @rename("2026-10") v2026_10,
};

struct Message {
    string id;
    string sender;
    string text;
};
```
```idl
@version
enum ApiVersions {
    @rename("2026-07") v2026_07,
    @rename("2026-10") v2026_10,
};

struct Message {
    string id;

    @removed(ApiVersions::v2026_10)
    @rename("sender")
    string legacy_sender;

    @added(ApiVersions::v2026_10)
    Sender sender;

    string text;
};
```
```idl
@version
enum ApiVersions {
    @rename("2026-07") v2026_07,
    @rename("2026-10") v2026_10,
};

enum Protocol { imessage, sms, @added(ApiVersions::v2026_10) whatsapp };

struct Message {
    string id;
    @removed(ApiVersions::v2026_10) @rename("sender") string legacy_sender;
    @added(ApiVersions::v2026_10)   Sender sender;
    string text;
    @added(ApiVersions::v2026_10)   @optional string thread_id;
};

interface Messages {
    @post(path = "/v1/messages")
    Message send(@body SendMessageRequest request) raises(NotFound, ThreadClosed);

    @added(ApiVersions::v2026_10)
    @get(path = "/v1/threads/{thread_id}/messages")
    sequence<Message> list_thread(@path string thread_id);
};
```
````

</div>
<div class="relative">
<Tip :at="0" title="起点：普通的接口定义">现在的定义文件就长这样，里面没有任何版本信息。</Tip>
<Tip :at="1" title="列出所有版本">
用 <code>@version</code> 标一个列表：按书写顺序就是版本先后，<b>最后一个就是最新版</b>。<code>@rename</code> 写的是对外显示的版本号。
</Tip>
<Tip :at="2" top="5.5rem" title="和 Polar 的标记一样">
<code>@added</code> 就是 Polar 的“从哪版开始”，<code>@removed</code> 就是“到哪版为止”。旧字段用 <code>@rename("sender")</code> 保持对外的名字不变。
</Tip>
<Tip :at="3" top="4rem" title="其他改动一样标" tone="ok">
新渠道、新字段、新接口、新错误类型，都只要标 <code>@added</code>。<b>没标的就是所有版本都有</b>。标错了（比如版本名拼错）编译时就报错。
</Tip>
</div>
</div>

<div class="foot">示例：<a href="https://github.com/YuniqueUnic/SlidevPresentation/blob/main/decks/2026-10-photon-versioned-api/attachments/examples/xidl/messages.idl" target="_blank" rel="noopener">attachments/examples/xidl/messages.idl ↗</a></div>

---
clicks: 2
---

# 编译器做了什么：按版本裁剪

<div class="grid grid-cols-[1fr_15rem] gap-5">
<div>

````md magic-move {lines: false}
```idl
// 我们写的：一份带版本标记的定义
struct Message {
    string id;
    @removed(ApiVersions::v2026_10) @rename("sender") string legacy_sender;
    @added(ApiVersions::v2026_10)   Sender sender;
    string text;
    @added(ApiVersions::v2026_10)   @optional string thread_id;
};
```
```idl
// 编译器裁出的 2026-07：只留这一版存在的字段
module v2026_07 {
    struct Message {
        string id;
        @rename("sender") string legacy_sender;
        string text;
    };
};
```
```idl
// 编译器裁出的 2026-10：一份不带版本标记的普通定义
module v2026_10 {
    struct Message {
        string id;
        Sender sender;
        string text;
        @optional string thread_id;
    };
};
```
````

<div class="analogy mt-4"><ph-scissors /><div><b>就像出版社的底稿</b><p>底稿上用颜色标出“第 2 版删掉”“第 3 版新增”，印哪一版时就按颜色裁掉不属于这一版的内容。后面生成代码的工具只拿到裁好的一版，<b>完全不需要懂版本</b>。</p></div></div>

</div>
<div class="relative">
<Tip :at="0" title="每个字段都有存在的区间"><code>legacy_sender</code>：从 2026-07 到 2026-10 之前；<code>sender</code>：从 2026-10 起。</Tip>
<Tip :at="1" title="裁出 2026-07" tone="gen"><code>sender</code> 和 <code>thread_id</code> 不在这一版的区间里，被去掉。</Tip>
<Tip :at="2" title="裁出 2026-10" tone="gen"><code>legacy_sender</code> 这一版已删除，被去掉。剩下的就是一份普通定义。</Tip>
</div>
</div>

---

# 一份定义，生成所有版本（实测 0.100.0）

<div class="grid grid-cols-2 gap-6">
<div>

```bash
xidlc gen openapi         -o out messages.idl
xidlc gen typescript-rest -o out messages.idl
xidlc gen rust-axum       -o out messages.idl
```

<div class="card mt-4 !p-4">
<div class="flex items-center gap-2 text-sm my-1"><simple-icons-openapiinitiative class="text-[#6ba539]" /><code>openapi_messages.v2026_07.json</code><span class="muted">2026-07 接口文档</span></div>
<div class="flex items-center gap-2 text-sm my-1"><simple-icons-openapiinitiative class="text-[#6ba539]" /><code>openapi_messages.v2026_10.json</code><span class="muted">2026-10 接口文档</span></div>
<div class="flex items-center gap-2 text-sm my-1"><simple-icons-typescript class="text-[#3178c6]" /><code>messages.d.ts</code><span class="muted">TS 数据格式，每版一组</span></div>
<div class="flex items-center gap-2 text-sm my-1"><simple-icons-zod class="text-[#3e67b1]" /><code>messages.zod.ts</code><span class="muted">TS 数据检查，每版一组</span></div>
<div class="flex items-center gap-2 text-sm my-1"><simple-icons-rust /><code>messages.rs</code><span class="muted">Rust 代码，每版一组</span></div>
</div>

<div class="gap-card mt-4" style="border-color: rgba(90,176,216,.45); background: rgba(90,176,216,.06)">
<div class="flex items-center gap-2 font-semibold text-sm"><simple-icons-go class="text-[#00add8] text-lg" /><simple-icons-python class="text-[#ffd43b]" /> Go、Python：加生成器就行</div>
<p class="text-xs muted !mt-1.5 !mb-0">裁剪发生在生成之前，生成器拿到的是普通定义，<b>不需要懂版本</b>，所以加 Go、Python 是常规工作。今天 Go 还没做按版本分组（会直接报错），Python 生成器还没有；补上之前，这两个 SDK 先从生成的接口文档再生成。</p>
</div>

</div>
<div>

```ts
// out/ts/messages.d.ts（自动生成，节选）
export namespace v2026_07 {
  type Protocol = "imessage" | "sms";
  interface Message {
    id: string;
    legacy_sender: string; // 对外叫 "sender"
    text: string;
  }
}
export namespace v2026_10 {
  type Protocol =
    "imessage" | "sms" | "whatsapp";
  interface Message {
    id: string;
    sender: Sender;        // 对外叫 "sender"
    text: string;
    thread_id?: string;
  }
}
```

</div>
</div>

---
clicks: 2
---

# 代码里的名字，和客户看到的名字

<div class="grid grid-cols-[14rem_1fr] gap-5 mid2-code">
<div>

```idl {all|3-5|6-7,9-10}{at:1}
struct Message {
  string id;
  @removed(v2026_10)
  @rename("sender")
  string legacy_sender;
  @added(v2026_10)
  Sender sender;
  string text;
  @added(v2026_10)
  @optional string thread_id;
};
```

<div class="note"><ph-info /><span>点一次看 2026-07，再点一次看 2026-10。右边两块都是 xidl 实际生成的代码（节选）。</span></div>

</div>
<div class="flex flex-col gap-3">

<div class="grid grid-cols-2 gap-3">
<div>
<div class="out-h"><simple-icons-typescript class="text-[#3178c6]" /> 给我们的代码用 · TS 数据格式</div>

<div v-if="$clicks <= 1">

```ts
namespace v2026_07 {
  interface Message {
    id: string;
    legacy_sender: string;
    text: string;
  }
}
```

</div>
<div v-else>

```ts
namespace v2026_10 {
  interface Message {
    id: string;
    sender: Sender;
    text: string;
    thread_id?: string;
  }
}
```

</div>
</div>
<div>
<div class="out-h"><simple-icons-openapiinitiative class="text-[#6ba539]" /> 给客户看 · 接口文档</div>

<div v-if="$clicks <= 1">

```json
"v2026_07.Message": {
  "properties": {
    "id":     { "type": "string" },
    "sender": { "type": "string" },
    "text":   { "type": "string" }
  },
  "required": ["id", "sender", "text"]
}
```

</div>
<div v-else>

```json
"v2026_10.Message": {
  "properties": {
    "id":        { "type": "string" },
    "sender":    { "$ref": "…/Sender" },
    "text":      { "type": "string" },
    "thread_id": { "type": "string" }
  },
  "required": ["id", "sender", "text"]
}
```

</div>
</div>
</div>

<Caption :steps="[
  { title: '两个名字', tag: '先看懂这一点', body: '一个字段有两个名字：<b>代码里的名字</b>只给我们自己写代码用，可以随便取；<b>线上的名字</b>是 JSON 里真正出现的字段名，是给客户的承诺，不能变。<code>@rename</code> 写的就是线上的名字。' },
  { title: '2026-07：代码里叫 legacy_sender，客户看到的还是 sender', tag: '旧版', body: '旧字段在代码里改叫 <code>legacy_sender</code>，一看就知道是旧的；但接口文档里仍是 <code>sender</code>、类型仍是字符串，<b>老客户什么都感觉不到</b>。' },
  { title: '2026-10：新的 sender 是对象，thread_id 可以不填', tag: '新版', body: '新版里 <code>sender</code> 变成对象，名字没变、形状变了。<code>thread_id</code> 在 TS 里是 <code>?</code>，在文档里不在必填列表，意思一致：可以不填。' },
]" />

<div class="hint-line"><ph-check-circle class="text-[var(--ph-green)]" /> Rust 代码和 TS 的数据检查代码也同时生成，线上的名字和“可不可以不填”都与上面一致，这里不再逐个展示。</div>

</div>
</div>

---
clicks: 5
---

# 两个版本差在哪：左右对照

<div class="grid grid-cols-2 gap-4 mid-code">
<div>
<div class="out-h"><span class="ver old !mb-0">2026-07</span> 旧版接口文档（简写）</div>

```yaml {all|1-3|5|9|7-10|12}{at:1}
接口:
  POST /v1/messages
  GET  /v1/messages/{id}

渠道 Protocol: imessage | sms

Message:
  id: string
  sender: string
  text: string

发消息可能的错误: NotFound
```

</div>
<div>
<div class="out-h"><span class="ver new !mb-0">2026-10</span> 新版接口文档（简写）</div>

```yaml {all|4|6|10|12|14}{at:1}
接口:
  POST /v1/messages
  GET  /v1/messages/{id}
  GET  /v1/threads/{thread_id}/messages  # 新增

渠道 Protocol: imessage | sms | whatsapp  # 新增选项

Message:
  id: string
  sender: Sender { handle, protocol }  # 换了类型
  text: string
  thread_id?: string  # 新增，可不填

发消息可能的错误: NotFound | ThreadClosed  # 新增
```

</div>
</div>

<Caption :steps="[
  { title: '同一份定义，编译出两份接口文档', tag: '先看整体', body: '左右两份都是 xidlc 从<b>同一个 messages.idl</b> 生成的（这里把 OpenAPI 写成了简写，方便对照）。没有人手写其中任何一份。下面逐处看差别。' },
  { title: '接口：多了一个', tag: '新增', body: '新版多了“按会话查消息”。旧版文档里<b>根本没有这个接口</b>，所以老客户不会看到它，也不会被它影响。' },
  { title: '渠道：多了 whatsapp', tag: '新增选项', body: '新版多了一个选项。旧版客户的代码如果把渠道写死成两种，遇到第三种可能出错，所以<b>旧版文档里不出现 whatsapp</b>；WhatsApp 的消息发给旧版客户时要另行处理（见“三个问题”那页）。' },
  { title: 'sender：名字没变，类型变了', tag: '换了类型', body: '旧版是电话号码字符串，新版是带渠道的对象。这是最需要转换的地方：发给旧版客户时，要把对象折回字符串。' },
  { title: 'thread_id：新增，可以不填', tag: '新增', body: '只在新版出现，而且不是必填。回给旧版客户时直接去掉，旧版客户完全看不到它。' },
  { title: '错误：多了“会话已关闭”', tag: '新增', body: '新版发消息可能返回新的错误类型。旧版的错误列表里没有它，所以编译器只把它放进新版；旧版客户遇到这种情况时返回什么，要我们决定。' },
]" />

---
clicks: 2
---

# 改一处定义，所有生成结果一起变

<div class="grid grid-cols-[16rem_1fr] gap-5 twoslash-slide">
<div class="flex flex-col gap-3">

````md magic-move {lines: false}
```idl
// 2026-10 的 Message
struct Message {
    string id;
    Sender sender;
    string text;
    @added(v2026_10)
    @optional string thread_id;
};
```
```idl
// 改成：thread_id 必须填
struct Message {
    string id;
    Sender sender;
    string text;
    @added(v2026_10)
    string thread_id;
};
```
````

<div class="card !p-3 text-sm">
<b>这个改动的意思</b>
<p class="text-xs muted !mt-1 !mb-0">在 2026-10 里，<code>thread_id</code> 从“可以不填”改成“必须填”。可旧版 2026-07 的请求里<b>根本没有这个字段</b>，升级时它从哪来？</p>
</div>

</div>
<div>

<div v-if="$clicks <= 1" v-click="1">

```ts twoslash
// @errors: 2741
// xidl 重新生成的格式（节选）
declare namespace v2026_07 {
  interface Message { id: string; legacy_sender: string; text: string }
}
declare namespace v2026_10 {
  interface Sender { handle: string; protocol: "imessage" | "sms" | "whatsapp" }
  interface Message { id: string; sender: Sender; text: string; thread_id: string }
}
// ---cut---
// 我们手写的升级函数：2026-07 → 2026-10
const upgrade = (o: v2026_07.Message): v2026_10.Message => ({
  id: o.id,
  text: o.text,
  sender: { handle: o.legacy_sender, protocol: "sms" },
});
```

<div class="note"><ph-terminal-window /><span>红色报错是 TypeScript 编译器在生成这页时真实给出的：新版要求有 <code>thread_id</code>，升级函数没给。编译器<b>逼我们回答</b>“旧请求里没有的 thread_id 从哪来”，而不是等线上出错。</span></div>

</div>
<div v-else>

<div class="card !p-3">
<div class="flex items-center gap-2 font-semibold text-sm mb-2"><ph-gear-six class="text-[var(--ph-green)]" /> 同一处改动，四种生成结果自动跟着变（xidlc 0.100.0 实测）</div>
<div class="diff-row"><simple-icons-typescript class="text-[#3178c6]" /><span>TS 数据格式</span><b><code>thread_id?: string</code> → <code>thread_id: string</code></b></div>
<div class="diff-row"><simple-icons-zod class="text-[#3e67b1]" /><span>TS 数据检查</span><b><code>.optional()</code> 去掉了</b></div>
<div class="diff-row"><simple-icons-rust /><span>Rust</span><b><code>Option&lt;String&gt;</code> → <code>String</code></b></div>
<div class="diff-row"><simple-icons-openapiinitiative class="text-[#6ba539]" /><span>接口文档</span><b>必填列表加上 <code>thread_id</code></b></div>
</div>

<div class="card c1 !p-3 mt-3">
<div class="flex items-center gap-2 font-semibold text-sm"><ph-hand /> 换成方案一（自己手写转换）会怎样</div>
<p class="text-xs muted !mt-1.5 !mb-0">上面这 4 处是<b>各自独立的文件</b>，要一处一处手改。漏改一处，<b>不会有任何报错</b>：比如文档写了必填、检查代码却还允许不填，客户按文档写的代码和服务器的实际行为就对不上了。</p>
</div>

</div>
</div>
</div>

<Sfx name="error" :at="1" />

---
clicks: 2
---

# 转换代码：xidl 能自动生成多少（#324 提案）

<div class="chg mt-1">
<div class="h">改动类型</div><div class="h">旧请求 → 新格式</div><div class="h">新结果 → 旧格式</div><div class="h">例子</div>

<div><span class="op add"><ph-plus-bold /> 新增 <small>@added</small></span></div>
<div class="res auto"><ph-check-circle-fill /> 自动：可不填就留空，有默认值就填默认值</div>
<div class="res auto"><ph-check-circle-fill /> 自动：去掉这个字段</div>
<div class="ex"><code>thread_id</code> 只在新版有，回给旧版时去掉</div>

<div><span class="op add"><ph-plus-bold /> 新增必填 <small>@added</small></span></div>
<div class="res hook"><ph-hand-pointing /> 要我们写：旧请求里没有，值从哪来</div>
<div class="res auto"><ph-check-circle-fill /> 自动：去掉</div>
<div class="ex">新版要求必填“发送渠道”，旧请求没带</div>

<div><span class="op del"><ph-minus-bold /> 删除 <small>@removed</small></span></div>
<div class="res auto"><ph-check-circle-fill /> 自动：去掉</div>
<div class="res hook"><ph-hand-pointing /> 旧版要求必填时要我们写：值从哪来</div>
<div class="ex">新版删了 <code>legacy_sender</code>，旧版还要它</div>

<div><span class="op ren"><ph-pencil-simple /> 改名 <small>@rename</small></span></div>
<div class="res auto"><ph-check-circle-fill /> 自动：换个名字</div>
<div class="res auto"><ph-check-circle-fill /> 自动：换回原名</div>
<div class="ex"><code>recipient</code> 改成 <code>to</code>（只改名字时）</div>

<div><span class="op typ"><ph-swap /> 改类型</span></div>
<div class="res hook"><ph-hand-pointing /> 要我们写</div>
<div class="res hook"><ph-hand-pointing /> 要我们写</div>
<div class="ex"><code>sender</code> 从字符串变成对象</div>

<div><span class="op enm"><ph-list-plus /> 新选项 / 新错误</span></div>
<div class="res none">—</div>
<div class="res hook"><ph-hand-pointing /> 要我们写：旧版里对应成什么</div>
<div class="ex">新渠道 WhatsApp、新错误“会话已关闭”</div>
</div>

<div class="grid grid-cols-2 gap-4 mt-5">
<div v-click="1" class="flex items-center gap-3 card !p-3"><span class="res auto text-lg"><ph-check-circle-fill /></span><span class="text-sm"><b>自动</b>：编译器从标记里就能推出来，生成好直接用</span></div>
<div v-click="2" class="flex items-center gap-3 card !p-3"><span class="res hook text-lg"><ph-hand-pointing /></span><span class="text-sm"><b>要我们写</b>：编译器生成一个<b>必须填写的空函数</b>，不填就编译失败。下一页会看到，这部分还能继续变少</span></div>
</div>

<div class="foot">这是 xidl 上游 #324 的提案规则，还没发布；新增 = Create，删除 = Delete，改名 = Rename，改类型 = Update</div>

---
clicks: 3
zoom: 0.86
---

# 随着 xidl 推进，我们要写的越来越少

<div class="stage3 mt-1">
<div class="h"></div>
<div class="h" v-click="1">今天 · 0.100.0<small>已发布</small></div>
<div class="h" v-click="2">加上 #324<small>上游提案</small></div>
<div class="h" v-click="3">再进一步<small>设想，需和上游讨论</small></div>

<div class="l">每个版本的格式和文档</div>
<div class="cell g" v-click="1"><ph-gear-six /> xidl 生成</div>
<div class="cell g" v-click="2"><ph-gear-six /> xidl 生成</div>
<div class="cell g" v-click="3"><ph-gear-six /> xidl 生成</div>

<div class="l">转换的骨架和串联</div>
<div class="cell o" v-click="1"><ph-user /> 我们写</div>
<div class="cell g" v-click="2"><ph-gear-six /> xidl 生成</div>
<div class="cell g" v-click="3"><ph-gear-six /> xidl 生成</div>

<div class="l">新增、删除、改名</div>
<div class="cell o" v-click="1"><ph-user /> 我们写</div>
<div class="cell g" v-click="2"><ph-gear-six /> xidl 生成</div>
<div class="cell g" v-click="3"><ph-gear-six /> xidl 生成</div>

<div class="l">新增必填字段的默认值</div>
<div class="cell o" v-click="1"><ph-user /> 我们写</div>
<div class="cell o" v-click="2"><ph-user /> 待填函数</div>
<div class="cell g" v-click="3"><ph-gear-six /> 标 <code>@default("sms")</code> 自动填</div>

<div class="l">常见的改形状<br/>（字符串 ↔ 对象里的一个字段）</div>
<div class="cell o" v-click="1"><ph-user /> 我们写</div>
<div class="cell o" v-click="2"><ph-user /> 待填函数</div>
<div class="cell g" v-click="3"><ph-gear-six /> 用标记说明对应关系，自动生成</div>

<div class="l">旧版表达不了时怎么办</div>
<div class="cell o" v-click="1"><ph-user /> 我们写</div>
<div class="cell o" v-click="2"><ph-user /> 待填函数</div>
<div class="cell o" v-click="3"><ph-user /> 我们写：这是产品决定</div>

<div class="l">改变业务行为</div>
<div class="cell o" v-click="1"><ph-user /> 我们写</div>
<div class="cell o" v-click="2"><ph-user /> 我们写</div>
<div class="cell o" v-click="3"><ph-user /> 我们写：行为开关</div>
</div>

<div v-click="3" class="grid grid-cols-[1fr_1fr] gap-4 mt-4">

```idl
// 设想的写法（xidl 目前没有，需要和上游讨论）
@added(v2026_10) @default("sms") Protocol protocol;
@added(v2026_10) @from(legacy_sender, into = "handle") Sender sender;
```

<div class="note !mt-0"><ph-info /><span>到最后，留给我们的只剩<b>真正需要产品判断的事</b>：旧版表达不了时报什么错、哪些改动要走行为开关。</span></div>

</div>

---
clicks: 2
---

# 分工（已确认）：xidl 生成框架，我们只写业务判断

<div class="mb-3 h-7">
<Who v-if="$clicks === 0" kind="idl" />
<template v-else-if="$clicks === 1"><Who kind="gen" /><Who kind="proposal" /></template>
<Who v-else kind="ours" />
</div>

<div class="grid grid-cols-[1fr_14rem] gap-5">
<div>

````md magic-move {lines: false}
```idl
// 1. 我们写定义：只标出发生了什么
struct Message {
    string id;
    @removed(ApiVersions::v2026_10) @rename("sender") string legacy_sender;
    @added(ApiVersions::v2026_10)   Sender sender;
    string text;
    @added(ApiVersions::v2026_10)   @optional string thread_id;
};
```
```ts
// 2. xidl 生成（不要手改）
export interface MessageHooks_2026_07 {
  downgradeSender(s: v2026_10.Sender): Result<string, UnsupportedProjection>;
  upgradeSender(phone: string): v2026_10.Sender;
}

export const message_2026_10_to_2026_07 = (hooks: MessageHooks_2026_07) => ({
  downgrade: (h: v2026_10.Message) =>
    hooks.downgradeSender(h.sender).map((legacy_sender) => ({
      id: h.id,            // 没变：直接照抄
      text: h.text,        // 没变：直接照抄
      legacy_sender,       // 类型变了：交给我们写的函数
      // thread_id：新版才有 → 去掉
    })),
});
```
```ts
// 3. 我们写：只写需要业务判断的部分
export const messageHooks: MessageHooks_2026_07 = {
  downgradeSender(s) {
    if (s.protocol === "whatsapp") {
      return err(new UnsupportedProjection("structured-sender"));
    }
    return ok(s.handle);
  },
  upgradeSender(phone) {
    return { handle: phone, protocol: "sms" };
  },
};
```
````

</div>
<div class="relative">
<Tip :at="0" title="只标出发生了什么" tone="info">不写任何转换代码，只标出哪个字段在哪一版出现、删除、对外叫什么名字。</Tip>
<Tip :at="1" title="能推出来的都生成" tone="gen"><code>id</code>、<code>text</code> 照抄；<code>thread_id</code> 去掉；<code>sender</code> 类型变了推不出来，就生成一个<b>必须填写</b>的函数。</Tip>
<Tip :at="2" title="只写需要判断的" tone="ours">WhatsApp 发的消息没有电话号码：<b>明确报错</b>，不编号码。<code>upgradeSender</code> 这种简单对应，以后可以用标记自动生成。</Tip>
</div>
</div>

<div class="foot">第 2 步是 xidl 上游 #324 提案的样子，还没发布。在它发布前，这部分先手写在生成出来的格式上，发布后换成生成代码</div>

---
clicks: 3
---

# 每次要改接口，只问三个问题

<div class="dt mt-2">
<div v-click="1" class="qn"><Num>1</Num><div><b>编译器能看懂这个改动吗？</b><small>新增、删除、改名能看懂；换类型目前看不懂</small></div></div>
<div v-click="1" class="fork" />
<div v-click="1" class="yes"><div class="k"><ph-check-circle-fill /> 能</div>自动生成转换代码</div>
<div v-click="1" class="no"><div class="k"><ph-hand-pointing /> 不能</div>生成一个必须填写的函数，我们来写</div>
<div v-click="1" class="eg">例：<code>thread_id</code> 是新增 → 自动；<code>sender</code> 从字符串变对象 → 我们写（以后可以用标记说明）</div>

<div v-click="2" class="qn"><Num>2</Num><div><b>旧版格式能表达新的情况吗？</b><small>新数据放进旧格式，会不会说谎</small></div></div>
<div v-click="2" class="fork" />
<div v-click="2" class="yes"><div class="k"><ph-check-circle-fill /> 能</div>转回旧格式</div>
<div v-click="2" class="no"><div class="k"><ph-x-circle-fill /> 不能</div>明确报错，绝不编造旧值</div>
<div v-click="2" class="eg">例：短信发来的消息有号码 → 转回；WhatsApp 发来的没有号码 → 报错</div>

<div v-click="3" class="qn"><Num>3</Num><div><b>这个改动会改变业务行为吗？</b><small>比如扣费、权限、发送渠道变了</small></div></div>
<div v-click="3" class="fork" />
<div v-click="3" class="yes"><div class="k"><ph-check-circle-fill /> 不会</div>转换格式就够了</div>
<div v-click="3" class="no"><div class="k"><ph-toggle-right /> 会</div>交给 Photon 的行为开关（Stripe 的 has_side_effects）</div>
<div v-click="3" class="eg">例：新版默认改走 WhatsApp，旧版客户仍走短信 → 用行为开关</div>
</div>

<div class="punch mt-4 !text-sm">xidl 负责“接口在各个版本里长什么样”；Photon 负责“拿到这份接口后，业务怎么做”</div>

---
clicks: 4
---

# 理想状态下，xidl 这条路是怎么跑通的

<div class="flow4 mt-2">
<div class="col" v-click="1">
<div class="col-head"><ph-pencil-simple-line /> 1 · 写定义</div>
<div class="node done big">
<div class="node-title"><ph-file-code /> messages.idl</div>
<div class="chips"><code>@version</code><code>@added</code><code>@removed</code><code>@rename</code></div>
<div class="node-sub">一份定义，唯一的依据</div>
</div>
</div>
<div class="flowline" v-click="2" />
<div class="col" v-click="2">
<div class="col-head"><ph-cpu /> 2 · 编译</div>
<div class="node done"><div class="node-title">检查版本标记</div><div class="node-sub">区间合不合理、引用存不存在</div></div>
<div class="node done"><div class="node-title">按版本裁剪</div><div class="node-sub">2026-07 一份 · 2026-10 一份</div></div>
<div class="node todo"><div class="node-title">算出两版的对应关系</div><div class="node-sub">谁改名了、谁换类型了</div></div>
</div>
<div class="flowline" v-click="3" />
<div class="col" v-click="3">
<div class="col-head"><ph-package /> 3 · 生成</div>
<div class="node done"><div class="node-title">每个版本的接口文档</div></div>
<div class="node done"><div class="node-title">TS / Rust 数据格式和调用代码</div></div>
<div class="node todo"><div class="node-title">Go / Python 按版本输出</div><div class="node-sub">加生成器即可</div></div>
<div class="node todo"><div class="node-title">转换框架 + 待填函数</div><div class="node-sub">上游 #324</div></div>
<div class="node todo"><div class="node-title">Webhook 发送与签名</div><div class="node-sub">上游 #323</div></div>
</div>
<div class="flowline" v-click="4" />
<div class="col" v-click="4">
<div class="col-head"><ph-buildings /> 4 · 运行 · Photon</div>
<div class="node rt"><div class="node-title">确定版本</div><div class="node-sub">请求头 › SDK 设定 › 项目默认 › 当前版本</div></div>
<div class="node rt"><div class="node-title">检查 · 升级 · 业务 · 降级</div></div>
<div class="node rt"><div class="node-title">Webhook 正文先存 · 幂等 · 行为开关</div></div>
</div>
</div>

<div class="flex gap-5 mt-5 text-xs">
<span class="legend"><i class="lg done" /> 已经做好（0.100.0）</span>
<span class="legend"><i class="lg todo" /> 上游还在做 / 待补</span>
<span class="legend"><i class="lg rt" /> Photon 自己做（和选哪种方案无关）</span>
</div>

---
clicks: 4
zoom: 0.94
---

# 方案三：小结

<div class="sum2">
<div class="sum-side">
<div class="sum-verdict"><ph-target /><div><div class="k">在 Photon 的定位</div><div class="v">长期目标</div></div></div>
<div class="card !p-3">
<div class="text-xs muted mb-2">评分（越长越好）</div>
<Scores :items="[{ label: '起步成本低', value: 3, note: '一个接口一个接口迁' }, { label: '各版本保持一致', value: 5, note: '只有一份定义' }, { label: '版本多了好维护', value: 5, note: '加标记 + 少量判断' }, { label: '能用在 Photon', value: 5, note: '直接生成 TS' }]" />
</div>
</div>
<div class="sum">
<div class="box how" v-click="1"><h4><ph-gear /> 怎么运作</h4>

- 只维护一份接口定义，标出哪一版新增、哪一版删除（像 Polar）
- 编译器按版本裁剪，生成每个版本的代码和文档
- 转换框架由 xidl 生成，我们只写业务判断（像 Stripe 一样只有一份实现）

</div>
<div class="box pro" v-click="2"><h4><ph-thumbs-up /> 优点</h4>

- 只有一份定义，各版本不会对不上
- 改错了编译时就报错
- 一份定义生成多种语言；加语言只是加生成器
- xidl 越推进，手写的转换越少

</div>
<div class="box con" v-click="3"><h4><ph-thumbs-down /> 缺点</h4>

- 要把现有接口定义迁到 xidl
- 转换生成（#324）、Webhook（#323）还要和上游一起做
- 团队要学一种新写法；项目还没到 1.0

</div>
<div class="box keep" v-click="4"><h4><ph-wrench /> 好不好维护</h4>

- 每加一个版本：加几个标记，写少量业务判断
- 版本越多，越能体现优势

</div>
</div>
</div>

<div class="fit"><ph-lightbulb-filament /> <b>适合：</b>长期目标。先用一个接口试点，验证通过再推广</div>

<div class="fixline"><span class="fl-h"><ph-pencil-simple-line /> 对原来理解的修正</span><span>版本功能<b>已经发布</b>第一阶段；转换会逐步由 xidl 生成；确定版本、正文先存、幂等这些<b>永远是 Photon 自己做</b>。</span></div>

---
layout: section
---

<div class="section-wrap">
<div class="section-no">04 / 04</div>
<h1 class="section-title">怎么选</h1>
<div class="section-bar" style="background:var(--ph-spectrum)"></div>
<p class="muted mt-5">能力对比、版本多了以后的成本，最后给出推荐路线</p>
</div>

---

# 能力对比

<div class="matrix">

| 比较项 | 方案一 自己手写 | 方案二 Cadwyn | 方案三 xidl（现在 → 以后） |
| --- | --- | --- | --- |
| 能用在 Photon 的 TypeScript 服务里 | <ph-check-circle-fill class="i-ok" /> | <ph-x-circle-fill class="i-no" /> 只能用在 Python | <ph-check-circle-fill class="i-ok" /> |
| 各版本格式只有一份依据 | <ph-x-circle-fill class="i-no" /> 格式、文档、转换各一份 | 只在 Python 里成立 | <ph-check-circle-fill class="i-ok" /> |
| 旧版格式和接口文档 | 手写或存档 | 自动推出 | 自动推出 |
| 转换代码 | 全手写 | 结构变化自动，数据转换手写 | 现在手写 → 框架和常见转换自动生成 |
| 写错了什么时候发现 | 测试或线上 | 框架保证 | **编译时** |
| 多语言 SDK | 从接口文档生成 | 从接口文档生成 | TS / Rust 直接生成；Go / Python 补上生成器后直接生成 |
| Webhook / 长连接 | 自己做 | 自己做 | 自己做（#323 会提供格式和签名） |
| 起步工作量 | 最小 | 大（语言不同） | 中（一个接口一个接口迁） |
| 版本多了以后 | 越来越重 | 轻 | 轻 |
| 主要风险 | 对不上 | 技术栈不同 | 依赖上游进度、还没到 1.0 |

</div>

---

# 加到第 5 个版本时，各要做多少事

<div class="cost mt-2">
<div class="h"></div>
<div class="h" style="color:var(--c1)"><ph-hand /> 方案一 手写</div>
<div class="h" style="color:var(--c2)"><simple-icons-python /> 方案二 Cadwyn</div>
<div class="h" style="color:var(--c3)"><ph-file-code /> 方案三 xidl</div>

<div class="l">每次改接口</div>
<div class="c bad">新写一份旧版格式、一份接口文档存档、转换函数、登记表</div>
<div class="c good">写一个“改了什么”的类</div>
<div class="c good">在定义里加几个标记；只有业务判断要写函数</div>

<div class="l">旧版格式和文档</div>
<div class="c bad">5 套，全部手写或存档</div>
<div class="c good">自动推出</div>
<div class="c good">自动生成</div>

<div class="l">漏改了一处</div>
<div class="c bad">线上请求走到才报错</div>
<div class="c good">框架检查</div>
<div class="c good">编译失败</div>

<div class="l">新人接手</div>
<div class="c bad">要读完 5 套格式和转换才知道历史</div>
<div class="c">读改动类的列表</div>
<div class="c good">读一份定义文件，版本标记一目了然</div>
</div>

<div class="analogy mt-5"><ph-notebook /><div><b>打个比方：记账</b><p>方案一像手工记账，每个月把整本账抄一遍；方案二、三只记“这个月变了什么”，历史账目自动推出来。区别在于方案二的记账软件只能装在 Python 上，而我们用的是 TypeScript。</p></div></div>

---

# 推荐路线：以 xidl 为目标，但不被上游卡住

<div class="road mt-3">
<div class="stage" v-click="1">
<div class="stage-no">1</div>
<div class="stage-title">先做公共部分</div>
<div class="stage-tag">和选哪种方案无关 · 现在开工</div>
<ul><li>确定版本、项目默认版本</li><li>Webhook 正文先存、长连接</li><li>跨版本幂等</li></ul>
<div class="stage-foot">Linear 上已拆好的任务</div>
</div>
<div class="link" v-click="2"><ph-arrow-right /></div>
<div class="stage" v-click="2">
<div class="stage-no">2</div>
<div class="stage-title">用 xidl 试点一个接口</div>
<div class="stage-tag">接口定义改用 xidl 写</div>
<ul><li>发消息接口 + 收消息的 Webhook</li><li>转换代码先手写在生成的格式上</li></ul>
<div class="stage-foot">Go / Python SDK 先从生成的接口文档再生成</div>
</div>
<div class="link" v-click="3"><ph-arrow-right /></div>
<div class="gate" v-click="3">
<div class="gate-title"><ph-flag-checkered /> 检查关口</div>
<ul><li>生成的接口文档和线上一致</li><li>生成两次，结果一字不差</li><li>改定义后，转换代码会编译失败</li></ul>
</div>
<div class="link" v-click="4"><ph-arrow-right /><span>通过</span></div>
<div class="stage hero" v-click="4">
<div class="stage-no">3</div>
<div class="stage-title">和上游一起补齐</div>
<div class="stage-tag">#324 #323 #321 #320 · Go / Python</div>
<ul><li>转换框架和常见转换换成生成代码</li><li>我们写的业务判断原样保留</li></ul>
<div class="stage-foot">不用推倒重来</div>
</div>
</div>

<div class="fallback" v-click="5">
<div class="fb-line"><ph-arrow-bend-down-left /> 关口没通过</div>
<div class="fb-card"><b>退路：方案一</b><span>存档接口文档 + 手写转换；第 1 步做的公共部分全部保留，不浪费</span></div>
<div class="fb-card ref"><b>全程参考：Stripe、Polar、Cadwyn</b><span>先按旧版检查；已发布版本用测试锁住；发布过的改动记录不能再改</span></div>
</div>

<Sfx name="success" :at="4" />
<Sfx name="warning" :at="5" />

---
layout: end
---

<div class="section-wrap items-center text-center">
<div class="kicker">Photon · API 版本管理</div>
<h1 class="section-title">谢谢</h1>
<div class="section-bar mx-auto" style="background:var(--ph-spectrum)"></div>
<div class="flex gap-3 mt-8 justify-center">
<a class="pill link" href="https://github.com/YuniqueUnic/SlidevPresentation/blob/main/decks/2026-10-photon-versioned-api/attachments/README.md" target="_blank" rel="noopener"><ph-file-text /> 完整文档：attachments/README.md <ph-arrow-up-right /></a>
<a class="pill link" href="https://github.com/YuniqueUnic/SlidevPresentation/tree/main/decks/2026-10-photon-versioned-api/attachments/examples" target="_blank" rel="noopener"><ph-code /> 可运行示例：attachments/examples/ <ph-arrow-up-right /></a>
</div>
</div>
