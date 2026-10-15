# slidev-theme-unicorn

黑色画布、光谱色点缀、随点击切换的讲解，以及在浏览器里实时合成的音效。在 PPT 开头写：

```yaml
---
theme: unicorn
themeConfig:
  brand: Photon            # 页脚左侧
  mark: "''"               # 可选：品牌前的小标记
  product: API 版本管理     # 页脚品牌后的说明
  sfx: { volume: 0.5, music: false, musicVolume: 0.3 }
---
```

主题已默认：深色、`fade-out` 切换、Inter + Geist Mono 字体、`#/页码` 路由、xidl 代码高亮（` ```idl `）。

## 组件

| 组件 | 用途 | 例子 |
| --- | --- | --- |
| `Mark` | 一行带图标的状态说明，`t` 取 `ok / no / warn / fix / add / info` | `<Mark t="ok">零依赖</Mark>` |
| `Num` | 白底圆形序号 | `<Num>1</Num>` |
| `Caption` | 随点击切换的说明卡，带进度条 | `<Caption :steps="[{ title, tag, body }]" />` |
| `Tip` | 在第几次点击时出现的提示气泡，放在代码旁边不遮挡内容 | `<Tip :at="1" top="2rem" title="标题">内容</Tip>` |
| `Pipeline` | 竖向步骤条，当前步骤随点击高亮 | `<Pipeline :steps="['第一步', '第二步']" />` |
| `Scores` | 0–5 分的评分条，翻到该页时依次填满 | `<Scores :items="[{ label: '易用', value: 4 }]" />` |
| `SpectrumPanels` | 封面上的光谱色块 | `<SpectrumPanels />` |
| `Sfx` | 在第几次点击时播放一个音效 | `<Sfx name="success" :at="2" />` |
| `SoundFx` | 音效控制器，主题已放在页脚，不需要手动使用 | — |

常用样式类：`card`（可加 `c1 / c2 / c3 / hero`）、`pill`、`punch`、`analogy`、`note`、`verdict`、`sum`、`fixline`、`big-code`、`mid-code`。

## 音效

音效和背景音乐都是 CC0 授权的真实录音（Kenney 的界面音效与翻书声、OpenGameArt 上的平静配乐），来源见 `sfx/CREDITS.md`。每种音效用哪个文件写在 `sfx/catalog.json`：`use` 是当前使用的文件（多个时随机挑一个），`candidates` 是备选。最方便的改法是在本地导航页打开 **音效试听**（`pnpm dev` 后访问 <http://localhost:3030/sfx>），边听边勾选，结果直接存回 `catalog.json`。

| 名字 | 什么时候用 | 默认文件 |
| --- | --- | --- |
| `click` | 每次点击（自动） | `synth:soft-tick`（浏览器合成的柔和“嗒”声） |
| `slide` | 翻页（自动） | bookFlip1–3（真实翻书声） |
| `reveal` | 某个内容出现 | select_001 |
| `pop` | 轻提示 | pluck_001 |
| `success` | 通过、完成 | confirmation_002 |
| `warning` | 需要注意 | question_001 |
| `error` | 出错、失败 | error_004 |
| `notify` | 提示一条信息 | bong_001 |

背景音乐默认关闭，有 4 首平静的曲子可选（Contemplation、Heavenly Loop、Calm Piano 1、Calm Ambient 3），统一响度后循环播放；音效响起时音乐会自动压低。导出 PDF 时不发声。

快捷键：`m` 开关音效，`b` 开关背景音乐，`n` 换下一首，`[` / `]` 调音量。页脚右侧也有对应按钮，设置会被记住。每份 PPT 可以在开头设默认值：`themeConfig.sfx: { volume, music, musicVolume, track }`。

在自己的组件里使用：

```ts
import { useSfx } from 'slidev-theme-unicorn/composables/useSfx'
useSfx().play('success')
```

新增一种音效：把 MP3 放进 `sfx/ui/`，在 `catalog.json` 的 `effects` 里加一项，并在 `CREDITS.md` 记下来源和许可。
