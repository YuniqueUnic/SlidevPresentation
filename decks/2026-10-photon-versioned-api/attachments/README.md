# Photon Versioned API 三条路线对比：手写 Adapter、Cadwyn、xidl

**核对日期 2026-10-14。** 本文对照三份调研稿（《Photon API版本化治理与映射层调研》《XIDL × Photon Versioned API 深度审计》《Cadwyn、XIDL 对比与最小可落地方案》），以及 xidl 本机仓库与上游 issue、Cadwyn 源码和 Photon 各仓的实际语言，评审“三种做法”的理解是否成立，并给出修正、扩充和可运行的代码示例。完整调研与第一性原理推导详见同目录下的完整文档：[Photon 接口版本管理完整调研：从第一性原理到工程落地](RESEARCH.md)。演示文稿为 [../slides.md](../slides.md)（Slidev，44 页：先讲 Stripe、Polar 的做法和核心要求，再讲 Photon 的三种方案；面向不熟悉这个领域的读者），已导出 PDF（构建时导出）；在仓库根目录运行 `pnpm dev 2026-10-photon-versioned-api` 可以现场演示，包括 magic-move 代码动画。所有示例在 [examples/](examples/) 中，每个都实际运行或编译过（见文末“验证”）。

## 一、结论

**三分法的方向对，但三条路线的分界线需要换一个说法。** 它们的差别不在于“要不要写 Adapter”：三条路线都要有 Adapter，也都要 Photon 自己实现运行时。真正的差别在于下面三个问题由谁回答：每个版本的合同结构以什么为准，从一个版本到另一个版本的转换从哪里来，以及转换写错了谁能发现。

| 问题 | 方案一：手写 Adapter | 方案二：Cadwyn | 方案三：xidl |
| --- | --- | --- | --- |
| 每个版本的合同以什么为准 | 每个版本手写类型或冻结 OpenAPI 快照 | HEAD Pydantic 模型 + 反向变更指令，框架派生旧版本 | HEAD IDL + `@added` / `@removed`，编译器派生旧版本 |
| 版本之间的转换从哪里来 | 全部手写 | 结构差异由指令派生；数据转换手写（装饰器） | 今天：对生成的类型手写；提案 #324：机械部分生成，非机械部分生成必须实现的 hook |
| 写错了谁能发现 | 运行时或测试 | 框架按目标版本校验请求，派生的 schema 与指令一致 | 编译器：版本类型变了，转换代码直接编译失败（已实测） |
| 能否直接用在 Photon 运行时 | 能（TypeScript） | **不能**：只能跑在 Python + FastAPI 上 | 能：TypeScript / Rust 生成目标已支持版本化合同 |

**推荐：以方案三为目标、分阶段推进，不被上游阻塞。** 先实现三条路线都绕不开的 Photon 运行时底座（版本解析、项目默认版本、Webhook 预生成正文、WS 游标、幂等、行为门控）。转换代码第一版手写，但写在 xidl 生成的各版本类型之上，这样当天就获得编译期的漂移检查。xidl #324 落地后，再把其中机械的部分换成生成代码。Cadwyn 只作为运行语义的参考实现，不作为依赖。

**2026-10-14 用户确认分工：** 版本之间的 adapter 由 xidl 生成，包括升维和降维的骨架、机械转换，以及必须实现的 hook 签名；hook 里的具体业务逻辑由 Photon 编写。

## 二、对原有理解的逐条评审

### 方案一：自己写 Adapter

**成立的部分：** 起步最简单、最直接，零新依赖，与现有 TypeScript 技术栈一致；缺点“版本化任务回到开发者身上”也是对的。

**需要修正的部分：**

- “四处分散”不是这条路线的必然结果，可以用一个集中的 Adapter 注册表把转换收在一处（示例就是这么做的）。它真正的弱点在于有两份事实：一份是每个版本的合同结构（类型、校验、OpenAPI 快照），另一份是转换代码，两者靠人保持一致。HEAD 改了一个字段，旧版本的手写类型不会跟着变，转换代码照样能编译，漂移只能靠测试或线上发现。
- 历史版本的 OpenAPI 和 SDK 类型要么手写，要么在发布时冻结快照。冻结快照是最省事的起点（第三份调研稿的建议），但它只证明“发布时是什么样”，不证明转换代码的输出符合快照，所以还需要按版本校验输出的测试。
- “breaking 还是 additive”的判断完全依靠人工评审，或者再写一个 OpenAPI diff 工具。
- 补充一个容易漏掉的优点：它是另外两条路线的退路，因为三条路线的运行时部分本来就要自己写。

