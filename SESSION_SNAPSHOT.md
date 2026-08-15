# 对话上下文快照

> 生成时间: 2026-05-10
> 最后更新: 2026-05-17
> 用途: 在新对话开头引用此文件 (@TAVERN_HELPER_DEVNOTES.md + @SESSION_SNAPSHOT.md) 即可快速恢复全部上下文

---

## 已创建的项目产物

| 目录 | 类型 | 说明 | 触发标签 |
|------|------|------|----------|
| `src/hello_world/` | 前端界面 | 爆炸特效 + Hello World 按钮 | `<explode/>` |
| `src/brothel_salon/` | 前端界面 | 夜莺之巢姑娘名册（6人/暗红金配色） | `<brothel/>` |

## 技术偏好 (已写进 DEVNOTES.md 第七/八章)

- **分发**: 角色卡内联 HTML > CDN
- **触发**: 正则替换 > 脚本监听
- **CSS**: 零 `<style>` 标签, 纯 JS transition
- **开发预览**: 并行三条线 (pnpm watch + http-server + ST浏览器)

---

## 2026-05-17 会话记录

### EJS 与 Lorebook 协作分析

已确认以下协作机制：

| 协作通道 | 机制 |
|----------|------|
| `[GENERATE]` 标记的世界书条目 | 生成时由 EJS 插件的 `generate_loader_enabled` 控制是否注入 |
| `[RENDER]` 标记的世界书条目 | 渲染楼层时由 `render_loader_enabled` 注入 |
| `@INJECT` 标记的世界书条目 | 由 `inject_loader_enabled` 控制注入时机 |
| `EjsTemplate.evalTemplate(code, context)` | 程序化执行模板语法，context 来自 `EjsTemplate.prepareContext` |

动态控制世界书条目的两条路径：
1. **模板内控制内容**：在 worldbook entry 的 `content` 中嵌入 EJS 条件语法 (`<% if (...) { %>`)
2. **代码侧控制条目开关**：用 `updateWorldbookWith()` 编程式修改条目 `enabled`/`strategy`，配合 MVU 事件 (`VARIABLE_UPDATE_ENDED`) 触发

**核心局限**：EJS 模板语法不能直接"触发"世界书条目激活——激活仍由 `strategy.keys` + `scan_depth` 决定。EJS 只能在条目已被激活后对内容进行二次加工。

### 深红夜莺 = brothel_salon

"深红夜莺"即 `src/brothel_salon/` 项目 —— 夜莺之巢姑娘名册前端界面。

---

## 已讨论但未执行的议题

- [x] EJS Template 与 lorebook 触发协作机制（已分析）
- [ ] MVU 角色卡: 前端从楼层变量动态读取姑娘属性
- [ ] 脚本触发方案 (监听 `CHARACTER_MESSAGE_RENDERED`)
- [ ] Git 推送项目到 GitHub

## 启动预览命令 (快速备忘)

```bash
pnpm watch                           # 终端1
npx http-server dist -p 5500 --cors  # 终端2
# ST浏览器 → 酒馆助手 → 允许监听 → 导入正则JSON → 发含<标签>的消息
```

---

*下次对话开头写: "请先读 @TAVERN_HELPER_DEVNOTES.md 和 @SESSION_SNAPSHOT.md，然后继续我们上次的工作"*
