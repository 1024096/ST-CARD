# Tavern Helper 开发实战笔记

> 基于 opencode CLI 环境的酒馆助手前端开发踩坑记录与工作流程。
> 每次打开此项目的对话中可引用本文件快速上手。

---

## 一、开发环境启动（三条线）

| 服务 | 命令 | 端口 | 作用 |
|------|------|------|------|
| webpack watch | `pnpm watch` | 6621 (socket.io) | 编译 `src/` → `dist/`，热更新通知 |
| 静态文件服务 (仅开发期) | `npx http-server dist -p 5500 --cors` | 5500 | 让 ST 浏览器能 HTTP 加载 `dist/` |
| ST 浏览器 | 手动打开 | — | 酒馆助手→开启"允许监听" (连 6621) |

**启动顺序**：
```bash
pnpm install    # 仅首次，装 node_modules
pnpm watch      # 终端1：持续编译 + 热更新
npx http-server dist -p 5500 --cors   # 终端2：静态文件服务
```

**注意**：
- 终端必须在项目根目录打开（`D:\...\tavern_helper_template-main`）
- cmd 和 pwsh 都可以用，无区别
- `pnpm install` 必须先跑，否则 webpack 命令不存在

---

## 二、在 SillyTavern 中预览

### 酒馆助手设置
1. ST → 扩展设置 → 酒馆助手 → 打开 **"允许监听"**
2. 查看 `pnpm watch` 终端：出现 `成功连接到酒馆网页` 即连接成功
3. 忽略 ST 控制台中的 `AutoComplete.js` 报错（ST 自身 bug）

### 导入正则配置 JSON
参考格式（前端界面项目）：

**开发模式** (`replaceString` 用 URL)：
```json
{
  "id": "生成一个UUID",
  "scriptName": "你的界面名-实时修改",
  "findRegex": "<explode/>",
  "replaceString": "```\n<body>\n<script>\n$('body').load('http://localhost:5500/你的项目名/index.html')\n</script>\n</body>\n```",
  "trimStrings": [],
  "placement": [1, 2],
  "disabled": false,
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "minDepth": null,
  "maxDepth": null
}
```

**角色卡分发模式** (`replaceString` 直接粘贴编译产物全文)：
```json
{
  "id": "生成一个UUID",
  "scriptName": "你的界面名",
  "findRegex": "<explode/>",
  "replaceString": "<直接粘贴 dist/项目名/index.html 完整内容>",
  "trimStrings": [],
  "placement": [1, 2],
  "disabled": false,
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "minDepth": null,
  "maxDepth": null
}
```
> **注意**：分发模式直接粘贴 HTML 全文时，`replaceString` **不需要**代码块包裹（不用 `` ``` ``），直接粘贴原始 HTML 即可。

**关键细节**：
- `replaceString` 中 backticks ` ``` ` **必须独占一行**，用实际换行（不是 `\n` 字面量）
- `placement: [1, 2]` 表示替换整体消息内容
- `findRegex: ".*"` 匹配任意内容（替换整条消息）；`"<explode/>"` 仅匹配该标签

### 路径注意
- `http-server` 从 `dist/` 启动时，URL 路径是 `localhost:5500/项目名/index.html`，**不要**加 `/dist/` 前缀
- 必须加 `--cors` 参数，否则 ST 浏览器跨域加载被拦截
- `file:///D:/...` 路径**不可用**（浏览器禁止 `http://` 页面加载 `file://` 资源）

---

## 三、核心踩坑：CSS 嵌入问题

### 问题
将 webpack 编译后的完整 HTML（60KB）直接作为 `replaceString` 内联到角色卡时，ST 报错：
```
CSS ERROR: Error: :4:37: property missing ':'
```

### 根因
ST 内置的 CSS 解析器无法处理：
1. **CSS 自定义属性**：如 `var(--dx)` 在 `@keyframes` 中
2. **webpack CSS 注释**：MiniCssExtractPlugin 生成的多行注释含 `\` 续行符，老旧 CSS 解析器不兼容

### 解决方案
**完全避免 `<style>` 标签**，改用 JavaScript 驱动的 `CSS transition`：

```vue
<!-- 错误：@keyframes + var(--custom-prop) -->
<style scoped>
@keyframes burst {
  100% { transform: translate(var(--dx), var(--dy)); }
}
</style>

<!-- 正确：JS + transition -->
<script setup>
function animateParticle(el, p) {
  requestAnimationFrame(() => {
    el.style.transform = `translate(${p.dx}px, ${p.dy}px) scale(0)`
    el.style.opacity = '0'
  })
}
</script>
<template>
  <span :style="{ transition: 'transform 0.8s ease-out', transform: 'translate(0,0)' }"
        :ref="(el) => animateParticle(el, p)" />