### 方案二：引入 Cadwyn

**成立的部分：** Cadwyn 是 Stripe 版本化模型最完整的开源实现。它的核心做法是“只维护 HEAD，用反向变更指令描述过去，请求向前迁移、响应向后迁移”，并能从同一份描述派生出每个版本的 schema 和 OpenAPI，确实减少了人工维护的部分。它也确实无法引入 Photon 的运行时。

**需要修正的部分：**

- Cadwyn 不是能套在现有服务外层的“门面”。它就是 FastAPI 应用本身：路由、请求校验、OpenAPI 生成都由 Cadwyn 和 FastAPI 完成（`Cadwyn(...)` 继承自 `FastAPI`），业务端点也必须写成 FastAPI 路由。Photon 的运行时全部是 TypeScript（`base-bffs`、`fusor-v2`、`webhooks`、`aerial`、`contracts`、`semantic-adapter` 主语言都是 TypeScript），所以连“门面”这一层也引不进来。
- “引入 Cadwyn”实际只有两种形态：
  - **2a：按 Cadwyn 的模型用 TypeScript 自己写一遍。** 这本质上是方案一加上 Cadwyn 的纪律，Cadwyn 本身没有被引入。
  - **2b：在 TS 服务前面加一个 Python FastAPI 网关做版本转换。** 这会多一种语言、多一跳网络，而且请求和响应 schema 要在 Pydantic 和 TS 两边各维护一份，制造出新的漂移源。
- Cadwyn 只管同步 HTTP。它提供 `migrate_response_body` 可以在路由之外复用响应转换，但 Webhook 绑定、预生成正文、重试字节一致、WS 回放这些都不在它的范围内。
- 成熟度要准确表述：Cadwyn 采用 MIT 许可，最新版 7.4.0（2026-09-20），约 310 star、31 个 open issue，维护活跃，自述 production-ready。它是成熟的参考实现，但不是 Stripe 自己的代码。

### 方案三：引入 xidl

**成立的部分：** 声明式 IDL 可读、可评审，一份源生成多语言产物，版本化随合同一起管理，长期维护成本最低；缺点“要和 xidl 一起推进”也是对的。

**需要修正的部分：**

- 版本化已经不是纸上设计。xidl **0.100.0（2026-10-14 发布）** 已经落地第一阶段：`@version` 枚举声明版本时间线，`@added` / `@removed` 标注生命周期，`@rename` 保持线上字段名，然后从一份 IDL 派生每个版本的 OpenAPI 文档、TypeScript 命名空间和 Rust 模块。本文的示例已用 0.100.0 实际编译。第三份调研稿说“xidl 还在 0.91.x、没有版本化能力”，第二份说“0 个 open issue”，这两处都已过时。
- “versioned API 也一并随之完成”说过头了。截至今天，以下能力仍未实现：
  - 一份实现服务所有版本（运行时转换，#324 open）。现在每个版本生成各自的 server trait，业务逻辑要实现 N 遍，官方 BDD 示例就是这样写的。
  - Webhook 出站操作（#323）、统一 JSON 线上语义（#321）、跨语言一致性向量（#320），均为 open。
  - Go 生成器还不能按版本输出模块，遇到版本化合同会直接报错退出，不会生成错误代码；xidl 也没有 Python 目标。Photon 的 `api` 仓发布 Go 和 Python SDK（`packages/go`、`packages/python`），所以这两个 SDK 短期要继续从 xidl 输出的每版本 OpenAPI 生成，长期需要上游支持。
  - Photon 的运行时部分（版本解析、项目默认版本、预生成正文等）无论选哪条路线都不归 xidl。
- 需要补充的缺点：
  - 合同源迁移成本。现有 `contracts`、Standard Schema 和 `openapi → api-internal → api` 生成链要迁到 IDL（可分端点迁移）。
  - 上游依赖。xidl 的版本化语法由维护者 cathaysia 主导：第一阶段只接受 `@added` / `@removed`，改名写成“区间不相交的新成员”，`@renamedFrom` 等被明确拒绝。Photon 需要的能力要通过上游讨论落地。
  - 项目仍在 1.0 之前，团队要学习 IDL。
  - 第一阶段的已知缺口（本人已在 #314 审计中提出）：改名只靠线上字段名关联，编译器不知道 `legacy_sender` 和 `sender` 是“同一个字段的两个形态”，这正是 #324 生成转换代码前要补的对应关系表。

