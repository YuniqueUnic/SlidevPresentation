# SlidevPresentation

Unic 的演示文稿合集。所有 PPT、它们用到的附件和示例代码都放在这一个仓库里；推送到 `main` 后自动发布到 GitHub Pages：

- 导航页：<https://yuniqueunic.github.io/SlidevPresentation/>
- 每份 PPT：`https://yuniqueunic.github.io/SlidevPresentation/<文件夹名>/`

## 目录

```text
theme/          slidev-theme-unicorn：通用样式、组件、音效、代码高亮（见 theme/README.md）
decks/<名字>/   一份 PPT 一个文件夹
  slides.md       正文
  deck.json       登记信息：标题、简介、日期、标签、是否公开
  thumbnail.png   导航页用的缩略图（pnpm thumbs 生成后提交）
  components/     只属于这份 PPT 的组件
  attachments/    附件、文档、可运行的示例代码
  public/         放映时按路径直接读取的文件（如 iframe 里的 PDF）
gallery/        导航页模板
scripts/        新建、预览、生成缩略图、整体构建
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装依赖（需要 Node 22+、pnpm 10） |
| `pnpm dev` | 本地导航页 <http://localhost:3030>：点哪份就启动哪份（端口 3031 起），另有音效试听页 `/sfx` |
| `pnpm dev <名字>` | 直接放映某一份 PPT |
| `pnpm new <名字> --title "标题"` | 用 unicorn 主题新建一份 PPT |
| `pnpm thumbs [名字]` | 截取第一页作为缩略图 |
| `pnpm build` | 构建所有 `public: true` 的 PPT 和导航页到 `dist/` |
| `pnpm preview` | 按 GitHub Pages 的路径在本地预览 `dist/` |

## 新增一份 PPT

1. `pnpm new 2026-11-my-talk --title "我的分享" --brand "Unic"`
2. `pnpm install`，然后 `pnpm dev 2026-11-my-talk`
3. 写完后运行 `pnpm thumbs 2026-11-my-talk`，把 `deck.json` 里的 `public` 改成 `true`
4. 提交并推送到 `main`，导航页会自动出现这份 PPT

文件夹名建议用 `年-月-主题`，导航页按 `deck.json` 里的日期从新到旧排列。

## 说明

- 网址使用 `#/页码` 的形式（`routerMode: hash`），因为 GitHub Pages 无法为单页应用处理 `/页码` 这样的深链接。
- `pnpm-workspace.yaml` 统一管理依赖版本，并把 `markdown-it` 锁在 14：Slidev 依赖的 `@comark/markdown-it` 还不兼容 15。
- `netlify.toml` 和 `vercel.json` 是旧配置，目前不使用。
