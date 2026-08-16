# 工作记录

## 2026-08-15

- 建立独立测试目录,确保本轮文件、说明与历史不散落到其他项目。
- 确定四段式交互:身份输入、天赋选择、世界选项、最终确认。
- 将测试变量结构集中到 `schema.ts`,将正式卡适配点隔离在 `services/mvu.ts`。
- 实现 MVU 当前消息楼层写入,保留既有 `stat_data` 的其他字段。
- 实现世界书模式与伙伴条目的互斥切换、自检及失败回滚。
- 增加运行环境识别,避免非酒馆环境误调用 MVU 与世界书接口。
- 添加用于酒馆热重载的正则导入文件。
- 修正实时导入配置的换行转义;增加 MVU 写入失败时对已修改世界书的二次回滚。
- 修复前端空白:原入口在挂载 Vue 前无限等待消息楼层中的 `stat_data`,与当前无正式 MVU 适配器的演示模式冲突;现改为立即渲染,正式数据初始化由未来适配器自行负责。
- 完成本地联调链路:Edge 浏览器控制、酒馆 `8000`、webpack 实时监听 `6621`、带 CORS 的静态服务 `5500` 均已验证。
- 排查并修复两层空白原因:普通 Python 静态服务器缺少 CORS;跨域修复后,入口仍因等待不存在的 `stat_data` 而不挂载 Vue。
- 在实际第 0 楼的 `TH-message--0--0` iframe 中确认界面成功渲染,标题、身份表单、步骤导航和继续按钮均可见。
- 新增 `SESSION_HANDOFF.md`,保存新对话继续工作所需的环境、结论和边界。
- 抽离 `runtime.ts`,运行环境检测仅依赖 `getIframeName()` 与 try-catch,放弃对 `waitGlobalInitialized` 等多个全局符号的硬依赖,本地预览或未接入 MVU 的酒馆环境也能完整跑完四步。
- 新增 `storage.ts` 与 localStorage 缓存能力:进入界面时自动恢复上次填写;字段任意变化即时写回;生成后保留草案;新增"方案"工具栏支持命名保存、应用与删除。
- 重写 `App.vue` 样式做响应式:取消固定 `aspect-ratio` 与 720px 最小高度,改为内容驱动;新增 1100 / 880 / 680 三档断点;支持 `prefers-reduced-motion`。
- `store.ts` 暴露 `hydrateFrom`、`persistPlan`、`removePlan` 三个方案管理方法,`savedPlans` 同步反映本地最新列表。

### 方向纠正

- 用户明确指出:需求中的输入、特质、难度、伙伴与变量写法只是潜在性简单示例,不是未来规范。
- 撤销"示例等于产品结构"的假设,当前原型默认不再写 MVU 或修改世界书。
- 新增 `integration.ts` 作为可插拔正式接入点;未配置时只生成无副作用的开局草案。
- 将 MVU 写入改成由外部 merger 决定路径,将世界书联动改成任意互斥组,不再内置"模式/伙伴"语义。

## 2026-08-16

- 整体改造为**声明式通用模板**。核心思路:把"四步硬编码+写死字段"重构为基于 `STEPS` 配置数组的动态渲染,新增/删除步骤无需修改组件。
- 新增 `types.ts`:定义 `StepDef`/`FieldDef`/`FieldDef`/`Draft`,字段类型支持 text/textarea/number/radio/checkbox,带 placeholder/defaultValue/required/minLength/maxLength/min/max/maxSelect 等元信息。
- 重写 `config.ts`:把"特质/模式/伙伴"原硬编码内容改为示例 `STEPS` 声明;以后改流程只动此文件。
- 重写 `schema.ts`:废弃写死字段的 zod schema,改为基于字段元信息的 `validateDraft()` 函数,校验 required / minLength / 数量 / 数值范围。
- 重写 `store.ts`:动态 `Draft` reactive record、按字段元信息自动 hydrate(从 localStorage 或默认值),通用 API 含 `setField`/`toggleCheckbox`/`validateStep`/`validateAll`/`buildDraft`/`persistPlan`/`removePlan`/`applyPlan`。
- 重写 `storage.ts`:明确两层独立 key —— `tavern-opening:last-draft`(自动续填) + `tavern-opening:plans`(永久命名方案)。
- 改写 `services/mvu.ts` 与 `services/worldbook.ts`:接收 `Draft` 而非写死 `OpeningDraft`,与适配器解耦。
- 重写 `integration.ts`:返回 null(演示模式) 时模板默认不写 AKVU 不动 lorebook;顶部注释给出完整可抄写的适配器样例代码。
- 重写 `App.vue`:循环渲染 `STEPS`,通用 field renderer;步骤导航由 grid 改为 flex 自适应,适配任意步骤数;响应式断点保留;完成时调用 `integration.commit(draft)`。
- 确认页改为自动按 `STEPS.length + 1` 生成,汇总所有字段当前值;适配器状态明确标识"演示/已绑定"。
- 重写 `README.md`:给出完整的改造指南、接入流程、文件结构说明。

### 方向调整(本轮)

- 用户明确指出"以这个为样例,做一个**通用模板**,第一页基础信息固定,其他步骤全部自由化,可能不止 4 步";据此撤销 0.1~0.2 阶段的"四步硬编码"假设,改为声明式配置驱动。
- MVU 写入与 lorebook 开关保留为可选适配器;模板自身不感知业务语义。
- 自动缓存按用户要求"下次打开新对话有上一次记忆"实现,与永久方案独立。

## 待真正进入角色卡集成阶段再确认

- 正式 MVU `schema.ts` 及玩家、特质、模式、伙伴的最终路径。
- 正式世界书名称和条目精确名称。
- 特质数值效果是否仅作为描述,还是需要参与额外判定脚本。
- 完成初始化后是否自动创建新的用户/AI消息或直接触发生成。