### 三份调研稿之间的分歧怎么看

第一份（Gemini）给出了正确的核心模型：单一 HEAD、请求升维、响应和事件降维、预生成正文、少量行为门控。第三份在此基础上做了必要的收窄：不首期自动派生历史 schema；幂等指纹要包含 behavior epoch，不能只对升维后的 JSON 求哈希；多跳转换要在 CI 中对每个支持版本单独验证；内部持久事件仍需 schema 兼容。第二份给 xidl 划出了正确的职责边界：xidl 负责“合同在各版本里是什么意思”，Photon 负责“运行时怎么用这份合同”。第三份认为 xidl 应该暂缓，这是根据过时的上游信息得出的；按今天的事实，xidl 已经具备“声明 → 派生各版本产物”的一半，缺的是运行时转换那一半，而这一半在任何路线下都要写。

## 三、三条路线都绕不开的 Photon 运行时

下面这些是 Photon 自己的产品和可靠性语义，Cadwyn 不做，xidl 也不应该做。它们与路线选择无关，可以立刻开工，对应 Linear P-ENG-100 v5 的 T1–T3 和 T5–T7。

| 能力 | 内容 | Linear |
| --- | --- | --- |
| 版本目录与解析 | `preview` / `current` / `maintain` 选择器解析为具体 `YYYY-MM`；优先级为请求头 > SDK pin > 项目默认 > `current`；`Photon-Version` 与 `x-photon-version` 冲突时报错 | T1、T2 |
| 项目默认版本 | 项目创建时存具体版本，不存别名 | T3 |
| Webhook 预生成正文 | 首次投递前降维一次并保存字节和哈希；重试和 DLQ 重投发送同一份字节 | T5 |
| WS 游标绑定 | 游标绑定具体版本；超出保留窗口明确报错 | T6 |
| 跨版本幂等 | 指纹基于升维后的规范命令加 behavior epoch | T7 |
| 行为门控 | 无法用数据转换表达的副作用差异（计费、权限、路由），用少量命名门控 | — |
| 不可表示时明确失败 | HEAD 状态在旧合同里表达不了时，返回明确的 unsupported，不伪造旧值 | — |

## 四、同一个变更在三条路线下的样子

示例变更：`2026-07` 的消息里 `sender` 是电话号码字符串，发送接口用 `recipient`；`2026-10` 把它改为结构化的 `sender: { handle, protocol }`，发送接口改用 `to`，并新增 WhatsApp 渠道、可选字段 `thread_id`、新端点 `GET /v1/threads/{thread_id}/messages` 和新异常 `ThreadClosed`。以下 JSON 和字段是演示模型，不代表 Photon 已发布的线上合同。

### 方案一：手写 Adapter（TypeScript，可运行）

完整代码见 [examples/hand-adapter/adapter.ts](examples/hand-adapter/adapter.ts)，用 `node adapter.ts` 运行。核心是沿用题目里给出的接口：

```ts
interface VersionAdapter<Old, Head> {
  upcastRequest?(input: Old, ctx: AdapterContext): Head;
  downcastResponse?(input: Head, ctx: AdapterContext): Old;
  downcastEvent?(input: Head, ctx: AdapterContext): Old;
}

// 每个版本的合同类型都要手写，HEAD 改了它们不会跟着变。
interface SendV0707 { recipient: string; text: string }
interface MessageV0707 { id: string; sender: string; text: string }

const message_1010_to_0707: VersionAdapter<MessageV0707, MessageHead> = {
  downcastResponse: (head) => {
    if (head.sender.protocol === "whatsapp") {
      throw new UnsupportedDowncast("structured-sender",
        "2026-07 cannot represent a WhatsApp sender");
    }
    return { id: head.id, sender: head.sender.handle, text: head.text };
  },
};

// 注册表要靠人保持完整；漏注册只在运行时报错。
const REGISTRY = {
  "messages.send": { "2026-07": sendMessage_0707_to_1010 },
  "messages.get": { "2026-07": message_1010_to_0707 },
  "message.received": { "2026-07": message_1010_to_0707 },
};
```

