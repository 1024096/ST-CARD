# 变更历史

## 0.4.0 - 2026-08-16

- 整体改造为**声明式通用模板**:步骤数量可变、字段类型可变,仅通过 `config.ts` 即可控制全部步骤结构。
- 新增 `types.ts` 定义 `StepDef`/`FieldDef`/`FieldOption`/`Draft`,字段支持 text/textarea/number/radio/checkbox 五种类型,带 placeholder/defaultValue/required/minLength/maxLength/min/max/maxSelect/full 等元信息。
- `config.ts` 重写为 `STEPS` 数组,演示三步内容全部声明式,新增或删除步骤无需修改组件。
- `schema.ts` 改为基于字段元信息的最小校验(required / minLength / 数量 / 数值范围),不再依赖写死的字段名。
- `store.ts` 重构:动态 `Draft` reactive record、按字段元信息自动 hydrate、提供 `setField`/`toggleCheckbox`/`validateStep`/`validateAll` 等通用 API;自动缓存与命名方案两层独立。
- `storage.ts` 明确两层:`tavern-opening:last-draft`(自动续填,与永久方案独立) + `tavern-opening:plans`(永久命名方案)。
- `services/mvu.ts` 与 `services/worldbook.ts` 改为通用辅助,接收 `Draft` 而非写死的 `OpeningDraft`。
- `integration.ts` 重写为完整适配器骨架:顶部注释给出可抄写的样例代码、相关 import,以及"演示模式 vs 正式模式"的判断;返回 null 时模板默认演示,不写 MVU 不动 lorebook。
- `App.vue` 重写:循环渲染 `STEPS`,通用 field renderer;步骤导航改 flex 自适应,2 步到 8 步以上都正确布局;响应式断点保留(`1100` / `880` / `680` 三档)。
- 确认页改为自动按 `STEPS.length + 1` 生成,汇总所有字段当前值;适配器为 null 时显示"演示模式",非 null 时显示"已绑定适配器"。
- 重写 `README.md`:给出完整的改造指南、接入流程、文件结构说明。

## 0.3.0 - 2026-08-15

- 抽离 `runtime.ts`,运行环境检测改为仅尝试 `getIframeName()`,去除对 `waitGlobalInitialized` 等多个全局符号的硬依赖。
- 新增 `storage.ts`,提供 `localStorage` 读写、命名方案列表与异常兜底。
- `store.ts` 接入缓存,进入页面时优先恢复上次填写;新增"方案"工具栏。
- 重写 `App.vue` 样式做响应式;新增 `prefers-reduced-motion` 兼容。

## 0.2.1 - 2026-08-15

- 移除界面挂载前对消息楼层 `stat_data` 的强制等待,避免未接入正式 MVU 结构时前端永久空白。

## 0.2.0 - 2026-08-15

- 明确全部字段与选项均为能力演示,不构成产品规范。
- 默认禁用 MVU 写入和世界书修改。
- 新增可插拔角色卡适配器入口。

## 0.1.0 - 2026-08-15

- 新增沉浸式四步开局创建界面。
- 新增自由身份输入、六项天赋、三档模式和三名初始伙伴。
- 新增 MVU 结构化初始化写入。
- 新增世界书互斥开关、冲突自检与异常回滚。
- 新增酒馆运行模式和本地视觉预览模式。
