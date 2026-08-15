# 更新日志

## 2026-05-10 — v1.1 用户偏好 + 分发生态

### 新增

- **第七章 用户偏好设定**：记录分发方式（角色卡内联）、触发方式（正则替换）、角色卡兼容要求
- **第八章 分发方式对比**：URL 加载 vs 内联 HTML vs CDN 三种模式对照表
- **第二章** 新增"角色卡分发模式"JSON 模板（`replaceString` 直接粘贴编译产物）

### 修改

- 第一章 http-server 标注"仅开发期"
- 第三章 追加用户习惯备注
- 第六章 精简命令，去除 CDN 相关内容

### 项目产物

- `src/hello_world/` — Hello World 爆炸特效前端（示例）
- `src/brothel_salon/` — 夜莺之巢姑娘名册前端（6 位姑娘卡片，暗红金配色，20 世纪妓院风格）
- 所有前端界面零 `<style>` 标签，兼容 ST 角色卡内联

### 踩坑记录

- ST CSS 解析器不兼容 `var(--custom-prop)` 和 webpack 注释 `\` 续行符
- `http-server` 从 `dist/` 启动时 URL 不含 `/dist/` 前缀
- 直接 `file:///` 路径不可用（跨协议安全策略）
- 正则替换 `replaceString` 代码块格式要求 backticks 独占行