运行输出：2026-07 客户端收到 `{ id, sender: "+15551234567", text }`，2026-10 收到结构化 sender；Webhook 正文降维一次后计算哈希；WhatsApp 发送者在 2026-07 下抛出 `UnsupportedDowncast`。

**这个变更要手动维护的地方：** 2026-07 的请求类型和响应类型、HEAD 类型、两个转换函数、注册表三处条目、2026-07 的 OpenAPI 快照（或单独再写一份校验）、SDK 类型，以及证明这些一致的测试。

### 方案二：Cadwyn（Python，可运行）

完整代码见 [examples/cadwyn/app.py](examples/cadwyn/app.py)，用 `uv run --python 3.12 --with "cadwyn==7.4.0" --with httpx python -W ignore app.py` 运行。一个 `VersionChange` 同时描述“过去长什么样”和“数据怎么转”：

```python
class StructureTheSender(VersionChange):
    """`sender` is now an object with `handle` and `protocol`. Requests use
    `to` instead of `recipient`."""

    instructions_to_migrate_to_previous_version = (
        schema(Message).field("sender").had(type=str),
        schema(SendMessageRequest).field("to").didnt_exist,
        schema(SendMessageRequest).field("recipient").existed_as(type=str),
    )

    @convert_request_to_next_version_for(SendMessageRequest)
    def recipient_to_structured(request: RequestInfo):
        request.body["to"] = {"handle": request.body.pop("recipient"), "protocol": "sms"}

    @convert_response_to_previous_version_for(Message)
    def structured_to_phone(response: ResponseInfo):
        response.body["sender"] = response.body["sender"]["handle"]

versions = VersionBundle(HeadVersion(), Version("2026-10", StructureTheSender), Version("2026-07"))
app = Cadwyn(versions=versions, api_version_parameter_name="Photon-Version",
             api_version_format="string", changelog_url=None)
```

实测结果：
- `Photon-Version: 2026-07` 的请求得到 `sender` 字符串，2026-10 得到对象。
- 用 2026-10 的请求体以 2026-07 调用，返回 422，说明请求先按目标版本校验。
- `/openapi.json?version=2026-07` 中 `Message.sender` 是 `string`，2026-10 中是对 `Sender` 的引用，说明历史 OpenAPI 是派生出来的。
- 注意：Cadwyn 默认版本格式是 ISO 日期，`2026-07` 这种年月格式需要显式设置 `api_version_format="string"`。

**这个变更要手动维护的地方：** HEAD 模型、一个 `VersionChange`（三条指令、两个转换函数）。历史 schema、历史 OpenAPI 和按版本校验都由框架完成。但所有这些都只在 Python/FastAPI 服务里成立。

### 方案三：xidl（IDL，已用 0.100.0 编译）

IDL 见 [examples/xidl/messages.idl](examples/xidl/messages.idl)，生成命令为 `xidlc gen openapi|typescript-rest|rust-axum -o out/... messages.idl`：

```idl
@version
enum ApiVersions {
    @rename("2026-07") v2026_07,
    @rename("2026-10") v2026_10,   // 最后一个成员 = 本文件描述的 HEAD
};

enum Protocol {
    imessage,
    sms,
    @added(ApiVersions::v2026_10) whatsapp,
};

struct Message {
    string id;

    @removed(ApiVersions::v2026_10)
    @rename("sender")                 // 旧成员保留线上名 sender
    string legacy_sender;

    @added(ApiVersions::v2026_10)
    Sender sender;                    // HEAD 代码拿到干净的名字

    string text;

    @added(ApiVersions::v2026_10)
    @optional string thread_id;
};

interface Messages {
    @post(path = "/v1/messages")
    Message send(@body SendMessageRequest request) raises(NotFound, ThreadClosed);

    @added(ApiVersions::v2026_10)
    @get(path = "/v1/threads/{thread_id}/messages")
    sequence<Message> list_thread(@path string thread_id);
};
```

一份源实际生成的结果：
- `openapi_messages.v2026_07.json`（2 个路径，`sender: string`，`Protocol` 只有 imessage/sms）和 `openapi_messages.v2026_10.json`（3 个路径，`sender` 引用 `Sender`，带 `thread_id`）。
- TypeScript 的 `namespace v2026_07` / `namespace v2026_10`；zod 校验用 `xjson(..., {"name":"sender"})` 保持线上名。
- Rust 的 `mod v2026_07` / `mod v2026_10`，带 `#[serde(rename = "sender")]`。
- `ThreadClosed` 只出现在 2026-10 的 `raises` 里。旧版本没有这个异常，编译器会把它从旧版本中过滤掉。