</template>
```

**核心原则**：
- 开发期用 URL 加载 (`$('body').load(url)`)，方便热更新
- 角色卡内联时用无 `<style>` 的纯 JS 方案
- 所有动画通过 `transition` + `requestAnimationFrame` 实现
- `@keyframes` 可用但必须**放在无注释的纯 CSS 环境**（ST 的 CSS 解析器在独立上下文中工作正常，问题出在 webpack 注释污染）

> **用户习惯**：开发期用 URL 加载方便热更新；分发到角色卡时直接粘贴编译产物全文到 `replaceString`（无需 `` ``` `` 代码块包裹）。

---

## 四、文件结构约定

### 前端界面项目
```
src/项目名/
├── index.html    ← 仅骨架：<head></head><body><div id="app"></div></body>
├── index.ts      ← Vue + Pinia 启动入口 ($(() => { ... }))
└── App.vue       ← 主体 Vue 组件
```

### 规则速查
- `index.html` 禁止 `<link>` 和 `<script src>`，一切通过 TS import
- 使用 `$(() => {})` 替代 `DOMContentLoaded`（iframe 环境无效）
- 用 `$(window).on('pagehide', ...)` 做卸载清理
- 禁止 `vh` 单位，用 `aspect-ratio` 控制高度
- 禁止 `position: absolute` 在主体内容上
- TailwindCSS 全局可用（无需导入）
- FontAwesome 免费图标可直接使用
- jQuery (`$`)、lodash (`_`)、toastr 全局可用，不要 import

---

## 五、Q&A 备忘

**Q: opencode CLI 环境下我该做什么来预览？**
A: 参考第一章，三个终端/窗口并行。你能用的就是代码编写和命令执行；ST 浏览器操作必须你手动。

**Q: cmd vs pwsh 有影响吗？**
A: 无，都行。

**Q: 必须从项目根目录开终端吗？**
A: 是。不然 `pnpm watch` 找不到 `src/`，`http-server` 找不到 `dist/`。

**Q: 为什么 `<body><script>$('body').load(...)</script></body>` 显示为代码框不执行？**
A: 需要用 markdown 代码块语法（`` ``` `` 独占行）。酒馆助手扩展会从中提取 HTML 并注入。如果仍然不执行，检查连接状态和 `disabled` 字段。

**Q: 角色卡需要内联完整 HTML 而不是 URL 链接，怎么办？**
A: 用无 `<style>` 的纯 JS 方案（见第三章）。webpack 编译产物经过去注释/去 style 后可直接作为 `replaceString`。

**Q: 导入的正则 JSON 中 `findRegex` 和 `placement` 分别是什么？**
A: `findRegex` 的正则匹配触发条件，`placement: [1, 2]` 控制 DOM 替换范围（1=替换式，2=覆盖内容）。

---

## 六、常用命令

```bash
pnpm install              # 安装依赖
pnpm watch                # 编译 + 热更新监听
pnpm build                # 生产构建
npx http-server dist -p 5500 --cors   # 启动静态服务（仅开发期）
npx webpack --mode development        # 单次编译（查看错误）
```

---

## 七、用户偏好设定

- **分发方式**：优先内联完整 HTML 到角色卡，不依赖 CDN / 外部链接
- **触发方式**：正则替换触发（`<brothel/>`、`<翻牌子/>` 等 XML 标签），不用脚本监听
- **替换内容**（分发期）：`replaceString` 直接粘贴编译产物全文，不用 `$('body').load(url)`
- **图片管理**：Vue 数据中定义 `imageUrl`，编译后直接映射到 HTML 的 `<img src>`
- **角色卡兼容**：所有前端界面必须零 `<style>` 标签（纯 JS transition），确保 ST CSS 解析器不报错
- **开发预览**：本地用 `http://localhost:5500/项目名/index.html` + `$('body').load()`

---

## 八、分发方式对比

| 方式 | 开发期 | 分发期 | 适用 |
|------|--------|--------|------|
| URL 加载 | `$('body').load('localhost:5500/...')` | —（仅本地） | 热更新开发 |
| 内联 HTML | 不适用（体积大、不便调试） | `replaceString` 直贴编译产物 | **角色卡分发（首选）** |
| CDN 脚本 | `import 'cdn/...'` | `import 'https://testingcf.jsdelivr.net/gh/.../index.js'` | 脚本分发、公开项目 |
