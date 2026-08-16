# 自选开场白:通用模板

一个**声明式、可扩展**的酒馆助手前端界面模板,用于制作"自选开局"类开场流程。

第一页固定为"基础信息",其余步骤完全由配置驱动,可任意增删字段、改动顺序、改字段类型。完成后自动调用适配器(可选)写 MVU 变量、开关 lorebook 条目,并把当前填写缓存到本地,下次进入新对话自动恢复。

## 适用场景

- 你的角色卡需要玩家填写名字、年龄、人设等基础信息
- 还有一些可配置的"开局选择"(天赋/职业/出身/同伴/世界线 …… 任意数量任意结构)
- 填完之后需要把数据写进 MVU 变量,并根据玩家选择打开/关闭对应世界书条目
- 想让玩家保留多种"方案预设",在不同聊天间快速切换

## 当前演示

- 步骤 1 身份(基础信息:姓名/年龄/性别/人设)
- 步骤 2 天性(多选天赋,最多 3 项)
- 步骤 3 世界(单选难度 + 单选同伴)
- 步骤 4 确认页(自动渲染,展示汇总,触发生成)

演示模式不会写 MVU/lorebook,只在控制台打印草案。

## 改造指南

### 1. 增删步骤、改字段

只改 `config.ts`。`STEPS` 是一个声明式数组,每个步骤包含:

```ts
{
  id: 'traits',                  // 唯一 id
  navLabel: '天性',                // 导航中显示
  title: '选择你的天性',            // 主标题
  desc: '可选的副标题',
  layout: 'cards',                 // grid 表单布局 / cards 卡片选择
  fields: [
    {
      key: 'traitIds',            // 在 draft 中的存储键
      label: '天赋',
      kind: 'checkbox',           // text/textarea/number/radio/checkbox
      defaultValue: [],
      maxSelect: 3,               // 仅 checkbox 用
      options: [/* FieldOption */],
    },
  ],
}
```

新增步骤不需要动 `App.vue`。模板会按 `STEPS.length + 1` 自动渲染步骤导航,最后一步是确认页。

### 2. 接入正式角色卡(MVU + lorebook)

打开 `integration.ts`,把 `getOpeningIntegration()` 返回值从 `null` 改成一个真实的适配器。文件顶部有完整的可抄写样例,核心结构是:

```ts
return {
  name: '我的角色卡',
  async commit(draft) {
    // 1. 写 MVU:由 merger 决定路径,模板不写死
    await writeOpeningToMvu(draft, (current, draft) => ({
      ...current,
      stat_data: { /* 用 draft 的字段映射你的角色卡结构 */ },
    }));

    // 2. 互斥开关 lorebook 条目
    const selections: WorldbookExclusiveSelection[] = [/* ... */];
    const wb = await synchronizeOpeningWorldbook('我的世界书', selections);

    // 3. (可选)追加一条用户消息并触发生成

    return { message: '序章已经准备好了。', warnings: wb.result.warnings };
  },
};
```

`draft` 里的字段就是 `STEPS` 中所有 `field.key` 对应的当前值,例如 `draft.name`、`draft.traitIds`。

适配器一旦不为 null,确认页会显示"已绑定适配器"状态,完成时模板会自动调用 `commit`。

### 3. 缓存与方案

两层独立:

| 存储 | 用途 | 何时写 | 何时读 |
|---|---|---|---|
| `tavern-opening:last-draft` | 自动续填 | 任意字段变化即写 | 进入页面自动读 |
| `tavern-opening:plans` | 永久命名方案 | 用户点"保存"按钮并命名 | 任意聊天中点"应用"按钮 |

新对话进入时,会自动把上次填写的字段恢复到所有步骤中。
点工具栏右侧"方案"按钮,可以把当前所有字段命名保存,之后在任意聊天中调出应用。两者数据完全独立,删除方案不会影响自动续填。

## 本地预览

1. 在仓库根目录保持 `pnpm watch` 运行
2. 在另一个终端从仓库根启动允许跨域的静态服务:

   ```powershell
   pnpm dlx http-server . -p 5500 --cors -c-1
   ```

   不要使用普通的 `python -m http.server 5500`,它没有跨域响应头
3. 打开酒馆 `http://localhost:8000`,导入 `导入到酒馆中/自选开场白-实时修改.json`
4. 让一条消息包含 `<自选开场白/>`,界面会挂载到该消息楼层

## 文件结构

| 文件 | 作用 |
|---|---|
| `types.ts` | `StepDef`/`FieldDef`/`FieldOption`/`Draft` 等类型定义 |
| `config.ts` | 唯一需要修改的配置文件:步骤数组、字段定义、选项列表 |
| `schema.ts` | 基于字段元信息的最小校验 |
| `store.ts` | 动态 draft record、自动缓存、方案管理 |
| `storage.ts` | localStorage 两层封装 |
| `integration.ts` | 正式角色卡适配器接入点,可抄写样例 |
| `services/mvu.ts` | MVU 通用写入辅助 |
| `services/worldbook.ts` | lorebook 通用互斥开关辅助 |
| `runtime.ts` | 运行环境检测(本地/酒馆) |
| `App.vue` | 通用渲染层 + 响应式布局,改动应集中在样式而非结构 |
| `index.ts` / `index.html` | 入口 |

## 边界与未决

- 模板不预设"模式=难度""伙伴=同行者"等业务语义,所有业务概念由你的 `config.ts` 与 `integration.ts` 决定
- 校验仅做 required + minLength + 数量 + 数值范围,自定义校验可后续在 `schema.ts` 扩展
- 当前未内建"完成后追加消息并触发生成"逻辑,适配器可在 `commit` 里自行调用 `generateRaw` 等
- `.vscode/launch.json` 与浏览器调试通道见 `SESSION_HANDOFF.md`