转换代码今天仍要手写，但写在生成的类型之上（[examples/xidl/adapters.ts](examples/xidl/adapters.ts)）：

```ts
import type { v2026_07, v2026_10 } from "./out/ts/messages";

export const message: Step<v2026_07.Message, v2026_10.Message> = {
  upgrade: (old) => ({ id: old.id, sender: { handle: old.legacy_sender, protocol: "sms" }, text: old.text }),
  downgrade: (head) => {
    if (head.sender.protocol === "whatsapp") {
      throw new UnsupportedProjection("structured-sender", "2026-07 cannot represent a WhatsApp sender");
    }
    return { id: head.id, legacy_sender: head.sender.handle, text: head.text };
  },
};
```

**漂移检查实测：** 把 IDL 中 `thread_id` 改为必填后重新生成，`tsc` 立即报错 `Property 'thread_id' is missing in type ... but required in type 'Message'`。方案一里同样的改动不会让任何东西编译失败。

**这个变更要手动维护的地方：** IDL 中的几行注解，加上非机械转换（字符串 ↔ 结构化 sender、WhatsApp 不可表示）。各版本的类型、OpenAPI 和校验都由编译器生成。#324 落地后，`thread_id` 删除、新端点不出现在旧版本这类机械转换也会自动生成，只剩真正需要业务判断的 hook。

## 五、理想形态下的 xidl：声明 → 编译 → 运行时

```text
messages.idl（HEAD + @version / @added / @removed）
        │  xidlc
        ▼
  Version-aware HIR ──投影──► HIR@2026-07 / HIR@2026-10          ✅ 0.100.0
        │
        ├─► OpenAPI@每个版本、TS / Rust 类型与客户端               ✅ 0.100.0
        ├─► 相邻版本对应关系表（改名、类型变更、可选性变化）         ⏳ #314 审计提出
        ├─► 转换代码：机械部分生成，非机械部分生成必须实现的 hook     ⏳ #324
        ├─► Webhook 出站操作、签名验证、接收端类型                   ⏳ #323
        ├─► 统一 JSON 线上语义、跨语言一致性向量                     ⏳ #321 / #320
        └─► 版本清单（各版本 HIR 摘要、产物摘要、变更分类）           ⏳ 提案
                     │
                     ▼
Photon 运行时：版本解析 → 按目标版本校验 → 升维 → HEAD 业务 → 降维 → 按目标版本校验
              Webhook：降维一次 → 冻结字节 → 重试发送同一份字节
```

在这个形态下，一次 breaking change 只要求工程师回答三个问题：编译器能否描述这个结构差异（能就生成，不能就生成一个 hook）；旧合同能否表示新状态（能就降维，不能就明确返回 unsupported）；这个变化是否改变业务副作用（是则交给 Photon 的行为门控）。

## 六、能力对比

| 维度 | 方案一 手写 | 方案二 Cadwyn | 方案三 xidl（今天 / 目标） |
| --- | --- | --- | --- |
| 适配 Photon TS 运行时 | ✅ | ❌（需 Python 网关或重写） | ✅ / ✅ |
| 唯一合同事实源 | ❌ 类型、快照、转换各一份 | ✅ 仅限 Python 侧 | ✅ / ✅ |
| 历史 schema / OpenAPI | 手写或冻结快照 | 派生 | 派生 / 派生 |
| 多语言 SDK 类型 | 走现有 OpenAPI 生成链 | 走 OpenAPI 生成链 | 直接生成 TS / Rust；Go、Python 走 xidl 输出的每版本 OpenAPI / 上游支持后直接生成 |
| 请求按目标版本校验 | 自己写 | ✅ 内置 | 生成的 zod / serde / 内置于 #324 |
| 升维 / 降维 | 全手写 | 指令 + 手写函数 | 对生成类型手写 / 机械部分生成 |
| 转换与合同的漂移检测 | 只靠测试 | 框架保证一致 | 编译失败（已实测）/ 编译失败 |
| breaking 分类 | 人工或另写 diff | 由指令隐含 | 人工 / 对应关系表与清单 |
| Webhook / WS / 预生成正文 | Photon 自己做 | Photon 自己做 | Photon 自己做（#323 提供类型和签名） |
| 新增依赖与风险 | 无 | Python 技术栈 | 上游节奏、1.0 之前、团队学习 IDL |
| 起步成本 | 最低 | 高（栈不匹配） | 中（迁移合同源，可分端点） |
| 版本数增多后的成本 | 线性增长且易漂移 | 低 | 低 |

## 七、推荐路线与关口

1. **立刻开始，不依赖路线选择：** 实现第三节的 Photon 运行时底座（T1–T3、T5–T7），并选一个真实的 breaking 变更作为端到端验收用例（第四节的 `sender` 结构化即可）。
2. **合同源先切到 xidl，从一个纵向切片开始：** `GET/POST /v1/messages` 加 `message.received` 事件。用 xidl 生成各版本类型和 OpenAPI，转换代码手写在生成类型之上；Go 和 Python SDK 从 xidl 输出的每版本 OpenAPI 生成。验收要求：生成的 OpenAPI 与生产线上格式等价，同一输入两次生成逐字节一致，改 IDL 导致转换代码编译失败。
3. **与上游一起推进 #324 / #323 / #321 / #320：** Photon 提供真实用例和一致性向量。#324 落地后，把手写转换中的机械部分换成生成代码；非机械 hook 保持手写。
4. **退路：** 如果第 2 步的切片在约定时间内过不了关口，退回方案一（快照 + 手写 Adapter），运行时底座和一致性向量全部保留，没有沉没成本。Cadwyn 在任何阶段都只作为语义参考（目标版本校验、HEAD 可携带仅为兼容保留的数据、变更不可改写等）。

这与 Linear ENG-3684（In Review）原提案的阶段划分一致：先做准备和基线，再做 P0 加纵向切片，最后迁移和切换。不同之处在于，xidl 0.100.0 已经交付了版本投影，第 1 阶段的起点比提案时更靠前。

## 八、局限

- 示例中的字段和 JSON 是演示模型，不是 Photon 已发布的合同；Photon 运行时示例只演示了转换链和正文哈希，没有接入真实的 Hono、NATS 或数据库。
- xidl 的“目标”列是上游提案（#320–#324），语法和时间以维护者合并的代码为准；投入估算沿用 ENG-3684 的提案值（P0 约 2 人月），未与维护者确认。
- Cadwyn 只在本机 Python 3.12 + cadwyn 7.4.0 下运行了示例，没有评估它在 Photon 规模下的性能。
- 本文没有改动 Linear 或任何上游仓库。

## 验证

| 项目 | 命令 | 结果 |
| --- | --- | --- |
| 方案一运行 | `node examples/hand-adapter/adapter.ts`（Node 24） | 输出两个版本的响应、正文哈希、`UnsupportedDowncast` |
| 方案一类型检查 | `tsc --strict --noEmit`（TS 5.9 + @types/node） | 通过 |
| 方案二运行 | `uv run --python 3.12 --with cadwyn==7.4.0 --with httpx python -W ignore examples/cadwyn/app.py` | 2026-07 / 2026-10 均 200；跨版本请求体 422；两版 OpenAPI 的 `sender` 类型不同 |
| 方案三编译 | xidlc 0.100.0（本机源码 `21460f79` 构建）`gen openapi / typescript-rest / rust-axum` | 生成两份 OpenAPI、TS 命名空间、Rust 模块；`go-rest` 按设计拒绝 |
| 方案三类型检查 | `tsc -p examples/xidl/tsconfig.json` | 通过；把 `thread_id` 改为必填后报 TS2741 |

来源：xidl [#314](https://github.com/xidl/xidl/issues/314)、[#315](https://github.com/xidl/xidl/issues/315)、[#320](https://github.com/xidl/xidl/issues/320)–[#324](https://github.com/xidl/xidl/issues/324)、[v0.100.0](https://github.com/xidl/xidl/releases/tag/v0.100.0)、[版本化指南](https://github.com/xidl/xidl/blob/master/website/src/content/docs/guide/versioning.mdx)；Cadwyn [仓库](https://github.com/zmievsa/cadwyn)（`640bda6`）与 [Version Changes](https://docs.cadwyn.dev/concepts/version_changes/)；Photon 各仓语言来自 GitHub `photon-hq/*` 的 languages 接口；Linear [ENG-3684](https://linear.app/photonhq/issue/ENG-3684)。
